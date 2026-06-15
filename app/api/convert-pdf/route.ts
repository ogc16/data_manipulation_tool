import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buf });
    const textResult = await parser.getText();
    const text = textResult.text;

    const lines = text
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    const csvLines: string[] = [];
    for (const line of lines) {
      const cells = line.split(/\s{2,}|\t/).map((c: string) => {
        const trimmed = c.trim();
        return trimmed.includes(",") ? `"${trimmed}"` : trimmed;
      });
      csvLines.push(cells.join(","));
    }

    const csv = csvLines.join("\n");

    await parser.destroy();

    return NextResponse.json({ csv });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF conversion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
