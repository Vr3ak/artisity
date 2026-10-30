import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy · Artisity",
  description: "What Artisity collects, why, who can see it, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 30, 2026">
      <p>
        Artisity connects clients with artists in Cambodia. This policy explains what we collect when
        you use artisity.co, why, who can see it, and how to remove it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your email address and password (stored hashed), or the
          name, email and profile picture Google shares when you sign in with Google.
        </li>
        <li>
          <strong>Profile:</strong> display name, username, bio, location, cover and profile images,
          social links, the categories you offer or want, and for artists, services, prices and
          portfolio images.
        </li>
        <li>
          <strong>Private contact handles:</strong> the Telegram, Facebook or Instagram handles you
          choose to add.
        </li>
        <li>
          <strong>Messages and requests:</strong> chat messages, the files and voice notes you send,
          and commission requests with their brief, budget, deadline and status.
        </li>
        <li>
          <strong>Safety records:</strong> people you block and reports you send.
        </li>
        <li>
          <strong>Technical data:</strong> a sign-in cookie that keeps you logged in, your light or
          dark theme choice (stored in your browser), and standard server logs such as IP address
          and browser type.
        </li>
      </ul>
      <p>We don&apos;t use advertising trackers and we don&apos;t sell your data.</p>

      <h2>Why we use it</h2>
      <ul>
        <li>To run your account and show your profile.</li>
        <li>To deliver messages, files and commission requests between you and other users.</li>
        <li>To send sign-in codes and account emails.</li>
        <li>To keep the platform safe: reviewing reports and stopping spam, scams and abuse.</li>
      </ul>

      <h2>Who can see what</h2>
      <ul>
        <li>
          <strong>Artist profiles</strong> (name, username, bio, images, links, services, portfolio)
          are public, including to people who aren&apos;t signed in.
        </li>
        <li>
          <strong>Client profiles</strong> are visible only to you, the artists you message or send
          requests to, and Artisity staff.
        </li>
        <li>
          <strong>Messages and files</strong> are visible only to the two people in the conversation.
        </li>
        <li>
          <strong>Contact handles</strong> are shown only to people you share a commission request
          with.
        </li>
        <li>
          <strong>Blocks and reports</strong> are private. People you block or report aren&apos;t told.
        </li>
      </ul>

      <h2>Services we rely on</h2>
      <p>
        We store data with Supabase (database, file storage and sign-in) and host the website with
        our hosting provider. If you sign in with Google, Google handles that sign-in under its own
        privacy policy. These providers process data on our behalf and may store it outside Cambodia.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your data while your account exists. You can delete your account at any time from{" "}
        <Link href="/profile/edit">Edit profile</Link>. This permanently removes your profile, images,
        services, contact handles, messages, files and requests. Conversations you were part of are
        removed for the other person too. Reports you sent are kept, without your name, so staff can
        finish reviewing them. Server logs and backups are cleared on our providers&apos; normal
        schedules.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Edit your profile and contact handles at any time.</li>
        <li>Edit or delete messages you sent.</li>
        <li>Block anyone to stop them messaging you or sending requests.</li>
        <li>Delete your account and its data.</li>
        <li>Email us for a copy of your data or to ask about anything above.</li>
      </ul>

      <h2>Children</h2>
      <p>
        Artisity is for people aged 16 and over. If you believe a younger child has an account,
        contact us and we&apos;ll remove it.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we&apos;ll update the date above and, for significant changes, let
        you know in the app or by email.
      </p>
    </LegalPage>
  );
}
