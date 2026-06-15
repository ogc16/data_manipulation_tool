"use client";

import { useRef, useState } from "react";

interface FileUploadProps {
  accept: string;
  label: string;
  onFile: (file: File) => void;
  file?: File | null;
}

export default function FileUpload({ accept, label, onFile, file }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type) onFile(f);
    else if (f) onFile(f);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div>
      <label>{label}</label>
      <div
        className={`file-drop${dragging ? " active" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          style={{ display: "none" }}
        />
        {file ? (
          <p style={{ color: "#4361ee", fontWeight: 500, fontSize: "0.95rem" }}>
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        ) : (
          <>
            <p style={{ color: "#667085", marginBottom: "0.3rem" }}>
              Drag & drop or click to browse
            </p>
            <p style={{ fontSize: "0.8rem", color: "#98a2b3" }}>
              Accepted: {accept}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
