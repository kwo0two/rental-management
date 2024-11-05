'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '@/firebase/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('로그인 시도:', { email });
      await signInWithEmailAndPassword(auth, email, password);
      console.log('로그인 성공');
    } catch (error: any) {
      console.error('로그인 실패 상세:', {
        code: error.code,
        message: error.message,
        fullError: error
      });
      
      switch (error.code) {
        case 'auth/invalid-email':
          throw new Error('유효하지 않은 이메일 형식입니다.');
        case 'auth/user-disabled':
          throw new Error('비활성화된 계정입니다.');
        case 'auth/user-not-found':
          throw new Error('존재하지 않는 계정입니다.');
        case 'auth/wrong-password':
          throw new Error('잘못된 비밀번호입니다.');
        case 'auth/invalid-credential':
          throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
        case 'auth/network-request-failed':
          throw new Error('네트워크 연결을 확인해주세요.');
        default:
          throw new Error(`로그인 실패: ${error.message}`);
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('로그아웃 실패:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 