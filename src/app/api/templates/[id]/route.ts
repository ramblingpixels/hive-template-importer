import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api";
import { getTemplate, updateTemplate } from "@/lib/repository";

const editSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  sections: z.array(z.object({ id: z.uuid(), name: z.string().trim().min(1).max(200) })).optional(),
  items: z.array(z.object({ id: z.uuid(), name: z.string().trim().min(1).max(200) })).optional(),
  comments: z.array(z.object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(240),
    bodyHtml: z.string().max(250_000),
  })).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid template id." }, { status: 400 });
    }
    const template = await getTemplate(id);
    if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });
    return NextResponse.json({ template });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid template id." }, { status: 400 });
    }
    const parsed = editSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "One or more edits are invalid.", details: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }
    await updateTemplate(id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

