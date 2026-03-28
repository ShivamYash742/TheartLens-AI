"""services/ai_extractor.py — Pluggable AI threat intelligence extraction."""
from __future__ import annotations
import json, logging, re
from typing import Any
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = "You are a cybersecurity threat intelligence analyst. Return ONLY valid JSON, no explanation."

USER_PROMPT = """Extract threat intelligence from the text below.
Return a JSON object with EXACTLY these fields (use empty arrays/strings if nothing found):
{{"cves":[],"vulnerability_descriptions":[],"malware_names":[],"threat_actors":[],
"iocs":{{"ips":[],"urls":[],"domains":[],"hashes":[]}},"exploited_products":[],
"attack_vectors":[],"ttp_clues":[],"severity":"Critical|High|Medium|Low|Info|Unknown",
"executive_summary":"non-technical 2-3 sentence summary",
"technical_summary":"technical analyst summary with specific IOCs and TTPs"}}

Text:
{text}"""


class IntelResult:
    """Structured threat intelligence extraction result."""
    def __init__(self, data: dict[str, Any], raw_response: str = ""):
        self.cves: list = data.get("cves", [])
        self.vulnerability_descriptions: list = data.get("vulnerability_descriptions", [])
        self.malware_names: list = data.get("malware_names", [])
        self.threat_actors: list = data.get("threat_actors", [])
        self.iocs: dict = data.get("iocs", {"ips": [], "urls": [], "domains": [], "hashes": []})
        self.exploited_products: list = data.get("exploited_products", [])
        self.attack_vectors: list = data.get("attack_vectors", [])
        self.ttp_clues: list = data.get("ttp_clues", [])
        self.severity: str = data.get("severity", "Unknown")
        self.executive_summary: str = data.get("executive_summary", "")
        self.technical_summary: str = data.get("technical_summary", "")
        self._raw = raw_response

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if not k.startswith("_")}


def _regex_fallback(text: str) -> IntelResult:
    logger.warning("LLM unavailable — using regex fallback")
    cves = list(set(re.findall(r"CVE-\d{4}-\d{4,7}", text, re.IGNORECASE)))
    ips = list(set(re.findall(r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b", text)))
    urls = list(set(re.findall(r"https?://[^\s\"'>]+", text)))
    domains = list(set(re.findall(r"\b(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|io|gov|edu|ru|cn|biz)\b", text)))
    hashes = list(set(re.findall(r"\b[a-fA-F0-9]{32}\b|\b[a-fA-F0-9]{64}\b", text)))
    sev = "Unknown"
    for pat, s in [("critical", "Critical"), ("high", "High"), ("medium", "Medium"), ("low", "Low")]:
        if re.search(pat, text, re.IGNORECASE):
            sev = s; break
    return IntelResult({
        "cves": cves, "vulnerability_descriptions": [], "malware_names": [], "threat_actors": [],
        "iocs": {"ips": ips, "urls": urls, "domains": domains, "hashes": hashes},
        "exploited_products": [], "attack_vectors": [], "ttp_clues": [], "severity": sev,
        "executive_summary": "Extracted via pattern matching (LLM unavailable).",
        "technical_summary": f"Regex found {len(cves)} CVEs, {len(ips)} IPs, {len(urls)} URLs.",
    })


def _parse_json(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?\n?", "", raw).strip().rstrip("`")
    s, e = cleaned.find("{"), cleaned.rfind("}") + 1
    if s == -1 or e == 0:
        raise ValueError("No JSON object in LLM response")
    return json.loads(cleaned[s:e])


async def _call_openai(text: str) -> str:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    resp = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[{"role": "system", "content": SYSTEM_PROMPT},
                  {"role": "user", "content": USER_PROMPT.format(text=text[:12000])}],
        temperature=0.1, response_format={"type": "json_object"})
    return resp.choices[0].message.content or ""


async def _call_ollama(text: str) -> str:
    prompt = f"{SYSTEM_PROMPT}\n\n{USER_PROMPT.format(text=text[:8000])}"
    async with httpx.AsyncClient(timeout=300.0) as client:
        resp = await client.post(f"{settings.OLLAMA_HOST}/api/generate",
            json={"model": settings.OLLAMA_MODEL, "prompt": prompt, "stream": False,
                  "options": {"temperature": 0.1, "num_predict": 3000}})
        resp.raise_for_status()
        return resp.json().get("response", "")


async def _call_openrouter(text: str) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post("https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                     "Content-Type": "application/json",
                     "HTTP-Referer": "http://localhost:3000", "X-Title": "ThreatLens AI"},
            json={"model": settings.OPENROUTER_MODEL, "temperature": 0.1, "max_tokens": 3000,
                  "messages": [{"role": "system", "content": SYSTEM_PROMPT},
                                {"role": "user", "content": USER_PROMPT.format(text=text[:12000])}]})
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"] or ""


async def extract_threat_intel(text: str) -> IntelResult:
    """Main entry: extract structured threat intel from raw text. Falls back to regex on LLM failure."""
    if not text.strip():
        return IntelResult({})
    try:
        logger.info("Calling LLM provider: %s", settings.LLM_PROVIDER)
        if settings.LLM_PROVIDER == "openai":
            raw = await _call_openai(text)
        elif settings.LLM_PROVIDER == "ollama":
            raw = await _call_ollama(text)
        elif settings.LLM_PROVIDER == "openrouter":
            raw = await _call_openrouter(text)
        else:
            return _regex_fallback(text)
        return IntelResult(_parse_json(raw), raw_response=raw)
    except Exception as exc:
        logger.error("LLM extraction failed (%s) — falling back to regex", exc)
        return _regex_fallback(text)
