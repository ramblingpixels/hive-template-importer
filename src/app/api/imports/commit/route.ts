import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { parseSpectoraWorkbook } from "@/lib/importer/parse";
import { saveImportedTemplate } from "@/lib/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file = data.get("file");
    const requestedName = data.get("name");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an .xlsx file to import." }, { status: 400 });
    }
    const parsed = await parseSpectoraWorkbook(Buffer.from(await file.arrayBuffer()), file.name);
    if (typeof requestedName === "string" && requestedName.trim()) {
      parsed.name = requestedName.trim();
    }
    const id = await saveImportedTemplate(parsed);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

