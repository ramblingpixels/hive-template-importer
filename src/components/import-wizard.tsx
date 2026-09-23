"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AlertIcon, ArrowIcon, CheckIcon, FileIcon, UploadIcon } from "@/components/icons";
import type { ImportSummary, ImportWarning } from "@/types/template";

type Preview = {
  name: string;
  sourceFilename: string;
  sourceFingerprint: string;
  summary: ImportSummary;
  warnings: ImportWarning[];
  outline: Array<{
    name: string;
    itemCount: number;
    commentCount: number;
    items: Array<{ name: string; commentCount: number }>;
  }>;
};

export function ImportWizard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failureWarnings, setFailureWarnings] = useState<ImportWarning[]>([]);

  async function chooseFile(selected: File | null) {
    if (!selected) return;
    setFile(selected);
    setPreview(null);
    setError(null);
    setFailureWarnings([]);
    setBusy("preview");
    try {
      const formData = new FormData();
      formData.append("file", selected);
      const response = await fetch("/api/imports/preview", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        setFailureWarnings(data.warnings ?? []);
        throw new Error(data.error || "The workbook could not be previewed.");
      }
      setPreview(data);
      setTemplateName(data.name);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The workbook could not be previewed.");
    } finally {
      setBusy(null);
    }
  }

  async function commitImport() {
    if (!file || !preview) return;
    setBusy("import");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", templateName);
      const response = await fetch("/api/imports/commit", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The import could not be saved.");
      router.push(`/templates/${data.id}?imported=1`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The import could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page import-page">
      <header className="import-heading">
        <span className="eyebrow"><span className="pulse-dot" /> Guided import</span>
        <h1>Trust, then <em>transfer.</em></h1>
        <p>Review the structure and every exception before the template enters your workspace.</p>
      </header>

      <ol className="stepper" aria-label="Import steps">
        <li className="active"><b>1</b><span>Choose file</span></li>
        <li className={preview ? "active" : ""}><b>2</b><span>Verify mapping</span></li>
        <li><b>3</b><span>Start editing</span></li>
      </ol>

      <div className="import-layout">
        <section className="import-main-card">
          <div
            className={`drop-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void chooseFile(event.dataTransfer.files[0] ?? null);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)}
            />
            <span className="upload-orbit"><UploadIcon /></span>
            <h2>{file ? file.name : "Drop in your Spectora export"}</h2>
            <p>{file ? `${formatBytes(file.size)} · ${busy === "preview" ? "Reading workbook…" : "Workbook selected"}` : "Use Export to spreadsheet → Export HTML Text"}</p>
            <button className="button button-outline" type="button" onClick={() => inputRef.current?.click()} disabled={busy !== null}>
              {file ? "Choose a different file" : "Browse files"}
            </button>
            <small>Modern Excel workbooks up to 10 MB</small>
          </div>

          {error && (
            <div className="inline-error" role="alert">
              <AlertIcon />
              <div><strong>Import stopped safely</strong><p>{error}</p></div>
            </div>
          )}
          {failureWarnings.length > 0 && <WarningList warnings={failureWarnings} />}

          {preview && (
            <div className="preview-panel">
              <div className="preview-title">
                <div><span className="overline">Preflight complete</span><h2>Here’s what will come across</h2></div>
                <span className="status-pill status-clean"><CheckIcon /> Ready to import</span>
              </div>
              <div className="metric-row">
                <Metric value={preview.summary.sections} label="Sections" />
                <Metric value={preview.summary.items} label="Items" />
                <Metric value={preview.summary.comments} label="Comments" />
                <Metric value={preview.warnings.length} label="Notices" attention={preview.warnings.length > 0} />
              </div>

              <label className="field-label">
                Template name
                <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={160} />
              </label>

              <div className="outline-preview">
                <div className="subsection-heading"><h3>Structure preview</h3><span>First {preview.outline.length} sections</span></div>
                {preview.outline.map((section, index) => (
                  <div className="outline-row" key={`${section.name}-${index}`}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <span><strong>{section.name}</strong><small>{section.itemCount} items · {section.commentCount} comments</small></span>
                    <span className="outline-examples">{section.items.map((item) => item.name).join(" · ")}</span>
                  </div>
                ))}
              </div>

              {preview.warnings.length > 0 ? <WarningList warnings={preview.warnings} /> : (
                <div className="all-clear"><CheckIcon /><span><strong>No mapping exceptions found</strong>All populated rows were placed in the hierarchy.</span></div>
              )}

              <div className="import-confirm">
                <div>
                  <strong>Source fingerprint</strong>
                  <code>{preview.sourceFingerprint.slice(0, 16)}…</code>
                </div>
                <button className="button button-primary" onClick={() => void commitImport()} disabled={busy !== null || !templateName.trim()}>
                  {busy === "import" ? "Saving template…" : "Import and start editing"} <ArrowIcon />
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="import-aside">
          <span className="overline">Before you upload</span>
          <h3>Use the rich export</h3>
          <ol>
            <li><b>01</b><span>Open your template in Spectora.</span></li>
            <li><b>02</b><span>Choose <strong>Export to spreadsheet.</strong></span></li>
            <li><b>03</b><span>Select <strong>Export HTML Text</strong>, not plain text.</span></li>
          </ol>
          <div className="aside-note"><FileIcon /><p><strong>Why HTML text?</strong> It carries links, emphasis, tables, and embedded media references that plain text removes.</p></div>
          <div className="aside-safety">
            <span><CheckIcon /> Preview before save</span>
            <span><CheckIcon /> Raw source retained</span>
            <span><CheckIcon /> Unsafe markup blocked on display</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ value, label, attention = false }: { value: number; label: string; attention?: boolean }) {
  return <div className={attention ? "metric attention" : "metric"}><b>{value}</b><span>{label}</span></div>;
}

function WarningList({ warnings }: { warnings: ImportWarning[] }) {
  return (
    <div className="warning-list">
      <div className="subsection-heading"><h3>Import notices</h3><span>{warnings.length} total</span></div>
      {warnings.map((warning, index) => (
        <div className={`warning-row severity-${warning.severity}`} key={`${warning.code}-${warning.rowNumber}-${index}`}>
          <AlertIcon />
          <span><strong>{warning.code.replaceAll("_", " ").toLocaleLowerCase()}</strong><small>{warning.message}{warning.rowNumber ? ` · Row ${warning.rowNumber}` : ""}</small></span>
        </div>
      ))}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
