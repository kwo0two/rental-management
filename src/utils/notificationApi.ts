import { db } from '@/firebase/config';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  orderBy,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  limit
} from 'firebase/firestore';

export interface Notification {
  id: string;
  userId: string;
  type: 'PAYMENT_DUE' | 'CONTRACT_EXPIRY' | 'RENT_INCREASE';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedTenantId?: string;
  relatedBuildingId?: string;
}

export const notificationApi = {
  // 알림 생성
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
    const notificationsRef = collection(db, 'notifications');
    const docRef = await addDoc(notificationsRef, {
      ...notification,
      createdAt: new Date().toISOString(),
      read: false
    });
    return docRef.id;
  },

  // 사용자의 알림 목록 조회
  async getNotifications(userId: string): Promise<Notification[]> {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));
  },

  // 알림 읽음 처리
  async markAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  },

  // 알림 삭제
  async deleteNotification(notificationId: string): Promise<void> {
    const notificationRef = doc(db, 'notifications', notificationId);
    await deleteDoc(notificationRef);
  },

  // 알림 검사 및 생성
  async checkAndCreateNotifications(userId: string): Promise<void> {
    const tenantsRef = collection(db, 'tenants');
    const tenantsSnapshot = await getDocs(tenantsRef);
    const today = new Date();

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenant = tenantDoc.data();
      const buildingDoc = await getDoc(doc(db, 'buildings', tenant.buildingId));
      
      // buildingDoc이 존재하지 않거나 데이터가 없는 경우 건너뛰기
      if (!buildingDoc.exists()) continue;
      
      const building = buildingDoc.data();
      
      // building이 undefined이거나 userId가 일치하지 않으면 건너뛰기
      if (!building || building.userId !== userId) continue;

      // 계약 만료 알림 (30일 전)
      if (tenant.contractEndDate) {
        const contractEnd = new Date(tenant.contractEndDate);
        const daysUntilExpiry = Math.floor((contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          await this.createNotification({
            userId,
            type: 'CONTRACT_EXPIRY',
            title: '계약 만료 예정',
            message: `${building.name}의 ${tenant.name} 임대인의 계약이 ${daysUntilExpiry}일 후 만료됩니다.`,
            relatedTenantId: tenantDoc.id,
            relatedBuildingId: tenant.buildingId,
            read: false
          });
        }
      }

      // 미납 알림
      const paymentsRef = collection(db, 'payments');
      const paymentsQuery = query(
        paymentsRef,
        where('tenantId', '==', tenantDoc.id),
        orderBy('date', 'desc'),
        limit(1)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      if (paymentsSnapshot.empty || 
          new Date(paymentsSnapshot.docs[0].data().date).getMonth() < today.getMonth()) {
        await this.createNotification({
          userId,
          type: 'PAYMENT_DUE',
          title: '임대료 미납',
          message: `${building.name}의 ${tenant.name} 임대인의 이번 달 임대료가 미납되었습니다.`,
          relatedTenantId: tenantDoc.id,
          relatedBuildingId: tenant.buildingId,
          read: false
        });
      }
    }
  }
}; 