import { db } from '@/firebase/config';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { Tenant, Payment, TenantReport } from '@/types';

export const reportApi = {
  // 임차인 보고서 생성
  async generateTenantReport(tenantId: string): Promise<TenantReport[]> {
    try {
      // 임차인 정보 조회
      const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
      if (!tenantDoc.exists()) {
        throw new Error('임차인을 찾을 수 없습니다.');
      }
      const tenant = { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;

      // 납부 기록 조회
      const paymentsQuery = query(collection(db, 'payments'), where('tenantId', '==', tenantId));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const payments = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];

      // 보고서 생성
      return this.generateReport(tenant, payments);
    } catch (error) {
      console.error('보고서 생성 중 오류:', error);
      throw error;
    }
  },

  // 보고서 데이터 생성
  generateReport(tenant: Tenant, payments: Payment[]): TenantReport[] {
    const startDate = new Date(tenant.startDate);
    const today = new Date();
    const report: TenantReport[] = [];

    let currentDate = new Date(startDate);
    currentDate.setDate(1); // 월 시작일로 설정

    while (currentDate <= today) {
      const month = currentDate.toISOString().slice(0, 7); // YYYY-MM 형식
      const monthlyRent = this.getMonthlyRent(tenant, currentDate);
      
      // 해당 월의 납부 기록 찾기
      const monthPayments = payments.filter(payment => 
        payment.date.startsWith(month)
      );

      const paymentAmount = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const paymentDate = monthPayments.length > 0 ? monthPayments[0].date : null;

      // 잔액 계산
      const previousBalance = report.length > 0 ? report[report.length - 1].balance : 0;
      const balance = previousBalance + monthlyRent - paymentAmount;

      report.push({
        month,
        rent: monthlyRent,
        paymentDate: paymentDate || '',
        paymentAmount,
        balance,
        note: this.getMonthlyNote(tenant, currentDate)
      });

      // 다음 달로 이동
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return report;
  },

  // 월별 임대료 계산
  private getMonthlyRent(tenant: Tenant, date: Date): number {
    const monthKey = date.toISOString().slice(0, 7);
    
    // 임대료 수정 내역 확인
    if (tenant.monthlyRentOverrides?.[monthKey]) {
      const override = tenant.monthlyRentOverrides[monthKey];
      return typeof override === 'number' ? override : override.amount;
    }

    // 일할 계산이 필요한 경우
    if (tenant.paymentType === 'prorated') {
      // 시작 월인 경우
      if (monthKey === tenant.startDate.slice(0, 7)) {
        const startDay = parseInt(tenant.startDate.slice(8, 10));
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        return (tenant.monthlyRent / daysInMonth) * (daysInMonth - startDay + 1);
      }
      
      // 종료 월인 경우
      if (tenant.contractEndDate && monthKey === tenant.contractEndDate.slice(0, 7)) {
        const endDay = parseInt(tenant.contractEndDate.slice(8, 10));
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        return (tenant.monthlyRent / daysInMonth) * endDay;
      }
    }

    return tenant.monthlyRent;
  },

  // 월별 비고 사항 가져오기
  private getMonthlyNote(tenant: Tenant, date: Date): string {
    const monthKey = date.toISOString().slice(0, 7);
    const override = tenant.monthlyRentOverrides?.[monthKey];
    
    if (override && typeof override === 'object' && override.note) {
      return override.note;
    }

    if (tenant.paymentType === 'prorated') {
      if (monthKey === tenant.startDate.slice(0, 7)) {
        return '일할계산(시작)';
      }
      if (tenant.contractEndDate && monthKey === tenant.contractEndDate.slice(0, 7)) {
        return '일할계산(종료)';
      }
    }

    return '';
  }
}; 