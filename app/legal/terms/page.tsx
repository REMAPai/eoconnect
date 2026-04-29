import Link from 'next/link'

// Boilerplate Terms of Service. Replace with reviewed legal copy
// before public launch. The structure mirrors a standard SaaS ToS
// so future updates are non-disruptive.

export const metadata = {
  title: 'Terms of Service · Member Market',
  description: 'The terms governing use of Member Market.',
}

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 prose prose-sm dark:prose-invert">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: April 2026 · <Link href="/legal/privacy" className="underline">Privacy Policy</Link>
      </p>

      <section className="space-y-6 text-sm leading-relaxed">
        <p>
          These terms govern access to and use of Member Market (the &ldquo;Service&rdquo;).
          By creating an account or using the Service, you agree to these terms.
          Member Market is a private business directory exclusively for verified
          members of the Entrepreneurs&apos; Organization (EO) and approved affiliates.
        </p>

        <h2 className="text-lg font-semibold mt-8">1. Eligibility</h2>
        <p>
          You must be a current EO member, EO alumni, or EO Accelerator participant
          to register. We may verify your status at any time and suspend accounts
          that no longer meet eligibility.
        </p>

        <h2 className="text-lg font-semibold mt-8">2. Your account</h2>
        <p>
          You are responsible for the accuracy of information on your profile and
          listings, the security of your credentials, and all activity occurring
          under your account.
        </p>

        <h2 className="text-lg font-semibold mt-8">3. Acceptable use</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>No illegal, deceptive, or fraudulent listings.</li>
          <li>No spam, scraping, or automated messaging of other members.</li>
          <li>No content that violates intellectual property rights.</li>
          <li>No harassment of other members.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-8">4. Listings and content</h2>
        <p>
          You retain ownership of content you submit. You grant Member Market a
          non-exclusive, worldwide license to display that content within the
          Service for the purpose of operating the directory.
        </p>

        <h2 className="text-lg font-semibold mt-8">5. Paid features</h2>
        <p>
          Sponsored listings, promoted campaigns, and other paid features are
          billed separately through Stripe. Refunds are handled on a case-by-case
          basis. See pricing details at the point of purchase.
        </p>

        <h2 className="text-lg font-semibold mt-8">6. Termination</h2>
        <p>
          We may suspend or terminate accounts that violate these terms or
          present a risk to the community. You may close your account at any
          time by contacting support.
        </p>

        <h2 className="text-lg font-semibold mt-8">7. Disclaimers</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo;. Member Market is not party to
          transactions between members and makes no warranty regarding the
          quality, safety, or legality of services listed.
        </p>

        <h2 className="text-lg font-semibold mt-8">8. Changes</h2>
        <p>
          We may update these terms periodically. Material changes will be
          announced on the Service. Continued use after a change constitutes
          acceptance of the updated terms.
        </p>

        <h2 className="text-lg font-semibold mt-8">9. Contact</h2>
        <p>
          Questions about these terms?{' '}
          <a href="mailto:support@member.market" className="underline">support@member.market</a>
        </p>
      </section>
    </main>
  )
}
