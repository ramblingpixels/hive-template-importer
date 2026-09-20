import Link from "next/link";

export function AppHeader() {
  return (
    <header className="app-header">
      <Link href="/" className="brand" aria-label="Hive Template Studio home">
        <span className="brand-mark" aria-hidden="true">
          <span />
        </span>
        <span>
          <strong>Hive</strong>
          <small>Template Studio</small>
        </span>
      </Link>
      <nav aria-label="Primary navigation">
        <Link href="/">Templates</Link>
        <Link href="/import" className="button button-small button-dark">
          <PlusIcon /> Import template
        </Link>
      </nav>
    </header>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

