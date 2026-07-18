"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, ImageRun } from "docx";
import ErrorMessage from "../components/ErrorMessage";
import Loading from "../components/Loading";

const FORMATS = [
  { id: "pdf", label: "PDF", mime: "application/pdf", ext: ".pdf" },
  { id: "word", label: "Word", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: ".docx" },
  { id: "excel", label: "Excel", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: ".xlsx" },
  { id: "csv", label: "CSV", mime: "text/csv;charset=utf-8;", ext: ".csv" },
] as const;

type FormatId = (typeof FORMATS)[number]["id"];

export default function ScanPage() {
  const [format, setFormat] = useState<FormatId>("pdf");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("Camera access denied or not available");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImages((prev) => [...prev, dataUrl]);
  };

  const addImages = useCallback((files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setCapturedImages((prev) => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(files[i]);
    }
  }, []);

  const removeImage = (index: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearImages = () => {
    setCapturedImages([]);
  };

  const exportImages = async () => {
    if (capturedImages.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const baseName = `scan_${Date.now()}`;

      if (format === "pdf") {
        const pdf = new jsPDF();
        for (let i = 0; i < capturedImages.length; i++) {
          if (i > 0) pdf.addPage();
          const imgData = capturedImages[i];
          const pdfW = pdf.internal.pageSize.getWidth();
          const pdfH = pdf.internal.pageSize.getHeight();
          pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH, undefined, "FAST");
        }
        pdf.save(`${baseName}.pdf`);
      } else if (format === "word") {
        const paragraphs: Paragraph[] = [];
        for (const dataUrl of capturedImages) {
          const imgData = dataUrl.split(",")[1];
          const imgBytes = atob(imgData);
          const imgArray = new Uint8Array(imgBytes.length);
          for (let j = 0; j < imgBytes.length; j++) imgArray[j] = imgBytes.charCodeAt(j);
          paragraphs.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imgArray,
                  transformation: { width: 500, height: 375 },
                  type: "jpg",
                }),
              ],
              spacing: { after: 200 },
            })
          );
        }
        const doc = new Document({ sections: [{ children: paragraphs }] });
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "excel") {
        const rows = capturedImages.map((dataUrl, i) => ({
          Page: i + 1,
          Type: "JPEG Image",
          Data: dataUrl,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [{ wch: 8 }, { wch: 10 }, { wch: 80 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Scans");
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "csv") {
        const rows = capturedImages.map((_dataUrl, i) => `Page ${i + 1},JPEG Image`);
        const csv = "Page,Type\n" + rows.join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoading(false);
    }
  };

  const fmtLabel = FORMATS.find((f) => f.id === format)?.label ?? "";

  return (
    <div className="container">
      <div className="page-header fade-in">
        <h1 className="page-title">Scan & export</h1>
        <p className="page-subtitle">Capture or upload images and export as PDF, Word, Excel, or CSV.</p>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <button className="btn btn-primary" onClick={startCamera}>
            Open camera
          </button>
          <button className="btn btn-danger" onClick={stopCamera}>
            Stop camera
          </button>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            Upload images
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => e.target.files && addImages(e.target.files)}
          />
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: "100%", maxWidth: 480, borderRadius: 8, background: "#000" }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div style={{ display: "flex", alignItems: "center" }}>
            <button className="btn btn-success" onClick={captureImage} disabled={!streamRef.current}>
              Capture photo
            </button>
          </div>
        </div>
      </div>

      {capturedImages.length > 0 && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ margin: 0 }}>
              {capturedImages.length} image{capturedImages.length !== 1 ? "s" : ""} captured
            </h3>
            <button className="btn btn-danger" onClick={clearImages}>Clear all</button>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", maxHeight: 300, overflowY: "auto" }}>
            {capturedImages.map((dataUrl, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img
                  src={dataUrl}
                  alt={`Capture ${i + 1}`}
                  style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}
                />
                <button
                  onClick={() => removeImage(i)}
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: "none",
                    background: "var(--danger)",
                    color: "white",
                    fontSize: "0.7rem",
                    cursor: "pointer",
                    lineHeight: "20px",
                    textAlign: "center",
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor="export-format">Export format</label>
          <select id="export-format" value={format} onChange={(e) => setFormat(e.target.value as FormatId)}>
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-success" disabled={capturedImages.length === 0 || loading} onClick={exportImages}>
          {loading ? "Exporting..." : `Export as ${fmtLabel} (${capturedImages.length})`}
        </button>
      </div>

      {error && <ErrorMessage message={error} />}
      {loading && <Loading text="Exporting..." />}
    </div>
  );
}
