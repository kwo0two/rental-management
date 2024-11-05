'use client';

import React from 'react';
import ClientLayout from './ClientLayout';
import AuthGuard from './AuthGuard';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ClientLayout>{children}</ClientLayout>
    </AuthGuard>
  );
} 