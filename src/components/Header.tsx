'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import NotificationBell from './NotificationBell';

export default function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto py-4 px-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          임대료 관리 시스템
        </h1>
        {user && (
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-gray-600">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </header>
  );
} 