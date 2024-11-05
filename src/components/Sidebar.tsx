import React from 'react';
import Link from 'next/link';

export default function Sidebar() {
  const menuItems = [
    { href: '/', label: '대시보드' },
    { href: '/buildings', label: '건물 관리' },
    { href: '/tenants', label: '임대인 관리' },
    { href: '/payments', label: '납부 기록' },
    { href: '/reports', label: '보고서' },
    { href: '/migration', label: '데이터 이전' }
  ];

  return (
    <aside className="w-64 bg-gray-800">
      <div className="h-full px-3 py-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link 
                href={item.href}
                className="flex items-center p-2 text-white rounded-lg hover:bg-gray-700"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
} 