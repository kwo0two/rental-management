import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// 디버그 로그 추가
console.log('Firebase Config 로드됨:', {
  apiKey: firebaseConfig.apiKey ? '설정됨' : '미설정',
  authDomain: firebaseConfig.authDomain ? '설정됨' : '미설정',
  projectId: firebaseConfig.projectId ? '설정됨' : '미설정',
});

// Firebase 초기화 전에 모든 필수 설정이 있는지 확인
Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) {
    console.error(`Firebase ${key} 설정이 없습니다.`);
  }
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); 