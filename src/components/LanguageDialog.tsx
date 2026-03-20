import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { SPRITE_LANGS, SPEECH_LANGS, findVoice, type PlaybackLang } from '../hooks/useSpeech'

const isNative = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()

interface LangOption {
  value: PlaybackLang
  flag: string
  label: string
}

const OPTIONS: LangOption[] = [
  { value: 'en', flag: '🇬🇧', label: 'English'  },
  { value: 'fr', flag: '🇫🇷', label: 'Français' },
  { value: 'zh', flag: '🇨🇳', label: '中文'      },
  { value: 'de', flag: '🇩🇪', label: 'Deutsch'  },
]

const VISIBLE_OPTIONS = isNative
  ? OPTIONS.filter(o => SPRITE_LANGS.has(o.value))
  : OPTIONS

function getAvailableSpeechLangs(): Set<PlaybackLang> {
  const available = new Set<PlaybackLang>()
  for (const lang of SPEECH_LANGS) {
    if (findVoice(lang)) available.add(lang)
  }
  return available
}

const SPEED_STEPS = [
  { value: 0.5,  label: '🐌 Escargot endormi'  },
  { value: 0.75, label: '🦥 Paresseux'          },
  { value: 1.0,  label: '🐹 Hamster tranquille' },
  { value: 1.25, label: '🐇 Lapin pressé'       },
  { value: 1.5,  label: '🗣️ Pipelette'          },
  { value: 1.75, label: '🐿️ Écureuil turbo'    },
  { value: 2.0,  label: '⚡ Chipmunk fou'        },
]

interface Props {
  value: PlaybackLang
  onChange: (lang: PlaybackLang) => void
  speed: number
  onSpeedChange: (speed: number) => void
}

export function LanguageDialog({ value, onChange, speed, onSpeedChange }: Props) {
  const [open, setOpen] = useState(false)
  // null = still loading (don't disable anything yet)
  const [speechAvailable, setSpeechAvailable] = useState<Set<PlaybackLang> | null>(null)

  useEffect(() => {
    const synth = window.speechSynthesis
    if (!synth) { setSpeechAvailable(new Set()); return }

    const refresh = () => setSpeechAvailable(getAvailableSpeechLangs())

    // Try immediately — works on many mobile browsers
    const initial = getAvailableSpeechLangs()
    if (initial.size > 0) { setSpeechAvailable(initial); return }

    // Otherwise wait for async voice loading
    synth.addEventListener('voiceschanged', refresh)
    return () => synth.removeEventListener('voiceschanged', refresh)
  }, [])

  function isDisabled(lang: PlaybackLang) {
    if (SPRITE_LANGS.has(lang)) return false          // always available
    if (speechAvailable === null) return false         // still loading — don't disable yet
    return !speechAvailable.has(lang)                  // speech-only: needs a voice
  }

  function select(lang: PlaybackLang) {
    if (isDisabled(lang)) return
    onChange(lang)
    setOpen(false)
  }

  const current = OPTIONS.find(o => o.value === value)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 text-sm font-medium text-amber-800 transition-colors cursor-pointer"
        title="Changer de langue"
      >
        <span>{current?.flag}</span>
        <span>{current?.label}</span>
        <span className="text-amber-400 text-xs">▾</span>
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

          <div
            className="relative bg-white rounded-2xl shadow-xl w-72 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800">Choisir la langue</p>
            </div>

            <ul className="py-2">
              {VISIBLE_OPTIONS.map(opt => {
                const isSprite   = SPRITE_LANGS.has(opt.value)
                const isActive   = opt.value === value
                const disabled   = isDisabled(opt.value)

                return (
                  <li key={opt.value}>
                    <button
                      onClick={() => select(opt.value)}
                      disabled={disabled}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                        disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : isActive
                            ? 'bg-violet-50 text-violet-700 cursor-pointer'
                            : 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      <span className="text-2xl">{opt.flag}</span>
                      <div className="flex-1">
                        <span className="font-medium">{opt.label}</span>
                        {disabled && (
                          <p className="text-xs text-gray-400 mt-0.5">Voix non installée</p>
                        )}
                      </div>
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

            <div className="px-5 py-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vitesse</p>
              <p className="text-center text-lg font-medium text-gray-800 mb-3">
                {SPEED_STEPS.find(s => s.value === speed)?.label ?? '🐹 Hamster tranquille'}
              </p>
              <input
                type="range"
                min={0}
                max={SPEED_STEPS.length - 1}
                step={1}
                value={SPEED_STEPS.findIndex(s => s.value === speed)}
                onChange={e => onSpeedChange(SPEED_STEPS[+e.target.value].value)}
                className="w-full accent-violet-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      , document.body)}
    </>
  )
}
