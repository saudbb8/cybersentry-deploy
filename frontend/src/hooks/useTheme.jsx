import React, { useState, useEffect, createContext, useContext } from 'react'

export const ThemeContext = createContext({ theme:'dark', toggle:()=>{}, isDark:true })

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('cs_theme') || 'dark'
  })

  useEffect(() => {
    localStorage.setItem('cs_theme', theme)
    if (theme === 'light') {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
      document.documentElement.classList.add('dark')
    }
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, toggle, isDark: theme === 'dark' } },
    children
  )
}
