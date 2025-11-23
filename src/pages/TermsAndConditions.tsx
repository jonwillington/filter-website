import React from 'react';
import { Link } from 'react-router-dom';

const TermsAndConditions: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link
          to="/"
          className="text-accent hover:text-secondary transition-colors mb-8 inline-block"
        >
          ← Back to Home
        </Link>
        
        <h1 className="text-4xl font-semibold text-contrastBlock mb-8">
          Terms and Conditions
        </h1>
        
        <div className="prose prose-lg max-w-none text-text space-y-6">
          <p className="text-textSecondary">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          
          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              1. Agreement to Terms
            </h2>
            <p className="text-text leading-relaxed">
              By accessing or using Filter, you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you may not access the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              2. Use License
            </h2>
            <p className="text-text leading-relaxed mb-4">
              Permission is granted to temporarily use Filter for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-text">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained in Filter</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              3. User Accounts
            </h2>
            <p className="text-text leading-relaxed">
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              4. Acceptable Use
            </h2>
            <p className="text-text leading-relaxed mb-4">
              You agree not to use Filter:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-text">
              <li>In any way that violates any applicable law or regulation</li>
              <li>To transmit any malicious code or viruses</li>
              <li>To impersonate or attempt to impersonate another user</li>
              <li>To engage in any automated use of the system</li>
              <li>To interfere with or disrupt the service or servers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              5. Content
            </h2>
            <p className="text-text leading-relaxed">
              Our service allows you to post, link, store, share and otherwise make available certain information. You are responsible for the content that you post on or through the service, including its legality, reliability, and appropriateness.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              6. Intellectual Property
            </h2>
            <p className="text-text leading-relaxed">
              The service and its original content, features, and functionality are and will remain the exclusive property of Filter and its licensors. The service is protected by copyright, trademark, and other laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              7. Termination
            </h2>
            <p className="text-text leading-relaxed">
              We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              8. Disclaimer
            </h2>
            <p className="text-text leading-relaxed">
              The information on this service is provided on an "as is" basis. To the fullest extent permitted by law, Filter excludes all representations, warranties, and conditions relating to our service and the use of this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              9. Limitation of Liability
            </h2>
            <p className="text-text leading-relaxed">
              In no event shall Filter, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              10. Governing Law
            </h2>
            <p className="text-text leading-relaxed">
              These Terms shall be interpreted and governed by the laws of the jurisdiction in which Filter operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              11. Changes to Terms
            </h2>
            <p className="text-text leading-relaxed">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              12. Contact Information
            </h2>
            <p className="text-text leading-relaxed">
              If you have any questions about these Terms and Conditions, please contact us through the appropriate channels provided in our service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;

