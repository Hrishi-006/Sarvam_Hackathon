import Link from 'next/link';

export function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--paper)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          The Haggler
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link
            href="/copilot"
            className="rounded-full px-3 py-2 transition-colors hover:bg-[var(--card)]"
          >
            Copilot
          </Link>
          <Link
            href="/arena"
            className="rounded-full px-3 py-2 transition-colors hover:bg-[var(--card)]"
          >
            Arena
          </Link>
        </nav>
      </div>
    </header>
  );
}
