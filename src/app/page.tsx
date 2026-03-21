import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 relative overflow-hidden">
        {/* Background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-[var(--color-accent)] rounded-full opacity-[0.03] blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-purple-600 rounded-full opacity-[0.03] blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500 rounded-full opacity-[0.02] blur-3xl" />
        </div>

        {/* Hero Section */}
        <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8 text-sm text-[var(--color-text-secondary)]">
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
              AI-Powered Threat Intelligence
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="text-[var(--color-text-primary)]">Turn Security Reports</span>
              <br />
              <span className="gradient-text">Into Actionable Insights</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
              Upload PDFs and text files to automatically extract CVEs, severity levels,
              threat types, and affected systems — in seconds.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="btn-primary text-lg px-8 py-3 glow-accent"
                id="hero-cta"
              >
                Get Started Free →
              </Link>
              <Link
                href="/dashboard"
                className="btn-secondary text-lg px-8 py-3"
                id="hero-dashboard"
              >
                View Dashboard
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 stagger-children">
            {[
              {
                icon: "📄",
                title: "Upload & Parse",
                description:
                  "Drop in PDF or text security reports. Our engine extracts text and identifies threats automatically.",
              },
              {
                icon: "🔍",
                title: "Extract Threats",
                description:
                  "Regex-powered NLP identifies CVEs, threat types (Malware, Phishing, DDoS), severity levels, and affected systems.",
              },
              {
                icon: "📊",
                title: "Visualize & Manage",
                description:
                  "View all threats in a sortable dashboard with severity badges, summary stats, and detailed views.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="glass rounded-xl p-6 card-hover"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 border-t border-[var(--color-border)] py-8">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm text-[var(--color-text-muted)]">
            <p>© 2026 ThreatLens AI. Built for hackathon demonstration.</p>
          </div>
        </footer>
      </main>
    </>
  );
}
