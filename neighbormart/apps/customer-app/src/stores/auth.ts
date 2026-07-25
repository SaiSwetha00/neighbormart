import { useState, useEffect, createContext, useContext } from 'react'
import api from '../api'

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  loyaltyPoints?: number
  tier?: string
}

export interface AuthState {
  user: Customer | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refetch: () => Promise<void>
}

export interface RegisterData {
  name: string
  email: string
  phone?: string
  password: string
}

import React from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCustomer(raw: any): Customer | null {
  if (!raw) return null
  // Login response: { user: { id, name, email, role }, customer: { id, loyaltyPoints, tier, ... } }
  // Profile response: { id, userId, tier, loyaltyPoints, user: { name, email, phone } }
  const customer = raw.customer ?? raw
  const user = raw.user ?? customer.user ?? customer
  const name = user.name ?? customer.name
  const email = user.email ?? customer.email
  if (!name && !email) return null
  return {
    id: customer.id ?? user.id,
    name: name ?? '',
    email: email ?? '',
    phone: user.phone ?? customer.phone,
    loyaltyPoints: customer.loyaltyPoints,
    tier: customer.tier,
  }
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async () => {
    try {
      // Use native fetch to bypass any axios interceptor redirect logic
      const res = await window.fetch('/api/customer/profile', { credentials: 'include' })
      if (!res.ok) {
        setUser(null)
        return
      }
      const json = await res.json()
      const data = json?.data ?? json
      setUser(parseCustomer(data))
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.post('/customer/auth/login', { email, password })
    const data = res.data?.data ?? res.data
    setUser(parseCustomer(data))
  }

  const register = async (registerData: RegisterData) => {
    const res = await api.post('/customer/auth/register', {
      ...registerData,
      storeId: 'demo-store-001',
    })
    const data = res.data?.data ?? res.data
    setUser(parseCustomer(data))
  }

  const logout = async () => {
    await api.post('/customer/auth/logout')
    setUser(null)
  }

  const value: AuthState = {
    user,
    loading,
    login,
    register,
    logout,
    refetch: fetchProfile,
  }

  return React.createElement(AuthContext.Provider, { value }, children)
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
