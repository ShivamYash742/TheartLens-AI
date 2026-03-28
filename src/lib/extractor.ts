import type { ExtractedThreat } from "@/types";
import { callLLM, type LLMProvider } from "@/lib/llm-client";
import { extractedThreatSchema } from "@/lib/validators";

// ─── Layer 1: Regex Patterns ────────────────────────────────────────────────

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

// ─── Pre-processing ─────────────────────────────────────────────────────────

function cleanText(raw: string): string {
  return raw
    .replace(/[^\x20-\x7E\n\r\t]/g, " ") // Remove non-ASCII
    .replace(/\s{3,}/g, "  ")              // Collapse excessive whitespace
    .replace(/\n{3,}/g, "\n\n")            // Collapse excessive newlines
    .trim();
}

// ─── JSON Input Parser ──────────────────────────────────────────────────────

/**
 * Attempts to parse input as structured JSON containing threat data.
 * Supports: JSON array of threat objects, or an object with a threats/data/items array.
 * Returns extracted threats if successful, null if input is not valid JSON.
 */
export function tryParseJsonInput(text: string): ExtractedThreat[] | null {
  try {
    const trimmed = text.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;

    const parsed = JSON.parse(trimmed);

    // Direct array of threats
    let items: unknown[] = [];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (typeof parsed === "object" && parsed !== null) {
      // Look for common wrapper keys
      const arrayKey = ["threats", "data", "items", "results", "vulnerabilities", "findings"].find(
        (k) => Array.isArray(parsed[k])
      );
      if (arrayKey) {
        items = parsed[arrayKey];
      } else {
        // Single threat object
        items = [parsed];
      }
    }

    if (items.length === 0) return null;

    const threats: ExtractedThreat[] = [];
    for (const item of items) {
      if (typeof item !== "object" || item === null) continue;
      const obj = item as Record<string, unknown>;

      // Map common field name variations
      const type =
        (obj.type as string) ||
        (obj.threat_type as string) ||
        (obj.category as string) ||
        (obj.name as string) ||
        "General Threat";
      const cve =
        (obj.cve as string) ||
        (obj.cve_id as string) ||
        (obj.vulnerability_id as string) ||
        "N/A";
      const severity =
        (obj.severity as string) ||
        (obj.risk as string) ||
        (obj.level as string) ||
        "Medium";
      const affected_system =
        (obj.affected_system as string) ||
        (obj.system as string) ||
        (obj.target as string) ||
        (obj.asset as string) ||
        "Unknown";

      threats.push({ type, cve, severity, affected_system });
    }

    return threats.length > 0 ? threats : null;
  } catch {
    return null;
  }
}

// ─── Layer 1: Regex-only extraction ─────────────────────────────────────────

export function extractThreatsRegex(text: string): ExtractedThreat[] {
  const cleaned = cleanText(text);
  const threats: ExtractedThreat[] = [];
  const cves = extractCVEs(cleaned);
  const threatTypes = detectThreatTypes(cleaned);
  const severity = detectSeverity(cleaned);
  const systems = detectSystems(cleaned);

  // CVE-based threats
  for (const cve of cves) {
    threats.push({
      type: threatTypes[0],
      cve,
      severity,
      affected_system: systems[0],
    });
  }

  // Type-based threats
  for (const type of threatTypes) {
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

// ─── Layer 2: LLM-based extraction ──────────────────────────────────────────

function parseLLMResponse(raw: string): ExtractedThreat[] {
  try {
    // Extract JSON array from response (handle markdown code blocks)
    let jsonStr = raw.trim();

    // Strip markdown code fences
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");

    // Strip any thinking tags (qwen3 sometimes outputs these)
    jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    // Find the JSON array
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (!arrayMatch) return [];

    const parsed = JSON.parse(arrayMatch[0]);
    if (!Array.isArray(parsed)) return [];

    // Validate each item with Zod
    const validated: ExtractedThreat[] = [];
    for (const item of parsed) {
      const result = extractedThreatSchema.safeParse(item);
      if (result.success) {
        validated.push(result.data);
      }
    }
    return validated;
  } catch {
    return [];
  }
}

// ─── Layer 3: De-duplication & Consolidation ────────────────────────────────

function deduplicateThreats(threats: ExtractedThreat[]): ExtractedThreat[] {
  const seen = new Set<string>();
  const unique: ExtractedThreat[] = [];

  for (const threat of threats) {
    // De-duplicate by type+cve combination
    const key = `${threat.type}::${threat.cve}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(threat);
    }
  }
  return unique;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Sync regex-only extraction (backward compatible) */
export function extractThreatsFromText(text: string): ExtractedThreat[] {
  return extractThreatsRegex(text);
}

/** Async hybrid extraction: Regex + LLM → Validate → De-duplicate */
export async function extractThreatsHybrid(
  text: string,
  provider: LLMProvider = "regex-only"
): Promise<{
  threats: ExtractedThreat[];
  provider: LLMProvider;
  llmUsed: boolean;
  llmError?: string;
}> {
  const cleaned = cleanText(text);

  // Layer 1: Always run regex
  const regexThreats = extractThreatsRegex(cleaned);

  // If regex-only mode, return immediately
  if (provider === "regex-only") {
    return { threats: regexThreats, provider, llmUsed: false };
  }

  // Layer 2: Call LLM
  const llmResponse = await callLLM(provider, cleaned);

  if (llmResponse.error || !llmResponse.text) {
    // Fallback to regex-only results
    return {
      threats: regexThreats,
      provider,
      llmUsed: false,
      llmError: llmResponse.error || "Empty LLM response",
    };
  }

  // Parse and validate LLM output
  const llmThreats = parseLLMResponse(llmResponse.text);

  // Layer 3: Merge + de-duplicate (LLM results first, they're usually better)
  const merged = deduplicateThreats([...llmThreats, ...regexThreats]);

  return {
    threats: merged,
    provider,
    llmUsed: true,
  };
}
