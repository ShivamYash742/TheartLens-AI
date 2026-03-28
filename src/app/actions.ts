"use server";

import { supabase } from "@/lib/supabaseClient";
import { extractThreatsHybrid, tryParseJsonInput } from "@/lib/extractor";
import { uploadSchema, threatSchema, deleteThreatSchema, llmProviderSchema, urlInputSchema, textInputSchema } from "@/lib/validators";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import type { Threat, Document } from "@/types";
import type { LLMProvider } from "@/lib/llm-client";

// Helper: get or create profile for current Clerk user
async function getOrCreateProfile() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_id", user.id)
    .single();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("profiles")
    .upsert({
      email: user.emailAddresses[0]?.emailAddress ?? "unknown",
      clerk_id: user.id,
    }, { onConflict: "clerk_id" })
    .select()
    .single();

  if (error) throw new Error(`Failed to create profile: ${error.message}`);
  return created;
}

// Upload document and extract threats with hybrid NLP
export async function uploadDocument(formData: FormData) {
  const profile = await getOrCreateProfile();

  const filename = formData.get("filename") as string;
  const content = formData.get("content") as string;
  const providerRaw = formData.get("provider") as string || "regex-only";

  // Validate inputs
  const validated = uploadSchema.safeParse({ filename, content });
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const providerParsed = llmProviderSchema.safeParse(providerRaw);
  const provider: LLMProvider = providerParsed.success ? providerParsed.data : "regex-only";

  // Insert document
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      user_id: profile.id,
      filename: validated.data.filename,
      content: validated.data.content,
    })
    .select()
    .single();

  if (docError) {
    return { error: { general: [docError.message] } };
  }

  // Extract threats using hybrid pipeline
  const extraction = await extractThreatsHybrid(validated.data.content, provider);

  // Insert threats
  const threatsToInsert = extraction.threats.map((t) => ({
    document_id: doc.id,
    type: t.type,
    cve: t.cve,
    severity: t.severity,
    affected_system: t.affected_system,
  }));

  const { data: insertedThreats, error: threatError } = await supabase
    .from("threats")
    .insert(threatsToInsert)
    .select();

  if (threatError) {
    return { error: { general: [threatError.message] } };
  }

  revalidatePath("/dashboard");

  return {
    success: true,
    document: doc as Document,
    threats: insertedThreats as Threat[],
    count: insertedThreats?.length ?? 0,
    provider: extraction.provider,
    llmUsed: extraction.llmUsed,
    llmError: extraction.llmError,
  };
}

// Fetch all threats for current user
export async function fetchThreats() {
  const profile = await getOrCreateProfile();

  // Get user's documents
  const { data: documents } = await supabase
    .from("documents")
    .select("id")
    .eq("user_id", profile.id);

  if (!documents || documents.length === 0) {
    return { threats: [], documents: [] };
  }

  const docIds = documents.map((d: { id: string }) => d.id);

  // Get threats for those documents
  const { data: threats, error } = await supabase
    .from("threats")
    .select("*")
    .in("document_id", docIds)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  // Get full documents
  const { data: fullDocs } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  return {
    threats: (threats ?? []) as Threat[],
    documents: (fullDocs ?? []) as Document[],
  };
}

// Fetch single threat by ID
export async function fetchThreatById(id: string) {
  const { data: threat, error } = await supabase
    .from("threats")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { error: error.message };

  // Get associated document
  const { data: document } = await supabase
    .from("documents")
    .select("*")
    .eq("id", threat.document_id)
    .single();

  return {
    threat: threat as Threat,
    document: document as Document | null,
  };
}

