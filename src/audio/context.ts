let sharedContext: AudioContext | null = null

export function getAudioContext(): AudioContext {
  if (!sharedContext) sharedContext = new AudioContext()
  return sharedContext
}
