import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api";
import { copyTemplate } from "@/lib/repository";

type RouteContext = { params: Promise<{ id: string }> };

const copySchema = z.object({ name: z.string().trim().min(1).max(160).optional() });

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid template id." }, { status: 400 });
    }
    const parsed = copySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "The copy name is invalid." }, { status: 400 });
    }
    const copyId = await copyTemplate(id, parsed.data.name);
    if (!copyId) return NextResponse.json({ error: "Template not found." }, { status: 404 });
    return NextResponse.json({ id: copyId }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

