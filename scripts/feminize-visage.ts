#!/usr/bin/env -S npx tsx
/**
 * Generates overrides.json entries replacing "visage" → "tête"
 * with feminine adjective agreement.
 *
 * Usage:  npx tsx scripts/feminize-visage.ts
 *         npx tsx scripts/feminize-visage.ts --apply   (writes to overrides.json)
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { EMOJIS } from '../src/data/emojis.ts'

// ── Feminization rules (applied to each word individually) ───────────────────

// Special irregular forms first
const IRREGULAR: Record<string, string> = {
  'inquiet':    'inquiète',
  'stupéfait':  'stupéfaite',
  'confus':     'confuse',
  'bleu':       'bleue',
  'chaud':      'chaude',
  'froid':      'froide',
  'vieux':      'vieille',
  'beau':       'belle',
  'nouveau':    'nouvelle',
}

function feminizeWord(word: string): string {
  if (IRREGULAR[word]) return IRREGULAR[word]
  if (/ment$/.test(word)) return word           // adverb (-ment): invariable
  if (/e$/.test(word)) return word              // already ends in -e: invariable
  if (/eux$/.test(word)) return word.replace(/eux$/, 'euse')
  if (/eur$/.test(word)) return word.replace(/eur$/, 'euse')
  if (/if$/.test(word))  return word.replace(/if$/, 'ive')
  if (/ant$/.test(word)) return word + 'e'      // souriant → souriante
  if (/ent$/.test(word)) return word + 'e'      // somnolent → somnolente
  if (/[éè]$/.test(word)) return word + 'e'    // angoissé → angoissée
  if (/i$/.test(word))   return word + 'e'      // endormi → endormie
  if (/u$/.test(word))   return word + 'e'      // déçu → déçue, épuisé... wait
  return word                                    // unknown: leave as-is
}

// Prepositions/conjunctions that end the adjective phrase following "tête"
const BREAK_WORDS = new Set(['avec', 'aux', 'au', 'de', 'du', 'des', 'qui',
  'dans', 'sur', 'en', 'faisant', 'envoyant', 'retenant', 'roulant', 'riant',
  'pleurant'])

function transform(fr: string): string | null {
  if (!fr.includes('visage')) return null

  // Replace "visage" with "tête"
  let result = fr.replace('visage', 'tête')

  // Find adjective words right after "tête" (before a break word)
  // Only feminize if "tête" is followed by an adjective (not a preposition)
  const afterTete = result.slice(result.indexOf('tête') + 4).trim()
  const firstWord = afterTete.split(/\s+/)[0]

  if (!firstWord || BREAK_WORDS.has(firstWord)) return result // no adj to feminize

  // Split into: [tête] [adj words...] [break word + rest]
  const words = afterTete.split(/\s+/)
  const adjWords: string[] = []
  let breakIdx = words.length
  for (let i = 0; i < words.length; i++) {
    if (BREAK_WORDS.has(words[i])) { breakIdx = i; break }
    adjWords.push(words[i])
  }
  const rest = words.slice(breakIdx).join(' ')

  // Handle "et" within adj words (e.g. "rouge et chaud")
  const feminized = adjWords.map((w, i) => w === 'et' ? 'et' : feminizeWord(w)).join(' ')

  result = 'tête ' + feminized + (rest ? ' ' + rest : '')
  return result
}

// ── Main ─────────────────────────────────────────────────────────────────────

const apply = process.argv.includes('--apply')
const overridesPath = resolve('scripts/overrides.json')
const existing: Record<string, Record<string, string>> = JSON.parse(readFileSync(overridesPath, 'utf-8'))

const proposals: Record<string, Record<string, string>> = { ...existing }
let count = 0

console.log('\nProposed changes:\n')
for (const emoji of EMOJIS) {
  const original = emoji.fr
  if (!original.includes('visage')) continue
  // Skip entries where "visage" is not the subject (mid-sentence)
  if (!original.startsWith('visage')) continue

  const transformed = transform(original)
  if (!transformed || transformed === original) continue

  console.log(`  ${emoji.char}  "${original}"`)
  console.log(`       → "${transformed}"`)

  proposals[emoji.char] = { ...(proposals[emoji.char] ?? {}), fr: transformed }
  count++
}

console.log(`\n${count} entries would change.`)

if (apply) {
  writeFileSync(overridesPath, JSON.stringify(proposals, null, 2) + '\n')
  console.log(`✓ Written to scripts/overrides.json`)
  console.log(`  Run: npm run emoji-list  to regenerate emojis.ts`)
} else {
  console.log(`\nRun with --apply to write to overrides.json`)
}
