"use client";

import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import dynamic from "next/dynamic";
import FileUpload from "../components/FileUpload";
import DataTable from "../components/DataTable";
import ErrorMessage from "../components/ErrorMessage";
import Loading from "../components/Loading";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const CHART_TYPES = [
  { id: "scatter", label: "Scatter", minCols: 2 },
  { id: "line", label: "Line", minCols: 2 },
  { id: "bar", label: "Bar", minCols: 2 },
  { id: "histogram", label: "Histogram", minCols: 1 },
  { id: "box", label: "Box Plot", minCols: 1 },
  { id: "pie", label: "Pie", minCols: 1 },
  { id: "area", label: "Area", minCols: 2 },
  { id: "bubble", label: "Bubble", minCols: 3 },
  { id: "heatmap-correlation", label: "Correlation Heatmap", minCols: 2 },
] as const;

type ChartTypeId = (typeof CHART_TYPES)[number]["id"];

type ChartWidget = {
  id: number;
  type: ChartTypeId;
  x: string;
  y: string;
  z: string;
  size: string;
  title: string;
  color: string;
};

let widgetCounter = 0;
function createWidget(type: ChartTypeId, cols: string[]): ChartWidget {
  widgetCounter++;
  const numeric = cols.filter((c) => !isNaN(Number((() => 0)())));
  return {
    id: widgetCounter,
    type,
    x: cols[0] ?? "",
    y: cols[1] ?? cols[0] ?? "",
    z: cols[2] ?? cols[0] ?? "",
    size: cols[2] ?? cols[0] ?? "",
    title: CHART_TYPES.find((t) => t.id === type)?.label ?? type,
    color: "#4361ee",
  };
}

type ColumnStats = {
  count: number; mean: number; std: number;
  min: number; q1: number; median: number; q3: number; max: number;
  missing: number;
};

type StoredFile = {
  id: number;
  name: string;
  data: Record<string, unknown>[];
  columns: string[];
};

const ROWS_PER_PAGE = 25;

function computeStats(values: (number | null | undefined)[]): ColumnStats | null {
  const valid = values.filter((v): v is number => v != null && !isNaN(v));
  const missing = values.length - valid.length;
  if (valid.length === 0) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  return {
    count: n, mean, std: Math.sqrt(variance),
    min: sorted[0], q1, median: n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)],
    q3, max: sorted[n - 1], missing,
  };
}

function getNumericCols(data: Record<string, unknown>[], cols: string[]) {
  return cols.filter((c) => data.some((r) => { const v = r[c]; return v != null && v !== "" && !isNaN(Number(v)); }));
}

function getAllCols(data: Record<string, unknown>[], cols: string[]) {
  return cols;
}

function computeAllStats(data: Record<string, unknown>[], numericCols: string[]) {
  const result: Record<string, ColumnStats> = {};
  for (const col of numericCols) {
    const vals = data.map((r) => { const v = r[col]; return v == null || v === "" ? null : Number(v); });
    const s = computeStats(vals);
    if (s) result[col] = s;
  }
  return Object.keys(result).length > 0 ? result : null;
}

function computeCorrelation(data: Record<string, unknown>[], numericCols: string[]) {
  if (numericCols.length < 2) return null;
  const n = numericCols.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) { matrix[i][j] = 1; continue; }
      const pairs: [number, number][] = [];
      for (const row of data) {
        const vi = Number(row[numericCols[i]]);
        const vj = Number(row[numericCols[j]]);
        if (!isNaN(vi) && !isNaN(vj)) pairs.push([vi, vj]);
      }
      if (pairs.length < 3) { matrix[i][j] = 0; continue; }
      const mi = pairs.reduce((s, [v]) => s + v, 0) / pairs.length;
      const mj = pairs.reduce((s, [, v]) => s + v, 0) / pairs.length;
      let num = 0, di = 0, dj = 0;
      for (const [vi, vj] of pairs) {
        num += (vi - mi) * (vj - mj);
        di += (vi - mi) ** 2;
        dj += (vj - mj) ** 2;
      }
      matrix[i][j] = di * dj === 0 ? 0 : num / Math.sqrt(di * dj);
    }
  }
  return { matrix, labels: numericCols };
}

