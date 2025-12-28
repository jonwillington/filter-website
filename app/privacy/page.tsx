import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Filter Coffee',
  description: 'Privacy Policy for Filter Coffee',
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>

        <div className="prose prose-lg max-w-none text-text space-y-6">
          <p className="text-textSecondary">Last updated: December 2024</p>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              1. Introduction
            </h2>
            <p className="text-text leading-relaxed">
              Welcome to Filter. We are committed to protecting your privacy and
              ensuring you have a positive experience on our platform. This
              Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              2. Information We Collect
            </h2>
            <p className="text-text leading-relaxed mb-4">
              We may collect information about you in a variety of ways:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-text">
              <li>Location data if you choose to share it with us</li>
              <li>Usage data including how you interact with our service</li>
              <li>Device information such as browser type</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-text leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-text">
              <li>Provide, maintain, and improve our services</li>
              <li>Show you nearby coffee shops based on your location</li>
              <li>Monitor and analyze trends and usage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              4. Data Security
            </h2>
            <p className="text-text leading-relaxed">
              We implement appropriate technical and organizational security
              measures to protect your personal information. Your location data
              is only used locally and is not stored on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              5. Contact Us
            </h2>
            <p className="text-text leading-relaxed">
              If you have any questions about this Privacy Policy, please
              contact us through the Filter mobile app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
