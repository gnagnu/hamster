import { useState, useCallback } from 'react'

const STORAGE_KEY = 'hamster-favorites'
const MAX_FAVORITES = 10

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
      // Always move to front (whether new or re-tapped), drop oldest if over limit
      const next = [char, ...prev.filter(c => c !== char)].slice(0, MAX_FAVORITES)
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