function mergeDatasets(left: Record<string, unknown>[], right: Record<string, unknown>[], leftCol: string, rightCol: string, joinType: "inner" | "left" | "right" | "outer"): Record<string, unknown>[] {
  const rightLookup = new Map<string, Record<string, unknown>[]>();
  for (const row of right) {
    const key = String(row[rightCol] ?? "");
    if (!rightLookup.has(key)) rightLookup.set(key, []);
    rightLookup.get(key)!.push(row);
  }
  const matchedRightKeys = new Set<string>();
  const result: Record<string, unknown>[] = [];
  const rightCols = right.length > 0 ? Object.keys(right[0]) : [];
  const leftCols = left.length > 0 ? Object.keys(left[0]) : [];

  for (const lRow of left) {
    const key = String(lRow[leftCol] ?? "");
    const matches = rightLookup.get(key);
    if (matches) {
      for (const rRow of matches) {
        matchedRightKeys.add(key);
        const merged: Record<string, unknown> = { ...lRow };
        for (const rc of rightCols) { if (rc !== rightCol) merged[rc] = rRow[rc]; }
        result.push(merged);
      }
    } else if (joinType === "left" || joinType === "outer") {
      const merged: Record<string, unknown> = { ...lRow };
      for (const rc of rightCols) { if (rc !== rightCol) merged[rc] = null; }
      result.push(merged);
    }
  }
  if (joinType === "right" || joinType === "outer") {
    for (const rRow of right) {
      const key = String(rRow[rightCol] ?? "");
      if (!matchedRightKeys.has(key)) {
        const merged: Record<string, unknown> = {};
        for (const lc of leftCols) merged[lc] = null;
        merged[leftCol] = rRow[rightCol];
        for (const rc of rightCols) { if (rc !== rightCol) merged[rc] = rRow[rc]; }
        result.push(merged);
      }
    }
  }
  return result;
}

const PALETTE = ["#4361ee", "#2ec4b6", "#e63946", "#f77f00", "#8338ec", "#ffbe0b", "#06d6a0", "#118ab2", "#ef476f", "#073b4c"];

