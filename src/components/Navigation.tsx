import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Navigation() {
  const { signOut } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center h-12">
          <div className="flex items-center space-x-1 px-2">
            <Link href="/" 
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
              대시보드
            </Link>
            <Link href="/buildings" 
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
              건물 관리
            </Link>
            <Link href="/tenants" 
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
              임차인 관리
            </Link>
            <Link href="/payments" 
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
              납부 기록
            </Link>
            <Link href="/reports" 
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
              보고서
            </Link>
          </div>
          <div className="ml-auto px-2">
            <button
              onClick={signOut}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 