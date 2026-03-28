"""services/stix_generator.py — Generate STIX 2.1 bundles from extracted intel."""
import json, logging
from typing import Any

logger = logging.getLogger(__name__)


def generate_stix_bundle(intel: dict[str, Any], mitre_techniques: list[dict]) -> dict:
    """Convert Intel dict + MITRE matches into a STIX 2.1 Bundle."""
    try:
        from stix2 import (AttackPattern, Bundle, Identity, Indicator,
                           Malware, Note, ThreatActor, Vulnerability)
    except ImportError:
        raise RuntimeError("stix2 not installed: pip install stix2")

    objects: list = []
    identity = Identity(name="ThreatLens AI", identity_class="system",
                        description="Automated threat intelligence platform")
    objects.append(identity)

    # CVEs → Vulnerability
    cves: list[str] = intel.get("cves", [])
    for cve in cves:
        if not str(cve).upper().startswith("CVE-"): continue
        try:
            objects.append(Vulnerability(name=cve.upper(), created_by_ref=identity.id,
                                         description="CVE identified in analyzed document."))
        except Exception as e:
            logger.debug("Skip CVE %s: %s", cve, e)

    # IOCs → Indicator
    iocs = intel.get("iocs", {})
    for ip in iocs.get("ips", []):
        try:
            objects.append(Indicator(name=f"IP: {ip}", pattern=f"[ipv4-addr:value = '{ip}']",
                pattern_type="stix", indicator_types=["malicious-activity"],
                valid_from="2024-01-01T00:00:00Z", created_by_ref=identity.id))
        except Exception: pass
    for url in iocs.get("urls", []):
        try:
            objects.append(Indicator(name=f"URL: {url[:60]}", pattern=f"[url:value = '{url}']",
                pattern_type="stix", indicator_types=["malicious-activity"],
                valid_from="2024-01-01T00:00:00Z", created_by_ref=identity.id))
        except Exception: pass
    for domain in iocs.get("domains", []):
        try:
            objects.append(Indicator(name=f"Domain: {domain}", pattern=f"[domain-name:value = '{domain}']",
                pattern_type="stix", indicator_types=["malicious-activity"],
                valid_from="2024-01-01T00:00:00Z", created_by_ref=identity.id))
        except Exception: pass
    hashes: list[str] = iocs.get("hashes", [])
    for h in hashes:
        ht = "MD5" if len(h) == 32 else "SHA-256"
        try:
            objects.append(Indicator(name=f"Hash ({ht}): {h[:16]}...",
                pattern=f"[file:hashes.'{ht}' = '{h}']",
                pattern_type="stix", indicator_types=["malicious-activity"],
                valid_from="2024-01-01T00:00:00Z", created_by_ref=identity.id))
        except Exception: pass

    # Malware
    for m in intel.get("malware_names", []):
        try:
            objects.append(Malware(name=m, is_family=False, created_by_ref=identity.id,
                                   description="Malware identified in the analyzed report."))
        except Exception: pass

    # Threat actors
    for a in intel.get("threat_actors", []):
        try:
            objects.append(ThreatActor(name=a, threat_actor_types=["unknown"],
                                       created_by_ref=identity.id,
                                       description="Threat actor identified in the report."))
        except Exception: pass

    # MITRE ATT&CK patterns
    for t in mitre_techniques:
        try:
            objects.append(AttackPattern(
                name=f"{t['technique_id']}: {t['name']}",
                description=f"MITRE technique matched with confidence {t['confidence_score']}.",
                created_by_ref=identity.id))
        except Exception: pass

    # Summary note
    summary = intel.get("executive_summary") or intel.get("technical_summary", "")
    if summary:
        try:
            objects.append(Note(content=summary, abstract="ThreatLens AI Summary",
                                created_by_ref=identity.id, object_refs=[identity.id]))
        except Exception: pass

    bundle = Bundle(*objects, allow_custom=True)
    return json.loads(bundle.serialize())
