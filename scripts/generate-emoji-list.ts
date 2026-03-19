/**
 * generate-emoji-list.ts
 * Fetches emoji data from Unicode + CLDR and outputs src/data/emojis.ts
 *
 * Usage: npm run emoji-list
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Per-category targets (must sum to TARGET) ─────────────────────────────────
const CAT_TARGETS: Record<string, number> = {
  smileys:    180,
  people:     140,
  animals:    160,
  food:       135,
  travel:     100,
  activities:  90,
  objects:    130,
  symbols:     65,
}
const TARGET = Object.values(CAT_TARGETS).reduce((a, b) => a + b, 0)

// ── Skip rules ────────────────────────────────────────────────────────────────

const SKIP_GROUPS    = new Set(['Flags', 'Component'])
const SKIP_SUBGROUPS = new Set(['keycap', 'skin-tone'])

// U+1F3FB–1F3FF skin-tone modifiers / U+1F9B0–1F9B3 hair components
const SKIN_RE = /[\u{1F3FB}-\u{1F3FF}]/u
const HAIR_RE = /[\u{1F9B0}-\u{1F9B3}]/u
const isVariant = (c: string) => SKIN_RE.test(c) || HAIR_RE.test(c)

// ── Category mapping ──────────────────────────────────────────────────────────

const GROUP_TO_CAT: Record<string, string> = {
  'Smileys & Emotion': 'smileys',
  'People & Body':     'people',
  'Animals & Nature':  'animals',
  'Food & Drink':      'food',
  'Travel & Places':   'travel',
  'Activities':        'activities',
  'Objects':           'objects',
  'Symbols':           'symbols',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchText(url: string): Promise<string> {
  process.stdout.write(`  GET ${url} … `)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  console.log(`${text.length.toLocaleString()} bytes`)
  return text
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  process.stdout.write(`  GET ${url} … `)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json() as Record<string, unknown>
  console.log('ok')
  return json
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Target: ${TARGET} emojis`)
  console.log('Per-category targets:', CAT_TARGETS)

  // 1. Read popular set from git HEAD (the original curated 354 emojis)
  //    Falls back to current file if git is unavailable
  let popularSource: string
  try {
    const { execSync } = await import('child_process')
    popularSource = execSync('git show HEAD:src/data/emojis.ts', { cwd: ROOT }).toString()
    console.log('\nPopular set: reading from git HEAD')
  } catch {
    popularSource = readFileSync(join(ROOT, 'src/data/emojis.ts'), 'utf-8')
    console.log('\nPopular set: reading from current file (git unavailable)')
  }
  const popularChars = new Set<string>()
  for (const m of popularSource.matchAll(/char:\s*'([^']+)'/g)) popularChars.add(m[1])
  // If the current file was already regenerated (cat field present), popular is baked in
  const fromRegen = popularSource.includes("cat: '")
  if (fromRegen) {
    for (const m of popularSource.matchAll(/\/\/ popular/g)) { /* count only */ }
    // Re-extract: popular entries have `// popular` comment
    for (const m of popularSource.matchAll(/char:\s*'([^']+)'[^}]+\/\/ popular/g)) popularChars.add(m[1])
    console.log(`Popular set: ${popularChars.size} emojis (from regenerated file markers)`)
  } else {
    console.log(`Popular set: ${popularChars.size} emojis`)
  }

  // 2. Fetch Unicode data
  console.log('\nFetching Unicode data…')
  const emojiTest = await fetchText('https://unicode.org/Public/emoji/latest/emoji-test.txt')

  // 3. Fetch CLDR annotations (EN, FR, ZH)
  console.log('\nFetching CLDR annotations…')
  const CLDR = 'https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-annotations-full/annotations'
  const [enRaw, frRaw, zhRaw, deRaw] = await Promise.all([
    fetchJson(`${CLDR}/en/annotations.json`),
    fetchJson(`${CLDR}/fr/annotations.json`),
    fetchJson(`${CLDR}/zh/annotations.json`),
    fetchJson(`${CLDR}/de/annotations.json`),
  ])

  type AnnotMap = Record<string, { tts?: string[] }>
  const enAnn = ((enRaw as any).annotations?.annotations ?? {}) as AnnotMap
  const frAnn = ((frRaw as any).annotations?.annotations ?? {}) as AnnotMap
  const zhAnn = ((zhRaw as any).annotations?.annotations ?? {}) as AnnotMap
  const deAnn = ((deRaw as any).annotations?.annotations ?? {}) as AnnotMap

  // 4. Parse emoji-test.txt — also extract inline English name as fallback
  console.log('\nParsing emoji-test.txt…')

  interface EmojiEntry {
    char: string
    cat: string
    popular: boolean
    nameFromFile: string  // fallback name from emoji-test.txt
  }

  const allByCategory: Record<string, EmojiEntry[]> = {}
  let group = '', subgroup = ''

  for (const line of emojiTest.split('\n')) {
    if (line.startsWith('# group:'))    { group    = line.slice(9).trim();  continue }
    if (line.startsWith('# subgroup:')) { subgroup = line.slice(12).trim(); continue }
    if (!line.includes('; fully-qualified')) continue

    if (SKIP_GROUPS.has(group))      continue
    if (SKIP_SUBGROUPS.has(subgroup)) continue

    // "1F600  ; fully-qualified  # 😀 E1.0 grinning face"
    const m = line.match(/;\s*fully-qualified\s*#\s*(\S+)\s+E[\d.]+\s+(.+)$/)
    if (!m) continue
    const char         = m[1]
    const nameFromFile = m[2].trim()

    if (isVariant(char)) continue

    const cat = GROUP_TO_CAT[group] ?? 'symbols'
    if (!allByCategory[cat]) allByCategory[cat] = []
    allByCategory[cat].push({ char, cat, popular: popularChars.has(char), nameFromFile })
  }

  for (const [cat, arr] of Object.entries(allByCategory)) {
    console.log(`  ${cat}: ${arr.length} available`)
  }

  // 5. Select per category up to target, popular always first
  const selected: EmojiEntry[] = []
  for (const [cat, entries] of Object.entries(allByCategory)) {
    const limit = CAT_TARGETS[cat] ?? 50
    const pop   = entries.filter(e => e.popular)
    const rest  = entries.filter(e => !e.popular)
    const pick  = [...pop, ...rest].slice(0, limit)
    selected.push(...pick)
  }

  // Re-sort into original Unicode order (emoji-test.txt order)
  const globalOrder = new Map<string, number>()
  let idx = 0
  for (const entries of Object.values(allByCategory)) {
    for (const e of entries) globalOrder.set(e.char, idx++)
  }
  selected.sort((a, b) => (globalOrder.get(a.char) ?? 0) - (globalOrder.get(b.char) ?? 0))

  console.log(`\nSelected: ${selected.length} emojis total`)

  // 6. Build output lines
  const lines: string[] = []
  let missingCldr = 0, missingFr = 0, missingZh = 0, missingDe = 0
  let lastCat = ''

  for (const { char, cat, popular, nameFromFile } of selected) {
    const enCldr = enAnn[char]?.tts?.[0]
    const fr     = frAnn[char]?.tts?.[0]
    const zh     = zhAnn[char]?.tts?.[0]
    const de     = deAnn[char]?.tts?.[0]

    // Use CLDR name if available, else fall back to emoji-test.txt name
    const en = enCldr ?? nameFromFile
    if (!enCldr) missingCldr++
    if (!fr)      missingFr++
    if (!zh)      missingZh++
    if (!de)      missingDe++

    const frVal = fr ?? en
    const zhVal = zh ?? en
    const deVal = de ?? en

    const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

    if (cat !== lastCat) {
      lines.push(`\n  // ── ${cat} ───────────────────────────────────────────────────────────────────`)
      lastCat = cat
    }

    const popField = popular ? ', popular: true' : ''
    lines.push(`  { char: '${esc(char)}', en: '${esc(en)}', fr: '${esc(frVal)}', zh: '${esc(zhVal)}', de: '${esc(deVal)}', cat: '${cat}'${popField} },`)
  }

  console.log(`CLDR fallbacks: EN ${missingCldr}, FR ${missingFr}, ZH ${missingZh}, DE ${missingDe}`)

  // 7. Write file
  const out = `// Auto-generated by scripts/generate-emoji-list.ts
// Source: Unicode CLDR — ${new Date().toISOString().slice(0, 10)}
// DO NOT EDIT MANUALLY — run: npm run emoji-list

export interface Emoji {
  char: string
  en: string
  fr: string
  zh: string
  de: string
  cat: string
  popular?: boolean
}

export interface EmojiCategory {
  key: string
  en: string
  fr: string
  zh: string
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  { key: 'popular',     en: 'Popular',            fr: 'Populaires',          zh: '热门' },
  { key: 'smileys',    en: 'Smileys & Emotion',   fr: 'Sourires & Émotion',  zh: '笑脸与情感' },
  { key: 'people',     en: 'People & Body',        fr: 'Personnes & Corps',   zh: '人物与身体' },
  { key: 'animals',    en: 'Animals & Nature',     fr: 'Animaux & Nature',    zh: '动物与自然' },
  { key: 'food',       en: 'Food & Drink',         fr: 'Nourriture & Boisson',zh: '食物与饮料' },
  { key: 'travel',     en: 'Travel & Places',      fr: 'Voyage & Lieux',      zh: '旅行与地点' },
  { key: 'activities', en: 'Activities',           fr: 'Activités',           zh: '活动' },
  { key: 'objects',    en: 'Objects',              fr: 'Objets',              zh: '物品' },
  { key: 'symbols',    en: 'Symbols',              fr: 'Symboles',            zh: '符号' },
  { key: 'random',     en: 'Random',               fr: 'Aléatoire',           zh: '随机' },
  { key: 'rare',       en: 'Rare',                 fr: 'Rares',               zh: '罕见' },
]

export const EMOJIS: Emoji[] = [${lines.join('\n')}
]
`

  const outPath = join(ROOT, 'src/data/emojis.ts')
  writeFileSync(outPath, out, 'utf-8')
  console.log(`\nWritten → ${outPath}`)
}

main().catch(err => { console.error(err); process.exit(1) })
