import React from 'react'
import { render, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { onAuthStateChanged } from 'firebase/auth'

jest.mock('firebase/auth')

describe('AuthContext', () => {
  const mockUser = { uid: '1', email: 'test@example.com' }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('provides authentication state', async () => {
    let authState: any

    ;(onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      callback(mockUser)
      return () => {}
    })

    const TestComponent = () => {
      authState = useAuth()
      return null
    }

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
    })

    expect(authState.user).toEqual(mockUser)
    expect(authState.loading).toBe(false)
    expect(typeof authState.signIn).toBe('function')
    expect(typeof authState.signOut).toBe('function')
  })
}) 