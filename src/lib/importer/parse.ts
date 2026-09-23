import { createHash } from "node:crypto";
import path from "node:path";
import readXlsxFile, { type CellValue } from "read-excel-file/node";

import type {
  ImportWarning,
  ParsedComment,
  ParsedItem,
  ParsedSection,
  ParsedTemplate,
  SourceMetadata,
} from "@/types/template";

import {
  findHeaderIndex,
  HEADER_ALIASES,
  KNOWN_NORMALIZED_HEADERS,
  normalizeHeader,
} from "./columns";
import { containsPotentiallyUnsafeMarkup, htmlToPlainText, sanitizeRichHtml } from "./html";

type RawCell = CellValue | null;

export class ImportValidationError extends Error {
  warnings: ImportWarning[];

  constructor(message: string, warnings: ImportWarning[]) {
    super(message);
    this.name = "ImportValidationError";
    this.warnings = warnings;
  }
}

function cellToString(cell: RawCell): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString();
  return String(cell).trim();
}

function valueAt(row: RawCell[], index: number): string {
  return index < 0 ? "" : cellToString(row[index]);
}

function hasAnyValue(row: RawCell[]): boolean {
  return row.some((cell) => cellToString(cell) !== "");
}

function recordForRow(headers: string[], row: RawCell[]): Record<string, string> {
  return Object.fromEntries(
    headers.map((header, index) => [header || `Column ${index + 1}`, valueAt(row, index)]),
  );
}

function metadataForRow(headers: string[], row: RawCell[]): SourceMetadata {
  return Object.fromEntries(
    headers
      .map((header, index) => [header || `Column ${index + 1}`, valueAt(row, index)] as const)
      .filter(([, value]) => value !== ""),
  );
}

function sourceKey(kind: string, rowNumber: number, position: number): string {
  return `${kind}:${rowNumber}:${position}`;
}

function safeTemplateName(filename: string): string {
  return path.basename(filename, path.extname(filename)).replace(/[_-]+/g, " ").trim() || "Imported template";
}

function countNested(sections: ParsedSection[]) {
  let items = 0;
  let comments = 0;
  for (const section of sections) {
    items += section.items.length;
    for (const item of section.items) comments += item.comments.length;
  }
  return { items, comments };
}

