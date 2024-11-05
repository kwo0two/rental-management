import { db } from '@/firebase/config';
import { collection, addDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { Payment } from '@/types';

export const paymentApi = {
  // 납부 기록 조회
  async getPayments(tenantId: string): Promise<Payment[]> {
    const q = query(collection(db, 'payments'), where('tenantId', '==', tenantId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Payment));
  },

  // 납부 기록 추가
  async addPayment(paymentData: Omit<Payment, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'payments'), paymentData);
    return docRef.id;
  },

  // 납부 기록 삭제
  async deletePayment(paymentId: string): Promise<void> {
    await deleteDoc(doc(db, 'payments', paymentId));
  }
}; 