function renderChart(data: Record<string, unknown>[], widget: ChartWidget, allCols: string[]) {
  const { type, x, y, z, size, title, color } = widget;

  if (type === "heatmap-correlation") {
    const numericCols = getNumericCols(data, allCols);
    const cm = computeCorrelation(data, numericCols);
    if (!cm || cm.labels.length < 2) return <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>Need at least 2 numeric columns</p>;
    return (
      <Plot
        data={[{
          z: cm.matrix, x: cm.labels, y: cm.labels, type: "heatmap",
          colorscale: [[0, "#d62828"], [0.5, "#f5f5f5"], [1, "#1e88e5"]],
          zmin: -1, zmax: 1,
          text: cm.matrix.map((row) => row.map((v) => v.toFixed(2))),
          texttemplate: "%{text}", hoverongaps: false,
        }]}
        layout={{ title, height: 400, margin: { t: 40, r: 20, b: 80, l: 80 }, paper_bgcolor: "transparent", plot_bgcolor: "transparent", font: { color: "var(--text-color, #1a1a2e)" } }}
        style={{ width: "100%" }} useResizeHandler config={{ responsive: true }}
      />
    );
  }

  const xVals = data.map((r) => {
    const v = r[x];
    return v != null && !isNaN(Number(v)) ? Number(v) : String(v ?? "");
  });
  const yVals = y ? data.map((r) => Number(r[y])) : [];
  const zVals = (type === "bubble" && z) ? data.map((r) => Number(r[z])) : [];
  const sizeVals = (type === "bubble" && size) ? data.map((r) => Math.abs(Number(r[size]) || 5)) : [];

  const isNumericX = xVals.length > 0 && xVals.some((v) => typeof v === "number");
  const labels = !isNumericX ? [...new Set(xVals.map(String))] : [];

  const commonLayout = {
    title, height: 350,
    margin: { t: 40, r: 20, b: 60, l: 60 },
    paper_bgcolor: "transparent" as const,
    plot_bgcolor: "transparent" as const,
    font: { color: "var(--text-color, #1a1a2e)" },
  };

  switch (type) {
    case "scatter":
      return (
        <Plot
          data={[{ x: xVals, y: yVals, type: "scatter", mode: "markers", marker: { color, size: 6 } }]}
          layout={{ ...commonLayout, xaxis: { title: x }, yaxis: { title: y } }}
          style={{ width: "100%" }} useResizeHandler config={{ responsive: true }}
        />
      );

    case "line":
      return (
        <Plot
          data={[{ x: xVals, y: yVals, type: "scatter", mode: "lines+markers", marker: { color, size: 4 }, line: { color } }]}
          layout={{ ...commonLayout, xaxis: { title: x }, yaxis: { title: y } }}
          style={{ width: "100%" }} useResizeHandler config={{ responsive: true }}
        />
      );

    case "bar":
      return (
        <Plot
          data={[{
            x: isNumericX ? xVals : labels,
            y: isNumericX ? yVals : labels.map((l) => xVals.filter((v) => String(v) === l).length),
            type: "bar", marker: { color },
          }]}
          layout={{ ...commonLayout, xaxis: { title: x }, yaxis: { title: y || "Count" } }}
          style={{ width: "100%" }} useResizeHandler config={{ responsive: true }}
        />
      );

    case "histogram":
      return (
        <Plot
          data={[{ x: xVals.filter((v): v is number => typeof v === "number"), type: "histogram", marker: { color } }]}
          layout={{ ...commonLayout, xaxis: { title: x }, yaxis: { title: "Frequency" } }}
          style={{ width: "100%" }} useResizeHandler config={{ responsive: true }}
        />
      );

    case "box":
      return (
        <Plot
          data={[{ y: xVals.filter((v): v is number => typeof v === "number"), type: "box", marker: { color } }]}
          layout={{ ...commonLayout, yaxis: { title: x } }}
          style={{ width: "100%" }} useResizeHandler config={{ responsive: true }}
        />
      );

    case "pie":
      return (
        <Plot
          data={[{
            labels, values: labels.map((l) => xVals.filter((v) => String(v) === l).length),
            type: "pie", marker: { colors: PALETTE },
          }]}
          layout={{ ...commonLayout, height: 380 }}
          style={{ width: "100%" }} useResizeHandler config={{ responsive: true }}
        />
      );

    case "area":
      return (
        <Plot
          data={[{
            x: xVals, y: yVals, type: "scatter", mode: "lines",
            fill: "tozeroy", line: { color }, marker: { color },
          }]}
          layout={{ ...commonLayout, xaxis: { title: x }, yaxis: { title: y } }}
          style={{ width: "100%" }} useResizeHandler config={{ responsive: true }}
        />
      );

    case "bubble":
      return (
        <Plot
          data={[{
            x: xVals, y: yVals, type: "scatter", mode: "markers",
            marker: { color: zVals.length > 0 ? zVals : color, size: sizeVals.length > 0 ? sizeVals : 8, colorscale: "Viridis", showscale: zVals.length > 0 },
            text: sizeVals.length > 0 ? sizeVals.map((v) => `${size}: ${v.toFixed(1)}`) : undefined,
          }]}
          layout={{ ...commonLayout, xaxis: { title: x }, yaxis: { title: y } }}
          style={{ width: "100%" }} useResizeHandler config={{ responsive: true }}
        />
      );

    default:
      return <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "1rem" }}>Select a chart type</p>;
  }
}

