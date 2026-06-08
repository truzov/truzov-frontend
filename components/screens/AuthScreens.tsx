'use client';

import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/layout/Logo';
import { useAuthStore } from '@/store/auth.store';
import type { UserRole } from '@/types';

export function AuthScreen({
  mode,
  role = 'customer',
}: {
  mode: 'login' | 'register';
  role?: UserRole;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginAs = useAuthStore((state) => state.loginAs);
  const returnUrl =
    searchParams.get('redirect') ??
    (role === 'vendor' ? '/vendor' : role === 'admin' ? '/admin' : role === 'lab' ? '/lab' : '/account');

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-surface-border bg-surface-base p-6 shadow-sm">
        <div className="mb-8 text-center">
          <Logo />
          <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-sm font-semibold text-brand-primary">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            {role} access
          </div>
          <h1 className="mt-5 font-heading text-3xl">
            {mode === 'login' ? 'Sign in to Truzov' : 'Create your Truzov account'}
          </h1>
        </div>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            loginAs(role);
            router.push(returnUrl);
          }}
        >
          {mode === 'register' ? <Input label="Name" name="name" placeholder="Asha Verma" /> : null}
          <Input label="Email" name="email" placeholder={`${role}@truzov.test`} type="email" />
          <Input label="Password" name="password" placeholder="password123" type="password" />
          {mode === 'register' ? (
            <Input label="Confirm password" name="confirmPassword" placeholder="password123" type="password" />
          ) : null}
          <Button size="lg" type="submit">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
        <div className="mt-5 text-center text-sm text-text-secondary">
          {mode === 'login' ? (
            <>
              New to Truzov?{' '}
              <Link className="font-semibold text-brand-primary" href={role === 'customer' ? '/signup' : `/${role}/register`}>
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link className="font-semibold text-brand-primary" href={role === 'customer' ? '/login' : `/${role}/login`}>
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
