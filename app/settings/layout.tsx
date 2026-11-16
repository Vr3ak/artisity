import { SettingsNav } from "@/components/settings-nav";

// One Settings area (after Fiverr/Behance): public profile, account and security, preferences, and
// privacy. The proxy sends signed-out visitors to log in with ?next= back here.
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10 md:px-6 md:py-10">
      <div className="flex flex-col gap-4 md:sticky md:top-24 md:self-start">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Settings</h1>
        <SettingsNav />
      </div>
      <div className="min-w-0">{children}</div>
    </main>
  );
}
