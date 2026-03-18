import type { PlaybackLang } from '../hooks/useSpeech'

const OPTIONS: { value: PlaybackLang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'zh', label: '中文' },
]

interface Props {
  value: PlaybackLang
  onChange: (lang: PlaybackLang) => void
}

export function LanguageSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Voix&nbsp;:</span>
      <div className="flex rounded-lg overflow-hidden border border-gray-200">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1 text-sm font-medium transition-colors cursor-pointer ${
              value === opt.value
                ? 'bg-violet-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
