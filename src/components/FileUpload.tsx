"use client";

import { useState, useRef, useCallback } from "react";
import { uploadDocument } from "@/app/actions";
import type { Threat } from "@/types";

interface FileUploadProps {
  onUploadComplete?: (threats: Threat[]) => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success?: boolean;
    count?: number;
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
          // Read PDF as ArrayBuffer and extract on server
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          // Convert to base64 for transport
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

        const response = await uploadDocument(formData);

        if (response.error) {
          setResult({ error: response.error as Record<string, string[]> });
        } else {
          setResult({ success: true, count: response.count });
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
    [onUploadComplete]
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
                Extracting text and identifying threats
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
