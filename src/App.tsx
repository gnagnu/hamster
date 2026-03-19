import { useState, useCallback, useMemo } from 'react'
import { EMOJIS, EMOJI_CATEGORIES, type Emoji } from './data/emojis'
import { usePlayback } from './hooks/usePlayback'
import type { PlaybackLang } from './hooks/useSpeech'
import { useFavorites } from './hooks/useFavorites'
import { EmojiGrid } from './components/EmojiGrid'
import { LanguageDialog } from './components/LanguageDialog'
import { FavoritesSection } from './components/FavoritesSection'

const RANDOM_SIZE = 200

function pickRandom(pool: Emoji[], n: number): Emoji[] {
  const copy = [...pool]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

const RARE_EMOJIS = EMOJIS.filter(e => !e.popular && (e.cat === 'symbols' || e.cat === 'objects' || e.cat === 'travel'))

function App() {
  const [lang, setLang] = useState<PlaybackLang>('fr')
  const [activeCat, setActiveCat] = useState('popular')
  const [randomSet, setRandomSet] = useState<Emoji[]>(() => pickRandom(EMOJIS, RANDOM_SIZE))

  const { speak, mode } = usePlayback(lang)
  const { favorites, addFavorite, removeFavorite, reorderFavorites, clearFavorites } = useFavorites()

  const handlePress = useCallback((emoji: Emoji) => {
    try { speak(emoji) } catch { /* TTS unavailable */ }
    addFavorite(emoji.char)
  }, [speak, addFavorite])

  const handleCatSelect = useCallback((key: string) => {
    if (key === 'random') setRandomSet(pickRandom(EMOJIS, RANDOM_SIZE))
    setActiveCat(key)
  }, [])

  const displayedEmojis = useMemo(() => {
    switch (activeCat) {
      case 'popular':  return EMOJIS.filter(e => e.popular)
      case 'random':   return randomSet
      case 'rare':     return RARE_EMOJIS
      default:         return EMOJIS.filter(e => e.cat === activeCat)
    }
  }, [activeCat, randomSet])

  const favoriteEmojis = favorites
    .map(char => EMOJIS.find(e => e.char === char))
    .filter((e): e is Emoji => e !== undefined)

  const modeLabel = mode === 'sprite' ? '🎵' : mode === 'speech' ? '🗣️' : '⏳'

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-10 bg-amber-50/90 backdrop-blur border-b border-amber-200 px-4 pb-3 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <h1 className="text-xl font-bold text-amber-800 flex items-center gap-2">
          🐹 Hamster
          <span className="text-sm font-normal opacity-50" title={`Mode: ${mode}`}>{modeLabel}</span>
        </h1>
        <LanguageDialog value={lang} onChange={setLang} />
      </header>

      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full space-y-6">
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

        {/* Category picker + emoji grid */}
        <section>
          {/* Category tabs — horizontally scrollable */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
            {EMOJI_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => handleCatSelect(cat.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeCat === cat.key
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                {cat.fr}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
            <EmojiGrid
              emojis={displayedEmojis}
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
