# Build notes

## Candidate-owned items before submission

- [x] Add the real Spectora HTML-text workbook export to `fixtures/`.
- [ ] Record its exact template name and source below.
- [x] Test the importer against that file and update any format aliases it reveals.
- [ ] Complete the required Hive trial workflow and add direct product feedback below.
- [ ] Decide whether to explore Binsr; document the comparison or explain the choice to skip it.
- [x] Create Supabase and run the migration.
- [ ] Deploy through the candidate's Vercel account.
- [ ] Import the real template into production and use its direct editor URL in the submission.
- [ ] Record and publish the walkthrough.
- [ ] Add approximate candidate time spent.

## Input used

**Temporary development fixture:** `SYNTHETIC_Spectora_HTML_Text_Demo.xlsx`, produced in code solely to exercise the data model and seed the interface. It is not a real export and is labelled accordingly.

**Final Spectora export:** InterNACHI Residential, exported from Spectora on 2026-09-23 via Export to spreadsheet -> Export HTML Text. File: `fixtures/InterNACHI Residential -2026-09-23.xls`.

No real customer information should appear in the committed workbook.

## What was prioritized

Faithful, inspectable migration received the most time. The primary improvement beyond the baseline is the **Import Verification receipt**:

- It previews totals and exceptions before saving.
- It records a SHA-256 source fingerprint.
- It preserves raw values for unplaceable rows.
- It identifies metadata-only columns instead of pretending they are fully supported.
- It retains original comment HTML separately from the safe editable/rendered copy.
- It remains available after import rather than disappearing with a success toast.

This addresses the core customer problem: an inspector with four years of tuned content needs evidence that their work survived, not merely a green success message.

## Deliberate cuts

- **Authentication and teams:** omitted to keep the reviewer path frictionless. Production use requires tenant ownership and authorization.
- **Adding/deleting/reordering content in the editor:** the required edits are implemented; structural authoring is a separate product surface.
- **Editing every Spectora setting:** those values are retained as metadata but not exposed as controls.
- **Legacy `.xls`:** rejected explicitly. Supporting it would require a safe, tested parser; the available common parser has unresolved high-severity advisories.
- **Multiple worksheets:** only the first populated sheet is imported, with a visible warning for additional populated sheets.
- **AI mapping:** deliberately not used. The known spreadsheet contract is deterministic, cheaper, easier to validate, and cannot hallucinate sections.
- **Inspection reports, scheduling, payments, and homeowner portals:** out of assignment scope.
- **Mobile-specific workflow:** the assignment identifies a desktop user.

## Supported input and known limits

See `README.md` for the complete contract. Important limitations:

- Modern zipped Excel workbook only, 10 MB maximum. Spectora may use a `.xls` extension for this format.
- Four structural columns must be detectable: Section Name, Item Name, Comment Name, and Comment Text.
- Exact comment source HTML is retained, but unsafe elements/attributes are removed from the editable/rendered copy.
- External media availability is not guaranteed; source URLs may expire or require authentication.
- Missing export settings cannot be reconstructed. Unmodeled but present fields are retained as metadata.
- Duplicate section/item names are kept as separate ordered groups when they occur non-contiguously.

## How the work was checked

Automated checks currently completed:

- [x] Production Next.js build
- [x] ESLint
- [x] Parser unit tests
- [x] Rich-HTML sanitizer tests
- [x] Production dependency audit with zero known vulnerabilities

Manual checks to complete with the candidate's database and real export:

- [x] Preview real export; compare source row, section, item, and comment counts.
- [ ] Spot-check the first, middle, and last sections against the workbook.
- [ ] Spot-check emphasis, links, tables, images, and video references when present.
- [x] Edit a section, item, comment name, and comment body; save and hard-reload.
- [x] Duplicate the template; edit the copy; reload the original and prove it is unchanged.
- [ ] Upload an invalid spreadsheet and show the honest failure state.
- [x] Verify `/api/health` locally against Supabase.
- [ ] Test the final direct template link in a logged-out/private browser.

## Time spent

- AI-assisted implementation session: started 23 September 2026.
- Candidate product exploration, account setup, review, and recording: 6-7 hours.
- Total candidate time: ~12 hours.

## Credits

- OpenAI Codex was used to research the documented Spectora format and implement the repository.
- Next.js, React, PostgreSQL.js, read-excel-file, sanitize-html, DOMPurify, Zod, and Vitest are used under their respective open-source licenses.
- No application starter, commercial template, or copied competitor code was used.
