"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";

export default function Navbar() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <nav className="sticky top-0 z-50 w-full glass border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded bg-[var(--color-bg-card)] flex items-center justify-center border border-[var(--color-border)] group-hover:border-[var(--color-accent)] transition-colors">
                <span className="text-[var(--color-accent)] text-lg">🛡️</span>
              </div>
              <span className="font-bold text-lg tracking-wide uppercase text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                ThreatLens
                <span className="text-[var(--color-text-muted)] font-mono text-sm ml-1">AI</span>
              </span>
            </Link>

            {isLoaded && isSignedIn && (
              <div className="hidden sm:flex space-x-1">
                <Link
                  href="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === "/dashboard"
                      ? "bg-[rgba(0,255,255,0.1)] text-[var(--color-accent)] border border-[rgba(0,255,255,0.2)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  Command Center
                </Link>
                <Link
                  href="/upload"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === "/upload"
                      ? "bg-[rgba(0,255,255,0.1)] text-[var(--color-accent)] border border-[rgba(0,255,255,0.2)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  Intel Upload
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isLoaded && isSignedIn && (
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8 rounded border border-[var(--color-border)]",
                  },
                }}
              />
            )}
            
            {isLoaded && !isSignedIn && (
              <div className="flex items-center gap-3">
                <SignInButton mode="modal">
                  <button className="text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-2">
                    System Login
                  </button>
                </SignInButton>
                <Link href="/sign-up" className="btn-primary text-sm shrink-0">
                  Initialize Access
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
