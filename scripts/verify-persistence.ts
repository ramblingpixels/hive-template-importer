import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const templateId = process.argv[2];
if (!templateId) {
  throw new Error("Usage: npm run verify:persistence -- TEMPLATE_ID");
}

const { copyTemplate, getTemplate, updateTemplate } = await import("../src/lib/repository");

const originalBefore = await getTemplate(templateId);
if (!originalBefore) {
  throw new Error(`Template not found: ${templateId}`);
}

const firstSection = originalBefore.sections[0];
const firstItem = firstSection?.items[0];
const firstComment = firstItem?.comments[0];
if (!firstSection || !firstItem || !firstComment) {
  throw new Error("Imported template does not have enough content to verify editing.");
}

const copyId = await copyTemplate(templateId, `${originalBefore.name} - Verification Copy`);
if (!copyId) {
  throw new Error("Copy failed.");
}

const copyBefore = await getTemplate(copyId);
if (!copyBefore) {
  throw new Error("Copied template could not be reloaded.");
}

const copySection = copyBefore.sections[0];
const copyItem = copySection.items[0];
const copyComment = copyItem.comments[0];
const marker = `verified-${Date.now()}`;

await updateTemplate(copyId, {
  sections: [{ id: copySection.id, name: `${copySection.name} ${marker}` }],
  items: [{ id: copyItem.id, name: `${copyItem.name} ${marker}` }],
  comments: [{
    id: copyComment.id,
    name: `${copyComment.name} ${marker}`,
    bodyHtml: `${copyComment.bodyHtml}<p>${marker}</p>`,
  }],
});

const originalAfter = await getTemplate(templateId);
const copyAfter = await getTemplate(copyId);
if (!originalAfter || !copyAfter) {
  throw new Error("Reload after edit failed.");
}

const originalStillUnchanged =
  originalAfter.sections[0].name === firstSection.name &&
  originalAfter.sections[0].items[0].name === firstItem.name &&
  originalAfter.sections[0].items[0].comments[0].name === firstComment.name &&
  originalAfter.sections[0].items[0].comments[0].bodyHtml === firstComment.bodyHtml;

const copyChanged =
  copyAfter.sections[0].name.includes(marker) &&
  copyAfter.sections[0].items[0].name.includes(marker) &&
  copyAfter.sections[0].items[0].comments[0].name.includes(marker) &&
  copyAfter.sections[0].items[0].comments[0].bodyHtml.includes(marker);

if (!originalStillUnchanged || !copyChanged) {
  throw new Error("Copy independence verification failed.");
}

console.log(`Original template: ${templateId}`);
console.log(`Verification copy: ${copyId}`);
console.log(`Marker: ${marker}`);
console.log("Persistence and independent copy verification passed.");
