"""services/mitre_mapper.py — MITRE ATT&CK technique mapper (downloads + caches + matches)."""
from __future__ import annotations
import json, logging, re
from typing import Any
import httpx
from app.config import settings

logger = logging.getLogger(__name__)
MITRE_URL = "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json"
_index: list[dict] | None = None


def _load() -> list[dict]:
    global _index
    if _index is not None:
        return _index
    cache = settings.MITRE_ATTACK_CACHE
    if not cache.exists():
        logger.info("Downloading MITRE ATT&CK data from GitHub...")
        try:
            with httpx.Client(timeout=60.0) as c:
                r = c.get(MITRE_URL); r.raise_for_status(); cache.write_bytes(r.content)
            logger.info("MITRE data saved to %s", cache)
        except Exception as e:
            logger.error("MITRE download failed: %s", e)
            _index = []; return _index
    raw = json.loads(cache.read_text(encoding="utf-8"))
    techs = []
    for obj in raw.get("objects", []):
        if obj.get("type") != "attack-pattern": continue
        if obj.get("x_mitre_deprecated") or obj.get("revoked"): continue
        refs = obj.get("external_references", [])
        tid = next((r["external_id"] for r in refs if r.get("source_name") == "mitre-attack"), None)
        if not tid: continue
        name = obj.get("name", "")
        desc = re.sub(r"<[^>]+>", " ", obj.get("description", ""))
        keywords = list(set(re.findall(r"[a-z]{4,}", (name + " " + desc).lower())))
        tactics = [p["phase_name"].replace("-", " ") for p in obj.get("kill_chain_phases", [])
                   if p.get("kill_chain_name") == "mitre-attack"]
        techs.append({"technique_id": tid, "name": name, "tactics": tactics, "keywords": keywords})
    logger.info("Loaded %d MITRE techniques", len(techs))
    _index = techs
    return _index


def map_ttps(ttp_clues: list[str], top_n: int = 15) -> list[dict]:
    """Match TTP clue strings to MITRE ATT&CK techniques using keyword scoring."""
    techs = _load()
    if not techs: return []
    clue_words = set(w.lower() for c in ttp_clues for w in re.findall(r"[a-z]{4,}", c.lower()))
    if not clue_words: return []
    scored = [(len(clue_words & set(t["keywords"])), t) for t in techs]
    scored = sorted([(s, t) for s, t in scored if s > 0], key=lambda x: -x[0])
    return [{"technique_id": t["technique_id"], "name": t["name"],
             "tactics": t["tactics"], "confidence_score": s} for s, t in scored[:top_n]]


async def preload_mitre_data():
    """Pre-load MITRE data at startup."""
    import asyncio
    await asyncio.get_event_loop().run_in_executor(None, _load)
