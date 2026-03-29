import { z } from "zod";

export const uploadSchema = z.object({
  filename: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename too long"),
  content: z.string().min(1, "File content cannot be empty"),
});

export const threatSchema = z.object({
  document_id: z.string().uuid("Invalid document ID"),
  type: z.string().min(1, "Threat type is required"),
  cve: z.string().default("N/A"),
  severity: z.enum(["Critical", "High", "Medium", "Low", "Info"]),
  affected_system: z.string().default("Unknown"),
});

export const deleteThreatSchema = z.object({
  id: z.string().uuid("Invalid threat ID"),
});

/** Schema for validating individual threats from LLM JSON output */
export const extractedThreatSchema = z.object({
  type: z.string().min(1).default("General Threat"),
  cve: z.string().default("N/A"),
  severity: z
    .string()
    .transform((s) => {
      // Normalize common variations
      const lower = s.toLowerCase();
      if (lower.includes("critical")) return "Critical";
      if (lower.includes("high")) return "High";
      if (lower.includes("medium") || lower.includes("moderate")) return "Medium";
      if (lower.includes("low") || lower.includes("minor")) return "Low";
      if (lower.includes("info")) return "Info";
      return "Medium";
    })
    .pipe(z.enum(["Critical", "High", "Medium", "Low", "Info"])),
  affected_system: z.string().default("Unknown"),
});

/** Schema for LLM provider selection */
export const llmProviderSchema = z.enum(["ollama", "openrouter", "regex-only", "alactic"]);

/** Schema for URL input */
export const urlInputSchema = z.object({
  url: z
    .string()
    .url("Please enter a valid URL")
    .refine(
      (url) => url.startsWith("http://") || url.startsWith("https://"),
      "URL must start with http:// or https://"
    ),
});

/** Schema for raw text input */
export const textInputSchema = z.object({
  text: z
    .string()
    .min(10, "Text must be at least 10 characters")
    .max(500000, "Text exceeds 500K character limit"),
});

export type UploadInput = z.infer<typeof uploadSchema>;
export type ThreatInput = z.infer<typeof threatSchema>;
export type LLMProviderType = z.infer<typeof llmProviderSchema>;
