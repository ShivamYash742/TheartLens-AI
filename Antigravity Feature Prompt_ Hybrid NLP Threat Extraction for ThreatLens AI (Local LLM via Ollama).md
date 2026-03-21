# Antigravity Feature Prompt: Hybrid NLP Threat Extraction for ThreatLens AI (Local LLM via Ollama)

## Project Context

Assume the core ThreatLens AI application, including user authentication, document upload (with `pdf-parse` for text extraction), basic threat management (CRUD), and the dashboard UI, is already built using Next.js (App Router, TypeScript), Supabase (Auth, Postgres), and Tailwind CSS. The existing database schema for `profiles`, `documents`, and `threats` is in place. The goal of this task is to integrate a robust, hybrid NLP-based threat extraction mechanism into the existing `uploadDocument()` and `extractThreats()` server actions, specifically utilizing **local Large Language Models (LLMs) via Ollama** (e.g., DeepSeek, Qwen 2.5B).

## Feature: Hybrid NLP Threat Extraction with Local LLMs

This feature will enhance the document processing pipeline by automatically extracting structured security threats (Type, CVE, Severity, Affected System) from uploaded PDF/text content using a combination of regular expressions and local LLMs served by Ollama.

### 1. Extraction Layers & Logic

Implement a multi-layered extraction process within the `extractor.ts` utility:

| Layer | Technique | Best For | Implementation Details |
| :--- | :--- | :--- | :--- |
| **Layer 1: Deterministic** | Regex | CVE IDs, IP addresses, URLs, Severity keywords (High/Critical, Medium, Low, Informational). | Apply regex patterns first for high-speed, 100% accurate identification of fixed patterns. |
| **Layer 2: Semantic** | Local LLM (Ollama) | Summarization, Affected Systems, Contextual Severity, Relationship mapping, general threat types. | For content not captured by regex, send cleaned text to a local LLM via Ollama for deeper semantic understanding and extraction. |
| **Layer 3: Validation** | Zod / JSON Schema | Ensuring output consistency for database insertion. | Validate all extracted data (from both regex and LLM) against a predefined Zod schema before storage. |

### 2. Recommended Tools & Libraries

*   **Existing:** `pdf-parse` (for initial text extraction), `zod` (for validation).
*   **New/Enhanced:**
    *   **Ollama Client (e.g., `ollama-js` or direct `fetch` to Ollama API):** Integrate a client to interact with the local Ollama server. This will be used for LLM calls to models like DeepSeek or Qwen 2.5B.
    *   **`wink-nlp` (Optional):** Can be used for lightweight pre-processing tasks like tokenization or custom entity recognition if more advanced local NLP is desired before LLM calls, but prioritize direct LLM calls for semantic extraction.

### 3. Implementation Workflow

Modify the existing document processing flow (likely within `uploadDocument()` and `extractThreats()` server actions, utilizing `extractor.ts`):

1.  **Text Extraction:** (Already exists) Use `pdf-parse` to get raw text from the uploaded PDF/text file.
2.  **Pre-processing:** Implement text cleaning within `extractor.ts` (remove excessive whitespace, non-ASCII characters, normalize text).
3.  **Heuristic Pass (Regex):**
    *   Define and apply regex patterns for:
        *   **CVE ID:** `/\bCVE-\d{4}-\d{4,7}\b/g`
        *   **Severity:** `/\b(Critical|High|Medium|Low|Informational)\b/gi`
    *   Extract all matches and store them temporarily.
4.  **AI Pass (Local LLM via Ollama):**
    *   Send the pre-processed text (or relevant segments) to the local Ollama server.
    *   Ensure the Ollama request specifies a model (e.g., `deepseek-coder:latest`, `qwen:2.5b`) and includes a system prompt for structured JSON output:
        ```
        "Extract all security threats from the following text. For each threat, identify the type, CVE ID (if any), severity, and the affected system. Return the result strictly as a JSON array of objects, where each object has 'type', 'cve', 'severity', and 'affected_system' fields. If a field is not found, use null. Prioritize information from the text provided."
        ```
    *   Consider using "Few-Shot Prompting" by providing 2-3 examples of input text and corresponding desired JSON output within the prompt to guide the local LLM, especially for smaller models.
5.  **Consolidation & Validation:**
    *   Combine results from both regex and LLM passes, de-duplicating as necessary.
    *   Parse the LLM's JSON response.
    *   Use `zod` to validate the combined and parsed threat objects against a schema matching the `threats` table structure.
6.  **Storage:** Save the validated threat objects into the `threats` table in Supabase.

### 4. Updates to Existing Files

*   **`/lib/extractor.ts`:** Implement the pre-processing, regex extraction, Ollama integration, and consolidation logic.
*   **`/lib/validators.ts`:** Define the Zod schema for a `Threat` object, ensuring it matches the `threats` table structure.
*   **`/app/upload/page.tsx` (or relevant upload component):** Update to trigger the enhanced `extractThreats()` server action.
*   **`/app/dashboard/page.tsx` (or relevant dashboard component):** Ensure it can display the newly extracted and stored threat data.
*   **Server Actions (`uploadDocument()`, `extractThreats()`):** Modify to orchestrate the new extraction workflow.

### 5. Environment Variables

Ensure the following environment variable is configured for the Ollama host:

```
OLLAMA_HOST=http://localhost:11434
```

## Deliverables

*   Modified `extractor.ts` with hybrid NLP logic, including Ollama integration.
*   Updated `validators.ts` with `Threat` schema.
*   Adjusted server actions and UI components to integrate the new extraction pipeline.
*   A fully functional threat extraction feature that populates the Supabase `threats` table with structured data from uploaded documents, utilizing local LLMs via Ollama.

This prompt provides a focused set of instructions for integrating the advanced NLP threat extraction feature into the existing ThreatLens AI project, specifically tailored for local LLMs via Ollama. Antigravity should prioritize a robust and reliable implementation of this specific functionality.
