'use client';

import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
} 