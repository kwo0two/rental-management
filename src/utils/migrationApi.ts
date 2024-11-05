import { db } from '@/firebase/config';
import { 
  collection, 
  getDocs,
  addDoc,
  writeBatch,
  doc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { Building, Tenant, Payment } from '@/types';

interface LegacyData {
  buildings: {
    [buildingName: string]: {
      [tenantName: string]: {
        startDate: string;
        monthlyRent: number;
        paymentType: 'full' | 'prorated';
        contractEndDate: string | null;
        payments: {
          date: string;
          amount: number;
        }[];
      };
    };
  };
}

export const migrationApi = {
  // 데이터 가져오기
  async importData(userId: string, data: LegacyData): Promise<void> {
    const batch = writeBatch(db);

    try {
      // 건물 데이터 추가
      for (const [buildingName, tenants] of Object.entries(data.buildings)) {
        const buildingRef = await addDoc(collection(db, 'buildings'), {
          name: buildingName,
          userId,
          createdAt: new Date().toISOString()
        });

        // 임대인 데이터 추가
        for (const [tenantName, tenantData] of Object.entries(tenants)) {
          const tenantRef = await addDoc(collection(db, 'tenants'), {
            buildingId: buildingRef.id,
            name: tenantName,
            startDate: tenantData.startDate,
            monthlyRent: tenantData.monthlyRent,
            paymentType: tenantData.paymentType,
            contractEndDate: tenantData.contractEndDate,
            payments: [],
            createdAt: new Date().toISOString()
          });

          // 납부 기록 추가
          for (const payment of tenantData.payments) {
            await addDoc(collection(db, 'payments'), {
              tenantId: tenantRef.id,
              date: payment.date,
              amount: payment.amount,
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('데이터 가져오기 실패:', error);
      throw error;
    }
  },

  // 데이터 내보내기
  async exportData(userId: string): Promise<LegacyData> {
    try {
      const buildingsRef = collection(db, 'buildings');
      const tenantsRef = collection(db, 'tenants');
      const paymentsRef = collection(db, 'payments');

      // 모든 데이터 가져오기
      const buildingsSnapshot = await getDocs(buildingsRef);
      const tenantsSnapshot = await getDocs(tenantsRef);
      const paymentsSnapshot = await getDocs(paymentsRef);

      const buildings: LegacyData['buildings'] = {};

      // 건물 데이터 구성
      buildingsSnapshot.forEach(buildingDoc => {
        const buildingData = buildingDoc.data() as Building;
        if (buildingData.userId === userId) {
          buildings[buildingData.name] = {};
        }
      });

      // 임대인 데이터 구성
      tenantsSnapshot.forEach(tenantDoc => {
        const tenantData = tenantDoc.data() as Tenant;
        const buildingDoc = buildingsSnapshot.docs.find(doc => doc.id === tenantData.buildingId);
        if (buildingDoc && buildingDoc.data().userId === userId) {
          const buildingName = buildingDoc.data().name;
          buildings[buildingName][tenantData.name] = {
            startDate: tenantData.startDate,
            monthlyRent: tenantData.monthlyRent,
            paymentType: tenantData.paymentType,
            contractEndDate: tenantData.contractEndDate,
            payments: []
          };
        }
      });

      // 납부 기록 구성
      paymentsSnapshot.forEach(paymentDoc => {
        const paymentData = paymentDoc.data() as Payment;
        const tenantDoc = tenantsSnapshot.docs.find(doc => doc.id === paymentData.tenantId);
        if (tenantDoc) {
          const tenantData = tenantDoc.data() as Tenant;
          const buildingDoc = buildingsSnapshot.docs.find(doc => doc.id === tenantData.buildingId);
          if (buildingDoc && buildingDoc.data().userId === userId) {
            const buildingName = buildingDoc.data().name;
            buildings[buildingName][tenantData.name].payments.push({
              date: paymentData.date,
              amount: paymentData.amount
            });
          }
        }
      });

      return { buildings };
    } catch (error) {
      console.error('데이터 내보내기 실패:', error);
      throw error;
    }
  }
}; 