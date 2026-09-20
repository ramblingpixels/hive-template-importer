# Walkthrough outline (target: 9 minutes)

Use your own words. Keep the introduction and final Hive feedback short; spend most of the recording demonstrating and explaining the implementation.

## 0:00–0:35 — You

- Camera on.
- Introduce yourself and the kind of engineering/product work you enjoy.
- One sentence: “I built a trustworthy Spectora template migration workflow for inspectors who cannot afford to lose years of tuned content.”

## 0:35–2:45 — Import and verify

- Open `/import`.
- Upload the committed real Spectora HTML-text workbook on camera.
- Explain why plain text is rejected.
- Point out section/item/comment counts, source fingerprint, structure preview, and visible warnings.
- Say: “Unknown fields are kept as metadata; unplaceable rows become warnings with raw values. Nothing is silently dropped.”
- Complete the import.

## 2:45–4:15 — Edit, persist, and copy

- Rename one section and item.
- Change a comment name and body; preview formatting.
- Save, hard-reload, and show that the edits remain.
- Duplicate the template.
- Edit the copy and save.
- Reopen the original and show that it is unchanged.

## 4:15–5:25 — Repository and stack

- Show `src/lib/importer/parse.ts`, `src/lib/repository.ts`, and `db/migrations/001_initial.sql`.
- Explain Next.js + TypeScript + Supabase/PostgreSQL + Vercel.
- Explain how Codex helped build and test it, and be ready to describe code you reviewed.
- Mention that no product AI is used because deterministic mapping is safer for a known schema.

## 5:25–6:30 — Data model and preservation

- Show templates → sections → items → comments.
- Explain ordered positions and database transactions.
- Show `source_html` versus `body_html`.
- Open the Import Verification tab and explain editable fields versus retained metadata.
- Mention SHA-256 source fingerprinting and stable source-row references.

## 6:30–7:20 — Product decisions

- Primary priority: faithful import and user trust.
- Extra improvement: persistent Import Verification receipt.
- Cuts: auth, full structural editing, every Spectora setting, `.xls`, multiple sheets, and AI mapping.
- If you explored Binsr, give the comparison here. Otherwise explain the time-prioritization choice.

## 7:20–8:15 — Hard part and failure case

- Hard part: preserving rich, inconsistent spreadsheet content without executing unsafe markup or losing the original.
- Show a file with missing required headers or wrong format.
- Point out that validation stops before persistence.
- Optionally show an unsafe-markup unit test and explain the source/display separation.

## 8:15–9:00 — Hive feedback and close

- Give one specific observation from your required Hive hands-on exploration.
- State what you would build next with more time: promote high-value metadata fields into typed editor controls, add structural editing, and add tenant authorization.
- End with the live URL, repository, and test status.

## Before recording

- Use the real committed workbook, not the synthetic seed.
- Start from a clean/private browser window.
- Keep the original and copy open in separate tabs.
- Increase editor/terminal font sizes.
- Close notifications and unrelated tabs.
- Confirm that the video link works without requesting access.

