'use client';

import { LockClosedIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import Link from 'next/link';

const ForgotPasswordCard = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setMessage(
      'If an account with that email exists, we have sent password reset instructions.'
    );
    setLoading(false);
    // setEmail(''); // Optionally clear email field
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-lg shadow-xl w-full max-w-md">
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center">
          Forgot Password{' '}
          <LockClosedIcon className="h-5 w-5 text-yellow-500 dark:text-yellow-400 ml-2" />
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Enter your email and we&apos;ll send you instructions to reset your
          password
        </p>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-700 dark:bg-opacity-25 border border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 rounded-md">
          <p>{message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Email
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={loading}
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white dark:text-sky-900 bg-sky-600 dark:bg-sky-400 hover:bg-sky-700 dark:hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0v4c4.418 0 8.418 1.79 11.314 4.686z"
                ></path>
              </svg>
            ) : (
              'Send reset link'
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 flex items-center justify-center"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default ForgotPasswordCard;
