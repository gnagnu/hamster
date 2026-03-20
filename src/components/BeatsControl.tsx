import { Music2, Play, Square } from 'lucide-react'
import type { Beat } from '../hooks/useBeat'

interface Props {
  beats: Beat[]
  selectedFilename: string
  playing: boolean
  onSelect: (filename: string) => void
  onToggle: () => void
}

export function BeatsControl({ beats, selectedFilename, playing, onSelect, onToggle }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Music2 size={16} className="text-amber-600 flex-shrink-0" />
      <select
        value={selectedFilename}
        onChange={e => onSelect(e.target.value)}
        className="text-sm border border-amber-200 rounded-lg px-2 py-1.5 bg-white text-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
      >
        <option value="">Pas de musique</option>
        {beats.map(b => (
          <option key={b.filename} value={b.filename}>{b.title}</option>
        ))}
      </select>
      <button
        onClick={onToggle}
        disabled={!selectedFilename}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
          !selectedFilename
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : playing
              ? 'bg-amber-600 text-white hover:bg-amber-700 cursor-pointer'
              : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50 cursor-pointer'
        }`}
      >
        {playing
          ? <Square size={13} fill="currentColor" />
          : <Play size={13} fill="currentColor" />
        }
        {playing ? 'Stop' : 'Play'}
      </button>
    </div>
  )
}
