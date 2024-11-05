'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi } from '@/utils/dashboardApi';
import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentPayments from '@/components/dashboard/RecentPayments';
import ExpiringContracts from '@/components/dashboard/ExpiringContracts';
import MonthlyChart from '@/components/dashboard/MonthlyChart';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      if (user) {
        try {
          const data = await dashboardApi.getDashboardStats(user.uid);
          setStats(data);
        } catch (error) {
          console.error('대시보드 데이터 로드 실패:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadDashboard();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>
      
      <DashboardStats stats={stats} />
      
      <div className="grid grid-cols-2 gap-6">
        <RecentPayments payments={stats?.recentPayments} />
        <ExpiringContracts contracts={stats?.expiringContracts} />
      </div>
      
      <MonthlyChart data={stats?.monthlyStats} />
    </div>
  );
} 