// Delete a threat
export async function deleteThreat(formData: FormData) {
  await getOrCreateProfile();

  const id = formData.get("id") as string;
  const validated = deleteThreatSchema.safeParse({ id });

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("threats")
    .delete()
    .eq("id", validated.data.id);

  if (error) {
    return { error: { general: [error.message] } };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// Create a manual threat
export async function createThreat(formData: FormData) {
  await getOrCreateProfile();

  const document_id = formData.get("document_id") as string;
  const type = formData.get("type") as string;
  const cve = formData.get("cve") as string;
  const severity = formData.get("severity") as string;
  const affected_system = formData.get("affected_system") as string;

  const validated = threatSchema.safeParse({
    document_id,
    type,
    cve,
    severity,
    affected_system,
  });

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const { data, error } = await supabase
    .from("threats")
    .insert(validated.data)
    .select()
    .single();

  if (error) {
    return { error: { general: [error.message] } };
  }

  revalidatePath("/dashboard");
  return { success: true, threat: data as Threat };
}

// Upload from raw pasted text
export async function uploadFromText(text: string, providerRaw: string = "regex-only") {
  const profile = await getOrCreateProfile();

  // Validate text input
  const validated = textInputSchema.safeParse({ text });
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const providerParsed = llmProviderSchema.safeParse(providerRaw);
  const provider: LLMProvider = providerParsed.success ? providerParsed.data : "regex-only";

  // Check if input is structured JSON
  const jsonThreats = tryParseJsonInput(validated.data.text);

  // Insert document
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      user_id: profile.id,
      filename: jsonThreats ? "pasted-json-data.json" : "pasted-text-input.txt",
      content: validated.data.text,
    })
    .select()
    .single();

  if (docError) {
    return { error: { general: [docError.message] } };
  }

  // If JSON was parsed directly, use those threats; otherwise run hybrid extraction
  let finalThreats: { type: string; cve: string; severity: string; affected_system: string }[];
  let llmUsed = false;
  let llmError: string | undefined;
  let usedProvider = provider;

  if (jsonThreats && jsonThreats.length > 0) {
    finalThreats = jsonThreats;
    usedProvider = "regex-only";
  } else {
    const extraction = await extractThreatsHybrid(validated.data.text, provider);
    finalThreats = extraction.threats;
    llmUsed = extraction.llmUsed;
    llmError = extraction.llmError;
    usedProvider = extraction.provider;
  }

  // Insert threats
  const threatsToInsert = finalThreats.map((t) => ({
    document_id: doc.id,
    type: t.type,
    cve: t.cve,
    severity: t.severity,
    affected_system: t.affected_system,
  }));

  const { data: insertedThreats, error: threatError } = await supabase
    .from("threats")
    .insert(threatsToInsert)
    .select();

  if (threatError) {
    return { error: { general: [threatError.message] } };
  }

  revalidatePath("/dashboard");

  return {
    success: true,
    document: doc as Document,
    threats: insertedThreats as Threat[],
    count: insertedThreats?.length ?? 0,
    provider: usedProvider,
    llmUsed,
    llmError,
    jsonDetected: !!jsonThreats,
  };
}

// Upload from URL — fetch page content server-side
export async function uploadFromUrl(url: string, providerRaw: string = "regex-only") {
  const profile = await getOrCreateProfile();

  // Validate URL
  const validated = urlInputSchema.safeParse({ url });
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const providerParsed = llmProviderSchema.safeParse(providerRaw);
  const provider: LLMProvider = providerParsed.success ? providerParsed.data : "regex-only";

  // Fetch the URL content
  let pageContent: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(validated.data.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ThreatLens-AI/1.0 (Security Report Fetcher)",
        Accept: "text/html,application/json,text/plain,*/*",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        error: { url: [`Failed to fetch URL: HTTP ${response.status} ${response.statusText}`] },
      };
    }

    const rawContent = await response.text();

    // Strip HTML tags to get plain text
    pageContent = rawContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")   // Remove styles
      .replace(/<[^>]+>/g, " ")                           // Remove HTML tags
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s{2,}/g, " ")                            // Collapse whitespace
      .trim();

    if (!pageContent || pageContent.length < 10) {
      return {
        error: { url: ["The URL returned no meaningful text content."] },
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {
      error: { url: [`Failed to fetch URL: ${msg}`] },
    };
  }

  // Insert document
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      user_id: profile.id,
      filename: `url-${new URL(validated.data.url).hostname}.txt`,
      content: pageContent.substring(0, 500000), // Cap at 500K chars
    })
    .select()
    .single();

  if (docError) {
    return { error: { general: [docError.message] } };
  }

  // Extract threats
  const extraction = await extractThreatsHybrid(pageContent, provider);

  // Insert threats
  const threatsToInsert = extraction.threats.map((t) => ({
    document_id: doc.id,
    type: t.type,
    cve: t.cve,
    severity: t.severity,
    affected_system: t.affected_system,
  }));

  const { data: insertedThreats, error: threatError } = await supabase
    .from("threats")
    .insert(threatsToInsert)
    .select();

  if (threatError) {
    return { error: { general: [threatError.message] } };
  }

  revalidatePath("/dashboard");

  return {
    success: true,
    document: doc as Document,
    threats: insertedThreats as Threat[],
    count: insertedThreats?.length ?? 0,
    provider: extraction.provider,
    llmUsed: extraction.llmUsed,
    llmError: extraction.llmError,
    sourceUrl: validated.data.url,
  };
}
