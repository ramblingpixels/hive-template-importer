"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AlertIcon, ArrowIcon, FileIcon, ShieldIcon } from "@/components/icons";
import type { TemplateListItem } from "@/types/template";

type DashboardState =
  | { status: "loading" }
  | { status: "ready"; templates: TemplateListItem[] }
  | { status: "setup"; message: string }
  | { status: "error"; message: string };

export function TemplateDashboard() {
  const [state, setState] = useState<DashboardState>({ status: "loading" });

  useEffect(() => {
    fetch("/api/templates", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          if (data.code === "DATABASE_NOT_CONFIGURED") {
            setState({ status: "setup", message: data.error });
            return;
          }
          throw new Error(data.error || "Templates could not be loaded.");
        }
        setState({ status: "ready", templates: data.templates });
      })
      .catch((error: Error) => setState({ status: "error", message: error.message }));
  }, []);

  const templates = state.status === "ready" ? state.templates : [];
  const totalComments = templates.reduce((total, template) => total + template.commentCount, 0);

  return (
    <div className="page dashboard-page">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow"><span className="pulse-dot" /> Migration workspace</span>
          <h1>Bring the work.<br /><em>Keep the craft.</em></h1>
          <p>
            Move years of inspection knowledge into a structure you can verify, edit,
            and build on—without quiet data loss.
          </p>
          <div className="hero-actions">
            <Link href="/import" className="button button-primary">
              Import a Spectora template <ArrowIcon />
            </Link>
            <a href="#templates" className="text-link">View workspace</a>
          </div>
        </div>
        <div className="trust-card" aria-label="Import promise">
          <div className="trust-icon"><ShieldIcon /></div>
          <span className="overline">Import promise</span>
          <strong>Nothing disappears quietly.</strong>
          <p>Mapped content is editable. Everything else is retained and called out.</p>
          <div className="trust-rule" />
          <div className="trust-stats">
            <span><b>{templates.length}</b> templates</span>
            <span><b>{totalComments}</b> comments</span>
          </div>
        </div>
      </section>

      <section id="templates" className="workspace-section">
        <div className="section-heading">
          <div>
            <span className="overline">Your workspace</span>
            <h2>Imported templates</h2>
          </div>
          <Link href="/import" className="button button-outline">New import</Link>
        </div>

        {state.status === "loading" && <TemplateSkeleton />}
        {state.status === "setup" && (
          <div className="notice-card notice-setup">
            <AlertIcon />
            <div>
              <strong>Connect the database to unlock persistence</strong>
              <p>{state.message}</p>
              <code>cp .env.example .env.local &amp;&amp; npm run db:migrate</code>
            </div>
          </div>
        )}
        {state.status === "error" && (
          <div className="notice-card notice-error"><AlertIcon /><div><strong>Could not load templates</strong><p>{state.message}</p></div></div>
        )}
        {state.status === "ready" && templates.length === 0 && <EmptyState />}
        {state.status === "ready" && templates.length > 0 && (
          <div className="template-grid">
            {templates.map((template) => <TemplateCard key={template.id} template={template} />)}
          </div>
        )}
      </section>

      <section className="workflow-strip">
        <span className="overline">How it works</span>
        <div className="workflow-steps">
          <div><b>01</b><span><strong>Preview</strong>Review counts and warnings before saving.</span></div>
          <div><b>02</b><span><strong>Edit</strong>Rename sections, items, and comments.</span></div>
          <div><b>03</b><span><strong>Duplicate</strong>Create an independent working copy.</span></div>
        </div>
      </section>
    </div>
  );
}

function TemplateCard({ template }: { template: TemplateListItem }) {
  return (
    <Link href={`/templates/${template.id}`} className="template-card">
      <div className="template-card-top">
        <span className="file-tile"><FileIcon /></span>
        <span className={template.warningCount > 0 ? "status-pill status-review" : "status-pill status-clean"}>
          {template.warningCount > 0 ? `${template.warningCount} to review` : "Import checked"}
        </span>
      </div>
      <h3>{template.name}</h3>
      <p>{template.sourceFilename}</p>
      <div className="template-counts">
        <span><b>{template.sectionCount}</b> sections</span>
        <span><b>{template.itemCount}</b> items</span>
        <span><b>{template.commentCount}</b> comments</span>
      </div>
      <div className="card-footer">
        <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
        <ArrowIcon />
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <span className="file-tile large"><FileIcon /></span>
      <h3>Your first import starts here</h3>
      <p>Upload the HTML-text spreadsheet exported by Spectora. You will review the map before anything is saved.</p>
      <Link href="/import" className="button button-primary">Choose workbook <ArrowIcon /></Link>
    </div>
  );
}

function TemplateSkeleton() {
  return <div className="template-grid"><div className="template-card skeleton" /><div className="template-card skeleton" /></div>;
}