export default function AnalyzePage() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"data" | "dashboard" | "merge">("data");
  const [widgets, setWidgets] = useState<ChartWidget[]>([]);

  const [mergeIdxA, setMergeIdxA] = useState(0);
  const [mergeIdxB, setMergeIdxB] = useState(1);
  const [mergeColA, setMergeColA] = useState("");
  const [mergeColB, setMergeColB] = useState("");
  const [joinType, setJoinType] = useState<"inner" | "left" | "right" | "outer">("inner");
  const [mergedResult, setMergedResult] = useState<{ data: Record<string, unknown>[]; name: string } | null>(null);

  const activeFile: StoredFile | null = files[activeIdx] ?? null;
  const fileOptions = files.map((f, i) => ({ ...f, idx: i }));

  const handleFile = useCallback(async (f: File) => {
    setError(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
      if (json.length === 0) { setError("File is empty"); return; }
      const entry: StoredFile = { id: Date.now(), name: f.name, data: json, columns: Object.keys(json[0]) };
      setFiles((prev) => { setActiveIdx(prev.length); setPage(0); setMergedResult(null); return [...prev, entry]; });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to parse file");
    }
  }, []);

  const removeFile = (idx: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (activeIdx >= next.length) setActiveIdx(Math.max(0, next.length - 1));
      return next;
    });
    setMergedResult(null);
  };

  const switchFile = (idx: number) => {
    setActiveIdx(idx);
    setPage(0);
    setMergedResult(null);
    setWidgets([]);
  };

  const data = activeFile?.data ?? null;
  const columns = activeFile?.columns ?? [];
  const allCols = columns;
  const numericColumns = useMemo(() => data ? getNumericCols(data, columns) : [], [data, columns]);
  const activeStats = useMemo(() => data && numericColumns.length > 0 ? computeAllStats(data, numericColumns) : null, [data, numericColumns]);
  const totalPages = data ? Math.ceil(data.length / ROWS_PER_PAGE) : 0;
  const pageRows = useMemo(() => data ? data.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE) : [], [data, page]);

  const downloadAsCsv = () => {
    if (!data) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeFile?.name?.split(".")[0] ?? "data"}_analysis.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const crossStats = useMemo(() => {
    if (files.length < 2) return null;
    const fileStats = files.map((f) => {
      const nc = getNumericCols(f.data, f.columns);
      return { name: f.name, columns: nc, stats: computeAllStats(f.data, nc) };
    });
    const allNumericCols = [...new Set(fileStats.flatMap((s) => s.columns))];
    return { fileStats, columns: allNumericCols };
  }, [files]);

  const handleMerge = () => {
    if (files.length < 2) return;
    const a = files[mergeIdxA];
    const b = files[mergeIdxB];
    if (!a || !b) return;
    if (!mergeColA || !mergeColB) { setError("Select join columns for both files"); return; }
    try {
      const result = mergeDatasets(a.data, b.data, mergeColA, mergeColB, joinType);
      setMergedResult({ data: result, name: `Merged (${a.name} ⋈ ${b.name})` });
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Merge failed");
    }
  };

  const addWidget = (type: ChartTypeId) => {
    const w = createWidget(type, allCols);
    setWidgets((prev) => [...prev, w]);
  };

  const updateWidget = (id: number, patch: Partial<ChartWidget>) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  const removeWidget = (id: number) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  };

  const chartTypeInfo = CHART_TYPES.find((t) => t.id === "scatter")!;

  const fmt = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(3);

  return (
    <div className="container">
      <div className="page-header fade-in">
        <h1 className="page-title">Data analysis</h1>
        <p className="page-subtitle">Upload CSV or Excel files for interactive charts, statistics, and merging.</p>
      </div>

      <div className="card">
        <FileUpload accept=".csv,.xlsx" label="Upload a file (add to workspace)" onFile={handleFile} />
      </div>

      {files.length > 0 && (
        <div className="card">
          <h3>Files in workspace ({files.length})</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
            {files.map((f, idx) => (
              <button
                key={f.id}
                className={`btn ${idx === activeIdx ? "btn-primary" : "btn-outline"}`}
                onClick={() => switchFile(idx)}
                style={{ fontSize: "0.8rem", padding: "0.35rem 0.8rem", background: idx === activeIdx ? "var(--primary)" : "var(--surface-alt)", color: idx === activeIdx ? "white" : "var(--text)", border: "1px solid var(--border)" }}
              >
                {f.name}
                <span onClick={(e) => { e.stopPropagation(); removeFile(idx); }} style={{ marginLeft: "0.4rem", cursor: "pointer", opacity: 0.6 }}>✕</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      {activeFile && data && (
        <>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            {(["data", "dashboard", "merge"] as const).map((t) => (
              <button
                key={t}
                className="btn"
                onClick={() => setTab(t)}
                style={{
                  background: tab === t ? "var(--primary)" : "var(--surface)",
                  color: tab === t ? "white" : "var(--text)",
                  border: "1px solid var(--border)",
                  fontSize: "0.85rem",
                  padding: "0.4rem 1rem",
                }}
              >
                {t === "data" ? "📊 Data" : t === "dashboard" ? "📈 Dashboard" : "🔗 Merge"}
              </button>
            ))}
          </div>

          {/* ───── TAB: DATA ───── */}
          {tab === "data" && (
            <>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <h3>{activeFile.name}</h3>
                  </div>
                  <button className="btn btn-primary" onClick={downloadAsCsv} style={{ fontSize: "0.8rem", padding: "0.4rem 1rem" }}>Download CSV</button>
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                  {data.length} rows × {columns.length} columns
                  {totalPages > 1 && ` · Page ${page + 1} of ${totalPages}`}
                </p>
                <DataTable columns={columns} rows={pageRows} maxHeight={400} />
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1rem" }}>
                    <button className="btn btn-primary" disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}>◀ Prev</button>
                    <span style={{ padding: "0.4rem 0.8rem", color: "var(--text-secondary)" }}>{page + 1} / {totalPages}</span>
                    <button className="btn btn-primary" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}>Next ▶</button>
                  </div>
                )}
              </div>

              {activeStats && (
                <div className="card">
                  <h3>Statistical Summary</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Column</th><th>Count</th><th>Missing</th><th>Mean</th><th>Std</th>
                          <th>Min</th><th>25%</th><th>50%</th><th>75%</th><th>Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        {numericColumns.map((col) => {
                          const s = activeStats[col];
                          if (!s) return null;
                          return (
                            <tr key={col}>
                              <td style={{ fontWeight: 600 }}>{col}</td>
                              <td>{s.count}</td>
                              <td>{s.missing > 0 ? <span style={{ color: "var(--danger)" }}>{s.missing}</span> : 0}</td>
                              <td>{fmt(s.mean)}</td><td>{fmt(s.std)}</td>
                              <td>{fmt(s.min)}</td><td>{fmt(s.q1)}</td><td>{fmt(s.median)}</td><td>{fmt(s.q3)}</td><td>{fmt(s.max)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {crossStats && crossStats.columns.length > 0 && (
                <div className="card">
                  <h3>Cross-File Comparison</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                    Comparing {crossStats.fileStats.length} file{crossStats.fileStats.length > 1 ? "s" : ""}
                  </p>
                  {crossStats.columns.map((col) => {
                    const rows = crossStats.fileStats.map((fs) => ({ name: fs.name, stat: fs.stats?.[col] })).filter((r) => r.stat);
                    if (rows.length < 2) return null;
                    return (
                      <div key={col} style={{ marginBottom: "1rem" }}>
                        <h4 style={{ fontSize: "0.95rem", marginBottom: "0.3rem" }}>{col}</h4>
                        <table>
                          <thead>
                            <tr><th>File</th><th>Count</th><th>Mean</th><th>Std</th><th>Min</th><th>Max</th></tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr key={r.name}>
                                <td style={{ fontWeight: 600 }}>{r.name}</td>
                                <td>{r.stat!.count}</td>
                                <td>{fmt(r.stat!.mean)}</td><td>{fmt(r.stat!.std)}</td><td>{fmt(r.stat!.min)}</td><td>{fmt(r.stat!.max)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ───── TAB: DASHBOARD ───── */}
          {tab === "dashboard" && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <h3>📈 Dashboard</h3>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {CHART_TYPES.map((ct) => {
                    const needed = ct.minCols;
                    const ok = (ct.id === "heatmap-correlation" ? numericColumns.length : allCols.length) >= needed;
                    return (
                      <button
                        key={ct.id}
                        className="btn"
                        disabled={!ok}
                        onClick={() => addWidget(ct.id)}
                        style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem", background: "var(--surface-alt)", color: ok ? "var(--text)" : "var(--text-muted)", border: "1px solid var(--border)" }}
                        title={!ok ? `Need at least ${needed} column${needed > 1 ? "s" : ""}` : ct.label}
                      >
                        + {ct.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {widgets.length === 0 && (
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>
                  Click a chart type above to add it to the dashboard
                </p>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(450px, 1fr))", gap: "1rem" }}>
                {widgets.map((w) => {
                  const ctInfo = CHART_TYPES.find((t) => t.id === w.type);
                  return (
                    <div key={w.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem", gap: "0.5rem", flexWrap: "wrap" }}>
                        <input
                          value={w.title}
                          onChange={(e) => updateWidget(w.id, { title: e.target.value })}
                          style={{ width: "auto", minWidth: 120, flex: 1, fontSize: "0.85rem", padding: "0.3rem 0.5rem", border: "1px solid var(--border-input)", borderRadius: 4, background: "var(--surface)", color: "var(--text)" }}
                          placeholder="Chart title"
                        />
                        <select
                          value={w.type}
                          onChange={(e) => updateWidget(w.id, { type: e.target.value as ChartTypeId })}
                          style={{ width: "auto", fontSize: "0.75rem", padding: "0.3rem 0.4rem" }}
                        >
                          {CHART_TYPES.map((t) => (
                            <option key={t.id} value={t.id} disabled={allCols.length < t.minCols}>{t.label}</option>
                          ))}
                        </select>
                        <button onClick={() => removeWidget(w.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: "1.1rem", padding: "0 0.2rem" }} title="Remove">✕</button>
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 120px" }}>
                          <label style={{ fontSize: "0.7rem", marginBottom: "0.15rem" }}>X axis</label>
                          <select value={w.x} onChange={(e) => updateWidget(w.id, { x: e.target.value })} style={{ fontSize: "0.75rem", padding: "0.25rem 0.4rem" }}>
                            {allCols.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        {(ctInfo?.minCols ?? 1) >= 2 && (
                          <div style={{ flex: "1 1 120px" }}>
                            <label style={{ fontSize: "0.7rem", marginBottom: "0.15rem" }}>Y axis</label>
                            <select value={w.y} onChange={(e) => updateWidget(w.id, { y: e.target.value })} style={{ fontSize: "0.75rem", padding: "0.25rem 0.4rem" }}>
                              {allCols.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        )}
                        {w.type === "bubble" && (
                          <>
                            <div style={{ flex: "1 1 120px" }}>
                              <label style={{ fontSize: "0.7rem", marginBottom: "0.15rem" }}>Color by</label>
                              <select value={w.z} onChange={(e) => updateWidget(w.id, { z: e.target.value })} style={{ fontSize: "0.75rem", padding: "0.25rem 0.4rem" }}>
                                {allCols.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div style={{ flex: "1 1 120px" }}>
                              <label style={{ fontSize: "0.7rem", marginBottom: "0.15rem" }}>Bubble size</label>
                              <select value={w.size} onChange={(e) => updateWidget(w.id, { size: e.target.value })} style={{ fontSize: "0.75rem", padding: "0.25rem 0.4rem" }}>
                                {allCols.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          </>
                        )}
                        <div style={{ flex: "0 0 auto" }}>
                          <label style={{ fontSize: "0.7rem", marginBottom: "0.15rem" }}>Color</label>
                          <input type="color" value={w.color} onChange={(e) => updateWidget(w.id, { color: e.target.value })} style={{ width: 36, height: 30, padding: 0, border: "1px solid var(--border-input)", borderRadius: 4 }} />
                        </div>
                      </div>

                      {renderChart(data, w, allCols)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ───── TAB: MERGE ───── */}
          {tab === "merge" && files.length >= 2 && (
            <div className="card">
              <h3>🔗 Merge Files</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.8rem" }}>Join two datasets on a common column</p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 200px" }}>
                  <label>Left file</label>
                  <select value={mergeIdxA} onChange={(e) => { setMergeIdxA(Number(e.target.value)); setMergedResult(null); }}>
                    {fileOptions.map((f) => <option key={f.idx} value={f.idx}>{f.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: "1 1 200px" }}>
                  <label>Left join column</label>
                  <select value={mergeColA} onChange={(e) => setMergeColA(e.target.value)}>
                    <option value="">-- select --</option>
                    {(files[mergeIdxA]?.columns ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.8rem" }}>
                <div style={{ flex: "1 1 200px" }}>
                  <label>Right file</label>
                  <select value={mergeIdxB} onChange={(e) => { setMergeIdxB(Number(e.target.value)); setMergedResult(null); }}>
                    {fileOptions.map((f) => <option key={f.idx} value={f.idx}>{f.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: "1 1 200px" }}>
                  <label>Right join column</label>
                  <select value={mergeColB} onChange={(e) => setMergeColB(e.target.value)}>
                    <option value="">-- select --</option>
                    {(files[mergeIdxB]?.columns ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: "0.8rem" }}>
                <label>Join type</label>
                <select value={joinType} onChange={(e) => setJoinType(e.target.value as typeof joinType)}>
                  <option value="inner">Inner (only matching keys)</option>
                  <option value="left">Left (keep all left rows)</option>
                  <option value="right">Right (keep all right rows)</option>
                  <option value="outer">Outer (keep all rows)</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={handleMerge} style={{ marginTop: "0.8rem" }} disabled={!mergeColA || !mergeColB}>Merge</button>
              {mergedResult && (
                <div style={{ marginTop: "1rem" }}>
                  <h4>{mergedResult.name}</h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                    {mergedResult.data.length} rows · {mergedResult.data.length > 0 ? `${Object.keys(mergedResult.data[0]).length} columns` : ""}
                  </p>
                  {mergedResult.data.length > 0 && (
                    <>
                      <DataTable columns={Object.keys(mergedResult.data[0])} rows={mergedResult.data.slice(0, 10)} maxHeight={320} />
                      <button className="btn btn-success" style={{ marginTop: "0.5rem" }} onClick={() => {
                        const ws = XLSX.utils.json_to_sheet(mergedResult.data);
                        const csv = XLSX.utils.sheet_to_csv(ws);
                        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "merged_result.csv";
                        a.click();
                        URL.revokeObjectURL(url);
                      }}>Download merged CSV</button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "merge" && files.length < 2 && (
            <div className="card">
              <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>
                Upload at least 2 files to use the merge tool
              </p>
            </div>
          )}
        </>
      )}

      {activeFile && !data && <Loading text="Loading file..." />}
    </div>
  );
}
