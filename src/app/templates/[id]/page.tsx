import { TemplateEditor } from "@/components/template-editor";

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TemplateEditor id={id} />;
}

