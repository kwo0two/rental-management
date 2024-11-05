'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Dashboard from '@/components/Dashboard';
import ProtectedLayout from '@/components/ProtectedLayout';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  return (
    <ProtectedLayout>
      <div className="p-4">
        <div className="mb-4 border-b border-gray-200">
          <h1 className="text-base font-medium text-gray-900 pb-2">대시보드</h1>
        </div>
        <Dashboard />
      </div>
    </ProtectedLayout>
  );
} 