export function parseSpectoraRows(options: {
  rows: RawCell[][];
  filename: string;
  sheetName?: string;
  fingerprint?: string;
  workbookWarnings?: ImportWarning[];
}): ParsedTemplate {
  const { rows, filename } = options;
  const sheetName = options.sheetName ?? "Sheet 1";
  const warnings: ImportWarning[] = [...(options.workbookWarnings ?? [])];

  const headerRowIndex = rows.findIndex(hasAnyValue);
  if (headerRowIndex < 0) {
    throw new ImportValidationError("The spreadsheet is empty.", [
      ...warnings,
      {
        code: "EMPTY_SPREADSHEET",
        severity: "error",
        message: "No populated rows were found in the workbook.",
      },
    ]);
  }

  const headers = rows[headerRowIndex].map(cellToString);
  const sectionIndex = findHeaderIndex(headers, HEADER_ALIASES.sectionName);
  const itemIndex = findHeaderIndex(headers, HEADER_ALIASES.itemName);
  const commentNameIndex = findHeaderIndex(headers, HEADER_ALIASES.commentName);
  const commentTextIndex = findHeaderIndex(headers, HEADER_ALIASES.commentText);
  const commentTypeIndex = findHeaderIndex(headers, HEADER_ALIASES.commentType);
  const categoryIndex = findHeaderIndex(headers, HEADER_ALIASES.category);
  const orderIndex = findHeaderIndex(headers, HEADER_ALIASES.order);

  const missingHeaders = [
    ["Section Name", sectionIndex],
    ["Item Name", itemIndex],
    ["Comment Name", commentNameIndex],
    ["Comment Text", commentTextIndex],
  ].filter(([, index]) => index === -1);

  for (const [header] of missingHeaders) {
    warnings.push({
      code: "MISSING_REQUIRED_HEADER",
      severity: "error",
      field: String(header),
      message: `Required column “${header}” was not found.`,
    });
  }

  if (missingHeaders.length > 0) {
    throw new ImportValidationError(
      "This does not look like a Spectora HTML-text template export.",
      warnings,
    );
  }

  const preservedMetadataColumns = headers.filter(
    (header) => header && !KNOWN_NORMALIZED_HEADERS.has(normalizeHeader(header)),
  );
  for (const header of preservedMetadataColumns) {
    warnings.push({
      code: "PRESERVED_UNMODELED_COLUMN",
      severity: "info",
      field: header,
      message: `“${header}” is not editable in this version, but every populated value is retained in source metadata.`,
    });
  }

  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | undefined;
  let currentItem: ParsedItem | undefined;
  let carriedSectionName = "";
  let carriedItemName = "";
  let ignoredEmptyRows = 0;

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const rowNumber = rowIndex + 1;
    if (!hasAnyValue(row)) {
      ignoredEmptyRows += 1;
      continue;
    }

    const explicitSectionName = valueAt(row, sectionIndex);
    const explicitItemName = valueAt(row, itemIndex);
    if (explicitSectionName) carriedSectionName = explicitSectionName;
    if (explicitItemName) carriedItemName = explicitItemName;
    if (explicitSectionName && currentSection?.name !== explicitSectionName) {
      carriedItemName = explicitItemName;
    }

    const sectionName = explicitSectionName || carriedSectionName;
    const itemName = explicitItemName || carriedItemName;
    const rawRecord = recordForRow(headers, row);

    if (!sectionName) {
      warnings.push({
        code: "ROW_WITHOUT_SECTION",
        severity: "error",
        rowNumber,
        field: "Section Name",
        message: "The row could not be placed because no section name was present or available from the preceding row.",
        rawData: rawRecord,
      });
      continue;
    }

    if (!currentSection || currentSection.name !== sectionName) {
      currentSection = {
        sourceKey: sourceKey("section", rowNumber, sections.length),
        name: sectionName,
        position: sections.length,
        metadata: explicitSectionName ? { "Section Name": explicitSectionName } : {},
        items: [],
      };
      sections.push(currentSection);
      currentItem = undefined;
    }

    if (!itemName) {
      warnings.push({
        code: "ROW_WITHOUT_ITEM",
        severity: "error",
        rowNumber,
        field: "Item Name",
        message: `The row belongs to “${sectionName}” but has no item name. Its raw values are retained in this warning.`,
        rawData: rawRecord,
      });
      continue;
    }

    if (!currentItem || currentItem.name !== itemName) {
      currentItem = {
        sourceKey: sourceKey("item", rowNumber, currentSection.items.length),
        name: itemName,
        position: currentSection.items.length,
        metadata: explicitItemName ? { "Item Name": explicitItemName } : {},
        comments: [],
      };
      currentSection.items.push(currentItem);
    }

    const commentName = valueAt(row, commentNameIndex);
    const sourceHtml = valueAt(row, commentTextIndex);
    const commentType = valueAt(row, commentTypeIndex) || null;
    const category = valueAt(row, categoryIndex) || null;
    const rowMetadata = metadataForRow(headers, row);
    const hasCommentMaterial = Boolean(commentName || sourceHtml || commentType || category);

    if (!hasCommentMaterial) {
      warnings.push({
        code: "ITEM_WITHOUT_COMMENT",
        severity: "info",
        rowNumber,
        message: `Item “${itemName}” has no comment on this row. The item itself was preserved.`,
        rawData: rawRecord,
      });
      continue;
    }

    if (!commentName) {
      warnings.push({
        code: "COMMENT_WITHOUT_NAME",
        severity: "warning",
        rowNumber,
        field: "Comment Name",
        message: "A comment had content but no name. It was imported as “Untitled comment” instead of being dropped.",
        rawData: rawRecord,
      });
    }
    if (!sourceHtml) {
      warnings.push({
        code: "COMMENT_WITHOUT_TEXT",
        severity: "warning",
        rowNumber,
        field: "Comment Text",
        message: `Comment “${commentName || "Untitled comment"}” has no text. It remains editable after import.`,
        rawData: rawRecord,
      });
    }
    if (containsPotentiallyUnsafeMarkup(sourceHtml)) {
      warnings.push({
        code: "UNSAFE_HTML_SANITIZED_ON_RENDER",
        severity: "warning",
        rowNumber,
        field: "Comment Text",
        message: `Potentially unsafe markup in “${commentName || "Untitled comment"}” is retained in the source record but removed when displayed.`,
      });
    }

    const parsedOrder = Number.parseInt(valueAt(row, orderIndex), 10);
    const comment: ParsedComment = {
      sourceKey: sourceKey("comment", rowNumber, currentItem.comments.length),
      name: commentName || "Untitled comment",
      sourceHtml,
      bodyHtml: sanitizeRichHtml(sourceHtml),
      plainText: htmlToPlainText(sourceHtml),
      commentType,
      category,
      position: Number.isFinite(parsedOrder) ? parsedOrder : currentItem.comments.length,
      sourceRow: rowNumber,
      metadata: rowMetadata,
    };
    currentItem.comments.push(comment);
  }

  for (const section of sections) {
    for (const item of section.items) {
      item.comments.sort((a, b) => a.position - b.position || a.sourceRow - b.sourceRow);
      item.comments.forEach((comment, index) => {
        comment.position = index;
      });
    }
  }

  if (sections.length === 0) {
    warnings.push({
      code: "NO_IMPORTABLE_CONTENT",
      severity: "error",
      message: "No structured sections could be produced from the populated rows.",
    });
    throw new ImportValidationError("No importable template content was found.", warnings);
  }

  const nestedCounts = countNested(sections);
  return {
    name: safeTemplateName(filename),
    sourceFilename: filename,
    sourceFingerprint: options.fingerprint ?? "row-parser-test",
    sections,
    warnings,
    summary: {
      sheetName,
      sourceRows: rows.length - headerRowIndex - 1 - ignoredEmptyRows,
      sections: sections.length,
      items: nestedCounts.items,
      comments: nestedCounts.comments,
      warnings: warnings.filter((warning) => warning.severity === "warning").length,
      errors: warnings.filter((warning) => warning.severity === "error").length,
      detectedHeaders: headers.filter(Boolean),
      preservedMetadataColumns,
      ignoredEmptyRows,
    },
  };
}

