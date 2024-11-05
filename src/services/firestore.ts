import { db } from '@/firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs } from 'firebase/firestore';

export const buildingService = {
  // 건물 추가
  async addBuilding(name: string) {
    // ...
  },
  
  // 임대인 추가
  async addTenant(buildingId: string, tenant: Tenant) {
    // ...
  },
  
  // 납부 기록 추가
  async addPayment(buildingId: string, tenantId: string, payment: Payment) {
    // ...
  },
  
  // 보고서 생성
  async generateReport(buildingId: string, tenantId: string) {
    // ...
  }
}; 