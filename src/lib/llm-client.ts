/**
 * LLM Client — Unified interface for Ollama (local) and OpenRouter (cloud) providers.
 * Used by the hybrid threat extractor for semantic analysis.
 */

export type LLMProvider = "ollama" | "openrouter" | "regex-only";

interface LLMResponse {
  text: string;
  provider: LLMProvider;
  error?: string;
}

const THREAT_EXTRACTION_PROMPT = `You are a cybersecurity threat intelligence analyst. Extract all security threats from the following text.

For each threat found, return a JSON object with these fields:
- "type": The threat category (e.g., Malware, Phishing, Ransomware, DDoS, SQL Injection, XSS, Zero-Day, Buffer Overflow, Privilege Escalation, Brute Force, Man-in-the-Middle, Data Breach, Remote Code Execution, Insider Threat)
- "cve": The CVE ID if mentioned (e.g., "CVE-2024-1234"), otherwise "N/A"
- "severity": One of "Critical", "High", "Medium", "Low", or "Info"
- "affected_system": The system, software, or infrastructure affected (e.g., "Apache Web Server", "Windows Server 2019", "MySQL Database")

Return ONLY a valid JSON array. No markdown, no explanation, no extra text.

Example input: "A critical remote code execution vulnerability CVE-2024-3400 was found in Palo Alto Networks PAN-OS GlobalProtect."
Example output: [{"type":"Remote Code Execution","cve":"CVE-2024-3400","severity":"Critical","affected_system":"Palo Alto Networks PAN-OS GlobalProtect"}]

Example input: "Multiple phishing campaigns targeting Office 365 users with low severity credential harvesting attempts."
Example output: [{"type":"Phishing","cve":"N/A","severity":"Low","affected_system":"Office 365"}]

Now extract threats from this text:
`;

/**
 * Call Ollama local LLM
 */
async function callOllama(text: string): Promise<LLMResponse> {
  const host = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL || "lfm2.5-thinking:latest";

  try {
    const controller = new AbortController();
    // 5-minute timeout for slower local hardware
    const timeout = setTimeout(() => controller.abort(), 300000); 

    const response = await fetch(`${host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: THREAT_EXTRACTION_PROMPT + text.substring(0, 4000),
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 2048,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      return {
        text: "",
        provider: "ollama",
        error: `Ollama error ${response.status}: ${errText}`,
      };
    }

    const data = await response.json();
    return { text: data.response || "", provider: "ollama" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { text: "", provider: "ollama", error: `Ollama failed: ${message}` };
  }
}

/**
 * Call OpenRouter API
 */
async function callOpenRouter(text: string): Promise<LLMResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model =
    process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free"; // Default fast model

  if (!apiKey) {
    return {
      text: "",
      provider: "openrouter",
      error: "OPENROUTER_API_KEY not configured",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000); // 30s timeout

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000", // Required by OpenRouter
          "X-Title": "ThreatLens AI", // Required by OpenRouter
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: THREAT_EXTRACTION_PROMPT },
            { role: "user", content: text.substring(0, 8000) },
          ],
          temperature: 0.1,
          max_tokens: 2048,
          response_format: { type: "json_object" }, // if supported by model
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      return {
        text: "",
        provider: "openrouter",
        error: `OpenRouter error ${response.status}: ${errText}`,
      };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";
    return { text: content, provider: "openrouter" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      text: "",
      provider: "openrouter",
      error: `OpenRouter failed: ${message}`,
    };
  }
}

/**
 * Unified LLM call dispatcher
 */
export async function callLLM(
  provider: LLMProvider,
  text: string,
): Promise<LLMResponse> {
  switch (provider) {
    case "ollama":
      return callOllama(text);
    case "openrouter":
      return callOpenRouter(text);
    case "regex-only":
      return { text: "", provider: "regex-only" };
    default:
      return { text: "", provider: "regex-only", error: "Unknown provider" };
  }
}

/**
 * Check if a provider is available
 */
export async function checkProviderStatus(
  provider: LLMProvider,
): Promise<{ available: boolean; model?: string; error?: string }> {
  if (provider === "regex-only") {
    return { available: true };
  }

  if (provider === "ollama") {
    try {
      const host = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
      const res = await fetch(`${host}/api/tags`, {
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok)
        return { available: false, error: "Ollama server not responding" };
      const data = await res.json();
      const models = data?.models?.map((m: { name: string }) => m.name) || [];
      return { available: true, model: models[0] || "unknown" };
    } catch {
      return { available: false, error: "Cannot connect to Ollama" };
    }
  }

  if (provider === "openrouter") {
    return {
      available: !!process.env.OPENROUTER_API_KEY,
      error: process.env.OPENROUTER_API_KEY
        ? undefined
        : "OPENROUTER_API_KEY not set",
    };
  }

  return { available: false, error: "Unknown provider" };
}
