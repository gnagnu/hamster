#!/usr/bin/env -S npx tsx
/**
 * Generates an audio sprite for all emojis in a given language.
 *
 * Prerequisites:
 *   yarn install  (sets up .venv + edge-tts + ffmpeg-static automatically)
 *
 * Usage:
 *   yarn sprite --lang fr          # generate (resumes if interrupted)
 *   yarn sprite --lang fr --clean  # wipe cache and start fresh
 *
 * Outputs:
 *   public/audio/sprite-<lang>.mp3   — single concatenated audio file
 *   public/audio/sprite-<lang>.json  — manifest: { [emojiChar]: [startSec, durationSec] }
 *
 * How the app uses the manifest:
 *   audio.currentTime = start
 *   audio.play()
 *   setTimeout(() => audio.pause(), duration * 1000)
 *
 * Each clip is separated by GAP_S seconds of silence so stopping at
 * `start + duration` never bleeds into the next clip.
 *
 * Cache:
 *   .sprite-cache/<lang>/<index>.wav  — survives failures, reused on resume
 *   Wipe manually or with --clean to force regeneration.
 */

import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { EMOJIS } from '../src/data/emojis.ts'
import ffmpegPath from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'

const FFMPEG = ffmpegPath ?? 'ffmpeg'
const FFPROBE = ffprobeStatic.path

const EDGE_TTS = existsSync(resolve('.venv/bin/edge-tts'))
  ? resolve('.venv/bin/edge-tts')
  : 'edge-tts'

// ── config ────────────────────────────────────────────────────────────────────

type Lang = 'en' | 'fr' | 'zh'

const VOICES: Record<Lang, string> = {
  en: 'en-US-AriaNeural',
  fr: 'fr-FR-DeniseNeural',
  zh: 'zh-CN-XiaoxiaoNeural',
}

/** Silence gap between clips in the sprite (seconds). */
const GAP_S = 0.15

/** PCM sample rate for intermediate WAV files. */
const SAMPLE_RATE = 24000

/**
 * Silence threshold for stripping leading/trailing silence from each clip.
 * -50dB catches the edge-tts padding without cutting soft speech onsets.
 */
const SILENCE_THRESHOLD = '-50dB'

// ── helpers ───────────────────────────────────────────────────────────────────

function die(msg: string): never {
  console.error(`\nError: ${msg}`)
  process.exit(1)
}

function run(cmd: string, args: string[]): void {
  const r = spawnSync(cmd, args, { encoding: 'utf8' })
  if (r.error) die(`"${cmd}" not found — ${r.error.message}`)
  if (r.status !== 0) die(`"${cmd}" exited ${r.status}:\n${r.stderr}`)
}

function runWithRetry(cmd: string, args: string[], retries = 3, delayMs = 2000): void {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const r = spawnSync(cmd, args, { encoding: 'utf8' })
    if (r.error) die(`"${cmd}" not found — ${r.error.message}`)
    if (r.status === 0) return
    const isLast = attempt === retries
    if (isLast) die(`"${cmd}" failed after ${retries} attempts:\n${r.stderr}`)
    console.warn(`\n  attempt ${attempt} failed, retrying in ${delayMs}ms...`)
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs)
  }
}

function ffprobeFloat(args: string[]): number {
  const r = spawnSync(FFPROBE, args, { encoding: 'utf8' })
  if (r.error) die(`ffprobe failed: ${r.error.message}`)
  return parseFloat(r.stdout.trim())
}

function parseArgs(): { lang: Lang; clean: boolean } {
  const idx = process.argv.indexOf('--lang')
  const value = idx !== -1 ? process.argv[idx + 1] : undefined
  if (!value || !['en', 'fr', 'zh'].includes(value)) {
    die(`Usage: yarn sprite --lang <en|fr|zh> [--clean]`)
  }
  return { lang: value as Lang, clean: process.argv.includes('--clean') }
}

// ── main ──────────────────────────────────────────────────────────────────────

