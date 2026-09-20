export type WarningSeverity = "info" | "warning" | "error";

export type ImportWarning = {
  code: string;
  severity: WarningSeverity;
  message: string;
  rowNumber?: number;
  field?: string;
  rawData?: Record<string, string>;
};

export type SourceMetadata = Record<string, string | number | boolean | null>;

export type ParsedComment = {
  sourceKey: string;
  name: string;
  sourceHtml: string;
  bodyHtml: string;
  plainText: string;
  commentType: string | null;
  category: string | null;
  position: number;
  sourceRow: number;
  metadata: SourceMetadata;
};

export type ParsedItem = {
  sourceKey: string;
  name: string;
  position: number;
  metadata: SourceMetadata;
  comments: ParsedComment[];
};

export type ParsedSection = {
  sourceKey: string;
  name: string;
  position: number;
  metadata: SourceMetadata;
  items: ParsedItem[];
};

export type ImportSummary = {
  sheetName: string;
  sourceRows: number;
  sections: number;
  items: number;
  comments: number;
  warnings: number;
  errors: number;
  detectedHeaders: string[];
  preservedMetadataColumns: string[];
  ignoredEmptyRows: number;
};

export type ParsedTemplate = {
  name: string;
  sourceFilename: string;
  sourceFingerprint: string;
  sections: ParsedSection[];
  warnings: ImportWarning[];
  summary: ImportSummary;
};

export type TemplateListItem = {
  id: string;
  name: string;
  sourceFilename: string;
  sourceFingerprint: string;
  copiedFromId: string | null;
  createdAt: string;
  updatedAt: string;
  sectionCount: number;
  itemCount: number;
  commentCount: number;
  warningCount: number;
};

export type StoredComment = ParsedComment & {
  id: string;
  itemId: string;
  updatedAt: string;
};

export type StoredItem = Omit<ParsedItem, "comments"> & {
  id: string;
  sectionId: string;
  updatedAt: string;
  comments: StoredComment[];
};

export type StoredSection = Omit<ParsedSection, "items"> & {
  id: string;
  templateId: string;
  updatedAt: string;
  items: StoredItem[];
};

export type StoredTemplate = {
  id: string;
  name: string;
  sourceFilename: string;
  sourceFingerprint: string;
  copiedFromId: string | null;
  importSummary: ImportSummary;
  createdAt: string;
  updatedAt: string;
  sections: StoredSection[];
  warnings: ImportWarning[];
};

