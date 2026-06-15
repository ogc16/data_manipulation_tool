import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";

export async function POST(request: NextRequest) {
  try {
    const { rows, columns, filename } = await request.json() as {
      rows: Record<string, unknown>[];
      columns: string[];
      filename: string;
    };

    if (!rows || !columns || !filename) {
      return NextResponse.json({ error: "Missing rows, columns, or filename" }, { status: 400 });
    }

    const title = new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: filename.replace(/\.\w+$/, ""), bold: true, size: 32 })],
    });

    const headerRow = new TableRow({
      tableHeader: true,
      children: columns.map(
        (col) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: col, bold: true, size: 20 })] })],
          })
      ),
    });

    const dataRows = rows.map(
      (row) =>
        new TableRow({
          children: columns.map(
            (col) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: String(row[col] ?? ""), size: 20 })] })],
              })
          ),
        })
    );

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    });

    const doc = new Document({
      title: filename,
      sections: [{ children: [title, table] }],
    });

    const docxBuffer = await Packer.toBuffer(doc);
    const base64 = docxBuffer.toString("base64");

    return NextResponse.json({ base64, filename: filename.replace(/\.\w+$/, ".docx") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Word generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
