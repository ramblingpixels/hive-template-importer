import { describe, expect, it } from "vitest";

import { sanitizeRichHtml } from "@/lib/importer/html";
import { ImportValidationError, parseSpectoraRows, parseSpectoraWorkbook } from "@/lib/importer/parse";

const headers = [
  "Section Name",
  "Item Name",
  "Comment Name",
  "Comment Text",
  "Comment Type",
  "Category",
  "Order (w/i item)",
  "Custom Legacy Code",
];

describe("Spectora HTML-text row mapping", () => {
  it("preserves hierarchy, rich text, order, and unmodeled values", () => {
    const parsed = parseSpectoraRows({
      filename: "InterNACHI Residential.xlsx",
      fingerprint: "abc123",
      rows: [
        headers,
        ["Roof", "Coverings", "Second", "<p><strong>Second</strong> finding</p>", "defect", "1", "2", "legacy-b"],
        ["", "", "First", "<p><a href=\"https://example.com\">First</a> finding</p>", "info", "", "1", "legacy-a"],
        ["Exterior", "Siding", "Siding type", "<p>Fiber cement.</p>", "info", "", "0", "legacy-c"],
      ],
    });

    expect(parsed.name).toBe("InterNACHI Residential");
    expect(parsed.summary).toMatchObject({ sections: 2, items: 2, comments: 3 });
    expect(parsed.sections[0].items[0].comments.map((comment) => comment.name)).toEqual(["First", "Second"]);
    expect(parsed.sections[0].items[0].comments[0].sourceHtml).toContain("https://example.com");
    expect(parsed.sections[0].items[0].comments[0].metadata["Custom Legacy Code"]).toBe("legacy-a");
    expect(parsed.summary.preservedMetadataColumns).toEqual(["Custom Legacy Code"]);
    expect(parsed.warnings.some((warning) => warning.code === "PRESERVED_UNMODELED_COLUMN")).toBe(true);
  });

  it("retains unsafe source markup but sanitizes the editable display copy", () => {
    const parsed = parseSpectoraRows({
      filename: "unsafe.xlsx",
      rows: [
        headers,
        ["Interior", "Walls", "Unsafe legacy HTML", '<p onclick="alert(1)">Text</p><script>alert(1)</script>', "info", "", "0", ""],
      ],
    });
    const comment = parsed.sections[0].items[0].comments[0];

    expect(comment.sourceHtml).toContain("<script>");
    expect(comment.bodyHtml).toBe("<p>Text</p>");
    expect(parsed.warnings.some((warning) => warning.code === "UNSAFE_HTML_SANITIZED_ON_RENDER")).toBe(true);
  });

  it("preserves nameless comments instead of dropping them", () => {
    const parsed = parseSpectoraRows({
      filename: "missing-name.xlsx",
      rows: [headers, ["Plumbing", "Fixtures", "", "<p>Useful narrative.</p>", "info", "", "0", ""]],
    });

    expect(parsed.sections[0].items[0].comments[0].name).toBe("Untitled comment");
    expect(parsed.warnings.some((warning) => warning.code === "COMMENT_WITHOUT_NAME")).toBe(true);
  });

  it("fails honestly when required headers are absent", () => {
    expect(() => parseSpectoraRows({
      filename: "wrong.xlsx",
      rows: [["Title", "Body"], ["Roof", "Text"]],
    })).toThrowError(ImportValidationError);

    try {
      parseSpectoraRows({ filename: "wrong.xlsx", rows: [["Title", "Body"]] });
    } catch (error) {
      expect(error).toBeInstanceOf(ImportValidationError);
      expect((error as ImportValidationError).warnings.filter((warning) => warning.severity === "error")).toHaveLength(4);
    }
  });
});

describe("rich HTML safety", () => {
  it("keeps common formatting and links while blocking active content", () => {
    const result = sanitizeRichHtml('<p style="text-align:center" onclick="x()"><strong>Safe</strong> <a href="javascript:alert(1)">link</a></p>');
    expect(result).toContain("<strong>Safe</strong>");
    expect(result).toContain('style="text-align:center"');
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("javascript:");
  });
});

describe("workbook validation", () => {
  it("rejects files that are not modern zipped Excel workbooks", async () => {
    await expect(parseSpectoraWorkbook(Buffer.from("not a workbook"), "legacy.xls"))
      .rejects
      .toMatchObject({
        name: "ImportValidationError",
        warnings: expect.arrayContaining([
          expect.objectContaining({ code: "UNSUPPORTED_FILE_TYPE" }),
        ]),
      });
  });
});
