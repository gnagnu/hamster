import { useState, useEffect, useRef, useCallback } from 'react'
import type { Emoji } from '../data/emojis'
import type { PlaybackLang } from './useSpeech'

type SpriteManifest = Record<string, [number, number]> // [startSec, durationSec]

export type PlaybackMode = 'loading' | 'sprite' | 'speech'

/** Whether a sprite was successfully loaded for the current language. */
export type SpriteAvailability = 'loading' | 'available' | 'unavailable'

const LANG_CODES: Record<PlaybackLang, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  zh: 'zh-CN',
}

const isNative = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()

// Single AudioContext shared across language switches (browsers limit how many you can create)
let sharedContext: AudioContext | null = null
function getAudioContext(): AudioContext {
  if (!sharedContext) sharedContext = new AudioContext()
  return sharedContext
}

export function usePlayback(lang: PlaybackLang) {
  const [spriteAvailable, setSpriteAvailable] = useState<SpriteAvailability>('loading')
  const [forceSpeech, setForceSpeech] = useState(false)
  const manifestRef = useRef<SpriteManifest | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)

  const mode: PlaybackMode =
    spriteAvailable === 'loading' ? 'loading' :
    spriteAvailable === 'available' && !forceSpeech ? 'sprite' :
    'speech'

  const toggleMode = useCallback(() => {
    if (spriteAvailable === 'available') setForceSpeech(f => !f)
  }, [spriteAvailable])

  useEffect(() => {
    setSpriteAvailable('loading')
    setForceSpeech(false)
    manifestRef.current = null
    bufferRef.current = null

    const controller = new AbortController()

    Promise.all([
      fetch(`/audio/sprite-${lang}.json`, { signal: controller.signal })
        .then(r => { if (!r.ok) throw new Error('no sprite'); return r.json() as Promise<SpriteManifest> }),
      fetch(`/audio/sprite-${lang}.mp3`, { signal: controller.signal })
        .then(r => r.arrayBuffer())
        .then(buf => getAudioContext().decodeAudioData(buf)),
    ])
      .then(([manifest, audioBuffer]) => {
        manifestRef.current = manifest
        bufferRef.current = audioBuffer
        setSpriteAvailable('available')
      })
      .catch(err => { if (err.name !== 'AbortError') setSpriteAvailable('unavailable') })

    return () => controller.abort()
  }, [lang])

  const speak = useCallback((emoji: Emoji) => {
    const entry = mode === 'sprite' ? manifestRef.current?.[emoji.char] : undefined

    if (entry && bufferRef.current) {
      const ctx = getAudioContext()
      ctx.resume() // required on mobile after user gesture
      const [start, duration] = entry
      const source = ctx.createBufferSource()
      source.buffer = bufferRef.current
      source.connect(ctx.destination)
      source.start(0, start, duration)
    } else if (!isNative && window.speechSynthesis) {
      // sprite not available for this language — fall back to Web Speech
      const utterance = new SpeechSynthesisUtterance(emoji[lang])
      utterance.lang = LANG_CODES[lang]
      utterance.rate = 1.4
      utterance.pitch = 1.8
      window.speechSynthesis.speak(utterance)
    }
  }, [mode, lang])

  return { speak, mode, spriteAvailable, toggleMode }
}
