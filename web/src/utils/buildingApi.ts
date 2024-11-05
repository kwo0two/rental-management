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
import { Building } from '@/types';

export const buildingApi = {
  // 건물 목록 조회
  async getBuildings(userId: string): Promise<Building[]> {
    const buildingsRef = collection(db, 'buildings');
    const q = query(buildingsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Building));
  },

  // 건물 추가
  async addBuilding(userId: string, buildingData: Omit<Building, 'id'>): Promise<string> {
    const buildingsRef = collection(db, 'buildings');
    const docRef = await addDoc(buildingsRef, {
      ...buildingData,
      userId,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  },

  // 건물 수정
  async updateBuilding(buildingId: string, buildingData: Partial<Building>): Promise<void> {
    const buildingRef = doc(db, 'buildings', buildingId);
    await updateDoc(buildingRef, {
      ...buildingData,
      updatedAt: new Date().toISOString()
    });
  },

  // 건물 삭제
  async deleteBuilding(buildingId: string): Promise<void> {
    const buildingRef = doc(db, 'buildings', buildingId);
    await deleteDoc(buildingRef);
  }
}; 