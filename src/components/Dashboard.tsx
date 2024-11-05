'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi } from '@/utils/dashboardApi';
import { DashboardStats } from '@/types';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTenants: 0,
    monthlyTotal: 0,
    totalUnpaid: 0,
    unpaidList: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const data = await dashboardApi.getDashboardStats(user.uid);
        setStats(data);
      } catch (err) {
        console.error('통계 데이터 로드 실패:', err);
        setError('통계 데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded border border-gray-200">
          <h3 className="text-xs text-gray-500 mb-1">총 임차인 수</h3>
          <p className="text-2xl font-semibold text-gray-900">{stats.totalTenants}명</p>
        </div>
        <div className="bg-white p-4 rounded border border-gray-200">
          <h3 className="text-xs text-gray-500 mb-1">이번 달 예상 임대료</h3>
          <p className="text-2xl font-semibold text-gray-900">{stats.monthlyTotal.toLocaleString()}원</p>
        </div>
        <div className="bg-white p-4 rounded border border-gray-200">
          <h3 className="text-xs text-gray-500 mb-1">전체 미납금</h3>
          <p className="text-2xl font-semibold text-red-600">{stats.totalUnpaid.toLocaleString()}원</p>
        </div>
      </div>

      {/* 미납 현황 */}
      <div className="bg-white rounded border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-medium text-gray-900">미납 현황</h2>
        </div>
        <div className="p-4">
          {stats.unpaidList.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {stats.unpaidList.map((item, index) => (
                <div key={index} className="py-3 flex justify-between items-center">
                  <span className="text-sm text-gray-900">{item.tenant}</span>
                  <span className="text-sm text-red-600">{item.amount.toLocaleString()}원</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              미납된 임대료가 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 