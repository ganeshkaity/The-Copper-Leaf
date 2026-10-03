'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignUpPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;
    return score; // 0 to 4
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signUpWithEmail(email, password, name);
      router.push('/auth/confirm-email');
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code || ''));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-[#C8622A]/20 selection:text-[#C8622A]">
      <div className="max-w-[440px] w-full bg-white rounded-3xl p-8 sm:p-10 border border-[#E8E0D5] shadow-xl">
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1917] text-center">
            Good Morning!
          </h1>
          <p className="text-sm text-[#78716C] mt-1.5 text-center">
            Already have an account?{' '}
            <Link href="/auth/sign-in" className="text-[#C8622A] font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">Full Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type your full name"
              icon={<User className="w-4 h-4 text-[#78716C]" />}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Type your email address"
              icon={<Mail className="w-4 h-4 text-[#78716C]" />}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">Password</label>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create your password"
              icon={<Lock className="w-4 h-4 text-[#78716C]" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#78716C] hover:text-[#1C1917] p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />

            {/* Password strength indicator bars */}
            {password && (
              <div className="mt-2 flex gap-1.5 h-1 w-full">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      step <= strength
                        ? strength <= 1
                          ? 'bg-red-500'
                          : strength <= 2
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                        : 'bg-[#E8E0D5]'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <Button type="submit" loading={loading} className="w-full h-11 text-base mt-2">
            Sign Up
          </Button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="border-t border-[#E8E0D5] w-full" />
          <span className="bg-white px-3 text-xs text-[#78716C] uppercase tracking-wider absolute">
            Or
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full h-11 rounded-xl border border-[#E8E0D5] bg-white hover:bg-[#FAF6F0] text-sm font-semibold text-[#1C1917] flex items-center justify-center gap-2.5 transition-colors shadow-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <p className="mt-8 text-center text-xs text-[#78716C] leading-relaxed">
          By clicking Sign up, you agree to accept The Copper Leaf&apos;s{' '}
          <Link href="/" className="underline hover:text-[#C8622A]">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/" className="underline hover:text-[#C8622A]">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
