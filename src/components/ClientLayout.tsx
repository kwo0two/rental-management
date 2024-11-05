'use client';

import React, { ReactNode } from 'react';
import ClientWrapper from './ClientWrapper';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <ClientWrapper>
      {children}
    </ClientWrapper>
  );
} 