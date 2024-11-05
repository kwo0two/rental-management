import { db } from '@/firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Building } from '@/types';

export const buildingApi = {
  // 건물 목록 조회
  async getBuildings(userId: string): Promise<Building[]> {
    const q = query(collection(db, 'buildings'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Building));
  },

  // 건물 추가
  async addBuilding(userId: string, buildingData: Omit<Building, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'buildings'), buildingData);
    return docRef.id;
  },

  // 건물 수정
  async updateBuilding(buildingId: string, buildingData: Partial<Building>): Promise<void> {
    await updateDoc(doc(db, 'buildings', buildingId), buildingData);
  },

  // 건물 삭제
  async deleteBuilding(buildingId: string): Promise<void> {
    await deleteDoc(doc(db, 'buildings', buildingId));
  }
}; 