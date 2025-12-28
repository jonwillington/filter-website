import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions | Filter Coffee',
  description: 'Terms and Conditions for Filter Coffee',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-accent hover:text-secondary transition-colors mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-semibold text-contrastBlock mb-8">
          Terms and Conditions
        </h1>

        <div className="prose prose-lg max-w-none text-text space-y-6">
          <p className="text-textSecondary">Last updated: December 2024</p>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              1. Agreement to Terms
            </h2>
            <p className="text-text leading-relaxed">
              By accessing or using Filter, you agree to be bound by these Terms
              and Conditions. If you disagree with any part of these terms, you
              may not access the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              2. Use License
            </h2>
            <p className="text-text leading-relaxed mb-4">
              Permission is granted to use Filter for personal, non-commercial
              use. Under this license you may not:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-text">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose</li>
              <li>Attempt to reverse engineer any software</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              3. Disclaimer
            </h2>
            <p className="text-text leading-relaxed">
              The information on this service is provided on an &quot;as is&quot; basis.
              Filter makes no warranties about the accuracy of coffee shop
              information, opening hours, or other details. Always verify
              information directly with the establishment.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              4. Limitation of Liability
            </h2>
            <p className="text-text leading-relaxed">
              In no event shall Filter, nor its directors, employees, partners,
              or affiliates, be liable for any indirect, incidental, special,
              consequential, or punitive damages arising from your use of the
              service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              5. Changes to Terms
            </h2>
            <p className="text-text leading-relaxed">
              We reserve the right to modify or replace these Terms at any time.
              Continued use of the service after changes constitutes acceptance
              of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              6. Contact
            </h2>
            <p className="text-text leading-relaxed">
              If you have any questions about these Terms, please contact us
              through the Filter mobile app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
