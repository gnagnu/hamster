import { useEffect, useRef } from 'react'
import { getAudioContext } from '../audio/context'
import type { Tap } from '../hooks/useBeat'

interface Props {
  buffer: AudioBuffer
  startTime: number | null
  taps: Tap[]
}

const WINDOW_SECS = 10
const HEIGHT = 72

export function WaveformVis({ buffer, startTime, taps }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const peaksRef     = useRef<Float32Array | null>(null)
  const startTimeRef = useRef(startTime)
  const tapsRef      = useRef(taps)
  const rafRef       = useRef(0)

  useEffect(() => { startTimeRef.current = startTime }, [startTime])
  useEffect(() => { tapsRef.current = taps }, [taps])

  // Pre-compute peak envelope whenever buffer changes
  useEffect(() => {
    const data = buffer.getChannelData(0)
    const COLS = 1200
    const step = Math.max(1, Math.floor(data.length / COLS))
    const peaks = new Float32Array(COLS)
    for (let i = 0; i < COLS; i++) {
      let max = 0
      const end = Math.min(i * step + step, data.length)
      for (let j = i * step; j < end; j++) {
        const v = Math.abs(data[j])
        if (v > max) max = v
      }
      peaks[i] = max
    }
    peaksRef.current = peaks
  }, [buffer])

  // Animation loop — restarts only when buffer changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width  = rect.width * dpr
      canvas.height = HEIGHT * dpr
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const draw = () => {
      const ctx2d = canvas.getContext('2d')
      const peaks = peaksRef.current
      if (!ctx2d || !peaks) { rafRef.current = requestAnimationFrame(draw); return }

      const W = canvas.width
      const H = canvas.height
      ctx2d.clearRect(0, 0, W, H)

      const duration = buffer.duration
      const colsPerSec = peaks.length / duration

      // Current playback position
      let curPos = 0
      if (startTimeRef.current !== null) {
        curPos = (getAudioContext().currentTime - startTimeRef.current) % duration
        if (curPos < 0) curPos += duration
      }

      // Waveform bars
      for (let x = 0; x < W; x++) {
        const dt = ((x / W) - 0.5) * WINDOW_SECS * 2
        const pos = ((curPos + dt) % duration + duration) % duration
        const col = Math.min(Math.floor(pos * colsPerSec), peaks.length - 1)
        const peak = peaks[col]
        const barH = peak * H * 0.75
        const y = (H - barH) / 2
        ctx2d.fillStyle = dt < 0
          ? 'rgba(180, 83, 9, 0.65)'   // past — darker amber
          : 'rgba(251, 191, 36, 0.55)' // future — lighter amber
        ctx2d.fillRect(x, y, 1, barH)
      }

      // Center "now" line
      ctx2d.strokeStyle = '#92400e'
      ctx2d.lineWidth = 2 * dpr
      ctx2d.beginPath()
      ctx2d.moveTo(W / 2, 0)
      ctx2d.lineTo(W / 2, H)
      ctx2d.stroke()

      // Emoji taps — check across loop boundaries
      ctx2d.font = `${14 * dpr}px sans-serif`
      ctx2d.textAlign = 'center'
      const loopCount = Math.ceil(WINDOW_SECS / duration) + 2
      for (const tap of tapsRef.current) {
        for (let loop = -loopCount; loop <= loopCount; loop++) {
          const dt = tap.position + loop * duration - curPos
          if (dt < -WINDOW_SECS || dt > WINDOW_SECS) continue
          const x = (dt / (WINDOW_SECS * 2) + 0.5) * W
          ctx2d.fillText(tap.char, x, H * 0.32)
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [buffer])

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg bg-amber-50 border border-amber-100"
      style={{ height: HEIGHT, display: 'block' }}
    />
  )
}
