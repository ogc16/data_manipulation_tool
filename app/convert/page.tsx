"use client";

import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import FileUpload from "../components/FileUpload";
import DataTable from "../components/DataTable";
import ErrorMessage from "../components/ErrorMessage";
import Loading from "../components/Loading";

const CONVERSIONS = [
  { id: "excel-to-csv", label: "Excel to CSV", from: ".xlsx,.xls", toExt: "csv", toMime: "text/csv;charset=utf-8;", binary: false as const },
  { id: "excel-to-json", label: "Excel to JSON", from: ".xlsx,.xls", toExt: "json", toMime: "application/json;charset=utf-8;", binary: false },
  { id: "csv-to-excel", label: "CSV to Excel", from: ".csv", toExt: "xlsx", toMime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", binary: true },
  { id: "csv-to-json", label: "CSV to JSON", from: ".csv", toExt: "json", toMime: "application/json;charset=utf-8;", binary: false },
  { id: "json-to-csv", label: "JSON to CSV", from: ".json", toExt: "csv", toMime: "text/csv;charset=utf-8;", binary: false },
  { id: "json-to-excel", label: "JSON to Excel", from: ".json", toExt: "xlsx", toMime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", binary: true },
  { id: "pdf-to-csv", label: "PDF to CSV", from: ".pdf", toExt: "csv", toMime: "text/csv;charset=utf-8;", binary: false },
  { id: "pdf-to-word", label: "PDF to Word", from: ".pdf", toExt: "docx", toMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", binary: true },
] as const;

type ConversionId = (typeof CONVERSIONS)[number]["id"];

const convMap = Object.fromEntries(CONVERSIONS.map((c) => [c.id, c])) as Record<ConversionId, typeof CONVERSIONS[number]>;

async function parseInput(file: File, id: ConversionId): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer();

  if (id.startsWith("excel-") || id === "csv-to-excel" || id === "csv-to-json") {
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  }

  if (id.startsWith("json-")) {
    const text = new TextDecoder().decode(buf);
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
    if (typeof parsed === "object" && parsed !== null) return [parsed as Record<string, unknown>];
    throw new Error("JSON must be an array or object");
  }

  throw new Error("Unsupported conversion");
}

function toOutput(data: Record<string, unknown>[], id: ConversionId): string | Uint8Array {
  if (id.endsWith("-csv")) {
    const ws = XLSX.utils.json_to_sheet(data);
    return XLSX.utils.sheet_to_csv(ws);
  }
  if (id.endsWith("-json")) {
    return JSON.stringify(data, null, 2);
  }
  if (id.endsWith("-excel")) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    return XLSX.write(wb, { bookType: "xlsx", type: "array" });
  }
  throw new Error("Unsupported output format");
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

export default function ConvertPage() {
  const [convId, setConvId] = useState<ConversionId>("excel-to-csv");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Record<string, unknown>[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [output, setOutput] = useState<string | Uint8Array | null>(null);
  const [outputText, setOutputText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExcelInput = convId.startsWith("excel-");
  const isPdfInput = convId.startsWith("pdf-");

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setOutput(null);
    setOutputText(null);
    setError(null);
    setParsed(null);
    setColumns([]);
    setSheets([]);
    setSelectedSheet("");

    try {
      if (isExcelInput && /\.xlsx?$/i.test(f.name)) {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        setSheets(wb.SheetNames);
        setSelectedSheet(wb.SheetNames[0]);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
        setParsed(json);
        setColumns(json.length > 0 ? Object.keys(json[0]) : []);
      } else if (convId.startsWith("csv-") && f.name.endsWith(".csv")) {
        const json = await parseInput(f, convId);
        setParsed(json);
        setColumns(json.length > 0 ? Object.keys(json[0]) : []);
      } else if (convId.startsWith("json-") && f.name.endsWith(".json")) {
        const json = await parseInput(f, convId);
        setParsed(json);
        setColumns(json.length > 0 ? Object.keys(json[0]) : []);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to read file");
    }
  }, [convId, isExcelInput]);

  const switchSheet = (name: string) => {
    setSelectedSheet(name);
    setOutput(null);
    setOutputText(null);
    if (!file) return;
    parseInput(file, convId).then((json) => {
      setParsed(json);
      setColumns(json.length > 0 ? Object.keys(json[0]) : []);
    }).catch((e) => setError(e instanceof Error ? e.message : "Failed to switch sheet"));
  };

  const handleConvert = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setOutput(null);
    setOutputText(null);

    try {
      if (convId === "pdf-to-csv") {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/convert-pdf", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "PDF conversion failed");
        }
        const { csv } = await res.json();
        setOutput(csv);
        setOutputText(csv);
        setLoading(false);
        return;
      }

      if (convId === "pdf-to-word") {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/convert-pdf-word", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "PDF to Word conversion failed");
        }
        const { base64, filename } = await res.json();
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        setOutput(bytes);
        setOutputText(`[DOCX — ${bytes.byteLength} bytes]`);

        downloadBlob(bytes, filename, convMap[convId].toMime);
        setLoading(false);
        return;
      }

      let data: Record<string, unknown>[];

      if (isExcelInput && sheets.length > 1) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[selectedSheet];
        data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
      } else {
        data = await parseInput(file, convId);
      }

      const result = toOutput(data, convId);
      setOutput(result);
      if (typeof result === "string") setOutputText(result);
      else setOutputText(`[Binary ${convMap[convId].toExt.toUpperCase()} — ${result.byteLength} bytes]`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!output || !file) return;
    const info = convMap[convId];
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const suffix = isExcelInput && sheets.length > 1 ? `_${selectedSheet}` : "";
    downloadBlob(output, `${baseName}${suffix}.${info.toExt}`, info.toMime);
  };

  const totalRows = parsed?.length ?? 0;

  return (
    <div className="container">
      <h1 className="page-title">📁 File Converter</h1>
      <hr className="divider" />

      <div className="card">
        <label htmlFor="conv-type">Select conversion type</label>
        <select
          id="conv-type"
          value={convId}
          onChange={(e) => {
            setConvId(e.target.value as ConversionId);
            setFile(null);
            setOutput(null);
            setOutputText(null);
            setError(null);
            setParsed(null);
            setSheets([]);
          }}
        >
          {CONVERSIONS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="card">
        <FileUpload
          accept={convMap[convId].from}
          label="Upload a file"
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
        <div className="card">
          <h3>Preview</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            {totalRows} row{totalRows !== 1 ? "s" : ""} · {columns.length} column{columns.length !== 1 ? "s" : ""}
            {totalRows > 10 && " · showing first 10"}
          </p>
          <DataTable columns={columns} rows={parsed.slice(0, 10)} maxHeight={320} />
        </div>
      )}

      {!isPdfInput && (
        <button
          className="btn btn-primary"
          disabled={!file || loading || totalRows === 0}
          onClick={handleConvert}
        >
          {loading ? "Converting..." : `Convert to ${convMap[convId].toExt.toUpperCase()}`}
        </button>
      )}

      {isPdfInput && (
        <button
          className="btn btn-primary"
          disabled={!file || loading || !/\.pdf$/i.test(file?.name ?? "")}
          onClick={handleConvert}
        >
          {loading ? "Converting..." : `Convert PDF to ${convMap[convId].toExt.toUpperCase()}`}
        </button>
      )}

      {error && <ErrorMessage message={error} />}
      {loading && <Loading text="Converting file..." />}

      {outputText && (
        <div className="card">
          <h3>Converted {convMap[convId].toExt.toUpperCase()} data</h3>
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
              Download {convMap[convId].toExt.toUpperCase()}
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
