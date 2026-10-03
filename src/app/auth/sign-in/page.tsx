'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignInPage() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle, signInAnon } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [anonLoading, setAnonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signInWithEmail(email, password);
      router.push('/');
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

  const handleGuestSignIn = async () => {
    setAnonLoading(true);
    setError(null);
    try {
      await signInAnon();
      router.push('/');
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code || ''));
    } finally {
      setAnonLoading(false);
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
            Welcome Back!
          </h1>
          <p className="text-sm text-[#78716C] mt-1.5 text-center">
            Don&apos;t have an account?{' '}
            <Link href="/auth/sign-up" className="text-[#C8622A] font-semibold hover:underline">
              Sign Up
            </Link>
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Type your password"
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
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-[#44403C]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#E8E0D5] text-[#C8622A] focus:ring-[#C8622A]"
              />
              <span>Remember me</span>
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-[#78716C] hover:text-[#C8622A] font-medium"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" loading={loading} className="w-full h-11 text-base mt-2">
            Sign In
          </Button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="border-t border-[#E8E0D5] w-full" />
          <span className="bg-white px-3 text-xs text-[#78716C] uppercase tracking-wider absolute">
            Or
          </span>
        </div>

        <div className="space-y-2.5">
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

          <button
            type="button"
            onClick={handleGuestSignIn}
            disabled={anonLoading}
            className="w-full h-10 rounded-xl border border-dashed border-[#E8E0D5] bg-transparent hover:bg-[#FDF4ED] text-xs font-semibold text-[#78716C] hover:text-[#C8622A] flex items-center justify-center transition-colors disabled:opacity-50"
          >
            Continue as Guest (Anonymous)
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-[#78716C]">
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
