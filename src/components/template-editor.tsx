"use client";

import DOMPurify from "dompurify";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AlertIcon, CheckIcon, ChevronIcon, CopyIcon, ShieldIcon } from "@/components/icons";
import type { StoredTemplate } from "@/types/template";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; template: StoredTemplate };

type SaveState = "idle" | "saving" | "saved" | "error";

export function TemplateEditor({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [tab, setTab] = useState<"content" | "verification">("content");
  const [dirtyName, setDirtyName] = useState(false);
  const [dirtySections, setDirtySections] = useState<Set<string>>(new Set());
  const [dirtyItems, setDirtyItems] = useState<Set<string>>(new Set());
  const [dirtyComments, setDirtyComments] = useState<Set<string>>(new Set());
  const [previewComments, setPreviewComments] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    fetch(`/api/templates/${id}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Template could not be loaded.");
        setState({ status: "ready", template: data.template });
      })
      .catch((error: Error) => setState({ status: "error", message: error.message }));
  }, [id]);

  const isDirty = dirtyName || dirtySections.size > 0 || dirtyItems.size > 0 || dirtyComments.size > 0;
  const counts = useMemo(() => {
    if (state.status !== "ready") return { sections: 0, items: 0, comments: 0, edited: 0 };
    return {
      sections: state.template.sections.length,
      items: state.template.sections.reduce((total, section) => total + section.items.length, 0),
      comments: state.template.sections.reduce(
        (total, section) => total + section.items.reduce((sum, item) => sum + item.comments.length, 0),
        0,
      ),
      edited: state.template.sections.reduce(
        (total, section) => total + section.items.reduce(
          (sum, item) => sum + item.comments.filter((comment) => comment.bodyHtml !== comment.sourceHtml).length,
          0,
        ),
        0,
      ),
    };
  }, [state]);

  function updateTemplate(mutator: (template: StoredTemplate) => StoredTemplate) {
    setState((current) => current.status === "ready"
      ? { status: "ready", template: mutator(current.template) }
      : current);
    setSaveState("idle");
    setMessage(null);
  }

  function editSection(sectionId: string, name: string) {
    updateTemplate((template) => ({
      ...template,
      sections: template.sections.map((section) => section.id === sectionId ? { ...section, name } : section),
    }));
    setDirtySections((current) => new Set(current).add(sectionId));
  }

  function editItem(itemId: string, name: string) {
    updateTemplate((template) => ({
      ...template,
      sections: template.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => item.id === itemId ? { ...item, name } : item),
      })),
    }));
    setDirtyItems((current) => new Set(current).add(itemId));
  }

  function editComment(commentId: string, patch: { name?: string; bodyHtml?: string }) {
    updateTemplate((template) => ({
      ...template,
      sections: template.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          comments: item.comments.map((comment) => comment.id === commentId ? { ...comment, ...patch } : comment),
        })),
      })),
    }));
    setDirtyComments((current) => new Set(current).add(commentId));
  }

  async function saveEdits(): Promise<boolean> {
    if (state.status !== "ready") return false;
    setSaveState("saving");
    setMessage(null);
    const { template } = state;
    const allItems = template.sections.flatMap((section) => section.items);
    const allComments = allItems.flatMap((item) => item.comments);
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(dirtyName ? { name: template.name } : {}),
          sections: template.sections.filter((section) => dirtySections.has(section.id)).map(({ id, name }) => ({ id, name })),
          items: allItems.filter((item) => dirtyItems.has(item.id)).map(({ id, name }) => ({ id, name })),
          comments: allComments.filter((comment) => dirtyComments.has(comment.id)).map(({ id, name, bodyHtml }) => ({ id, name, bodyHtml })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Changes could not be saved.");
      setDirtyName(false);
      setDirtySections(new Set());
      setDirtyItems(new Set());
      setDirtyComments(new Set());
      setSaveState("saved");
      setMessage("All edits are stored in the database.");
      return true;
    } catch (caught) {
      setSaveState("error");
      setMessage(caught instanceof Error ? caught.message : "Changes could not be saved.");
      return false;
    }
  }

  async function duplicateTemplate() {
    if (state.status !== "ready") return;
    setCopying(true);
    setMessage(null);
    try {
      if (isDirty && !(await saveEdits())) return;
      const response = await fetch(`/api/templates/${id}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${state.template.name} — Copy` }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The template could not be copied.");
      router.push(`/templates/${data.id}?copied=1`);
    } catch (caught) {
      setSaveState("error");
      setMessage(caught instanceof Error ? caught.message : "The template could not be copied.");
    } finally {
      setCopying(false);
    }
  }

  if (state.status === "loading") return <EditorSkeleton />;
  if (state.status === "error") {
    return <div className="page editor-error"><AlertIcon /><h1>Template unavailable</h1><p>{state.message}</p><Link href="/" className="button button-outline">Back to templates</Link></div>;
  }

  const { template } = state;
  return (
    <div className="editor-page">
      <header className="editor-header page">
        <div className="breadcrumbs"><Link href="/">Templates</Link><span>/</span><span>{template.name}</span></div>
        <div className="editor-title-row">
          <div>
            <span className="overline">Template editor</span>
            <input
              className="template-name-input"
              aria-label="Template name"
              value={template.name}
              onChange={(event) => {
                updateTemplate((current) => ({ ...current, name: event.target.value }));
                setDirtyName(true);
              }}
            />
            <p>Imported from {template.sourceFilename}</p>
          </div>
          <div className="editor-actions">
            <button className="button button-ghost" onClick={() => void duplicateTemplate()} disabled={copying || saveState === "saving"}>
              <CopyIcon /> {copying ? "Copying…" : "Duplicate"}
            </button>
            <button className="button button-primary" onClick={() => void saveEdits()} disabled={!isDirty || saveState === "saving"}>
              {saveState === "saving" ? "Saving…" : isDirty ? "Save changes" : "Saved"}
              {!isDirty && <CheckIcon />}
            </button>
          </div>
        </div>
        {message && <div className={`save-message ${saveState === "error" ? "is-error" : ""}`}>{saveState === "error" ? <AlertIcon /> : <CheckIcon />}{message}</div>}
        <div className="editor-tabs" role="tablist">
          <button className={tab === "content" ? "active" : ""} onClick={() => setTab("content")}>Content <span>{counts.comments}</span></button>
          <button className={tab === "verification" ? "active" : ""} onClick={() => setTab("verification")}>Import verification <span>{template.warnings.length}</span></button>
        </div>
      </header>

      {tab === "content" ? (
        <div className="editor-workspace page">
          <aside className="section-nav">
            <span className="overline">Sections</span>
            <nav>
              {template.sections.map((section, index) => (
                <a key={section.id} href={`#section-${section.id}`}><b>{String(index + 1).padStart(2, "0")}</b><span>{section.name}</span></a>
              ))}
            </nav>
          </aside>
          <section className="section-editor">
            {template.sections.map((section, sectionIndex) => (
              <details className="section-block" id={`section-${section.id}`} key={section.id} open={sectionIndex < 2}>
                <summary>
                  <span className="section-number">{String(sectionIndex + 1).padStart(2, "0")}</span>
                  <span className="section-summary-text"><strong>{section.name}</strong><small>{section.items.length} items · {section.items.reduce((sum, item) => sum + item.comments.length, 0)} comments</small></span>
                  <ChevronIcon />
                </summary>
                <div className="section-body">
                  <label className="compact-field"><span>Section name</span><input value={section.name} onChange={(event) => editSection(section.id, event.target.value)} /></label>
                  {section.items.map((item) => (
                    <details className="item-block" key={item.id}>
                      <summary><span><strong>{item.name}</strong><small>{item.comments.length} comments</small></span><ChevronIcon /></summary>
                      <div className="item-body">
                        <label className="compact-field"><span>Item name</span><input value={item.name} onChange={(event) => editItem(item.id, event.target.value)} /></label>
                        <div className="comment-list">
                          {item.comments.map((comment) => {
                            const changed = comment.bodyHtml !== comment.sourceHtml;
                            const isPreviewing = previewComments.has(comment.id);
                            return (
                              <article className="comment-card" key={comment.id}>
                                <div className="comment-card-header">
                                  <span className={`comment-type type-${comment.commentType || "general"}`}>{comment.commentType || "general"}</span>
                                  <span>Source row {comment.sourceRow}</span>
                                  {changed && <span className="edited-pill">Edited</span>}
                                </div>
                                <label className="compact-field"><span>Comment name</span><input value={comment.name} onChange={(event) => editComment(comment.id, { name: event.target.value })} /></label>
                                <label className="compact-field"><span>Comment text <small>HTML formatting supported</small></span><textarea rows={5} value={comment.bodyHtml} onChange={(event) => editComment(comment.id, { bodyHtml: event.target.value })} /></label>
                                {isPreviewing && (
                                  <div className="comment-preview" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.bodyHtml, { USE_PROFILES: { html: true } }) }} />
                                )}
                                <div className="comment-actions">
                                  <button type="button" onClick={() => setPreviewComments((current) => {
                                    const next = new Set(current);
                                    if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id);
                                    return next;
                                  })}>{isPreviewing ? "Hide preview" : "Preview formatting"}</button>
                                  {changed && <button type="button" onClick={() => editComment(comment.id, { bodyHtml: comment.sourceHtml })}>Restore imported text</button>}
                                </div>
                              </article>
                            );
                          })}
                          {item.comments.length === 0 && <div className="no-comments">No comment rows were present for this item.</div>}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </section>
        </div>
      ) : (
        <VerificationPanel template={template} counts={counts} />
      )}

      {isDirty && (
        <div className="sticky-save">
          <span><i /> You have unsaved changes</span>
          <button className="button button-primary button-small" onClick={() => void saveEdits()} disabled={saveState === "saving"}>{saveState === "saving" ? "Saving…" : "Save now"}</button>
        </div>
      )}
    </div>
  );
}

