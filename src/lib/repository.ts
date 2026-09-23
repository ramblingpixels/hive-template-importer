import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";

import { getDatabase } from "@/lib/db";
import { htmlToPlainText, sanitizeRichHtml } from "@/lib/importer/html";
import type {
  ImportWarning,
  ParsedTemplate,
  StoredComment,
  StoredItem,
  StoredSection,
  StoredTemplate,
  TemplateListItem,
} from "@/types/template";

type JsonValue = Parameters<Sql["json"]>[0];

function asJson(value: unknown): JsonValue {
  return value as JsonValue;
}

function dateString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function listTemplates(): Promise<TemplateListItem[]> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT
      t.id,
      t.name,
      t.source_filename,
      t.source_fingerprint,
      t.copied_from_id,
      t.created_at,
      t.updated_at,
      count(DISTINCT s.id)::int AS section_count,
      count(DISTINCT i.id)::int AS item_count,
      count(DISTINCT c.id)::int AS comment_count,
      count(DISTINCT w.id)::int AS warning_count
    FROM templates t
    LEFT JOIN sections s ON s.template_id = t.id
    LEFT JOIN items i ON i.section_id = s.id
    LEFT JOIN comments c ON c.item_id = i.id
    LEFT JOIN import_warnings w ON w.template_id = t.id
    GROUP BY t.id
    ORDER BY t.updated_at DESC
  `;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sourceFilename: row.source_filename,
    sourceFingerprint: row.source_fingerprint,
    copiedFromId: row.copied_from_id,
    createdAt: dateString(row.created_at),
    updatedAt: dateString(row.updated_at),
    sectionCount: row.section_count,
    itemCount: row.item_count,
    commentCount: row.comment_count,
    warningCount: row.warning_count,
  }));
}

export async function saveImportedTemplate(parsed: ParsedTemplate): Promise<string> {
  const sql = getDatabase();
  return sql.begin(async (transaction) => {
    const templateId = randomUUID();
    await transaction`
      INSERT INTO templates (
        id, name, source_filename, source_fingerprint, import_summary
      ) VALUES (
        ${templateId},
        ${parsed.name},
        ${parsed.sourceFilename},
        ${parsed.sourceFingerprint},
        ${transaction.json(asJson(parsed.summary))}
      )
    `;

    const sectionRows = [];
    const itemRows = [];
    const commentRows = [];

    for (const section of parsed.sections) {
      const sectionId = randomUUID();
      sectionRows.push({
        id: sectionId,
        template_id: templateId,
        source_key: section.sourceKey,
        name: section.name,
        position: section.position,
        metadata: section.metadata,
      });

      for (const item of section.items) {
        const itemId = randomUUID();
        itemRows.push({
          id: itemId,
          section_id: sectionId,
          source_key: item.sourceKey,
          name: item.name,
          position: item.position,
          metadata: item.metadata,
        });

        for (const comment of item.comments) {
          commentRows.push({
            id: randomUUID(),
            item_id: itemId,
            source_key: comment.sourceKey,
            name: comment.name,
            source_html: comment.sourceHtml,
            body_html: comment.bodyHtml,
            plain_text: comment.plainText,
            comment_type: comment.commentType,
            category: comment.category,
            position: comment.position,
            source_row: comment.sourceRow,
            metadata: comment.metadata,
          });
        }
      }
    }

    if (sectionRows.length > 0) {
      await transaction`INSERT INTO sections ${transaction(sectionRows)}`;
    }
    if (itemRows.length > 0) {
      await transaction`INSERT INTO items ${transaction(itemRows)}`;
    }
    if (commentRows.length > 0) {
      await transaction`INSERT INTO comments ${transaction(commentRows)}`;
    }

    const warningRows = parsed.warnings.map((warning) => ({
      id: randomUUID(),
      template_id: templateId,
      code: warning.code,
      severity: warning.severity,
      message: warning.message,
      row_number: warning.rowNumber ?? null,
      field: warning.field ?? null,
      raw_data: warning.rawData ?? null,
    }));
    if (warningRows.length > 0) {
      await transaction`INSERT INTO import_warnings ${transaction(warningRows)}`;
    }

    return templateId;
  });
}

export async function getTemplate(id: string): Promise<StoredTemplate | null> {
  const sql = getDatabase();
  const [templates, sectionRows, itemRows, commentRows, warningRows] = await Promise.all([
    sql`SELECT * FROM templates WHERE id = ${id}`,
    sql`SELECT * FROM sections WHERE template_id = ${id} ORDER BY position`,
    sql`
      SELECT i.* FROM items i
      JOIN sections s ON s.id = i.section_id
      WHERE s.template_id = ${id}
      ORDER BY s.position, i.position
    `,
    sql`
      SELECT c.* FROM comments c
      JOIN items i ON i.id = c.item_id
      JOIN sections s ON s.id = i.section_id
      WHERE s.template_id = ${id}
      ORDER BY s.position, i.position, c.position
    `,
    sql`SELECT * FROM import_warnings WHERE template_id = ${id} ORDER BY created_at, row_number`,
  ]);

  const templateRow = templates[0];
  if (!templateRow) return null;

  const commentsByItem = new Map<string, StoredComment[]>();
  for (const row of commentRows) {
    const comment: StoredComment = {
      id: row.id,
      itemId: row.item_id,
      sourceKey: row.source_key,
      name: row.name,
      sourceHtml: row.source_html,
      bodyHtml: row.body_html,
      plainText: row.plain_text,
      commentType: row.comment_type,
      category: row.category,
      position: row.position,
      sourceRow: row.source_row,
      metadata: row.metadata ?? {},
      updatedAt: dateString(row.updated_at),
    };
    const list = commentsByItem.get(comment.itemId) ?? [];
    list.push(comment);
    commentsByItem.set(comment.itemId, list);
  }

  const itemsBySection = new Map<string, StoredItem[]>();
  for (const row of itemRows) {
    const item: StoredItem = {
      id: row.id,
      sectionId: row.section_id,
      sourceKey: row.source_key,
      name: row.name,
      position: row.position,
      metadata: row.metadata ?? {},
      updatedAt: dateString(row.updated_at),
      comments: commentsByItem.get(row.id) ?? [],
    };
    const list = itemsBySection.get(item.sectionId) ?? [];
    list.push(item);
    itemsBySection.set(item.sectionId, list);
  }

  const sections: StoredSection[] = sectionRows.map((row) => ({
    id: row.id,
    templateId: row.template_id,
    sourceKey: row.source_key,
    name: row.name,
    position: row.position,
    metadata: row.metadata ?? {},
    updatedAt: dateString(row.updated_at),
    items: itemsBySection.get(row.id) ?? [],
  }));

  const warnings: ImportWarning[] = warningRows.map((row) => ({
    code: row.code,
    severity: row.severity,
    message: row.message,
    rowNumber: row.row_number ?? undefined,
    field: row.field ?? undefined,
    rawData: row.raw_data ?? undefined,
  }));

  return {
    id: templateRow.id,
    name: templateRow.name,
    sourceFilename: templateRow.source_filename,
    sourceFingerprint: templateRow.source_fingerprint,
    copiedFromId: templateRow.copied_from_id,
    importSummary: templateRow.import_summary,
    createdAt: dateString(templateRow.created_at),
    updatedAt: dateString(templateRow.updated_at),
    sections,
    warnings,
  };
}

export type TemplateEdits = {
  name?: string;
  sections?: Array<{ id: string; name: string }>;
  items?: Array<{ id: string; name: string }>;
  comments?: Array<{ id: string; name: string; bodyHtml: string }>;
};

export async function updateTemplate(id: string, edits: TemplateEdits): Promise<void> {
  const sql = getDatabase();
  await sql.begin(async (transaction) => {
    if (edits.name !== undefined) {
      await transaction`
        UPDATE templates SET name = ${edits.name}, updated_at = now()
        WHERE id = ${id}
      `;
    }
    for (const section of edits.sections ?? []) {
      await transaction`
        UPDATE sections SET name = ${section.name}, updated_at = now()
        WHERE id = ${section.id} AND template_id = ${id}
      `;
    }
    for (const item of edits.items ?? []) {
      await transaction`
        UPDATE items SET name = ${item.name}, updated_at = now()
        WHERE id = ${item.id}
          AND section_id IN (SELECT id FROM sections WHERE template_id = ${id})
      `;
    }
    for (const comment of edits.comments ?? []) {
      await transaction`
        UPDATE comments
        SET name = ${comment.name},
            body_html = ${sanitizeRichHtml(comment.bodyHtml)},
            plain_text = ${htmlToPlainText(comment.bodyHtml)}, updated_at = now()
        WHERE id = ${comment.id}
          AND item_id IN (
            SELECT i.id FROM items i
            JOIN sections s ON s.id = i.section_id
            WHERE s.template_id = ${id}
          )
      `;
    }
    await transaction`UPDATE templates SET updated_at = now() WHERE id = ${id}`;
  });
}

export async function copyTemplate(id: string, requestedName?: string): Promise<string | null> {
  const source = await getTemplate(id);
  if (!source) return null;
  const sql = getDatabase();

  return sql.begin(async (transaction) => {
    const copyId = randomUUID();
    await transaction`
      INSERT INTO templates (
        id, name, source_filename, source_fingerprint, source_type,
        copied_from_id, import_summary
      ) VALUES (
        ${copyId},
        ${requestedName?.trim() || `${source.name} — Copy`},
        ${source.sourceFilename}, ${source.sourceFingerprint},
        'spectora_html_text_xlsx', ${source.id},
        ${transaction.json(asJson(source.importSummary))}
      )
    `;

    const sectionRows = [];
    const itemRows = [];
    const commentRows = [];

    for (const section of source.sections) {
      const sectionId = randomUUID();
      sectionRows.push({
        id: sectionId,
        template_id: copyId,
        source_key: section.sourceKey,
        name: section.name,
        position: section.position,
        metadata: section.metadata,
      });

      for (const item of section.items) {
        const itemId = randomUUID();
        itemRows.push({
          id: itemId,
          section_id: sectionId,
          source_key: item.sourceKey,
          name: item.name,
          position: item.position,
          metadata: item.metadata,
        });

        for (const comment of item.comments) {
          commentRows.push({
            id: randomUUID(),
            item_id: itemId,
            source_key: comment.sourceKey,
            name: comment.name,
            source_html: comment.sourceHtml,
            body_html: comment.bodyHtml,
            plain_text: comment.plainText,
            comment_type: comment.commentType,
            category: comment.category,
            position: comment.position,
            source_row: comment.sourceRow,
            metadata: comment.metadata,
          });
        }
      }
    }

    if (sectionRows.length > 0) {
      await transaction`INSERT INTO sections ${transaction(sectionRows)}`;
    }
    if (itemRows.length > 0) {
      await transaction`INSERT INTO items ${transaction(itemRows)}`;
    }
    if (commentRows.length > 0) {
      await transaction`INSERT INTO comments ${transaction(commentRows)}`;
    }

    const warningRows = source.warnings.map((warning) => ({
      id: randomUUID(),
      template_id: copyId,
      code: warning.code,
      severity: warning.severity,
      message: warning.message,
      row_number: warning.rowNumber ?? null,
      field: warning.field ?? null,
      raw_data: warning.rawData ?? null,
    }));
    if (warningRows.length > 0) {
      await transaction`INSERT INTO import_warnings ${transaction(warningRows)}`;
    }

    return copyId;
  });
}
