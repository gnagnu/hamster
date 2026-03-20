import { useState, useRef, useCallback, useEffect } from 'react'
import { getAudioContext } from '../audio/context'

export interface Beat { title: string; filename: string }
export interface Tap  { char: string; position: number }

export function useBeat() {
  const [beats, setBeats] = useState<Beat[]>([])
  const [selectedFilename, setSelectedFilename] = useState('')
  const [playing, setPlaying] = useState(false)
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [taps, setTaps] = useState<Tap[]>([])

  const gainRef       = useRef<GainNode | null>(null)
  const sourceRef     = useRef<AudioBufferSourceNode | null>(null)
  const bufferCache   = useRef<Map<string, AudioBuffer>>(new Map())
  const bufferRef     = useRef<AudioBuffer | null>(null)   // sync ref for recordTap
  const startTimeRef  = useRef<number | null>(null)        // sync ref for recordTap

  useEffect(() => {
    fetch('/audio/beats.json')
      .then(r => r.json() as Promise<Beat[]>)
      .then(setBeats)
      .catch(() => {})
  }, [])

  const stop = useCallback(() => {
    try { sourceRef.current?.stop() } catch { /* already stopped */ }
    sourceRef.current?.disconnect()
    sourceRef.current = null
    startTimeRef.current = null
    setStartTime(null)
    setPlaying(false)
  }, [])

  const play = useCallback(async (filename: string) => {
    const ctx = getAudioContext()
    await ctx.resume()

    try { sourceRef.current?.stop() } catch { /* */ }
    sourceRef.current?.disconnect()

    if (!gainRef.current) {
      gainRef.current = ctx.createGain()
      gainRef.current.gain.value = 0.28
      gainRef.current.connect(ctx.destination)
    }

    let buf = bufferCache.current.get(filename)
    if (!buf) {
      const arrayBuf = await fetch(`/audio/${filename}`).then(r => r.arrayBuffer())
      buf = await ctx.decodeAudioData(arrayBuf)
      bufferCache.current.set(filename, buf)
    }

    const source = ctx.createBufferSource()
    source.buffer = buf
    source.loop = true
    source.connect(gainRef.current)
    source.start()
    sourceRef.current = source

    const t = ctx.currentTime
    bufferRef.current    = buf
    startTimeRef.current = t
    setBuffer(buf)
    setStartTime(t)
    setPlaying(true)
  }, [])

  const toggle = useCallback(() => {
    if (playing) stop()
    else if (selectedFilename) play(selectedFilename)
  }, [playing, selectedFilename, stop, play])

  const select = useCallback((filename: string) => {
    if (!filename) {
      if (playing) stop()
      setSelectedFilename('')
      setTaps([])
      return
    }
    setTaps([])
    if (!selectedFilename || playing) play(filename)
    setSelectedFilename(filename)
  }, [playing, selectedFilename, stop, play])

  const recordTap = useCallback((char: string) => {
    if (startTimeRef.current === null || !bufferRef.current) return
    const pos = (getAudioContext().currentTime - startTimeRef.current) % bufferRef.current.duration
    setTaps(prev => [...prev, { char, position: pos }])
  }, [])

  return { beats, selectedFilename, select, playing, toggle, buffer, startTime, taps, recordTap }
}
