"use client";

import { useState, useRef, useCallback } from "react";
import { uploadDocument } from "@/app/actions";
import Link from "next/link";
import type { Threat } from "@/types";

type LLMProvider = "ollama" | "openrouter" | "regex-only";

interface FileUploadProps {
  onUploadComplete?: (threats: Threat[]) => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [provider, setProvider] = useState<LLMProvider>("regex-only");
  const [result, setResult] = useState<{
    success?: boolean;
    count?: number;
    provider?: string;
    llmUsed?: boolean;
    llmError?: string;
    error?: Record<string, string[]>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setFileName(file.name);
      setResult(null);

      // 5MB Limit Check
      if (file.size > 5 * 1024 * 1024) {
        setResult({
          error: {
            general: ["File exceeds the 5 MB limit. Please upload a smaller file."],
          },
        });
        setIsUploading(false);
        return;
      }

      try {
        let content = "";

        if (file.type === "application/pdf") {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          content = `[PDF_BASE64]${btoa(binary)}`;
        } else {
          content = await file.text();
        }

        const formData = new FormData();
        formData.set("filename", file.name);
        formData.set("content", content);
        formData.set("provider", provider);

        const response = await uploadDocument(formData);

        if (response.error) {
          setResult({ error: response.error as Record<string, string[]> });
        } else {
          setResult({
            success: true,
            count: response.count,
            provider: response.provider,
            llmUsed: response.llmUsed,
            llmError: response.llmError,
          });
          if (response.threats && onUploadComplete) {
            onUploadComplete(response.threats);
          }
        }
      } catch (err) {
        setResult({
          error: {
            general: [
              err instanceof Error ? err.message : "Upload failed",
            ],
          },
        });
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete, provider]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div className="mb-6 space-y-3">
        <label className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
          Intelligence Engine
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Ollama Local */}
          <label
            className={`relative flex flex-col p-4 rounded-md border text-left cursor-pointer transition-all ${
              provider === "ollama"
                ? "border-[var(--color-accent)] bg-[rgba(0,255,255,0.05)] shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]"
                : "border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-bg-card-hover)]"
            }`}
          >
            <input
              type="radio"
              name="provider"
              value="ollama"
              className="sr-only"
              checked={provider === "ollama"}
              onChange={(e) => setProvider(e.target.value as LLMProvider)}
            />
            <div className="flex items-center justify-between mb-2">
               <span className={`font-mono font-semibold ${provider === "ollama" ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"}`}>
                <span className="text-lg mr-2 align-middle">🖥️</span> Local Hybrid
              </span>
              {provider === "ollama" && (
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
              )}
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Regex + Local Model <br/> (qwen3.5 — Private execution)
            </p>
          </label>

          {/* OpenRouter */}
          <label
            className={`relative flex flex-col p-4 rounded-md border text-left cursor-pointer transition-all ${
              provider === "openrouter"
                ? "border-[var(--color-accent)] bg-[rgba(0,255,255,0.05)] shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]"
                : "border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-bg-card-hover)]"
            }`}
          >
            <input
              type="radio"
              name="provider"
              value="openrouter"
              className="sr-only"
              checked={provider === "openrouter"}
              onChange={(e) => setProvider(e.target.value as LLMProvider)}
            />
            <div className="flex items-center justify-between mb-2">
              <span className={`font-mono font-semibold ${provider === "openrouter" ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"}`}>
                <span className="text-lg mr-2 align-middle">☁️</span> Cloud Hybrid
              </span>
              {provider === "openrouter" && (
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
              )}
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Regex + OpenRouter <br/> (Fast, Cloud API)
            </p>
          </label>

          {/* Regex Only */}
          <label
            className={`relative flex flex-col p-4 rounded-md border text-left cursor-pointer transition-all ${
              provider === "regex-only"
                ? "border-[var(--color-text-primary)] bg-[rgba(255,255,255,0.05)]"
                : "border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-bg-card-hover)]"
            }`}
          >
            <input
              type="radio"
              name="provider"
              value="regex-only"
              className="sr-only"
              checked={provider === "regex-only"}
              onChange={(e) => setProvider(e.target.value as LLMProvider)}
            />
            <div className="flex items-center justify-between mb-2">
               <span className={`font-mono font-semibold ${provider === "regex-only" ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-primary)]"}`}>
                <span className="text-lg mr-2 align-middle">⚡</span> Heuristics
              </span>
              {provider === "regex-only" && (
                <div className="w-2 h-2 rounded-full bg-[var(--color-text-primary)]" />
              )}
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Regex pattern matching only.<br/>(Instant processing)
            </p>
          </label>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`drop-zone relative p-12 text-center cursor-pointer transition-all ${
          isDragging ? "drag-over" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload security report"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            fileInputRef.current?.click();
          }
        }}
        id="file-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.text,.log,.csv"
          onChange={handleFileChange}
          className="hidden"
          id="file-input"
          aria-label="Select file to upload"
        />

        {isUploading ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full border-4 border-[var(--color-accent)] border-t-transparent animate-spin" />
            <div>
              <p className="text-[var(--color-text-primary)] font-medium">
                Processing {fileName}...
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {provider === "regex-only"
                  ? "Running pattern-based extraction"
                  : `Analyzing with ${provider === "ollama" ? "Ollama (qwen3.5)" : "OpenRouter"}...`}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-center text-3xl">
              📄
            </div>
            <div>
              <p className="text-[var(--color-text-primary)] font-medium text-lg">
                {isDragging
                  ? "Drop your file here"
                  : "Drag & drop a security report"}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Supports PDF, TXT, LOG, CSV files
              </p>
            </div>
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Browse Files
            </button>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div
          className={`rounded-xl p-6 animate-fade-in ${
            result.success
              ? "bg-[rgba(57,255,20,0.05)] border border-[rgba(57,255,20,0.2)]"
              : "bg-[rgba(255,0,0,0.05)] border border-[rgba(255,0,0,0.2)]"
          }`}
        >
          {result.success ? (
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🟢</span>
              <div>
                <h4 className="font-semibold text-[var(--color-success)]">
                  Extraction Successful
                </h4>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  Identified <strong>{result.count}</strong> critical event
                  {result.count !== 1 ? "s" : ""} from{" "}
                  <strong>{fileName}</strong>
                </p>
                <div className="flex items-center gap-2 mt-3 text-xs text-[var(--color-text-muted)]">
                  <span className="font-mono px-2 py-0.5 rounded border border-[var(--color-border)]">
                    {result.llmUsed
                      ? `🧠 ${result.provider === "ollama" ? "Local hybrid" : "Cloud hybrid"}`
                      : "⚡ Heuristics only"}
                  </span>
                  {result.llmError && (
                    <span className="text-[var(--color-warning)] font-mono">
                      ⚠️ ENGIN_FAIL: {result.llmError}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <Link href="/dashboard" className="btn-primary text-sm inline-flex items-center gap-2">
                    <span>📊</span> View in Command Center
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🔴</span>
              <div>
                <h4 className="font-semibold text-[var(--color-danger)]">
                  Extraction Failed
                </h4>
                {result.error &&
                  Object.entries(result.error).map(([key, msgs]) => (
                    <p
                      key={key}
                      className="text-sm text-[var(--color-text-secondary)] mt-1"
                    >
                      {msgs.join(", ")}
                    </p>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