function VerificationPanel({ template, counts }: { template: StoredTemplate; counts: { sections: number; items: number; comments: number; edited: number } }) {
  return (
    <div className="verification-page page">
      <section className="verification-hero">
        <div className="trust-icon"><ShieldIcon /></div>
        <div><span className="overline">Import receipt</span><h2>What survived the move</h2><p>This receipt separates source omissions from importer limitations and stays attached to the template.</p></div>
      </section>
      <div className="verification-grid">
        <section className="receipt-card">
          <span className="overline">Preservation summary</span>
          <div className="receipt-metrics">
            <span><b>{counts.sections}</b> Sections</span><span><b>{counts.items}</b> Items</span><span><b>{counts.comments}</b> Comments</span><span><b>{counts.edited}</b> Edited since import</span>
          </div>
          <dl className="receipt-details">
            <div><dt>Source file</dt><dd>{template.sourceFilename}</dd></div>
            <div><dt>Worksheet</dt><dd>{template.importSummary.sheetName}</dd></div>
            <div><dt>Source rows</dt><dd>{template.importSummary.sourceRows}</dd></div>
            <div><dt>Fingerprint</dt><dd><code>{template.sourceFingerprint}</code></dd></div>
          </dl>
        </section>
        <section className="receipt-card">
          <span className="overline">Mapping contract</span>
          <ul className="mapping-list">
            <li><CheckIcon /><span><strong>Structured and editable</strong>Section names, item names, comment names, comment HTML, type, category, and order.</span></li>
            <li><CheckIcon /><span><strong>Retained as metadata</strong>Defaults, recommendations, photos, answer settings, usage counts, timestamps, and unfamiliar columns.</span></li>
            <li><ShieldIcon /><span><strong>Safe display copy</strong>Original HTML stays intact while rendered HTML is sanitized. Unsafe source markup is never executed.</span></li>
          </ul>
        </section>
      </div>
      <section className="receipt-card notice-receipt">
        <div className="subsection-heading"><h3>Exceptions and notices</h3><span>{template.warnings.length} total</span></div>
        {template.warnings.length === 0 ? (
          <div className="all-clear"><CheckIcon /><span><strong>No mapping exceptions</strong>Every populated row found a structured destination.</span></div>
        ) : template.warnings.map((warning, index) => (
          <details className={`receipt-warning severity-${warning.severity}`} key={`${warning.code}-${index}`}>
            <summary><AlertIcon /><span><strong>{warning.code.replaceAll("_", " ")}</strong><small>{warning.message}</small></span><b>{warning.rowNumber ? `Row ${warning.rowNumber}` : warning.severity}</b></summary>
            {warning.rawData && <pre>{JSON.stringify(warning.rawData, null, 2)}</pre>}
          </details>
        ))}
      </section>
      {template.importSummary.preservedMetadataColumns.length > 0 && (
        <section className="receipt-card">
          <span className="overline">Preserved metadata columns</span>
          <div className="metadata-chips">{template.importSummary.preservedMetadataColumns.map((column) => <span key={column}>{column}</span>)}</div>
        </section>
      )}
    </div>
  );
}

function EditorSkeleton() {
  return <div className="page editor-loading"><div className="skeleton-line wide" /><div className="skeleton-line" /><div className="editor-skeleton-card skeleton" /></div>;
}