function main() {
  const { lang, clean } = parseArgs()
  const voice = VOICES[lang]

  const cacheDir = resolve(`.sprite-cache/${lang}`)
  const outDir = resolve('public/audio')

  if (clean && existsSync(cacheDir)) {
    console.log(`Cleaning cache: ${cacheDir}`)
    rmSync(cacheDir, { recursive: true })
  }

  mkdirSync(cacheDir, { recursive: true })
  mkdirSync(outDir, { recursive: true })

  console.log(`\nGenerating sprite — lang: ${lang}  voice: ${voice}`)
  console.log(`Cache: ${cacheDir}`)
  console.log(`Emojis: ${EMOJIS.length}\n`)

  // ── 1. generate one WAV clip per emoji (skip if cached) ─────────────────────

  const manifest: Record<string, [number, number]> = {}
  const wavPaths: string[] = []
  let cursor = 0

  for (let i = 0; i < EMOJIS.length; i++) {
    const emoji = EMOJIS[i]
    const text = emoji[lang]
    const base = join(cacheDir, i.toString().padStart(4, '0'))
    const mp3Path = `${base}.mp3`
    const wavPath = `${base}.wav`

    if (existsSync(wavPath)) {
      process.stdout.write(`[${i + 1}/${EMOJIS.length}] ${emoji.char}  "${text}" ... (cached) `)
    } else {
      process.stdout.write(`[${i + 1}/${EMOJIS.length}] ${emoji.char}  "${text}" ... `)

      // TTS → MP3 (retries on transient 503s)
      runWithRetry(EDGE_TTS, ['--voice', voice, '--text', text, '--write-media', mp3Path])

      // MP3 → WAV: PCM, mono, fixed sample rate, leading+trailing silence stripped
      run(FFMPEG, [
        '-y', '-i', mp3Path,
        '-af', [
          `silenceremove=start_periods=1:start_duration=0:start_threshold=${SILENCE_THRESHOLD}`,
          `areverse`,
          `silenceremove=start_periods=1:start_duration=0:start_threshold=${SILENCE_THRESHOLD}`,
          `areverse`,
        ].join(','),
        '-ac', '1', '-ar', String(SAMPLE_RATE),
        '-acodec', 'pcm_s16le',
        wavPath,
      ])

      // MP3 no longer needed
      rmSync(mp3Path)
    }

    const duration = ffprobeFloat([
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      wavPath,
    ])

    manifest[emoji.char] = [parseFloat(cursor.toFixed(6)), parseFloat(duration.toFixed(6))]
    wavPaths.push(wavPath)
    cursor = parseFloat((cursor + duration + GAP_S).toFixed(6))

    console.log(`${duration.toFixed(3)}s  (starts at ${manifest[emoji.char][0].toFixed(3)}s)`)
  }

  // ── 2. generate silence WAV ──────────────────────────────────────────────────

  const silencePath = join(cacheDir, 'silence.wav')
  run(FFMPEG, [
    '-y',
    '-f', 'lavfi',
    '-i', `anullsrc=r=${SAMPLE_RATE}:cl=mono`,
    '-t', String(GAP_S),
    '-acodec', 'pcm_s16le',
    silencePath,
  ])

  // ── 3. concatenate all clips + silence gaps into one WAV ────────────────────

  console.log('\nConcatenating clips ...')

  const concatList = join(cacheDir, 'concat.txt')
  const lines: string[] = []
  for (const wav of wavPaths) {
    lines.push(`file '${wav}'`)
    lines.push(`file '${silencePath}'`)
  }
  writeFileSync(concatList, lines.join('\n'))

  const masterWav = join(cacheDir, 'master.wav')
  run(FFMPEG, [
    '-y',
    '-f', 'concat', '-safe', '0',
    '-i', concatList,
    masterWav,
  ])

  // ── 4. encode final MP3 ─────────────────────────────────────────────────────

  const spriteMp3 = join(outDir, `sprite-${lang}.mp3`)
  run(FFMPEG, [
    '-y', '-i', masterWav,
    '-acodec', 'libmp3lame', '-q:a', '4',
    spriteMp3,
  ])

  // master WAV no longer needed
  rmSync(masterWav)

  // ── 5. write manifest ───────────────────────────────────────────────────────

  const manifestPath = join(outDir, `sprite-${lang}.json`)
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

  console.log(`\n✓  public/audio/sprite-${lang}.mp3`)
  console.log(`✓  public/audio/sprite-${lang}.json`)
  console.log(`\nTotal audio length: ${cursor.toFixed(1)}s`)
  console.log(`Cache preserved at: ${cacheDir}`)
}

main()
