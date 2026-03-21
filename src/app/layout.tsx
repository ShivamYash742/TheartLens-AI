import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ThreatLens AI — Security Threat Intelligence",
  description:
    "Convert unstructured security reports into structured, actionable threat intelligence. Upload PDFs and text files to automatically extract CVEs, severity levels, and affected systems.",
  keywords: [
    "threat intelligence",
    "security",
    "CVE",
    "vulnerability",
    "cybersecurity",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
