import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[var(--color-accent)] rounded-full opacity-5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600 rounded-full opacity-5 blur-3xl" />
      </div>

      <div className="relative z-10 mb-8 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-lg">
            TL
          </div>
          <h1 className="text-3xl font-bold gradient-text">ThreatLens AI</h1>
        </div>
        <p className="text-[var(--color-text-secondary)] text-sm">
          Create your account to get started
        </p>
      </div>

      <SignUp
        routing="hash"
        fallbackRedirectUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-2xl",
          },
        }}
      />
    </main>
  );
}
