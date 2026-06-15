"use client";

import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import dynamic from "next/dynamic";
import FileUpload from "../components/FileUpload";
import DataTable from "../components/DataTable";
import ErrorMessage from "../components/ErrorMessage";
import Loading from "../components/Loading";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

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

function mergeDatasets(
  left: Record<string, unknown>[],
  right: Record<string, unknown>[],
  leftCol: string,
  rightCol: string,
  joinType: "inner" | "left" | "right" | "outer",
): Record<string, unknown>[] {
  const rightLookup = new Map<string, Record<string, unknown>[]>();
  for (const row of right) {
    const key = String(row[rightCol] ?? "");
    if (!rightLookup.has(key)) rightLookup.set(key, []);
    rightLookup.get(key)!.push(row);
  }

  const leftKeys = new Set<string>();
  const matchedRightKeys = new Set<string>();
  const result: Record<string, unknown>[] = [];

  const rightCols = right.length > 0 ? Object.keys(right[0]) : [];
  const leftCols = left.length > 0 ? Object.keys(left[0]) : [];

  for (const lRow of left) {
    const key = String(lRow[leftCol] ?? "");
    leftKeys.add(key);
    const matches = rightLookup.get(key);
    if (matches) {
      for (const rRow of matches) {
        matchedRightKeys.add(key);
        const merged: Record<string, unknown> = { ...lRow };
        for (const rc of rightCols) {
          if (rc === rightCol) continue;
          merged[rc] = rRow[rc];
        }
        result.push(merged);
      }
    } else if (joinType === "left" || joinType === "outer") {
      const merged: Record<string, unknown> = { ...lRow };
      for (const rc of rightCols) {
        if (rc === rightCol) continue;
        merged[rc] = null;
      }
      result.push(merged);
    }
  }

  if (joinType === "right" || joinType === "outer") {
    for (const rRow of right) {
      const key = String(rRow[rightCol] ?? "");
      if (!matchedRightKeys.has(key)) {
        const merged: Record<string, unknown> = {};
        for (const lc of leftCols) {
          merged[lc] = null;
        }
        merged[leftCol] = rRow[rightCol];
        for (const rc of rightCols) {
          if (rc === rightCol) continue;
          merged[rc] = rRow[rc];
        }
        result.push(merged);
      }
    }
  }

  return result;
}

