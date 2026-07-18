import type { Metadata } from "next";
import { meta } from "../seo-config";

export const metadata: Metadata = meta({
  title: "Scan to PDF Online — Document Scanner & Export Tool",
  description:
    "Scan documents with your camera and export as PDF, Word, Excel, or CSV. Free online scan to PDF tool — no app or software needed. Works in any browser.",
  keywords: [
    "scan to pdf",
    "document scanner online",
    "scan document to pdf",
    "camera scan pdf",
    "image to pdf converter",
    "scan to excel",
    "scan to csv",
    "online document scanner",
    "phone scan to pdf",
    "free scan tool",
    "ocr scan online",
    "scan and export pdf",
  ],
  path: "/scan/",
});

export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
