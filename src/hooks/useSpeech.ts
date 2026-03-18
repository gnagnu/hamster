import { useCallback, useRef } from 'react'

export type PlaybackLang = 'en' | 'fr' | 'zh'

const LANG_CODES: Record<PlaybackLang, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  zh: 'zh-CN',
}

export function useSpeech() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback((text: string, lang: PlaybackLang) => {
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = LANG_CODES[lang]
    utterance.rate = 1.4
    utterance.pitch = 1.8
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
  }, [])

  return { speak, stop }
}
