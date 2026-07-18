"use client";

import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import FileUpload from "../components/FileUpload";
import DataTable from "../components/DataTable";
import ErrorMessage from "../components/ErrorMessage";
import Loading from "../components/Loading";

const SOURCES = [
  { id: "csv", label: "CSV", ext: ".csv" },
  { id: "excel", label: "Excel", ext: ".xlsx,.xls" },
  { id: "json", label: "JSON", ext: ".json" },
  { id: "pdf", label: "PDF", ext: ".pdf" },
  { id: "word", label: "Word", ext: ".docx" },
  { id: "pptx", label: "PowerPoint", ext: ".pptx" },
] as const;

const TARGETS = [
  { id: "csv", label: "CSV", mime: "text/csv;charset=utf-8;" },
  { id: "excel", label: "Excel", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  { id: "json", label: "JSON", mime: "application/json;charset=utf-8;" },
  { id: "word", label: "Word", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { id: "pptx", label: "PowerPoint", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
] as const;

type SourceId = (typeof SOURCES)[number]["id"];
type TargetId = (typeof TARGETS)[number]["id"];

function isBinaryFormat(id: TargetId) {
  return id === "excel" || id === "word" || id === "pptx";
}

export default function ConvertPage() {
  const [from, setFrom] = useState<SourceId>("csv");
  const [to, setTo] = useState<TargetId>("excel");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<Record<string, unknown>[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [output, setOutput] = useState<string | Uint8Array | null>(null);
  const [outputText, setOutputText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsServer = from === "pdf" || from === "word";

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setFileName(f.name.replace(/\.[^.]+$/, ""));
    setOutput(null);
    setOutputText(null);
    setError(null);
    setParsed(null);
    setColumns([]);
    setSheets([]);
    setSelectedSheet("");

    try {
      if (from === "excel") {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        setSheets(wb.SheetNames);
        setSelectedSheet(wb.SheetNames[0]);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
        setParsed(json);
        setColumns(json.length > 0 ? Object.keys(json[0]) : []);
      } else if (from === "csv") {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
        setParsed(json);
        setColumns(json.length > 0 ? Object.keys(json[0]) : []);
      } else if (from === "json") {
        const buf = await f.arrayBuffer();
        const text = new TextDecoder().decode(buf);
        const parsed = JSON.parse(text);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const json = arr as Record<string, unknown>[];
        setParsed(json);
        setColumns(json.length > 0 ? Object.keys(json[0]) : []);
      } else if (from === "pptx") {
        const buf = await f.arrayBuffer();
        const zip = await JSZip.loadAsync(buf);
        const slideFiles = Object.keys(zip.files).filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k)).sort();
        const rows: Record<string, unknown>[] = [];

        for (const slidePath of slideFiles) {
          const slideNum = parseInt(slidePath.match(/\d+/)?.[0] ?? "0", 10);
          const content = await zip.files[slidePath].async("string");
          const texts = [...content.matchAll(/<a:t[^>]*>([^<]+)<\/a:t>/g)].map((m) => m[1]);
          if (texts.length > 0) {
            rows.push({ Slide: slideNum, Content: texts.join(" ") });
          }
        }

        if (rows.length === 0) {
          rows.push({ Slide: 1, Content: "(no text found)" });
        }

        setParsed(rows);
        setColumns(Object.keys(rows[0]));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to read file");
    }
  }, [from]);

  const switchSheet = (name: string) => {
    setSelectedSheet(name);
    setOutput(null);
    setOutputText(null);
    if (!file) return;
    const bufPromise = file.arrayBuffer();
    bufPromise.then((buf) => {
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[name];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
      setParsed(json);
      setColumns(json.length > 0 ? Object.keys(json[0]) : []);
    }).catch((e) => setError(e instanceof Error ? e.message : "Failed to switch sheet"));
  };

  const getData = async (): Promise<{ data: Record<string, unknown>[]; cols: string[]; name: string }> => {
    if (!file) throw new Error("No file");
    const name = fileName;

    if (!needsServer) {
      if (from === "excel" && sheets.length > 1) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[selectedSheet];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
        const cols = data.length > 0 ? Object.keys(data[0]) : [];
        return { data, cols, name };
      }
      if (from === "pptx") {
        return { data: parsed!, cols: columns, name };
      }
      return { data: parsed!, cols: columns, name };
    }

    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/parse-binary", { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Parsing failed");
    }
    const { rows, columns: apiColumns } = await res.json() as { rows: Record<string, unknown>[]; columns: string[] };
    return { data: rows, cols: apiColumns ?? (rows.length > 0 ? Object.keys(rows[0]) : []), name };
  };

  const handleConvert = async () => {
    setLoading(true);
    setError(null);
    setOutput(null);
    setOutputText(null);

    try {
      const { data, cols, name } = await getData();

      if (to === "word") {
        const res = await fetch("/api/generate-word", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: data, columns: cols, filename: name }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Word generation failed");
        }
        const { base64, filename: newName } = await res.json();
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        setOutput(bytes);
        setOutputText(`[DOCX — ${bytes.byteLength} bytes]`);
        downloadBlob(bytes, newName, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        setLoading(false);
        return;
      }

      if (to === "pptx") {
        const PptxGenJS = (await import("pptxgenjs")).default;
        const pres = new PptxGenJS();
        pres.layout = "LAYOUT_16x9";

        const slide = pres.addSlide();
        slide.addText(name, { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 20, bold: true, color: "4361EE" });

        const headerCells = cols.map((c) => ({ text: c, options: { bold: true, fill: { color: "E8EAF6" }, fontSize: 10 } }));
        const dataCells = data.slice(0, 50).map((row) =>
          cols.map((c) => ({ text: String(row[c] ?? ""), options: { fontSize: 9 } }))
        );

        slide.addTable([headerCells, ...dataCells], {
          x: 0.5,
          y: 1.3,
          w: 9,
          colW: cols.map(() => 9 / cols.length),
          fontSize: 10,
          border: { type: "solid", pt: 0.5, color: "CCCCCC" },
          autoPage: false,
        });

        const blob = (await pres.write({ outputType: "blob" })) as Blob;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${name}.pptx`;
        a.click();
        URL.revokeObjectURL(url);
        setOutputText(`[PPTX — ${blob.size} bytes]`);
        setLoading(false);
        return;
      }

      if (to === "csv") {
        const ws = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);
        setOutput(csv);
        setOutputText(csv);
      } else if (to === "json") {
        const json = JSON.stringify(data, null, 2);
        setOutput(json);
        setOutputText(json);
      } else if (to === "excel") {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        const xlsx = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        setOutput(xlsx);
        setOutputText(`[Binary XLSX — ${xlsx.byteLength} bytes]`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const target = TARGETS.find((t) => t.id === to)!;
    downloadBlob(output, `${fileName}.${to}`, target.mime);
  };

  const totalRows = parsed?.length ?? 0;
  const accept = SOURCES.find((s) => s.id === from)?.ext ?? "";
  const fromLabel = SOURCES.find((s) => s.id === from)?.label ?? "";
  const toLabel = TARGETS.find((t) => t.id === to)?.label ?? "";
  const canConvert = file && (needsServer || (parsed !== null && totalRows > 0));
  const sameFormat = from === to;

  return (
    <div className="container">
      <div className="page-header fade-in">
        <h1 className="page-title">File converter</h1>
        <p className="page-subtitle">Convert between CSV, Excel, JSON, PDF, Word, and PowerPoint.</p>
      </div>

      <div className="card fade-in fade-in-delay-1" style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor="from-type">From</label>
          <select
            id="from-type"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value as SourceId);
              setFile(null);
              setOutput(null);
              setOutputText(null);
              setError(null);
              setParsed(null);
              setSheets([]);
            }}
          >
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor="to-type">To</label>
          <select
            id="to-type"
            value={to}
            onChange={(e) => {
              setTo(e.target.value as TargetId);
              setOutput(null);
              setOutputText(null);
              setError(null);
            }}
          >
            {TARGETS.filter((t) => t.id !== from).map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card fade-in fade-in-delay-2">
        <FileUpload
          accept={accept}
          label={`Upload a ${fromLabel} file`}
          onFile={handleFile}
          file={file}
        />
      </div>

      {sheets.length > 1 && (
        <div className="card">
          <label htmlFor="sheet-select">Select sheet</label>
          <select
            id="sheet-select"
            value={selectedSheet}
            onChange={(e) => switchSheet(e.target.value)}
          >
            {sheets.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {parsed && columns.length > 0 && (
        <div className="card fade-in fade-in-delay-3">
          <h3>Preview</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            {totalRows} row{totalRows !== 1 ? "s" : ""} · {columns.length} column{columns.length !== 1 ? "s" : ""}
            {totalRows > 10 && " · showing first 10"}
          </p>
          <DataTable columns={columns} rows={parsed.slice(0, 10)} maxHeight={320} />
        </div>
      )}

      <button
        className="btn btn-primary"
        disabled={!canConvert || loading || sameFormat}
        onClick={handleConvert}
      >
        {loading ? "Converting..." : `Convert ${fromLabel} to ${toLabel}`}
      </button>

      {error && <ErrorMessage message={error} />}
      {loading && <Loading text="Converting file..." />}

      {outputText && (
        <div className="card fade-in">
          <h3>Converted {toLabel} data</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            {typeof output === "string"
              ? `${output.split("\n").length} lines · ${(new Blob([output]).size / 1024).toFixed(1)} KB`
              : `${(output as Uint8Array).byteLength} bytes`}
          </p>
          {typeof output === "string" && (
            <pre className="csv-preview">{output}</pre>
          )}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <button className="btn btn-success" onClick={handleDownload}>
              Download {toLabel}
            </button>
            {typeof output === "string" && (
              <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(output as string)}>
                Copy to clipboard
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function downloadBlob(content: string | Uint8Array, filename: string, mime: string) {
  const blob = new Blob([content as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
