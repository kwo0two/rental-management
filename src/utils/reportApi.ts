import { db } from '@/firebase/config';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy 
} from 'firebase/firestore';
import { Payment, Tenant } from '@/types';

interface MonthlyReport {
  month: string;
  rent: number;
  paymentDate: string | null;
  paymentAmount: number;
  balance: number;
  note?: string;
}

export const reportApi = {
  // 임대인별 보고서 생성
  async generateTenantReport(tenantId: string): Promise<MonthlyReport[]> {
    try {
      // 임대인 정보 조회
      const tenantsRef = collection(db, 'tenants');
      const tenantDoc = await getDocs(query(tenantsRef, where('id', '==', tenantId)));
      const tenant = tenantDoc.docs[0].data() as Tenant;

      // 납부 기록 조회
      const paymentsRef = collection(db, 'payments');
      const paymentsQuery = query(
        paymentsRef,
        where('tenantId', '==', tenantId),
        orderBy('date', 'asc')
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const payments = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];

      // 시작일부터 현재까지의 월별 보고서 생성
      const startDate = new Date(tenant.startDate);
      const currentDate = new Date();
      const months: MonthlyReport[] = [];
      let currentBalance = 0;

      let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      
      while (currentMonth <= currentDate) {
        const monthKey = currentMonth.toISOString().slice(0, 7);
        const monthPayments = payments.filter(p => p.date.startsWith(monthKey));
        
        // 월 임대료 계산 (일할계산 적용)
        let monthlyRent = tenant.monthlyRent;
        if (tenant.paymentType === 'prorated') {
          if (currentMonth.getFullYear() === startDate.getFullYear() && 
              currentMonth.getMonth() === startDate.getMonth()) {
            const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
            const remainingDays = daysInMonth - startDate.getDate() + 1;
            monthlyRent = (monthlyRent / daysInMonth) * remainingDays;
          }
        }

        // 해당 월의 납부 금액 합계
        const monthlyPayment = monthPayments.reduce((sum, p) => sum + p.amount, 0);
        
        // 잔액 계산
        currentBalance += monthlyRent - monthlyPayment;

        months.push({
          month: monthKey,
          rent: monthlyRent,
          paymentDate: monthPayments.length > 0 ? monthPayments[0].date : null,
          paymentAmount: monthlyPayment,
          balance: currentBalance,
          note: tenant.monthlyRentOverrides?.[monthKey]?.note
        });

        // 다음 달로 이동
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }

      return months;
    } catch (error) {
      console.error('보고서 생성 중 오류:', error);
      throw error;
    }
  },

  // 건물별 보고서 생성
  async generateBuildingReport(buildingId: string): Promise<{
    totalRent: number;
    totalPayment: number;
    totalBalance: number;
    tenantReports: { [key: string]: MonthlyReport[] };
  }> {
    try {
      // 건물의 모든 임대인 조회
      const tenantsRef = collection(db, 'tenants');
      const tenantsQuery = query(tenantsRef, where('buildingId', '==', buildingId));
      const tenantsSnapshot = await getDocs(tenantsQuery);
      const tenants = tenantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tenant[];

      // 각 임대인별 보고서 생성
      const tenantReports: { [key: string]: MonthlyReport[] } = {};
      let totalRent = 0;
      let totalPayment = 0;
      let totalBalance = 0;

      for (const tenant of tenants) {
        const report = await this.generateTenantReport(tenant.id);
        tenantReports[tenant.id] = report;

        // 합계 계산
        const lastMonth = report[report.length - 1];
        if (lastMonth) {
          totalRent += lastMonth.rent;
          totalPayment += lastMonth.paymentAmount;
          totalBalance += lastMonth.balance;
        }
      }

      return {
        totalRent,
        totalPayment,
        totalBalance,
        tenantReports
      };
    } catch (error) {
      console.error('건물 보고서 생성 중 오류:', error);
      throw error;
    }
  }
}; 