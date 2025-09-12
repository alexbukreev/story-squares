// src/hooks/useAutoThemeClass.ts
import { useEffect } from 'react'

type Mode = 'light' | 'dark' | 'system'

function apply(mode: Mode) {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = mode === 'dark' || (mode === 'system' && prefersDark)
  root.classList.toggle('dark', dark)
}

export function useAutoThemeClass() {
  useEffect(() => {
    // initial apply
    const stored = (localStorage.getItem('theme') as Mode | null) ?? 'system'
    apply(stored)

    // react to system changes when in "system" mode
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onMqlChange = () => {
      const mode = ((localStorage.getItem('theme') as Mode | null) ?? 'system')
      if (mode === 'system') apply(mode)
    }
    mql.addEventListener('change', onMqlChange)

    // react to manual changes from anywhere (e.g., a toggle)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const mode = (e.newValue as Mode | null) ?? 'system'
        apply(mode)
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      mql.removeEventListener('change', onMqlChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])
}

// optional helpers you can reuse from any component
export function setTheme(mode: 'light' | 'dark' | 'system') {
  if (mode === 'system') localStorage.removeItem('theme')
  else localStorage.setItem('theme', mode)
  // apply immediately for current tab
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = mode === 'dark' || (mode === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', dark)
}
