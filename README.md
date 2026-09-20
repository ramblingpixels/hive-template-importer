# Hive Template Studio

A focused migration workflow for home inspectors moving a tuned Spectora template into a new system. It imports Spectora's **Export HTML Text** `.xlsx` workbook into a structured PostgreSQL model, shows what was mapped or could not be mapped, allows core content to be edited, and creates independent copies.

## Current status

The application, database schema, importer, editor, duplication flow, import receipt, seed tooling, and automated tests are implemented. Final submission work still requires:

- a real shareable Spectora export in [`fixtures/`](./fixtures/README.md);
- a candidate-owned Supabase project;
- a candidate-owned Vercel deployment;
- hands-on Hive exploration and the candidate's walkthrough video.

The synthetic seed is clearly labelled and must not be presented as a Spectora-generated export.

## Product flow

1. Upload a Spectora HTML-text `.xlsx` export.
2. Review hierarchy counts, detected headers, preserved metadata, and row-level exceptions before saving.
3. Import into templates → sections → items → comments.
4. Rename the template, sections, items, and comments; edit formatted comment HTML; save to PostgreSQL.
5. Duplicate the template. Every copied record gets a new database identity and can be edited independently.
6. Use the Import Verification view as a persistent receipt for the source fingerprint, counts, mapping rules, and exceptions.

## Why the importer is trustworthy

- The workbook is parsed deterministically; no model is used for mapping.
- Section/item hierarchy is carried through sparse spreadsheet rows and kept in source order.
- The explicit Spectora `Order (w/i item)` value controls comment order, with spreadsheet row order as a stable fallback.
- The exact imported comment HTML is retained in immutable `source_html` while a sanitized `body_html` copy is used for editing and display.
- Unfamiliar columns and non-editor fields remain in JSON metadata.
- Rows that cannot be placed are attached to visible import warnings with their raw values.
- The source file receives a SHA-256 fingerprint for later verification.
- Invalid or legacy files fail before any database transaction begins.

Spectora's official documentation explains that the HTML-text export preserves formatting, links, images, and videos that plain text removes: [How to Export a Template](https://support.spectora.com/en/articles/2769896-how-to-export-a-template). The documented spreadsheet column contract is the basis of the mapping: [How to Import a Template from a Spreadsheet](https://support.spectora.com/en/articles/6198400-how-to-import-a-template-from-a-spreadsheet).

## Stack

- Next.js 16 App Router and React 19
- TypeScript
- PostgreSQL, designed for Supabase's transaction pooler
- `read-excel-file` for modern XLSX parsing
- `sanitize-html` on the server and DOMPurify for client previews
- Vitest
- Vercel deployment target

No authentication is required for the assignment reviewer path. In a production multi-tenant product, authorization and row-level ownership would be mandatory.

## Local setup

Requirements: Node.js 20.9 or newer and a PostgreSQL database. Node 22 is recommended.

```bash
npm install
cp .env.example .env.local
```

Set `DATABASE_URL` in `.env.local`. For Supabase, use the database transaction-pooler URI from **Project settings → Database → Connection string**. Keep the password URL-encoded and never commit `.env.local`.

Initialize and seed the database:

```bash
npm run db:migrate
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). `/api/health` verifies the database connection.

## Database model

```text
templates
  ├── sections (ordered)
  │     └── items (ordered)
  │           └── comments (ordered, imported source + editable copy)
  └── import_warnings (severity, row, field, retained raw values)
```

The schema lives in [`db/migrations/001_initial.sql`](./db/migrations/001_initial.sql). Every child table uses cascading deletion internally; `copied_from_id` is informational and becomes `NULL` if its original is removed.

## Import mapping

Structurally editable fields:

- Section Name
- Item Name
- Comment Name
- Comment Text
- Comment Type
- Category
- Order (w/i item)

Retained in source metadata:

- Multiple-choice and unit options
- Recommendations
- Answer type and default values
- Locations and estimates
- Lock/simple-format/photo flags
- Default photos and captions
- Usage count and last-modified value
- Any unfamiliar populated column

The metadata fields are deliberately read-only in this scope. They are not dropped and can be promoted into typed fields later.

## Supported input and limits

- Accepted: a single-sheet Spectora HTML-text `.xlsx` export, up to 10 MB.
- Rejected: plain-text exports, legacy `.xls`, password-protected/corrupt workbooks, and files without the four structural headers.
- Additional populated sheets produce a visible warning and are not imported.
- Rich HTML is preserved at rest. Common text formatting, links, tables, images, YouTube/Vimeo embeds, and video sources can render after sanitization. Scripts, event handlers, unsafe URL schemes, arbitrary iframes, and unsafe CSS are retained only in the immutable source field and blocked from display.
- Information absent from the export cannot be recovered. The receipt distinguishes this from information retained as metadata but not editable in the current UI.

Legacy `.xls` support was deliberately excluded because modern Spectora exports use `.xlsx`, and the commonly used legacy parser has unresolved security advisories. This limitation is explicit in both the upload UI and failure response.

## Verification

```bash
npm test
npm run lint
npm run build
npm audit --omit=dev
```

The unit suite checks hierarchy, sparse rows, order, rich-text preservation, extra metadata, invalid headers, nameless comments, and unsafe markup. Before submission, run the manual database checklist in [`NOTES.md`](./NOTES.md) against the real export.

## Deploying to Vercel

1. Create the Supabase project and run `npm run db:migrate` locally against it.
2. Import the real Spectora file in the local or deployed app so the database contains an explorable template.
3. Push this repository to GitHub.
4. Import the repository into Vercel.
5. Add `DATABASE_URL` and `DATABASE_SSL=true` to Vercel's Production environment.
6. Deploy and open `/api/health`; expect `{"status":"ok","database":"connected"}`.
7. Test upload, edit/save/reload, and copy/edit/reload in a private browsing window.
8. Give reviewers a direct `/templates/{id}` URL for the seeded real template.

## Repository guide

- `src/lib/importer/` — header mapping, workbook parsing, source preservation, HTML safety
- `src/lib/repository.ts` — transactional PostgreSQL persistence and independent copying
- `src/app/api/` — import preview/commit and template endpoints
- `src/components/` — dashboard, import review, editor, and verification receipt
- `db/migrations/` — database initialization
- `scripts/` — migration and seed commands
- `tests/` — deterministic importer and safety tests
- `fixtures/` — location for the required real Spectora export

## AI-tool use and credits

The application was implemented with OpenAI Codex as a coding collaborator. The candidate remains responsible for reviewing, running, understanding, and presenting the submission. Open-source packages and their roles are declared in `package.json`; no UI starter or copied application code was used.

