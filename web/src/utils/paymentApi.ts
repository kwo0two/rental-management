import { db } from '@/firebase/config';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { Payment } from '@/types';

export const paymentApi = {
  // 납부 기록 조회
  async getPayments(tenantId: string): Promise<Payment[]> {
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef, 
      where('tenantId', '==', tenantId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Payment));
  },

  // 납부 기록 추가
  async addPayment(paymentData: Omit<Payment, 'id'>): Promise<string> {
    const paymentsRef = collection(db, 'payments');
    const docRef = await addDoc(paymentsRef, {
      ...paymentData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  },

  // 납부 기록 삭제
  async deletePayment(paymentId: string): Promise<void> {
    const paymentRef = doc(db, 'payments', paymentId);
    await deleteDoc(paymentRef);
  }
}; 