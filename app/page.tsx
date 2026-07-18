import Link from "next/link";

const tools = [
  {
    href: "/convert",
    title: "File converter",
    desc: "Convert between CSV, Excel, JSON, PDF, Word, and PowerPoint.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M12 18v-6" />
        <path d="M9 15l3 3 3-3" />
      </svg>
    ),
  },
  {
    href: "/analyze",
    title: "Data analysis",
    desc: "Upload CSV or Excel files for interactive charts, stats, and merging.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: "/zip",
    title: "ZIP & extract",
    desc: "Create ZIP archives or extract ZIP and 7z files in the browser.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8v13H3V8" />
        <path d="M1 3h22v5H1z" />
        <path d="M10 12h4" />
      </svg>
    ),
  },
  {
    href: "/encrypt",
    title: "Encryption",
    desc: "AES-256-GCM file encryption and decryption with a password.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    href: "/scan",
    title: "Scan & export",
    desc: "Capture or upload images and export as PDF, Word, Excel, or CSV.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="container">
      <div className="page-header fade-in">
        <h1 className="page-title">Data tools</h1>
        <p className="page-subtitle">
          Convert, analyze, compress, encrypt, and export your data.
        </p>
      </div>

      <div className="feature-grid">
        {tools.map((tool, i) => (
          <div key={tool.href} className={`feature-card fade-in fade-in-delay-${i + 1}`}>
            <div style={{ color: "var(--primary)", marginBottom: "0.75rem" }}>
              {tool.icon}
            </div>
            <h3>{tool.title}</h3>
            <ul>
              <li>{tool.desc}</li>
            </ul>
            <Link href={tool.href} className="card-cta">
              Open tool
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        ))}
      </div>

      <div className="card fade-in fade-in-delay-5" style={{ marginTop: "1.5rem" }}>
        <h3>About</h3>
        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
          A public data processing toolkit. All processing happens in your browser.
          No files are uploaded to any server.
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
          Questions or feedback?{" "}
          <a href="mailto:info@techgaetano.com">info@techgaetano.com</a>
          {" "}&middot;{" "}
          <a href="https://github.com/ogc16/data_manipulation_tool" target="_blank" rel="noopener noreferrer">
            Source on GitHub
          </a>
        </p>
      </div>
    </div>
  );
}
