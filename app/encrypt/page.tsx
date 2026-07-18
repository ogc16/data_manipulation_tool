"use client";

import { useState, useRef } from "react";
import ErrorMessage from "../components/ErrorMessage";
import Loading from "../components/Loading";

type Tab = "encrypt" | "decrypt";

async function getKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const saltBuf = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuf, iterations: 600_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export default function EncryptPage() {
  const [tab, setTab] = useState<Tab>("encrypt");
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; size: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEncrypt = async () => {
    if (!file || !password) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const buf = await file.arrayBuffer();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await getKey(password, salt);
      const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, buf);

      const header = new Uint8Array(1 + 16 + 12 + encrypted.byteLength);
      header[0] = 1;
      header.set(salt, 1);
      header.set(iv, 17);
      header.set(new Uint8Array(encrypted), 29);

      const blob = new Blob([header]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name + ".enc";
      a.click();
      URL.revokeObjectURL(url);

      setResult({ name: file.name + ".enc", size: blob.size });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Encryption failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async () => {
    if (!file || !password) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const buf = await file.arrayBuffer();
      const data = new Uint8Array(buf);
      if (data[0] !== 1) throw new Error("Not a valid encrypted file");

      const salt = data.slice(1, 17);
      const iv = data.slice(17, 29);
      const ciphertext = data.slice(29);
      const key = await getKey(password, salt);
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);

      const origName = file.name.replace(/\.enc$/i, "");
      const blob = new Blob([decrypted]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = origName;
      a.click();
      URL.revokeObjectURL(url);

      setResult({ name: origName, size: blob.size });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Decryption failed — wrong password or corrupted file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header fade-in">
        <h1 className="page-title">Encryption</h1>
        <p className="page-subtitle">AES-256-GCM file encryption and decryption with a password.</p>
      </div>

      <div className="tabs">
        <button className={`tab${tab === "encrypt" ? " active" : ""}`} onClick={() => { setTab("encrypt"); setResult(null); setError(null); }}>
          Encrypt
        </button>
        <button className={`tab${tab === "decrypt" ? " active" : ""}`} onClick={() => { setTab("decrypt"); setResult(null); setError(null); }}>
          Decrypt
        </button>
      </div>

      <div className="card">
        <div
          style={{
            border: "2px dashed var(--border-color, #ccc)",
            borderRadius: 8,
            padding: "2rem",
            textAlign: "center",
            cursor: "pointer",
            marginBottom: "1rem",
          }}
          onClick={() => inputRef.current?.click()}
        >
          {file ? (
            <p><strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)</p>
          ) : (
            <>
              <p style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>
                {tab === "encrypt" ? "Select a file to encrypt" : "Select an .enc file to decrypt"}
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Click to browse</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={tab === "decrypt" ? ".enc" : undefined}
            style={{ display: "none" }}
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setError(null); }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter a strong password"
          />
        </div>

        <button
          className="btn btn-primary"
          disabled={!file || !password || loading}
          onClick={tab === "encrypt" ? handleEncrypt : handleDecrypt}
        >
          {loading ? "Processing..." : tab === "encrypt" ? "Encrypt & Download" : "Decrypt & Download"}
        </button>
      </div>

      {result && (
        <div className="card">
          <h3>{tab === "encrypt" ? "Encrypted" : "Decrypted"}</h3>
          <p>File: <strong>{result.name}</strong></p>
          <p>Size: {(result.size / 1024).toFixed(1)} KB</p>
        </div>
      )}

      {error && <ErrorMessage message={error} />}
      {loading && <Loading text={tab === "encrypt" ? "Encrypting..." : "Decrypting..."} />}
    </div>
  );
}
