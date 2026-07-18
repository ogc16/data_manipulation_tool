"use client";

import { useState, useMemo } from "react";

interface DataTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  maxHeight?: number;
}

type SortDir = "asc" | "desc" | null;

export default function DataTable({ columns, rows, maxHeight }: DataTableProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortCol(null); setSortDir(null); }
      else { setSortCol(col); setSortDir("asc"); }
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortCol || !sortDir) return rows;
    return [...rows].sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const na = Number(va);
      const nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb)) {
        return sortDir === "asc" ? na - nb : nb - na;
      }
      const sa = String(va);
      const sb = String(vb);
      return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [rows, sortCol, sortDir]);

  return (
    <div style={{ overflowX: "auto", maxHeight: maxHeight ?? "none", overflowY: maxHeight ? "auto" : "visible" }}>
      <table>
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            {columns.map((col) => (
              <th
                key={col}
                onClick={() => handleSort(col)}
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                {col}{" "}
                {sortCol === col ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i}>
              <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{i + 1}</td>
              {columns.map((col) => (
                <td key={col}>{String(row[col] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
