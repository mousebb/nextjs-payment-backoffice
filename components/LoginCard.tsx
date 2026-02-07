'use client'; // Needed for useState if we add form handling later

import {
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import { useAuth } from '@/components/AuthContext'; // Import useAuth
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import FloatingLabelInput from './FloatingLabelInput';

const LoginCard = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth(); // Get auth context
  const t = useTranslations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await auth.login(username, password, twoFactorCode);
    } catch (err: any) {
      setError(t(err.message) || t('ClientErrorMessages.login-failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-lg shadow-xl w-full max-w-md">
      <div className="flex flex-col items-center mb-6">
        {/* Placeholder for Logo Icon */}
        <div className="p-2 bg-sky-100 dark:bg-sky-700 dark:bg-opacity-25 rounded-md inline-block mb-3">
          <ShieldCheckIcon className="h-8 w-8 text-sky-600 dark:text-sky-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
          Welcome to Next.JS Payment!
        </h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-700 dark:bg-opacity-25 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <FloatingLabelInput
            id="username"
            name="username"
            label={t('Login.username')}
            value={username}
            onChange={e => setUsername(e.target.value)}
            type="text"
            autoComplete="new-password"
            disabled={loading}
            required
          />
        </div>

        <div className="relative">
          <FloatingLabelInput
            id="password"
            name="password"
            label={t('Login.password')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            disabled={loading}
            required
          />
        </div>

        <div>
          <FloatingLabelInput
            id="two_factor_code"
            name="two_factor_code"
            label="2FA Code (Optional)"
            value={twoFactorCode}
            onChange={e => {
              const value = e.target.value;
              if (value.length <= 6) {
                setTwoFactorCode(value);
              }
            }}
            type="text"
            autoComplete="off"
            disabled={loading}
            placeholder="Enter 6-digit code"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              disabled={loading}
              className="h-4 w-4 text-sky-600 dark:text-sky-400 focus:ring-sky-500 dark:focus:ring-sky-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:focus:ring-offset-gray-800"
            />
            <label
              htmlFor="remember-me"
              className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
            >
              {t('Login.remember-me')}
            </label>
          </div>
          <div className="text-sm">
            <Link
              href="/forgot-password"
              className={`font-medium text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 ${loading ? 'pointer-events-none opacity-50' : ''}`}
            >
              {t('Login.forgot-password')}
            </Link>
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
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white dark:text-sky-900"
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
              t('Login.login')
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginCard;
