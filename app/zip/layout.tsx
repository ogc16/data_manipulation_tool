import type { Metadata } from "next";
import { meta } from "../seo-config";

export const metadata: Metadata = meta({
  title: "Online ZIP Compress & Extract Tool — Free File Compression",
  description:
    "Compress files into ZIP archives or extract ZIP files online. Free browser-based zipping and extraction utility — no software to install. All processing happens locally.",
  keywords: [
    "online zip tool",
    "compress files online",
    "zip extract tool",
    "online file compression",
    "unzip files online",
    "zip utility",
    "create zip archive online",
    "extract zip file online",
    "free zip compressor",
    "online archive tool",
    "compress files browser",
    "zip file creator",
  ],
  path: "/zip/",
});

export default function ZipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
