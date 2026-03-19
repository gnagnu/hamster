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

export function useSpeech() {
  const speak = useCallback((text: string, lang: PlaybackLang) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = LANG_CODES[lang]
    utterance.rate = 1.4
    utterance.pitch = 1.8
    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
  }, [])

  return { speak, stop }
}
