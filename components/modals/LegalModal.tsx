'use client';

import { ModalHeader, ModalBody } from '@heroui/react';
import { CircularCloseButton, ResponsiveModal } from '@/components/ui';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms';
}

export function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
  const isPrivacy = type === 'privacy';

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      hideCloseButton
    >
      {/* Floating close button */}
      <CircularCloseButton
        onPress={onClose}
        className="absolute top-3 right-3 z-20"
      />

        <ModalHeader className="flex flex-col gap-1 pt-6">
          <h2 className="font-display text-2xl">
            {isPrivacy ? 'Privacy Policy' : 'Terms and Conditions'}
          </h2>
        </ModalHeader>
        <ModalBody className="pb-6">
          <div className="prose prose-lg max-w-none text-text space-y-6">
            <p className="text-textSecondary">Last updated: December 2024</p>

            {isPrivacy ? (
              <>
                <section>
                  <h3 className="text-xl font-semibold text-contrastBlock mt-6 mb-3">
                    1. Introduction
                  </h3>
                  <p className="text-text leading-relaxed">
                    Welcome to Filter. We are committed to protecting your privacy and
                    ensuring you have a positive experience on our platform. This
                    Privacy Policy explains how we collect, use, disclose, and
                    safeguard your information when you use our service.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-contrastBlock mt-6 mb-3">
                    2. Information We Collect
                  </h3>
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
                  <h3 className="text-xl font-semibold text-contrastBlock mt-6 mb-3">
                    3. How We Use Your Information
                  </h3>
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
                  <h3 className="text-xl font-semibold text-contrastBlock mt-6 mb-3">
                    4. Data Security
                  </h3>
                  <p className="text-text leading-relaxed">
                    We implement appropriate technical and organizational security
                    measures to protect your personal information. Your location data
                    is only used locally and is not stored on our servers.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-contrastBlock mt-6 mb-3">
                    5. Contact Us
                  </h3>
                  <p className="text-text leading-relaxed">
                    If you have any questions about this Privacy Policy, please
                    contact us through the Filter mobile app.
                  </p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h3 className="text-xl font-semibold text-contrastBlock mt-6 mb-3">
                    1. Agreement to Terms
                  </h3>
                  <p className="text-text leading-relaxed">
                    By accessing or using Filter, you agree to be bound by these Terms
                    and Conditions. If you disagree with any part of these terms, you
                    may not access the service.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-contrastBlock mt-6 mb-3">
                    2. Use License
                  </h3>
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
                  <h3 className="text-xl font-semibold text-contrastBlock mt-6 mb-3">
                    3. Disclaimer
                  </h3>
                  <p className="text-text leading-relaxed">
                    The information on this service is provided on an &quot;as is&quot; basis.
                    Filter makes no warranties about the accuracy of coffee shop
                    information, opening hours, or other details. Always verify
                    information directly with the establishment.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-contrastBlock mt-6 mb-3">
                    4. Limitation of Liability
                  </h3>
                  <p className="text-text leading-relaxed">
                    In no event shall Filter, nor its directors, employees, partners,
                    or affiliates, be liable for any indirect, incidental, special,
                    consequential, or punitive damages arising from your use of the
                    service.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-contrastBlock mt-6 mb-3">
                    5. Changes to Terms
                  </h3>
                  <p className="text-text leading-relaxed">
                    We reserve the right to modify or replace these Terms at any time.
                    Continued use of the service after changes constitutes acceptance
                    of the new terms.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-contrastBlock mt-6 mb-3">
                    6. Contact
                  </h3>
                  <p className="text-text leading-relaxed">
                    If you have any questions about these Terms, please contact us
                    through the Filter mobile app.
                  </p>
                </section>
              </>
            )}
          </div>
        </ModalBody>
    </ResponsiveModal>
  );
}
