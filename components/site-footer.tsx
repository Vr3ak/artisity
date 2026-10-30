import Link from "next/link";

// On content pages only (home, about): full-height pages like chat can't fit a footer.
export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 border-t px-4 py-6 text-sm text-muted-foreground md:px-6">
      <p>© Artisity</p>
      <nav aria-label="Legal" className="flex gap-6">
        <Link href="/about" className="hover:text-foreground">About us</Link>
        <Link href="/terms" className="hover:text-foreground">Terms</Link>
        <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
      </nav>
    </footer>
  );
}
