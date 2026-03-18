import type { Emoji } from '../data/emojis'
import type { PlaybackLang } from '../hooks/useSpeech'
import { EmojiButton } from './EmojiButton'

interface Props {
  emojis: Emoji[]
  lang: PlaybackLang
  onPress: (emoji: Emoji) => void
  size?: 'sm' | 'lg'
}

export function EmojiGrid({ emojis, lang, onPress, size = 'lg' }: Props) {
  if (emojis.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {emojis.map(emoji => (
        <EmojiButton
          key={emoji.char}
          emoji={emoji}
          lang={lang}
          onPress={onPress}
          size={size}
        />
      ))}
    </div>
  )
}
