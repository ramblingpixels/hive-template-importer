import { readFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error("Usage: npm run import:template -- fixtures/template-export.xls");
}

const { parseSpectoraWorkbook } = await import("../src/lib/importer/parse");
const { saveImportedTemplate } = await import("../src/lib/repository");

const absolutePath = path.resolve(process.cwd(), inputPath);
const buffer = await readFile(absolutePath);
const parsed = await parseSpectoraWorkbook(buffer, path.basename(inputPath));
const id = await saveImportedTemplate(parsed);

console.log(`Imported template: ${id}`);
console.log(`Sections: ${parsed.summary.sections}`);
console.log(`Items: ${parsed.summary.items}`);
console.log(`Comments: ${parsed.summary.comments}`);
console.log(`Warnings: ${parsed.warnings.length}`);