export default function AnalyzePage() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  const [histColumn, setHistColumn] = useState("");

  const [mergeIdxA, setMergeIdxA] = useState(0);
  const [mergeIdxB, setMergeIdxB] = useState(1);
  const [mergeColA, setMergeColA] = useState("");
  const [mergeColB, setMergeColB] = useState("");
  const [joinType, setJoinType] = useState<"inner" | "left" | "right" | "outer">("inner");
  const [mergedResult, setMergedResult] = useState<{ data: Record<string, unknown>[]; name: string } | null>(null);

  let nextId = useMemo(() => files.length + 1, [files.length]);

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

      const entry: StoredFile = {
        id: Date.now(),
        name: f.name,
        data: json,
        columns: Object.keys(json[0]),
      };

      setFiles((prev) => {
        const idx = prev.length;
        setActiveIdx(idx);
        setPage(0);
        setXAxis(entry.columns[0] ?? "");
        setYAxis(entry.columns[1] ?? entry.columns[0] ?? "");
        setHistColumn(entry.columns[0] ?? "");
        setMergedResult(null);
        return [...prev, entry];
      });
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
    const f = files[idx];
    if (f) {
      const nc = getNumericCols(f.data, f.columns);
      setXAxis(nc[0] ?? f.columns[0] ?? "");
      setYAxis(nc[1] ?? nc[0] ?? f.columns[0] ?? "");
      setHistColumn(nc[0] ?? f.columns[0] ?? "");
    }
  };

  const data = activeFile?.data ?? null;
  const columns = activeFile?.columns ?? [];
  const numericColumns = useMemo(() => data ? getNumericCols(data, columns) : [], [data, columns]);
  const stats = useMemo(() => data && numericColumns.length > 0 ? computeAllStats(data, numericColumns) : null, [data, numericColumns]);
  const corrMatrix = useMemo(() => data ? computeCorrelation(data, numericColumns) : null, [data, numericColumns]);

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

  const activeNumericCols = useMemo(() => data ? getNumericCols(data, columns) : [], [data, columns]);
  const activeStats = useMemo(() => data && activeNumericCols.length > 0 ? computeAllStats(data, activeNumericCols) : null, [data, activeNumericCols]);

  const availableMergeA = fileOptions.filter((_, i) => i !== mergeIdxB);
  const availableMergeB = fileOptions.filter((_, i) => i !== mergeIdxA);

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

  const fmt = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(3);

  // Cross-file stats comparison
  const crossStats = useMemo(() => {
    if (files.length < 2) return null;
    const allStats = files.map((f) => {
      const nc = getNumericCols(f.data, f.columns);
      const s = computeAllStats(f.data, nc);
      return { name: f.name, columns: nc, stats: s };
    });

    const allNumericCols = [...new Set(allStats.flatMap((s) => s.columns))];
    return { fileStats: allStats, columns: allNumericCols };
  }, [files]);

  return (
    <div className="container">
      <h1 className="page-title">📊 Data Analysis Tool</h1>
      <hr className="divider" />

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
                <span
                  onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                  style={{ marginLeft: "0.4rem", cursor: "pointer", opacity: 0.6, fontSize: "0.9rem" }}
                >
                  ✕
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      {activeFile && data && (
        <>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3>{activeFile.name}</h3>
              </div>
              <button className="btn btn-primary" onClick={downloadAsCsv} style={{ fontSize: "0.8rem", padding: "0.4rem 1rem" }}>
                Download CSV
              </button>
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
                    {activeNumericCols.map((col) => {
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

          {activeNumericCols.length >= 2 && (
            <div className="card">
              <h3>Scatter Plot</h3>
              <div style={{ display: "flex", gap: "1rem", margin: "1rem 0", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 200px" }}>
                  <label>X-axis</label>
                  <select value={xAxis} onChange={(e) => setXAxis(e.target.value)}>
                    {activeNumericCols.map((col) => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
                <div style={{ flex: "1 1 200px" }}>
                  <label>Y-axis</label>
                  <select value={yAxis} onChange={(e) => setYAxis(e.target.value)}>
                    {activeNumericCols.map((col) => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              </div>
              <Plot
                data={[{
                  x: data.map((r) => Number(r[xAxis])),
                  y: data.map((r) => Number(r[yAxis])),
                  type: "scatter", mode: "markers",
                  marker: { color: "#4361ee", size: 6 },
                }]}
                layout={{ title: `${yAxis} vs ${xAxis}`, height: 400, xaxis: { title: xAxis }, yaxis: { title: yAxis }, margin: { t: 40, r: 20, b: 50, l: 60 }, paper_bgcolor: "transparent", plot_bgcolor: "transparent", font: { color: "var(--text-color, #1a1a2e)" } }}
                style={{ width: "100%" }} useResizeHandler config={{ responsive: true }}
              />
            </div>
          )}

          {activeNumericCols.length >= 1 && (
            <div className="card">
              <h3>Histogram</h3>
              <div style={{ margin: "1rem 0" }}>
                <label>Select column</label>
                <select value={histColumn} onChange={(e) => setHistColumn(e.target.value)}>
                  {activeNumericCols.map((col) => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <Plot
                data={[{ x: data.map((r) => Number(r[histColumn])), type: "histogram", marker: { color: "#2ec4b6" } }]}
                layout={{ title: `Distribution of ${histColumn}`, height: 400, xaxis: { title: histColumn }, yaxis: { title: "Frequency" }, margin: { t: 40, r: 20, b: 50, l: 60 }, paper_bgcolor: "transparent", plot_bgcolor: "transparent", font: { color: "var(--text-color, #1a1a2e)" } }}
                style={{ width: "100%" }} useResizeHandler config={{ responsive: true }}
              />
            </div>
          )}

          {corrMatrix && corrMatrix.labels.length >= 2 && (
            <div className="card">
              <h3>Correlation Heatmap</h3>
              <Plot
                data={[{
                  z: corrMatrix.matrix, x: corrMatrix.labels, y: corrMatrix.labels,
                  type: "heatmap", colorscale: [[0, "#d62828"], [0.5, "#f5f5f5"], [1, "#1e88e5"]],
                  zmin: -1, zmax: 1,
                  text: corrMatrix.matrix.map((row) => row.map((v) => v.toFixed(2))),
                  texttemplate: "%{text}", hoverongaps: false,
                }]}
                layout={{ title: "Correlation Matrix", height: 500, margin: { t: 40, r: 20, b: 100, l: 100 }, paper_bgcolor: "transparent", plot_bgcolor: "transparent", font: { color: "var(--text-color, #1a1a2e)" } }}
                style={{ width: "100%" }} useResizeHandler config={{ responsive: true }}
              />
            </div>
          )}
        </>
      )}

      {activeFile && !data && <Loading text="Loading file..." />}

      {/* Cross-file stats comparison */}
      {crossStats && crossStats.columns.length > 0 && (
        <div className="card">
          <h3>Cross-File Comparison</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            Comparing {crossStats.fileStats.length} file{crossStats.fileStats.length > 1 ? "s" : ""}
          </p>
          {crossStats.columns.map((col) => {
            const rows = crossStats.fileStats.map((fs) => {
              const s = fs.stats?.[col];
              return { name: fs.name, stat: s };
            }).filter((r) => r.stat);
            if (rows.length < 2) return null;
            return (
              <div key={col} style={{ marginBottom: "1rem" }}>
                <h4 style={{ fontSize: "0.95rem", marginBottom: "0.3rem" }}>{col}</h4>
                <table>
                  <thead>
                    <tr>
                      <th>File</th><th>Count</th><th>Mean</th><th>Std</th><th>Min</th><th>Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.name}>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td>{r.stat!.count}</td>
                        <td>{fmt(r.stat!.mean)}</td>
                        <td>{fmt(r.stat!.std)}</td>
                        <td>{fmt(r.stat!.min)}</td>
                        <td>{fmt(r.stat!.max)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* Merge / Join */}
      {files.length >= 2 && (
        <div className="card">
          <h3>Merge Files</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.8rem" }}>
            Join two datasets on a common column
          </p>

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

          <button className="btn btn-primary" onClick={handleMerge} style={{ marginTop: "0.8rem" }} disabled={!mergeColA || !mergeColB}>
            Merge
          </button>

          {mergedResult && (
            <div style={{ marginTop: "1rem" }}>
              <h4>{mergedResult.name}</h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                {mergedResult.data.length} rows · {mergedResult.data.length > 0 ? `${Object.keys(mergedResult.data[0]).length} columns` : ""}
              </p>
              {mergedResult.data.length > 0 && (
                <>
                  <DataTable
                    columns={Object.keys(mergedResult.data[0])}
                    rows={mergedResult.data.slice(0, 10)}
                    maxHeight={320}
                  />
                  <button
                    className="btn btn-success"
                    style={{ marginTop: "0.5rem" }}
                    onClick={() => {
                      const ws = XLSX.utils.json_to_sheet(mergedResult.data);
                      const csv = XLSX.utils.sheet_to_csv(ws);
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "merged_result.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download merged CSV
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
