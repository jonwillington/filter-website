'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, Button } from '@heroui/react';
import { useAuth } from '@/lib/context/AuthContext';
import { useState } from 'react';
import { LegalModal } from '../modals/LegalModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading('google');
    setError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading('apple');
    setError(null);
    try {
      await signInWithApple();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      aria-labelledby="login-modal-title"
      aria-describedby="login-modal-description"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-2 pt-8">
          <span id="login-modal-title" className="font-display text-3xl">
            Sign in to Filter
          </span>
          <span id="login-modal-description" className="text-base font-normal text-default-500">
            Choose your preferred sign-in method
          </span>
        </ModalHeader>
        <ModalBody className="pb-8">
          <div className="flex flex-col gap-4">
            <Button
              onPress={handleGoogleSignIn}
              isLoading={loading === 'google'}
              isDisabled={loading !== null}
              variant="bordered"
              size="lg"
              className="w-full"
              aria-label="Sign in with Google"
              startContent={
                loading !== 'google' ? (
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                ) : null
              }
            >
              Continue with Google
            </Button>

            <Button
              onPress={handleAppleSignIn}
              isLoading={loading === 'apple'}
              isDisabled={loading !== null}
              variant="bordered"
              size="lg"
              className="w-full"
              aria-label="Sign in with Apple"
              startContent={
                loading !== 'apple' ? (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                ) : null
              }
            >
              Continue with Apple
            </Button>

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="p-3 rounded-lg bg-danger-50 border border-danger-200"
              >
                <p className="text-sm text-danger-600">{error}</p>
              </div>
            )}

            <p className="text-sm text-default-500 text-center">
              By signing in, you agree to our{' '}
              <button
                onClick={() => setLegalModal('terms')}
                className="text-accent hover:underline cursor-pointer"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                onClick={() => setLegalModal('privacy')}
                className="text-accent hover:underline cursor-pointer"
              >
                Privacy Policy
              </button>
              .
            </p>
          </div>
        </ModalBody>
      </ModalContent>

      <LegalModal
        isOpen={legalModal !== null}
        onClose={() => setLegalModal(null)}
        type={legalModal || 'privacy'}
      />
    </Modal>
  );
}