export async function parseSpectoraWorkbook(
  buffer: Buffer,
  filename: string,
): Promise<ParsedTemplate> {
  const looksLikeModernWorkbook = buffer[0] === 0x50 && buffer[1] === 0x4b;
  if (!looksLikeModernWorkbook) {
    throw new ImportValidationError("Only modern Excel workbooks are supported.", [
      {
        code: "UNSUPPORTED_FILE_TYPE",
        severity: "error",
        message: "Export from Spectora as a spreadsheet workbook. True legacy .xls and plain-text files are intentionally rejected.",
      },
    ]);
  }
  if (buffer.byteLength > 10 * 1024 * 1024) {
    throw new ImportValidationError("The workbook exceeds the 10 MB upload limit.", [
      {
        code: "FILE_TOO_LARGE",
        severity: "error",
        message: "Choose an exported template smaller than 10 MB.",
      },
    ]);
  }

  let sheets;
  try {
    sheets = await readXlsxFile(buffer);
  } catch {
    throw new ImportValidationError("The workbook could not be read.", [
      {
        code: "INVALID_WORKBOOK",
        severity: "error",
        message: "The file is not a readable .xlsx workbook. Re-export it from Spectora and try again.",
      },
    ]);
  }

  const populatedSheets = sheets.filter((sheet) => sheet.data.some(hasAnyValue));
  if (populatedSheets.length === 0) {
    throw new ImportValidationError("The workbook has no populated sheets.", [
      {
        code: "EMPTY_WORKBOOK",
        severity: "error",
        message: "No populated cells were found.",
      },
    ]);
  }

  const workbookWarnings: ImportWarning[] = [];
  if (populatedSheets.length > 1) {
    workbookWarnings.push({
      code: "ADDITIONAL_SHEETS_NOT_IMPORTED",
      severity: "warning",
      message: `${populatedSheets.length - 1} additional populated sheet(s) are visible but not imported. Spectora template exports are expected to use one sheet.`,
    });
  }

  const firstSheet = populatedSheets[0];
  const fingerprint = createHash("sha256").update(buffer).digest("hex");
  return parseSpectoraRows({
    rows: firstSheet.data,
    filename,
    sheetName: firstSheet.sheet,
    fingerprint,
    workbookWarnings,
  });
}
