"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import "./globals.css";

const navItems = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/convert", label: "File Converter", icon: "📁" },
  { href: "/analyze", label: "Data Analysis", icon: "📊" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const basePath = "/data_manipulation_tool";
  const relativePath = pathname?.startsWith(basePath)
    ? pathname.slice(basePath.length) || "/"
    : pathname || "/";

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Data Manipulation Tools</title>
      </head>
      <body>
        <div className="app-layout">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation"
          >
            <span /> <span /> <span />
          </button>

          <div
            className={`sidebar-overlay${sidebarOpen ? " visible" : ""}`}
            onClick={() => setSidebarOpen(false)}
          />

          <nav className={`sidebar${sidebarOpen ? " open" : ""}`}>
            <div className="sidebar-header">
              <h2>🛠️ Data Tools</h2>
              <p className="sidebar-version">V2.0</p>
            </div>

            <div className="sidebar-nav">
              {navItems.map((item) => {
                const active = item.href === "/"
                  ? relativePath === "/" || relativePath === ""
                  : relativePath.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link${active ? " active" : ""}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon} {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="sidebar-footer">
              <hr />
              <p>Data manipulation tool.</p>
              <p>
                Maintained by{" "}
                <a href="https://www.techgaetano.com" target="_blank" rel="noopener noreferrer">
                  TechGaetano
                </a>
              </p>
            </div>
          </nav>

          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
