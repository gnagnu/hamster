import { useState, useCallback } from 'react'
import { EMOJIS, type Emoji } from './data/emojis'
import { usePlayback, type PlaybackMode } from './hooks/usePlayback'
import type { PlaybackLang } from './hooks/useSpeech'
import { useFavorites } from './hooks/useFavorites'
import { EmojiGrid } from './components/EmojiGrid'
import { LanguageSelector } from './components/LanguageSelector'
import { FavoritesSection } from './components/FavoritesSection'

function ModeIndicator({ mode, spriteAvailable, onToggle }: {
  mode: PlaybackMode
  spriteAvailable: 'loading' | 'available' | 'unavailable'
  onToggle: () => void
}) {
  if (mode === 'loading') return <span className="text-xs text-amber-400">⏳</span>

  const canToggle = spriteAvailable === 'available'
  const label = mode === 'sprite' ? 'Audio sprite — cliquer pour TTS' : 'Web Speech — cliquer pour sprite'

  return (
    <button
      onClick={onToggle}
      disabled={!canToggle}
      title={canToggle ? label : 'Sprite non disponible pour cette langue'}
      className={`text-sm transition-opacity ${canToggle ? 'cursor-pointer hover:opacity-60' : 'cursor-default opacity-40'}`}
    >
      {mode === 'sprite' ? '🎵' : '🗣️'}
    </button>
  )
}

function App() {
  const [lang, setLang] = useState<PlaybackLang>('fr')
  const { speak, mode, spriteAvailable, toggleMode } = usePlayback(lang)
  const { favorites, addFavorite, removeFavorite, reorderFavorites, clearFavorites } = useFavorites()

  const handlePress = useCallback((emoji: Emoji) => {
    try { speak(emoji) } catch { /* TTS unavailable */ }
    addFavorite(emoji.char)
  }, [speak, addFavorite])

  const favoriteEmojis = favorites
    .map(char => EMOJIS.find(e => e.char === char))
    .filter((e): e is Emoji => e !== undefined)

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-amber-50/90 backdrop-blur border-b border-amber-200 px-4 pb-3 flex items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
        <h1 className="text-xl font-bold text-amber-800 flex items-center gap-2">
          🐹 Hamster
        </h1>
        <div className="flex items-center gap-3">
          <ModeIndicator mode={mode} spriteAvailable={spriteAvailable} onToggle={toggleMode} />
          <LanguageSelector value={lang} onChange={setLang} />
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full space-y-8">
        {/* Favorites */}
        <FavoritesSection
          favoriteEmojis={favoriteEmojis}
          favoriteChars={favorites}
          lang={lang}
          onPress={handlePress}
          onRemove={removeFavorite}
          onReorder={reorderFavorites}
          onClear={clearFavorites}
        />

        {/* All emojis */}
        <section>
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wider mb-3">
            Tous les emojis
          </h2>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
            <EmojiGrid
              emojis={EMOJIS}
              lang={lang}
              onPress={handlePress}
            />
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
