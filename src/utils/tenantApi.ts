import { db } from '@/firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Tenant } from '@/types';

export const tenantApi = {
  // 임차인 목록 조회
  async getTenants(buildingId: string): Promise<Tenant[]> {
    const q = query(collection(db, 'tenants'), where('buildingId', '==', buildingId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Tenant));
  },

  // 임차인 추가
  async addTenant(tenantData: Omit<Tenant, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'tenants'), tenantData);
    return docRef.id;
  },

  // 임차인 수정
  async updateTenant(tenantId: string, tenantData: Partial<Tenant>): Promise<void> {
    await updateDoc(doc(db, 'tenants', tenantId), tenantData);
  },

  // 임차인 삭제
  async deleteTenant(tenantId: string): Promise<void> {
    await deleteDoc(doc(db, 'tenants', tenantId));
  },

  // 임대료 수정
  async updateMonthlyRent(tenantId: string, data: {
    date: string;
    amount: number;
    note?: string;
  }): Promise<void> {
    const tenantRef = doc(db, 'tenants', tenantId);
    const monthKey = data.date.slice(0, 7); // YYYY-MM 형식

    await updateDoc(tenantRef, {
      [`monthlyRentOverrides.${monthKey}`]: {
        amount: data.amount,
        note: data.note || ''
      }
    });
  },

  // 계약 연장
  async extendContract(tenantId: string, data: {
    years: number;
    applyProrated: boolean;
  }): Promise<void> {
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantDoc = await getDoc(tenantRef);
    
    if (!tenantDoc.exists()) {
      throw new Error('임차인을 찾을 수 없습니다.');
    }

    const tenant = tenantDoc.data();
    const currentEndDate = tenant.contractEndDate ? new Date(tenant.contractEndDate) : new Date(tenant.startDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setFullYear(newEndDate.getFullYear() + data.years);

    await updateDoc(tenantRef, {
      contractEndDate: newEndDate.toISOString().split('T')[0],
      paymentType: data.applyProrated ? 'prorated' : 'full'
    });
  }
}; 