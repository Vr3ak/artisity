import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "About us · Artisity",
  description:
    "Artisity connects local businesses with Cambodia's hidden creative talent and stands for authentic human creativity.",
};

// Layout follows the About us mock: photo beside the intro, then vision (left) and mission (right).
export default function AboutPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-16 pt-6 md:gap-24 md:px-6 md:pt-12">
        <section className="grid items-center gap-8 md:grid-cols-[6fr_5fr] md:gap-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/about.jpg"
            alt="The Artisity team, four of us seated in front of a colorful painting"
            width={1600}
            height={1200}
            className="aspect-[4/3] w-full rounded-3xl object-cover shadow-float"
          />
          <div className="flex flex-col gap-5">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">About us</h1>
            <p className="max-w-prose text-lg leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">Artisity</strong> is a digital platform
              connecting local businesses with Cambodia&apos;s hidden creative talent. We were founded to
              address a growing problem of artists losing work to AI-generated content. As AI-generated
              content weakens the visual culture and displaces creative employment, we stand firmly for
              authentic human creativity.
            </p>
          </div>
        </section>

        <section className="flex max-w-3xl flex-col gap-4">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Our vision</h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            To protect Cambodian creative employment, revive authentic human visual storytelling, and
            build a trusted bridge between local talent and businesses, so that the next generation of
            designers, animators and musicians can turn their passion into a sustainable career.
          </p>
        </section>

        {/* Right-aligned from md up, as in the mock; left-aligned on phones for readability */}
        <section className="flex max-w-3xl flex-col gap-4 md:ml-auto md:text-right">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Our mission</h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            To provide a safe, localized digital marketplace and collaborative workspace tailored to
            Cambodia that empowers artists with transparent pricing, guaranteed protected payments and
            fast, filtered discovery, connecting businesses with real human creativity instead of AI.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
