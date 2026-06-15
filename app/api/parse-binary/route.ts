import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const name = file.name.toLowerCase();

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    let text: string;

    if (name.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buf });
      const textResult = await parser.getText();
      text = textResult.text;
      await parser.destroy();
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: buf });
      text = result.value;
    } else {
      return NextResponse.json({ error: "Only PDF and Word (.docx) files are supported" }, { status: 400 });
    }

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      return NextResponse.json({ rows: [], columns: [] });
    }

    const cellValues = lines.map((line) =>
      line.split(/\s{2,}|\t/).map((c) => c.trim()).filter((c) => c.length > 0)
    );

    const columns = cellValues[0];
    const rows: Record<string, unknown>[] = cellValues.slice(1).map((cells) => {
      const row: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        row[col] = cells[i] ?? null;
      });
      return row;
    });

    return NextResponse.json({ rows, columns });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parsing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
