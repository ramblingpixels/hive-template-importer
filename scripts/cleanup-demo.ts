import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const { getDatabase } = await import("../src/lib/db");
const { decodeHtmlEntities } = await import("../src/lib/importer/html");

const sql = getDatabase();

try {
  const verificationCopies = await sql`
    DELETE FROM templates
    WHERE name LIKE ${"%Verification Copy%"}
       OR id = ${"78eb8739-35ac-406e-9786-c09229d808eb"}
    RETURNING id
  `;

  const sections = await sql`SELECT id, name FROM sections WHERE name LIKE ${"%&%"}`;
  for (const section of sections) {
    await sql`UPDATE sections SET name = ${decodeHtmlEntities(section.name)}, updated_at = now() WHERE id = ${section.id}`;
  }

  const items = await sql`SELECT id, name FROM items WHERE name LIKE ${"%&%"}`;
  for (const item of items) {
    await sql`UPDATE items SET name = ${decodeHtmlEntities(item.name)}, updated_at = now() WHERE id = ${item.id}`;
  }

  const comments = await sql`SELECT id, name FROM comments WHERE name LIKE ${"%&%"}`;
  for (const comment of comments) {
    await sql`UPDATE comments SET name = ${decodeHtmlEntities(comment.name)}, updated_at = now() WHERE id = ${comment.id}`;
  }

  await sql`UPDATE templates SET name = ${"InterNACHI Residential 2026-09-23"}, updated_at = now() WHERE id = ${"53cb6e52-43ff-47fd-81f3-fbc2c95b64cc"}`;

  console.log(`Removed verification copies: ${verificationCopies.length}`);
  console.log(`Decoded sections: ${sections.length}`);
  console.log(`Decoded items: ${items.length}`);
  console.log(`Decoded comments: ${comments.length}`);
} finally {
  await sql.end();
}
