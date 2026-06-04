import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001'

// Set auth header on every request
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('cs_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('cs_token')
    if (token) {
      axios.get(`${API}/api/auth/me`)
        .then(r => setUser(r.data))
        .catch(() => localStorage.removeItem('cs_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/api/auth/login`, { email, password })
    localStorage.setItem('cs_token', data.user.token)
    setUser(data.user)
    return data.user
  }

  const register = async (name, email, password) => {
    const { data } = await axios.post(`${API}/api/auth/register`, { name, email, password })
    localStorage.setItem('cs_token', data.user.token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('cs_token')
    setUser(null)
  }

  return React.createElement(
    AuthContext.Provider,
    { value: { user, loading, login, register, logout, isLoggedIn: !!user, API } },
    children
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
