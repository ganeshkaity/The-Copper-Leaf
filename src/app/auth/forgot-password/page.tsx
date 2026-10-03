'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-[#C8622A]/20 selection:text-[#C8622A]">
      <div className="max-w-[440px] w-full bg-white rounded-3xl p-8 sm:p-10 border border-[#E8E0D5] shadow-xl">
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
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1917] text-center">
            Reset Password
          </h1>
          <p className="text-sm text-[#78716C] mt-2 text-center">
            Enter your email and we&apos;ll send you a link to reset your account password.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {sent ? (
          <div className="text-center space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Password reset email sent! Check your inbox.</span>
            </div>
            <Link href="/auth/sign-in">
              <Button variant="outline" className="w-full">
                Return to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Type your registered email"
                icon={<Mail className="w-4 h-4 text-[#78716C]" />}
                required
              />
            </div>

            <Button type="submit" loading={loading} className="w-full h-11 text-base mt-2">
              Send Reset Link
            </Button>

            <div className="text-center pt-2">
              <Link href="/auth/sign-in" className="text-xs text-[#78716C] hover:text-[#C8622A] font-medium">
                &larr; Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
