import type { ExtractedThreat } from "@/types";

const CVE_REGEX = /CVE-\d{4}-\d{4,}/gi;

const THREAT_TYPES: Record<string, RegExp> = {
  Malware: /malware|trojan|worm|virus|spyware|adware|rootkit/gi,
  Phishing: /phishing|spear[\s-]?phishing|social[\s-]?engineering/gi,
  Ransomware: /ransomware|crypto[\s-]?locker|encrypt/gi,
  "SQL Injection": /sql[\s-]?injection|sqli/gi,
  XSS: /cross[\s-]?site[\s-]?scripting|xss/gi,
  DDoS: /ddos|denial[\s-]?of[\s-]?service|distributed[\s-]?denial/gi,
  "Zero-Day": /zero[\s-]?day|0[\s-]?day/gi,
  "Buffer Overflow": /buffer[\s-]?overflow/gi,
  "Privilege Escalation":
    /privilege[\s-]?escalation|priv[\s-]?esc|elevation[\s-]?of[\s-]?privilege/gi,
  "Brute Force": /brute[\s-]?force|credential[\s-]?stuffing/gi,
  "Man-in-the-Middle": /man[\s-]?in[\s-]?the[\s-]?middle|mitm/gi,
  "Data Breach": /data[\s-]?breach|data[\s-]?leak|data[\s-]?exposure/gi,
  "Insider Threat": /insider[\s-]?threat/gi,
  "Remote Code Execution": /remote[\s-]?code[\s-]?execution|rce/gi,
};

const SEVERITY_KEYWORDS: Record<string, RegExp> = {
  Critical: /critical|catastrophic|emergency/gi,
  High: /high|severe|major|important/gi,
  Medium: /medium|moderate|significant/gi,
  Low: /low|minor|minimal|informational/gi,
};

const SYSTEM_PATTERNS: Record<string, RegExp> = {
  "Web Server": /apache|nginx|iis|web[\s-]?server|httpd/gi,
  Database: /mysql|postgresql|mongodb|oracle[\s-]?db|sql[\s-]?server|redis/gi,
  "Operating System":
    /windows[\s-]?server|linux|ubuntu|centos|debian|macos|freebsd/gi,
  Firewall: /firewall|iptables|pf[\s-]?sense|fortinet|palo[\s-]?alto/gi,
  "Email Server":
    /exchange|sendmail|postfix|email[\s-]?server|smtp[\s-]?server/gi,
  Network: /router|switch|vpn|load[\s-]?balancer|dns[\s-]?server/gi,
  "Cloud Infrastructure": /aws|azure|gcp|cloud|s3[\s-]?bucket|ec2/gi,
  "API Gateway": /api[\s-]?gateway|rest[\s-]?api|graphql/gi,
  "Authentication System": /ldap|active[\s-]?directory|oauth|sso|auth/gi,
};

function detectSeverity(text: string): string {
  for (const [level, regex] of Object.entries(SEVERITY_KEYWORDS)) {
    if (regex.test(text)) {
      // Reset regex lastIndex
      regex.lastIndex = 0;
      return level;
    }
  }
  return "Medium";
}

function detectThreatTypes(text: string): string[] {
  const found: string[] = [];
  for (const [type, regex] of Object.entries(THREAT_TYPES)) {
    if (regex.test(text)) {
      found.push(type);
      regex.lastIndex = 0;
    }
  }
  return found.length > 0 ? found : ["General Threat"];
}

function detectSystems(text: string): string[] {
  const found: string[] = [];
  for (const [system, regex] of Object.entries(SYSTEM_PATTERNS)) {
    if (regex.test(text)) {
      found.push(system);
      regex.lastIndex = 0;
    }
  }
  return found.length > 0 ? found : ["Unknown"];
}

function extractCVEs(text: string): string[] {
  const matches = text.match(CVE_REGEX);
  return matches ? [...new Set(matches.map((m) => m.toUpperCase()))] : [];
}

/**
 * Extract threats from raw text content.
 * Uses regex-based NLP simulation to identify threat types, CVEs,
 * severity levels, and affected systems.
 */
export function extractThreatsFromText(text: string): ExtractedThreat[] {
  const threats: ExtractedThreat[] = [];
  const cves = extractCVEs(text);
  const threatTypes = detectThreatTypes(text);
  const severity = detectSeverity(text);
  const systems = detectSystems(text);

  // If we found CVEs, create a threat for each
  if (cves.length > 0) {
    for (const cve of cves) {
      threats.push({
        type: threatTypes[0],
        cve,
        severity,
        affected_system: systems[0],
      });
    }
  }

  // Create threats for each detected threat type
  for (const type of threatTypes) {
    // Avoid duplicating if we already have a CVE-based entry with this type
    const alreadyExists = threats.some((t) => t.type === type);
    if (!alreadyExists) {
      threats.push({
        type,
        cve: "N/A",
        severity,
        affected_system: systems[0],
      });
    }
  }

  // If nothing was detected, create a single generic entry
  if (threats.length === 0) {
    threats.push({
      type: "Unclassified",
      cve: "N/A",
      severity: "Info",
      affected_system: "Unknown",
    });
  }

  return threats;
}
