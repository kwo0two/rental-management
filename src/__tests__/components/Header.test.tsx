import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

// Mocks
jest.mock('@/contexts/AuthContext')
jest.mock('next/navigation')

describe('Header Component', () => {
  const mockSignOut = jest.fn()
  const mockPush = jest.fn()

  beforeEach(() => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com' },
      signOut: mockSignOut,
    })
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
  })

  it('renders correctly with user logged in', () => {
    render(<Header />)
    
    expect(screen.getByText('임대료 관리 시스템')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('로그아웃')).toBeInTheDocument()
  })

  it('handles logout correctly', async () => {
    render(<Header />)
    
    const logoutButton = screen.getByText('로그아웃')
    await fireEvent.click(logoutButton)

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/login')
  })
}) 