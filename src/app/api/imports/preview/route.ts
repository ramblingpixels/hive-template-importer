import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { parseSpectoraWorkbook } from "@/lib/importer/parse";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a Spectora workbook export to preview." }, { status: 400 });
    }
    const parsed = await parseSpectoraWorkbook(Buffer.from(await file.arrayBuffer()), file.name);
    return NextResponse.json({
      name: parsed.name,
      sourceFilename: parsed.sourceFilename,
      sourceFingerprint: parsed.sourceFingerprint,
      summary: parsed.summary,
      warnings: parsed.warnings,
      outline: parsed.sections.slice(0, 8).map((section) => ({
        name: section.name,
        itemCount: section.items.length,
        commentCount: section.items.reduce((total, item) => total + item.comments.length, 0),
        items: section.items.slice(0, 5).map((item) => ({
          name: item.name,
          commentCount: item.comments.length,
        })),
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
