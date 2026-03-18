import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Pencil, X, Trash2, Check } from 'lucide-react'
import type { Emoji } from '../data/emojis'
import type { PlaybackLang } from '../hooks/useSpeech'

// ── sortable emoji item ───────────────────────────────────────────────────────

function SortableEmojiItem({
  emoji,
  lang,
  onPress,
  onRemove,
}: {
  emoji: Emoji
  lang: PlaybackLang
  onPress: (emoji: Emoji) => void
  onRemove: (char: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: emoji.char })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative inline-flex">
      <button
        title={emoji[lang]}
        aria-label={emoji[lang]}
        onClick={() => onPress(emoji)}
        {...attributes}
        {...listeners}
        className="text-2xl p-1 rounded-xl cursor-grab active:cursor-grabbing select-none leading-none hover:bg-black/10 transition-colors"
      >
        {emoji.char}
      </button>
      <button
        onClick={() => onRemove(emoji.char)}
        aria-label={`Supprimer ${emoji[lang]}`}
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
      >
        <X size={10} strokeWidth={3} />
      </button>
    </div>
  )
}

// ── favorites section ─────────────────────────────────────────────────────────

interface Props {
  favoriteEmojis: Emoji[]
  favoriteChars: string[]
  lang: PlaybackLang
  onPress: (emoji: Emoji) => void
  onRemove: (char: string) => void
  onReorder: (next: string[]) => void
  onClear: () => void
}

export function FavoritesSection({
  favoriteEmojis,
  favoriteChars,
  lang,
  onPress,
  onRemove,
  onReorder,
  onClear,
}: Props) {
  const [editing, setEditing] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = favoriteChars.indexOf(active.id as string)
    const newIndex = favoriteChars.indexOf(over.id as string)
    onReorder(arrayMove(favoriteChars, oldIndex, newIndex))
  }

  if (favoriteEmojis.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wider">
          ⭐ Favoris
        </h2>
        <div className="flex items-center gap-2">
          {editing && (
            <button
              onClick={() => { onClear(); setEditing(false) }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <Trash2 size={12} />
              Vider
            </button>
          )}
          <button
            onClick={() => setEditing(e => !e)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
          >
            {editing ? <><Check size={12} /> Terminer</> : <><Pencil size={12} /> Modifier</>}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
        {editing ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={favoriteChars} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap gap-1">
                {favoriteEmojis.map(emoji => (
                  <SortableEmojiItem
                    key={emoji.char}
                    emoji={emoji}
                    lang={lang}
                    onPress={onPress}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex flex-wrap gap-1">
            {favoriteEmojis.map(emoji => (
              <button
                key={emoji.char}
                title={emoji[lang]}
                aria-label={emoji[lang]}
                onClick={() => onPress(emoji)}
                className="text-2xl p-1 rounded-xl hover:bg-black/10 active:scale-90 transition-transform duration-75 cursor-pointer select-none leading-none"
              >
                {emoji.char}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
