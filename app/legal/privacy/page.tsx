import Link from 'next/link'

// Boilerplate privacy policy. Replace with reviewed legal copy
// (and accurate vendor list) before public launch.

export const metadata = {
  title: 'Privacy Policy · Member Market',
  description: 'How Member Market handles your data.',
}

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 prose prose-sm dark:prose-invert">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: April 2026 · <Link href="/legal/terms" className="underline">Terms of Service</Link>
      </p>

      <section className="space-y-6 text-sm leading-relaxed">
        <p>
          Member Market (the &ldquo;Service&rdquo;) collects only what we need to verify
          your eligibility, run the directory, and connect members with each other.
        </p>

        <h2 className="text-lg font-semibold mt-8">1. What we collect</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Account: name, email, profile photo, EO chapter and membership type.</li>
          <li>Business listing: business name, description, services, location, contact details, portfolio attachments.</li>
          <li>Usage: page views, search queries, listing impressions, click-through to outbound links. Used to measure engagement and improve relevance.</li>
          <li>Payment: when you purchase a sponsored campaign, Stripe collects payment details directly. We never see your card number.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-8">2. How we use it</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>To operate the Service: showing your listing to other members, routing messages, sending transactional email.</li>
          <li>To prevent abuse: rate limits, fraud detection, moderation.</li>
          <li>To improve the Service: aggregate analytics. We do not sell personal data.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-8">3. Who we share with</h2>
        <p>
          Subprocessors we rely on to operate the Service:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Supabase (auth, database, file storage)</li>
          <li>OpenAI (semantic search; queries are sent for embedding generation)</li>
          <li>Resend (transactional email)</li>
          <li>Stripe (paid sponsored campaigns only)</li>
          <li>Hosting provider (currently AWS)</li>
        </ul>
        <p>
          We do not share personal information with third parties for advertising or marketing.
        </p>

        <h2 className="text-lg font-semibold mt-8">4. Visibility within the Service</h2>
        <p>
          Other members can see your listed business, your name, profile photo,
          EO chapter, and any contact information you choose to publish. Direct
          messages are visible only to participants.
        </p>

        <h2 className="text-lg font-semibold mt-8">5. Retention</h2>
        <p>
          We keep account data while your account is active. After account closure
          we retain minimal records necessary to comply with legal obligations and
          resolve disputes.
        </p>

        <h2 className="text-lg font-semibold mt-8">6. Your rights</h2>
        <p>
          You may access, update, or delete your profile from the dashboard.
          For data export or full deletion requests, email us at the address below.
          If you are in the EU/UK you also have rights under GDPR including the
          right to object and the right to data portability.
        </p>

        <h2 className="text-lg font-semibold mt-8">7. Security</h2>
        <p>
          Data is transmitted over HTTPS and stored encrypted at rest. Service-role
          credentials are restricted to server processes. We aim to disclose any
          confirmed breach affecting your data within a reasonable time.
        </p>

        <h2 className="text-lg font-semibold mt-8">8. Changes</h2>
        <p>
          We may update this policy. Material changes will be announced on the
          Service.
        </p>

        <h2 className="text-lg font-semibold mt-8">9. Contact</h2>
        <p>
          Privacy questions or requests:{' '}
          <a href="mailto:support@member.market" className="underline">support@member.market</a>
        </p>
      </section>
    </main>
  )
}
