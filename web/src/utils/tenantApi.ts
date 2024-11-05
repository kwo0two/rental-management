import { db } from '@/firebase/config';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { Tenant } from '@/types';

export const tenantApi = {
  // 임대인 목록 조회
  async getTenants(buildingId: string): Promise<Tenant[]> {
    const tenantsRef = collection(db, 'tenants');
    const q = query(tenantsRef, where('buildingId', '==', buildingId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Tenant));
  },

  // 임대인 추가
  async addTenant(tenantData: Omit<Tenant, 'id'>): Promise<string> {
    const tenantsRef = collection(db, 'tenants');
    const docRef = await addDoc(tenantsRef, {
      ...tenantData,
      createdAt: new Date().toISOString(),
      payments: []
    });
    return docRef.id;
  },

  // 임대인 수정
  async updateTenant(tenantId: string, tenantData: Partial<Tenant>): Promise<void> {
    const tenantRef = doc(db, 'tenants', tenantId);
    await updateDoc(tenantRef, {
      ...tenantData,
      updatedAt: new Date().toISOString()
    });
  },

  // 임대인 삭제
  async deleteTenant(tenantId: string): Promise<void> {
    const tenantRef = doc(db, 'tenants', tenantId);
    await deleteDoc(tenantRef);
  }
}; 