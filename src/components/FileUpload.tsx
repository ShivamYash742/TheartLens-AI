"use client";

import { useState, useRef, useCallback } from "react";
import { uploadDocument } from "@/app/actions";
import type { Threat } from "@/types";

type LLMProvider = "ollama" | "openrouter" | "regex-only";

interface FileUploadProps {
  onUploadComplete?: (threats: Threat[]) => void;
}

const PROVIDERS: {
  id: LLMProvider;
  label: string;
  icon: string;
  desc: string;
}[] = [
  {
    id: "ollama",
    label: "Ollama (Local)",
    icon: "🦙",
    desc: "qwen3.5 — Private, no data leaves your machine",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    icon: "🌐",
    desc: "Cloud APIs — Access 100+ models",
  },
  {
    id: "regex-only",
    label: "Regex Only",
    icon: "⚡",
    desc: "Pattern matching — Instant, no AI required",
  },
];

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
      const file = e.dataTransfer.files[0];
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
      {/* AI Provider Selector */}
      <div>
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-3 block">
          🤖 AI Extraction Engine
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvider(p.id)}
              className={`
                relative text-left p-4 rounded-xl border transition-all duration-200
                ${
                  provider === p.id
                    ? "border-[var(--color-accent)] bg-[rgba(99,102,241,0.1)] shadow-[0_0_15px_var(--color-accent-glow)]"
                    : "border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-text-muted)]"
                }
              `}
              id={`provider-${p.id}`}
            >
              {provider === p.id && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
              )}
              <div className="text-xl mb-1">{p.icon}</div>
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                {p.label}
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {p.desc}
              </div>
            </button>
          ))}
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
            <div className="w-16 h-16 mx-auto rounded-2xl gradient-bg bg-opacity-15 flex items-center justify-center text-3xl">
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
              className="btn-secondary text-sm"
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
              ? "bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)]"
              : "bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]"
          }`}
        >
          {result.success ? (
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h4 className="font-semibold text-[var(--color-success)]">
                  Upload Successful!
                </h4>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  Extracted <strong>{result.count}</strong> threat
                  {result.count !== 1 ? "s" : ""} from{" "}
                  <strong>{fileName}</strong>
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-[var(--color-text-muted)]">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                    {result.llmUsed
                      ? `🤖 ${result.provider === "ollama" ? "Ollama" : "OpenRouter"} AI`
                      : "⚡ Regex"}
                  </span>
                  {result.llmError && (
                    <span className="text-[var(--color-warning)]">
                      ⚠️ LLM fallback: {result.llmError}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <span className="text-2xl">❌</span>
              <div>
                <h4 className="font-semibold text-[var(--color-danger)]">
                  Upload Failed
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
