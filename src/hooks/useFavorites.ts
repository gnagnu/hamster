import { useState, useCallback } from 'react'

const STORAGE_KEY = 'hamster-favorites'

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveFavorites(favs: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs))
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(loadFavorites)

  const addFavorite = useCallback((char: string) => {
    setFavorites(prev => {
      if (prev.includes(char)) return prev
      const next = [char, ...prev]
      saveFavorites(next)
      return next
    })
  }, [])

  const removeFavorite = useCallback((char: string) => {
    setFavorites(prev => {
      const next = prev.filter(c => c !== char)
      saveFavorites(next)
      return next
    })
  }, [])

  const reorderFavorites = useCallback((next: string[]) => {
    saveFavorites(next)
    setFavorites(next)
  }, [])

  const clearFavorites = useCallback(() => {
    saveFavorites([])
    setFavorites([])
  }, [])

  return { favorites, addFavorite, removeFavorite, reorderFavorites, clearFavorites }
}
