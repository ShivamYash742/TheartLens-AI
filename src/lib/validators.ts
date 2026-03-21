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

export type UploadInput = z.infer<typeof uploadSchema>;
export type ThreatInput = z.infer<typeof threatSchema>;
