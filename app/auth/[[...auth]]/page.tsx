// app/auth/[[...auth]]/page.tsx
// ============================================
'use client';

import { SignIn, SignUp } from '@clerk/nextjs';
import { useState } from 'react';
import { dark } from '@clerk/themes';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md p-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isSignUp ? 'Create an Account' : 'Welcome Back'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {isSignUp
              ? 'Sign up to get started with our service'
              : 'Sign in to continue to your dashboard'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {isSignUp ? (
            <SignUp
              appearance={{
                baseTheme:
                  typeof window !== 'undefined' &&
                  window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? dark
                    : undefined,
                elements: {
                  formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
                  card: 'shadow-none',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton:
                    'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700',
                  socialButtonsBlockButtonText: 'font-medium',
                  dividerLine: 'bg-gray-300 dark:bg-gray-600',
                  dividerText: 'text-gray-500 dark:text-gray-400',
                  formFieldLabel: 'text-gray-700 dark:text-gray-300',
                  formFieldInput:
                    'border-gray-300 dark:border-gray-600 dark:bg-gray-700',
                  footerAction: 'hidden',
                },
              }}
              redirectUrl="/dashboard"
              routing="path"
              path="/auth"
            />
          ) : (
            <SignIn
              appearance={{
                baseTheme:
                  typeof window !== 'undefined' &&
                  window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? dark
                    : undefined,
                elements: {
                  formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
                  card: 'shadow-none',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton:
                    'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700',
                  socialButtonsBlockButtonText: 'font-medium',
                  dividerLine: 'bg-gray-300 dark:bg-gray-600',
                  dividerText: 'text-gray-500 dark:text-gray-400',
                  formFieldLabel: 'text-gray-700 dark:text-gray-300',
                  formFieldInput:
                    'border-gray-300 dark:border-gray-600 dark:bg-gray-700',
                  footerAction: 'hidden',
                },
              }}
              redirectUrl="/dashboard"
              routing="path"
              path="/auth"
            />
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
