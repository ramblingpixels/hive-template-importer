import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { listTemplates } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ templates: await listTemplates() });
  } catch (error) {
    return apiError(error);
  }
}

