"use client";

import { useState, useCallback, useRef } from "react";
import JSZip from "jszip";
import ErrorMessage from "../components/ErrorMessage";
import Loading from "../components/Loading";

type Tab = "create" | "extract";

interface ZipEntry {
  file: File;
  id: number;
}

interface ExtractedFile {
  name: string;
  data: Blob;
  size: number;
}

export default function ZipPage() {
  const [tab, setTab] = useState<Tab>("create");
  const [files, setFiles] = useState<ZipEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveName, setArchiveName] = useState("archive");
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const extractRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    setExtractedFiles([]);
    const newEntries = Array.from(incoming).map((file, i) => ({
      file,
      id: Date.now() + i + Math.random(),
    }));
    setFiles((prev) => [...prev, ...newEntries]);
    setError(null);
  }, []);

  const removeFile = (id: number) => {
    setFiles((prev) => prev.filter((e) => e.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleCreateZip = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const zip = new JSZip();
      const nameCount = new Map<string, number>();

      for (const { file } of files) {
        let name = file.name;
        if (nameCount.has(name)) {
          const count = nameCount.get(name)! + 1;
          nameCount.set(name, count);
          const dot = name.lastIndexOf(".");
          if (dot > 0) name = name.slice(0, dot) + `_${count}` + name.slice(dot);
          else name = name + `_${count}`;
        } else {
          nameCount.set(name, 1);
        }
        zip.file(name, file);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${archiveName.replace(/\.zip$/i, "")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Zipping failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = useCallback(async (f: File) => {
    setLoading(true);
    setError(null);
    setExtractedFiles([]);

    try {
      const buf = await f.arrayBuffer();
      const name = f.name.toLowerCase();

      if (name.endsWith(".zip")) {
        const zip = await JSZip.loadAsync(buf);
        const entries: ExtractedFile[] = [];
        const tasks: Promise<void>[] = [];

        zip.forEach((path, zipEntry) => {
          if (zipEntry.dir) return;
          tasks.push(
            zipEntry.async("blob").then((blob) => {
              entries.push({ name: path, data: blob, size: blob.size });
            })
          );
        });

        await Promise.all(tasks);
        entries.sort((a, b) => a.name.localeCompare(b.name));
        setExtractedFiles(entries);
      } else if (name.endsWith(".7z")) {
        setError("7z extraction is not supported in browser. Please use a local tool like 7-Zip.");
        setLoading(false);
        return;
      } else {
        throw new Error("Unsupported archive format. Only .zip and .7z are supported.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadAll = () => {
    for (const ef of extractedFiles) {
      const url = URL.createObjectURL(ef.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = ef.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const totalSize = files.reduce((sum, e) => sum + e.file.size, 0);

  return (
    <div className="container">
      <div className="page-header fade-in">
        <h1 className="page-title">ZIP & extract</h1>
        <p className="page-subtitle">Create ZIP archives or extract ZIP and 7z files.</p>
      </div>

      <div className="tabs">
        <button className={`tab${tab === "create" ? " active" : ""}`} onClick={() => setTab("create")}>
          Create ZIP
        </button>
        <button className={`tab${tab === "extract" ? " active" : ""}`} onClick={() => setTab("extract")}>
          Extract ZIP / 7z
        </button>
      </div>

      {tab === "create" && (
        <>
          <div
            className="card"
            style={{
              border: "2px dashed var(--border-color, #ccc)",
              borderRadius: 8,
              padding: "2rem",
              textAlign: "center",
              cursor: "pointer",
            }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
              Drop files here or click to select
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Any file type — all zipped together
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h3 style={{ margin: 0 }}>
                    {files.length} file{files.length !== 1 ? "s" : ""} · {(totalSize / 1024).toFixed(1)} KB
                  </h3>
                  <button className="btn btn-danger" onClick={clearAll}>Clear all</button>
                </div>
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  {files.map((entry) => (
                    <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.9rem" }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{entry.file.name}</span>
                      <span style={{ color: "var(--text-secondary)", whiteSpace: "nowrap", margin: "0 0.75rem" }}>{(entry.file.size / 1024).toFixed(1)} KB</span>
                      <button className="btn btn-danger" style={{ padding: "0.15rem 0.5rem", fontSize: "0.8rem" }} onClick={() => removeFile(entry.id)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label htmlFor="archive-name">Archive name</label>
                  <input id="archive-name" type="text" value={archiveName} onChange={(e) => setArchiveName(e.target.value)} placeholder="archive" />
                </div>
                <button className="btn btn-success" disabled={loading} onClick={handleCreateZip}>
                  {loading ? "Zipping..." : `Download ZIP (${files.length} files)`}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {tab === "extract" && (
        <>
          <div
            className="card"
            style={{
              border: "2px dashed var(--border-color, #ccc)",
              borderRadius: 8,
              padding: "2rem",
              textAlign: "center",
              cursor: "pointer",
            }}
            onClick={() => extractRef.current?.click()}
          >
            <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
              Upload a ZIP or 7z archive
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Extract all files with one click
            </p>
            <input
              ref={extractRef}
              type="file"
              accept=".zip,.7z"
              style={{ display: "none" }}
              onChange={(e) => e.target.files && handleExtract(e.target.files[0])}
            />
          </div>

          {loading && <Loading text="Extracting archive..." />}

          {extractedFiles.length > 0 && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h3 style={{ margin: 0 }}>
                  {extractedFiles.length} file{extractedFiles.length !== 1 ? "s" : ""} extracted
                </h3>
                <button className="btn btn-success" onClick={downloadAll}>
                  Download all
                </button>
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {extractedFiles.map((ef, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.9rem" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{ef.name}</span>
                    <span style={{ color: "var(--text-secondary)", whiteSpace: "nowrap", marginRight: "0.75rem" }}>{(ef.size / 1024).toFixed(1)} KB</span>
                    <button className="btn btn-primary" style={{ padding: "0.15rem 0.5rem", fontSize: "0.8rem" }} onClick={() => { const u = URL.createObjectURL(ef.data); const a = document.createElement("a"); a.href = u; a.download = ef.name; a.click(); URL.revokeObjectURL(u); }}>
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {error && <ErrorMessage message={error} />}
    </div>
  );
}
