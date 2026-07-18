import type { Metadata } from "next";
import Sidebar from "./components/Sidebar";
import { SITE } from "./seo-config";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — Free Online File Utility`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  metadataBase: new URL(SITE.url),
  alternates: {
    canonical: SITE.url,
  },
  keywords: [
    "online file utility",
    "free online tools",
    "file converter",
    "data analysis",
    "compression tool",
    "encryption tool",
    "online utility",
    "excel to csv",
    "pdf to excel",
    "online file conversion",
    "scan to pdf",
    "online encryption",
    "zip compress extract",
  ],
  openGraph: {
    title: `${SITE.name} — Free Online File Utility`,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    locale: SITE.locale,
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${SITE.name} — Free Online File Utility`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — Free Online File Utility`,
    description: SITE.description,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "application-name": SITE.name,
    "theme-color": "#8B6914",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  applicationCategory: "UtilityApplication",
  operatingSystem: "Any (browser-based)",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Excel to CSV converter",
    "PDF to Excel converter",
    "Online file conversion between CSV, Excel, JSON, PDF, Word, and PowerPoint",
    "Interactive data analysis with charts and statistics",
    "ZIP compress and extract",
    "AES-256 file encryption and decryption",
    "Scan documents to PDF, Word, Excel, or CSV",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light"){document.documentElement.classList.toggle("dark",t==="dark")}else if(window.matchMedia("(prefers-color-scheme:dark)").matches){document.documentElement.classList.add("dark")}}catch(e){}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <a href="#main-content" style={{ position: "absolute", left: "-9999px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }}>
          Skip to main content
        </a>

        <div className="app-layout">
          <Sidebar />
          <main className="main-content" id="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
