import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
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
          Privacy Policy
        </h1>
        
        <div className="prose prose-lg max-w-none text-text space-y-6">
          <p className="text-textSecondary">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          
          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              1. Introduction
            </h2>
            <p className="text-text leading-relaxed">
              Welcome to Filter. We are committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              2. Information We Collect
            </h2>
            <p className="text-text leading-relaxed mb-4">
              We may collect information about you in a variety of ways. The information we may collect includes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-text">
              <li>Personal data such as name, email address, and contact information</li>
              <li>Usage data including how you interact with our service</li>
              <li>Device information such as IP address, browser type, and operating system</li>
              <li>Location data if you choose to share it with us</li>
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
              <li>Process transactions and send related information</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Monitor and analyze trends and usage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              4. Information Sharing and Disclosure
            </h2>
            <p className="text-text leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-text mt-4">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and safety</li>
              <li>With service providers who assist us in operating our platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              5. Data Security
            </h2>
            <p className="text-text leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              6. Your Rights
            </h2>
            <p className="text-text leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-text">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify inaccurate or incomplete data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to processing of your personal data</li>
              <li>Request restriction of processing</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              7. Cookies and Tracking Technologies
            </h2>
            <p className="text-text leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              8. Changes to This Privacy Policy
            </h2>
            <p className="text-text leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-contrastBlock mt-8 mb-4">
              9. Contact Us
            </h2>
            <p className="text-text leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us through the appropriate channels provided in our service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

