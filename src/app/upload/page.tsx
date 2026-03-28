import Navbar from "@/components/Navbar";
import FileUpload from "@/components/FileUpload";

export default function UploadPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
            Upload Security Report
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            Upload files, paste text, or fetch a URL. Our engine extracts
            threats, CVEs, severity levels, and affected systems automatically.
          </p>
        </div>

        {/* Upload Component */}
        <section className="mb-8 animate-fade-in" aria-label="File Upload">
          <FileUpload />
        </section>

        {/* Supported formats info */}
        <section className="glass rounded-xl p-6 animate-fade-in" aria-label="Supported Formats">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
            ℹ️ How it works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: "1",
                title: "Input",
                desc: "Upload a file (PDF, TXT, JSON, CSV, images), paste text, or enter a URL.",
              },
              {
                step: "2",
                title: "Extract",
                desc: "AI-powered extraction identifies CVEs, threats, and severity levels from any format.",
              },
              {
                step: "3",
                title: "Review",
                desc: "View extracted threats on your dashboard and manage them.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {item.step}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
