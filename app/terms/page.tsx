import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service · Artisity",
  description: "The rules for using Artisity as a client or an artist.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="October 30, 2026">
      <p>
        These terms apply when you use Artisity (artisity.co). By creating an account you agree to
        them. If you don&apos;t agree, please don&apos;t use Artisity.
      </p>

      <h2>What Artisity is</h2>
      <p>
        Artisity is a place for clients to find artists, message them and send commission requests.
        Artisity is not a party to the agreement between a client and an artist. Price, scope,
        deadlines, revisions, payment and delivery are agreed directly between you and the other
        person.
      </p>
      <p>
        <strong>Payments currently happen outside Artisity.</strong> We don&apos;t hold money, process
        payments or guarantee that work will be delivered or paid for. Agree on terms in writing in
        your Artisity chat before starting, and be careful with upfront payments to people you
        don&apos;t know.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 16 years old.</li>
        <li>Give accurate information and keep your password safe. You&apos;re responsible for activity on your account.</li>
        <li>One person per account. Don&apos;t create accounts for someone else without permission.</li>
      </ul>

      <h2>Your work and content</h2>
      <ul>
        <li>
          You keep ownership of everything you post: artwork, portfolio images, profile content and
          messages.
        </li>
        <li>
          You give Artisity permission to store, display and share that content only as needed to run
          the service, for example showing your portfolio on your public profile.
        </li>
        <li>
          Only post work you made or have the right to share. Rights in commissioned work transfer to
          the client only as you both agree.
        </li>
      </ul>

      <h2>Human-made work</h2>
      <p>
        Artisity exists to support human creativity. Don&apos;t present AI-generated work as your
        own hand-made work, in your portfolio or in commissions. If AI tools are part of your
        process, say so clearly before a client commissions you.
      </p>

      <h2>Things you must not do</h2>
      <ul>
        <li>Harass, threaten or discriminate against anyone.</li>
        <li>Scam, mislead or impersonate anyone.</li>
        <li>Post sexual content involving minors, or illegal, violent or hateful content.</li>
        <li>Post someone else&apos;s work, or infringe copyright or trademarks.</li>
        <li>Send spam or unsolicited advertising.</li>
        <li>Try to break, overload or get around the security of Artisity.</li>
      </ul>

      <h2>Safety, reports and enforcement</h2>
      <p>
        You can block anyone and report profiles or behavior from the menu on a profile or chat. We
        review reports and may remove content, limit features or suspend or delete accounts that
        break these terms, with or without notice.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can delete your account at any time from <Link href="/profile/edit">Edit profile</Link>.
        Our <Link href="/privacy">Privacy Policy</Link> explains what that removes.
      </p>

      <h2>No guarantees</h2>
      <p>
        Artisity is provided as is. We work to keep it available and safe, but we can&apos;t promise
        it will always be available or error-free, and we aren&apos;t responsible for what users do,
        say or deliver. To the extent the law allows, Artisity isn&apos;t liable for indirect losses
        or for disputes between users.
      </p>

      <h2>Changes and governing law</h2>
      <p>
        We may update these terms. We&apos;ll change the date above and, for significant changes, let
        you know in the app or by email. Continuing to use Artisity means you accept the updated
        terms. These terms are governed by the laws of the Kingdom of Cambodia.
      </p>
    </LegalPage>
  );
}
