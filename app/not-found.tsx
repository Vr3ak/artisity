import Link from "next/link";

// Replaces Next's built-in 404, whose own dark-mode styles override the site theme
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-sm font-semibold text-primary-ink">404</p>
      <h1 className="text-3xl font-bold tracking-tight">This page doesn&apos;t exist</h1>
      <p className="text-muted-foreground">The link may be broken, or the page may have been removed.</p>
      <Link
        href="/"
        className="inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90"
      >
        Go home
      </Link>
    </main>
  );
}
