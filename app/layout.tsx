import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { TopNav } from "@/components/top-nav";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const defaultUrl = process.env.SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Artisity",
  description: "",
};

// viewport-fit=cover makes env(safe-area-inset-bottom) report the home-indicator inset
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#2B2A2A" },
    { media: "(prefers-color-scheme: light)", color: "#FCF1D0" },
  ],
};

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    // THEME_SCRIPT sets the class on <html> before paint, so React sees a mismatch
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.className} antialiased`}>
        <Script
          id="theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 bg-background px-4 md:px-6">
          <Suspense>
            <TopNav />
          </Suspense>
        </header>
        {/* Clears the fixed mobile tab bar */}
        <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </div>
        {modal}
      </body>
    </html>
  );
}
