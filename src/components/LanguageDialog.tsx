import { useState } from 'react'
import { SPRITE_LANGS, type PlaybackLang } from '../hooks/useSpeech'

const isNative = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()

interface LangOption {
  value: PlaybackLang
  flag: string
  label: string
  nativeOnly: boolean // hide on APK if true
}

const OPTIONS: LangOption[] = [
  { value: 'en', flag: '🇬🇧', label: 'English',  nativeOnly: false },
  { value: 'fr', flag: '🇫🇷', label: 'Français', nativeOnly: false },
  { value: 'zh', flag: '🇨🇳', label: '中文',      nativeOnly: true  },
  { value: 'de', flag: '🇩🇪', label: 'Deutsch',  nativeOnly: true  },
]

// On native APK: only show sprite-backed languages
const VISIBLE_OPTIONS = isNative
  ? OPTIONS.filter(o => SPRITE_LANGS.has(o.value))
  : OPTIONS

interface Props {
  value: PlaybackLang
  onChange: (lang: PlaybackLang) => void
}

export function LanguageDialog({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const current = OPTIONS.find(o => o.value === value)

  function select(lang: PlaybackLang) {
    onChange(lang)
    setOpen(false)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 text-sm font-medium text-amber-800 transition-colors cursor-pointer"
        title="Changer de langue"
      >
        <span>{current?.flag}</span>
        <span>{current?.label}</span>
        <span className="text-amber-400 text-xs">▾</span>
      </button>

      {/* Dialog */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative bg-white rounded-2xl shadow-xl w-72 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800">Choisir la langue</p>
            </div>

            <ul className="py-2">
              {VISIBLE_OPTIONS.map(opt => {
                const isSprite = SPRITE_LANGS.has(opt.value)
                const isActive = opt.value === value
                return (
                  <li key={opt.value}>
                    <button
                      onClick={() => select(opt.value)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-violet-50 text-violet-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-2xl">{opt.flag}</span>
                      <span className="flex-1 font-medium">{opt.label}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full border"
                        title={isSprite ? 'Audio sprite' : 'Web Speech'}
                        style={{
                          borderColor: isSprite ? '#a78bfa' : '#fb923c',
                          color:       isSprite ? '#7c3aed' : '#ea580c',
                          background:  isSprite ? '#f5f3ff' : '#fff7ed',
                        }}
                      >
                        {isSprite ? '🎵 sprite' : '🗣️ speech'}
                      </span>
                      {isActive && <span className="text-violet-500">✓</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
