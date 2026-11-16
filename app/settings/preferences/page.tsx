import { ThemeSettings } from "@/components/account-settings";

// Device-level choices; the theme lives in this browser's localStorage (lib/theme.ts)
export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold tracking-tight">Preferences</h2>
      <ThemeSettings />
    </div>
  );
}
