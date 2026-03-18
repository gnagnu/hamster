import type { Emoji } from '../data/emojis'
import type { PlaybackLang } from '../hooks/useSpeech'

interface Props {
  emoji: Emoji
  lang: PlaybackLang
  onPress: (emoji: Emoji) => void
  size?: 'sm' | 'lg'
}

export function EmojiButton({ emoji, lang, onPress, size = 'lg' }: Props) {
  const label = emoji[lang]
  const textSize = size === 'lg' ? 'text-4xl' : 'text-2xl'
  const padding = size === 'lg' ? 'p-2' : 'p-1'

  return (
    <button
      title={label}
      aria-label={label}
      onClick={() => onPress(emoji)}
      className={`${textSize} ${padding} rounded-xl hover:bg-black/10 active:scale-90 transition-transform duration-75 cursor-pointer select-none leading-none`}
    >
      {emoji.char}
    </button>
  )
}
