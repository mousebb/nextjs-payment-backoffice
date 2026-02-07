'use client';

import ForgotPasswordCard from '@/components/ForgotPasswordCard';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <ForgotPasswordCard />
    </div>
  );
}
