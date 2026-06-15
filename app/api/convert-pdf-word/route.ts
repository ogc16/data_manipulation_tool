import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

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
    await parser.destroy();

    const rawText = textResult.text;
    const blocks = rawText.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b.length > 0);

    const children: Paragraph[] = [];

    for (const block of blocks) {
      const lines = block.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

      if (lines.length === 1 && lines[0].length < 80) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: lines[0], bold: true, size: 28 })],
          }),
        );
        continue;
      }

      for (const line of lines) {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: line, size: 22 })],
          }),
        );
      }
    }

    const doc = new Document({
      title: file.name.replace(/\.pdf$/i, ""),
      description: "Converted from PDF",
      sections: [{ children }],
    });

    const docxBuffer = await Packer.toBuffer(doc);
    const base64 = docxBuffer.toString("base64");

    return NextResponse.json({ base64, filename: file.name.replace(/\.pdf$/i, ".docx") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF to Word conversion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
