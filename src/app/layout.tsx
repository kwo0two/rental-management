import './globals.css'
import { ReactNode } from 'react'
import type { Metadata } from 'next'
import { AuthProvider } from '../contexts/AuthContext'

export const metadata: Metadata = {
  title: '임대료 관리 시스템',
  description: '임대료 관리를 위한 웹 애플리케이션',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
} 