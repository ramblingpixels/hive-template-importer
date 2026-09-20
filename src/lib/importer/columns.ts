export const HEADER_ALIASES = {
  sectionName: ["section name", "section"],
  itemName: ["item name", "item"],
  commentName: ["comment name", "narrative name", "comment"],
  commentText: ["comment text", "html text", "narrative text", "description"],
  commentType: ["comment type", "type"],
  category: ["category", "defect category"],
  order: ["order (w/i item)", "order within item", "order"],
} as const;

export const SPECTORA_KNOWN_HEADERS = [
  "Section Name",
  "Item Name",
  "Comment Name",
  "Comment Text",
  "Comment Type",
  "Category",
  "Multiple Choice Options (comma-separated)",
  "Unit Type Options (numeric answers only, comma-separated)",
  "Recommendation (from list)",
  "Order (w/i item)",
  "Answer Type (boolean, checkbox, date, number, range, text)",
  "Default Value",
  'Default Value 2 (for "range" types)',
  'Default Unit Type (for "number" and "range" types)',
  "Default Location",
  "Default Estimate Min",
  "Default Estimate Max",
  "Locked (true/false)",
  "Simple Format",
  "Disable Photos (true/false)",
  "Uses",
  "Default Photo 1",
  "Default Photo 1 Caption",
  "Default Photo 2",
  "Default Photo 2 Caption",
  "Default Photo 3",
  "Default Photo 3 Caption",
  "Last Modified",
] as const;

export function normalizeHeader(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .trim()
    .toLocaleLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ");
}

export function findHeaderIndex(
  headers: string[],
  aliases: readonly string[],
): number {
  const normalized = headers.map(normalizeHeader);
  return normalized.findIndex((header) =>
    aliases.some((alias) => header === normalizeHeader(alias)),
  );
}

export const KNOWN_NORMALIZED_HEADERS = new Set(
  SPECTORA_KNOWN_HEADERS.map(normalizeHeader),
);

