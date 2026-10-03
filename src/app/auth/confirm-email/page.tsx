'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';
import { Button } from '@/components/ui/button';

export default function ConfirmEmailPage() {
  const { sendVerificationEmail, firebaseUser } = useAuth();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      await sendVerificationEmail();
      setSent(true);
    } catch (e) {
      console.warn('Could not resend email:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-[#C8622A]/20 selection:text-[#C8622A]">
      <div className="max-w-[440px] w-full bg-white rounded-3xl p-8 sm:p-10 border border-[#E8E0D5] shadow-xl text-center">
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="relative w-16 h-16 mb-4 block">
            <Image
              src="/brand/logo.png"
              alt="The Copper Leaf"
              fill
              className="object-contain"
              priority
            />
          </Link>
          <div className="w-12 h-12 rounded-2xl bg-[#FDF4ED] text-[#C8622A] flex items-center justify-center mb-4">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1917]">
            Confirm your email address
          </h1>
          <p className="text-sm text-[#78716C] mt-3 leading-relaxed">
            Please check your inbox at{' '}
            <strong className="text-[#1C1917]">{firebaseUser?.email || 'your email'}</strong> for a
            confirmation link. Didn&apos;t receive the email? We&apos;ll send you another.
          </p>
        </div>

        {sent && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Verification email sent! Please check your inbox and spam folder.</span>
          </div>
        )}

        <Button
          onClick={handleResend}
          loading={loading}
          className="w-full h-11 text-base mb-4"
        >
          Resend Confirmation Email
        </Button>

        <Link href="/auth/sign-in" className="text-sm text-[#78716C] hover:text-[#C8622A] font-semibold">
          &larr; Back to Sign In
        </Link>

        <div className="mt-10 text-center text-xs text-[#78716C]">
          <Link href="/" className="hover:text-[#C8622A] mr-4">
            Privacy Policy
          </Link>
          <Link href="/" className="hover:text-[#C8622A]">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
