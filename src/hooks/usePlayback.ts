import { useState, useEffect, useRef, useCallback } from 'react'
import type { Emoji } from '../data/emojis'
import { LANG_CODES, SPRITE_LANGS, SPEECH_LANGS } from './useSpeech'
import type { PlaybackLang } from './useSpeech'
import { getAudioContext } from '../audio/context'

type SpriteManifest = Record<string, [number, number]> // [startSec, durationSec]

export type PlaybackMode = 'loading' | 'sprite' | 'speech'
export type SpriteAvailability = 'loading' | 'available' | 'unavailable'

const isNative = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()

// Find the best available voice for a BCP-47 language code.
// Returns null if the language isn't installed on this device.
function findVoice(bcp47: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? []
  const prefix = bcp47.split('-')[0]
  return voices.find(v => v.lang === bcp47)
      ?? voices.find(v => v.lang.startsWith(prefix))
      ?? null
}

export function usePlayback(lang: PlaybackLang, speed = 1.0) {
  const isSpeechOnly = SPEECH_LANGS.has(lang)

  const [spriteAvailable, setSpriteAvailable] = useState<SpriteAvailability>(
    isSpeechOnly ? 'unavailable' : 'loading'
  )
  const manifestRef = useRef<SpriteManifest | null>(null)
  const bufferRef   = useRef<AudioBuffer | null>(null)

  const mode: PlaybackMode =
    isSpeechOnly                              ? 'speech'  :
    spriteAvailable === 'loading'             ? 'loading' :
    spriteAvailable === 'available'           ? 'sprite'  :
    'speech'

  useEffect(() => {
    // Speech-only languages: no sprite to load
    if (!SPRITE_LANGS.has(lang)) {
      setSpriteAvailable('unavailable')
      manifestRef.current = null
      bufferRef.current   = null
      return
    }

    setSpriteAvailable('loading')
    manifestRef.current = null
    bufferRef.current   = null

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
        bufferRef.current   = audioBuffer
        setSpriteAvailable('available')
      })
      .catch(err => { if (err.name !== 'AbortError') setSpriteAvailable('unavailable') })

    return () => controller.abort()
  }, [lang])

  const speak = useCallback((emoji: Emoji) => {
    if (mode === 'sprite') {
      const entry = manifestRef.current?.[emoji.char]
      if (entry && bufferRef.current) {
        const ctx = getAudioContext()
        ctx.resume()
        const [start, duration] = entry
        const source = ctx.createBufferSource()
        source.buffer = bufferRef.current
        source.connect(ctx.destination)
        source.playbackRate.value = speed
        source.start(0, start, duration)
        return
      }
    }

    // Web Speech fallback (not on native APK)
    if (!isNative && window.speechSynthesis) {
      const targetCode = LANG_CODES[lang]
      const voice = findVoice(targetCode)
      // If no voice for this language, fall back to English text + English voice
      const effectiveLang: PlaybackLang = voice ? lang : 'en'
      const text = emoji[effectiveLang as keyof Emoji] as string
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang  = LANG_CODES[effectiveLang]
      if (voice) utterance.voice = voice
      // Tonal languages need neutral pitch to preserve tones
      const tonal = effectiveLang === 'zh'
      utterance.rate  = (tonal ? 1.0 : 1.4) * speed
      utterance.pitch = tonal ? 1.0 : 1.8
      window.speechSynthesis.speak(utterance)
    }
  }, [mode, lang, speed])

  return { speak, mode, spriteAvailable }
}
