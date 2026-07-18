import type { Metadata } from "next";
import { meta } from "../seo-config";

export const metadata: Metadata = meta({
  title: "Free Online File Encryption — AES-256 Password Protect",
  description:
    "Encrypt and decrypt files online with AES-256-GCM encryption. Password-protect any file instantly. No uploads — encryption runs entirely in your browser.",
  keywords: [
    "online encryption",
    "encrypt file online",
    "aes 256 encryption",
    "password protect file",
    "file encryption tool",
    "decrypt file online",
    "online file encryption utility",
    "encrypt pdf online",
    "secure file encryption",
    "browser encryption tool",
    "free encryption service",
    "aes encryption online",
  ],
  path: "/encrypt/",
});

export default function EncryptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
