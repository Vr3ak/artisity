import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/options";

// Long-form layout for /terms and /privacy. Styles plain h2/p/ul children (no typography plugin).
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-16 pt-6 md:px-6 md:pt-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="text-sm text-muted-foreground">Last updated {updated}</p>
      </header>
      <div className="flex flex-col gap-4 leading-relaxed text-muted-foreground [&_a]:font-semibold [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground [&_li]:pl-1 [&_strong]:text-foreground [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6">
        {children}
        <h2>Contact us</h2>
        <p>
          Questions about this page? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        See also <Link href="/terms" className="font-semibold text-foreground underline underline-offset-4">Terms of Service</Link>{" "}
        and <Link href="/privacy" className="font-semibold text-foreground underline underline-offset-4">Privacy Policy</Link>.
      </p>
    </main>
  );
}
