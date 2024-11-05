import { db } from '@/firebase/config';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy 
} from 'firebase/firestore';
import { Building, Tenant, Payment } from '@/types';

interface DashboardStats {
  totalBuildings: number;
  totalTenants: number;
  totalMonthlyRent: number;
  totalUnpaidRent: number;
  expiringContracts: Array<{
    buildingName: string;
    tenantName: string;
    expiryDate: string;
    daysRemaining: number;
  }>;
  recentPayments: Array<{
    buildingName: string;
    tenantName: string;
    amount: number;
    date: string;
  }>;
  monthlyStats: Array<{
    month: string;
    expectedRent: number;
    actualPayments: number;
  }>;
}

export const dashboardApi = {
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      // 건물 정보 조회
      const buildingsRef = collection(db, 'buildings');
      const buildingsQuery = query(buildingsRef, where('userId', '==', userId));
      const buildingsSnapshot = await getDocs(buildingsQuery);
      const buildings = buildingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Building[];

      // 임대인 정보 조회
      const tenantsRef = collection(db, 'tenants');
      const tenants: Tenant[] = [];
      for (const building of buildings) {
        const tenantsQuery = query(tenantsRef, where('buildingId', '==', building.id));
        const tenantsSnapshot = await getDocs(tenantsQuery);
        tenants.push(...tenantsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Tenant[]);
      }

      // 납부 기록 조회
      const paymentsRef = collection(db, 'payments');
      const payments: Payment[] = [];
      for (const tenant of tenants) {
        const paymentsQuery = query(
          paymentsRef,
          where('tenantId', '==', tenant.id),
          orderBy('date', 'desc')
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        payments.push(...paymentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Payment[]);
      }

      // 통계 계산
      const today = new Date();
      const totalMonthlyRent = tenants.reduce((sum, tenant) => sum + tenant.monthlyRent, 0);
      
      // 만료 예정 계약
      const expiringContracts = tenants
        .filter(tenant => tenant.contractEndDate)
        .map(tenant => {
          const building = buildings.find(b => b.id === tenant.buildingId);
          const expiryDate = new Date(tenant.contractEndDate!);
          const daysRemaining = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return {
            buildingName: building?.name || '',
            tenantName: tenant.name,
            expiryDate: tenant.contractEndDate!,
            daysRemaining
          };
        })
        .filter(contract => contract.daysRemaining > 0 && contract.daysRemaining <= 90)
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

      // 최근 납부 기록
      const recentPayments = payments
        .slice(0, 10)
        .map(payment => {
          const tenant = tenants.find(t => t.id === payment.tenantId);
          const building = tenant ? buildings.find(b => b.id === tenant.buildingId) : null;
          return {
            buildingName: building?.name || '',
            tenantName: tenant?.name || '',
            amount: payment.amount,
            date: payment.date
          };
        });

      // 월별 통계
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return date.toISOString().slice(0, 7);
      }).reverse();

      const monthlyStats = last6Months.map(month => {
        const expectedRent = totalMonthlyRent;
        const actualPayments = payments
          .filter(p => p.date.startsWith(month))
          .reduce((sum, p) => sum + p.amount, 0);
        return { month, expectedRent, actualPayments };
      });

      return {
        totalBuildings: buildings.length,
        totalTenants: tenants.length,
        totalMonthlyRent,
        totalUnpaidRent: totalMonthlyRent - (payments
          .filter(p => p.date.startsWith(today.toISOString().slice(0, 7)))
          .reduce((sum, p) => sum + p.amount, 0)),
        expiringContracts,
        recentPayments,
        monthlyStats
      };
    } catch (error) {
      console.error('대시보드 통계 조회 중 오류:', error);
      throw error;
    }
  }
}; 