import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const { createDemoTemplate } = await import("../src/lib/demo-template");
const { listTemplates, saveImportedTemplate } = await import("../src/lib/repository");

const existing = await listTemplates();
if (existing.length > 0) {
  console.log(`Seed skipped: ${existing.length} template(s) already exist.`);
  process.exit(0);
}

const id = await saveImportedTemplate(createDemoTemplate());
console.log(`Seeded demo template: ${id}`);

