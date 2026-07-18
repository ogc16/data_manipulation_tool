import type { Metadata } from "next";
import { meta } from "../seo-config";

export const metadata: Metadata = meta({
  title: "Free Excel to CSV Converter — PDF to Excel Online",
  description:
    "Convert Excel to CSV, PDF to Excel, Word to JSON, and more. Free online file conversion tool with preview. No uploads needed — runs entirely in your browser.",
  keywords: [
    "excel to csv",
    "pdf to excel",
    "online file conversion",
    "convert xlsx to csv",
    "csv converter online",
    "free file converter",
    "excel converter online",
    "pdf converter online",
    "word to csv",
    "json to excel",
    "convert pdf to spreadsheet",
    "xlsx converter",
    "file format converter",
    "online utility convert",
  ],
  path: "/convert/",
});

export default function ConvertLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
