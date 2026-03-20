import { useCallback } from 'react'

export type PlaybackLang = 'en' | 'fr' | 'zh' | 'de'

export const LANG_CODES: Record<PlaybackLang, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  zh: 'zh-CN',
  de: 'de-DE',
}

/** Languages backed by an audio sprite file (en, fr). */
export const SPRITE_LANGS = new Set<PlaybackLang>(['en', 'fr'])

/** Languages that use Web Speech API only (no sprite). */
export const SPEECH_LANGS = new Set<PlaybackLang>(['zh', 'de'])

/** Find the best available voice for a language, or null if none. */
export function findVoice(lang: PlaybackLang): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? []
  const code = LANG_CODES[lang]
  const prefix = code.split('-')[0]
  // Prefer exact match, then same language prefix
  return voices.find(v => v.lang === code)
      ?? voices.find(v => v.lang.startsWith(prefix + '-'))
      ?? null
}

export function useSpeech() {
  const speak = useCallback((text: string, lang: PlaybackLang) => {
    const voice = findVoice(lang)
    if (!voice) return                              // no voice → stay silent
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = voice                         // explicit — don't let browser guess
    utterance.lang  = voice.lang
    const tonal = lang === 'zh'
    utterance.rate  = tonal ? 1.0 : 1.4
    utterance.pitch = tonal ? 1.0 : 1.8
    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
  }, [])

  return { speak, stop }
}
