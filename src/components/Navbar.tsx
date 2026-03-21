"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/upload", label: "Upload", icon: "📤" },
  ];

  return (
    <nav className="glass-strong sticky top-0 z-50" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group"
            id="nav-logo"
          >
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform">
              TL
            </div>
            <span className="text-lg font-bold gradient-text hidden sm:block">
              ThreatLens AI
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {isSignedIn &&
              navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    id={`nav-${link.label.toLowerCase()}`}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${
                        isActive
                          ? "bg-[var(--color-accent)] bg-opacity-15 text-[var(--color-accent-hover)] shadow-[0_0_15px_var(--color-accent-glow)]"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]"
                      }
                    `}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="hidden sm:inline">{link.icon}</span>
                    {link.label}
                  </Link>
                );
              })}
          </div>

          {/* Auth */}
          <div className="flex items-center gap-3">
            {!isSignedIn ? (
              <Link
                href="/login"
                className="btn-secondary text-sm"
                id="nav-login"
              >
                Sign In
              </Link>
            ) : (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9 ring-2 ring-[var(--color-accent)] ring-opacity-50",
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
