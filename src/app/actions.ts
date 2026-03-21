"use server";

import { supabase } from "@/lib/supabaseClient";
import { extractThreatsFromText } from "@/lib/extractor";
import { uploadSchema, threatSchema, deleteThreatSchema } from "@/lib/validators";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import type { Threat, Document } from "@/types";

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
    .insert({
      email: user.emailAddresses[0]?.emailAddress ?? "unknown",
      clerk_id: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create profile: ${error.message}`);
  return created;
}

// Upload document and extract threats
export async function uploadDocument(formData: FormData) {
  const profile = await getOrCreateProfile();

  const filename = formData.get("filename") as string;
  const content = formData.get("content") as string;

  // Validate input
  const validated = uploadSchema.safeParse({ filename, content });
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

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

  // Extract threats
  const extractedThreats = extractThreatsFromText(validated.data.content);

  // Insert threats
  const threatsToInsert = extractedThreats.map((t) => ({
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
