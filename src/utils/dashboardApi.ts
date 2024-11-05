import { db } from '@/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Building, Tenant, Payment, DashboardStats } from '@/types';

export const dashboardApi = {
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      // 건물 목록 조회
      const buildingsQuery = query(
        collection(db, 'buildings'),
        where('userId', '==', userId)
      );
      const buildingsSnapshot = await getDocs(buildingsQuery);
      const buildings = buildingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Building[];

      // 임차인 목록 조회
      let totalTenants = 0;
      let monthlyTotal = 0;
      let totalUnpaid = 0;
      const unpaidList = [];

      for (const building of buildings) {
        const tenantsQuery = query(
          collection(db, 'tenants'),
          where('buildingId', '==', building.id)
        );
        const tenantsSnapshot = await getDocs(tenantsQuery);
        const tenants = tenantsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Tenant[];

        totalTenants += tenants.length;

        // 각 임차인의 임대료와 납부 현황 계산
        for (const tenant of tenants) {
          monthlyTotal += tenant.monthlyRent;

          // 납부 기록 조회
          const paymentsQuery = query(
            collection(db, 'payments'),
            where('tenantId', '==', tenant.id)
          );
          const paymentsSnapshot = await getDocs(paymentsQuery);
          const payments = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Payment[];

          // 미납금 계산
          const balance = await this._calculateBalance(tenant, payments);
          if (balance > 0) {
            totalUnpaid += balance;
            unpaidList.push({
              tenant: tenant.name,
              amount: balance
            });
          }
        }
      }

      return {
        totalTenants,
        monthlyTotal,
        totalUnpaid,
        unpaidList
      };
    } catch (error) {
      console.error('대시보드 통계 조회 실패:', error);
      throw error;
    }
  },

  async _calculateBalance(tenant: Tenant, payments: Payment[]): Promise<number> {
    const startDate = new Date(tenant.startDate);
    const today = new Date();
    let totalRent = 0;

    // 총 임대료 계산
    let currentDate = new Date(startDate);
    currentDate.setDate(1); // 월 시작일로 설정

    while (currentDate <= today) {
      const monthKey = currentDate.toISOString().slice(0, 7);
      let monthlyRent = tenant.monthlyRent;

      // 임대료 수정 내역 확인
      if (tenant.monthlyRentOverrides?.[monthKey]) {
        const override = tenant.monthlyRentOverrides[monthKey];
        monthlyRent = typeof override === 'number' ? override : override.amount;
      }

      // 일할 계산이 필요한 경우
      if (tenant.paymentType === 'prorated') {
        if (monthKey === tenant.startDate.slice(0, 7)) {
          const startDay = parseInt(tenant.startDate.slice(8, 10));
          const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          monthlyRent = (monthlyRent / daysInMonth) * (daysInMonth - startDay + 1);
        }

        if (tenant.contractEndDate && monthKey === tenant.contractEndDate.slice(0, 7)) {
          const endDay = parseInt(tenant.contractEndDate.slice(8, 10));
          const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          monthlyRent = (monthlyRent / daysInMonth) * endDay;
        }
      }

      totalRent += monthlyRent;
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // 총 납부액 계산
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

    return totalRent - totalPaid;
  }
}; 