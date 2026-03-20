import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { EMOJIS, EMOJI_CATEGORIES, type Emoji } from './data/emojis'
import { usePlayback } from './hooks/usePlayback'
import type { PlaybackLang } from './hooks/useSpeech'
import { useFavorites } from './hooks/useFavorites'
import { useBeat } from './hooks/useBeat'
import { EmojiGrid } from './components/EmojiGrid'
import { LanguageDialog } from './components/LanguageDialog'
import { FavoritesSection } from './components/FavoritesSection'
import { BeatsControl } from './components/BeatsControl'
import { WaveformVis } from './components/WaveformVis'
import { Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

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
  const [speed, setSpeed] = useState(1.0)
  const [activeCat, setActiveCat] = useState('popular')
  const [randomSet, setRandomSet] = useState<Emoji[]>(() => pickRandom(EMOJIS, RANDOM_SIZE))

  const { speak, mode } = usePlayback(lang, speed)
  const { favorites, addFavorite, removeFavorite, reorderFavorites, clearFavorites } = useFavorites()
  const { beats, selectedFilename, select: selectBeat, playing, toggle: toggleBeat,
          buffer, startTime, taps, recordTap } = useBeat()

  // Category tab auto-scroll to center on mobile
  const catScrollRef = useRef<HTMLDivElement>(null)
  const catBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  useEffect(() => {
    const container = catScrollRef.current
    const btn = catBtnRefs.current.get(activeCat)
    if (!container || !btn) return
    const center = container.offsetWidth / 2
    const btnCenter = btn.offsetLeft + btn.offsetWidth / 2
    container.scrollTo({ left: btnCenter - center, behavior: 'smooth' })
  }, [activeCat])

  const handlePress = useCallback((emoji: Emoji) => {
    try { speak(emoji) } catch { /* TTS unavailable */ }
    addFavorite(emoji.char)
    recordTap(emoji.char)
  }, [speak, addFavorite, recordTap])

  const handleFavoritePress = useCallback((emoji: Emoji) => {
    try { speak(emoji) } catch { /* TTS unavailable */ }
    recordTap(emoji.char)
  }, [speak, recordTap])

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

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    installPrompt.userChoice.then(() => setInstallPrompt(null))
  }, [installPrompt])

  return (
    <div className="min-h-screen bg-amber-50">

      {/* Sticky panel: header + all controls above the emoji grid */}
      <div className="sticky top-0 z-10 bg-amber-50/95 backdrop-blur">
        <header
          className="border-b border-amber-200 px-4 pb-3 flex items-center justify-between"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
        >
          <h1 className="text-xl font-bold text-amber-800 flex items-center gap-1">
            <button className="cursor-pointer select-none" onClick={() => { const e = EMOJIS.find(e => e.char === '🐹'); if (e) handlePress(e) }}>🐹</button>
            <button className="cursor-pointer select-none" onClick={() => { const e = EMOJIS.find(e => e.char === '🪵'); if (e) handlePress(e) }}>🪵</button>
            {' '}Hamster²
          </h1>
          <div className="flex items-center gap-2">
            {installPrompt && (
              <button onClick={handleInstall} title="Installer l'app" className="cursor-pointer opacity-50 hover:opacity-100 transition-opacity">
                <Download size={18} />
              </button>
            )}
            <span className="text-sm font-normal opacity-50" title={`Mode: ${mode}`}>{modeLabel}</span>
            <LanguageDialog value={lang} onChange={setLang} speed={speed} onSpeedChange={setSpeed} />
          </div>
        </header>

        <div className="max-w-3xl mx-auto w-full px-4 pt-4 space-y-4">
          <BeatsControl
            beats={beats}
            selectedFilename={selectedFilename}
            playing={playing}
            onSelect={selectBeat}
            onToggle={toggleBeat}
          />
          {buffer && (
            <WaveformVis buffer={buffer} startTime={startTime} taps={taps} />
          )}
          <FavoritesSection
            favoriteEmojis={favoriteEmojis}
            favoriteChars={favorites}
            lang={lang}
            onPress={handleFavoritePress}
            onRemove={removeFavorite}
            onReorder={reorderFavorites}
            onClear={clearFavorites}
          />
          {/* Category tabs */}
          <div
            ref={catScrollRef}
            className="flex gap-2 overflow-x-auto md:flex-wrap pb-3"
            style={{ scrollbarWidth: 'none' }}
          >
            {EMOJI_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                ref={el => { if (el) catBtnRefs.current.set(cat.key, el); else catBtnRefs.current.delete(cat.key) }}
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
        </div>
      </div>

      {/* Emoji grid — normal page flow so the window scrolls and address bar hides */}
      <div className="max-w-3xl mx-auto w-full px-4 pb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 min-h-screen">
          <EmojiGrid
            emojis={displayedEmojis}
            lang={lang}
            onPress={handlePress}
          />
        </div>
      </div>

    </div>
  )
}

export default App
