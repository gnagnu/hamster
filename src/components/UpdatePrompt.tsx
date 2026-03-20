import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-amber-800 text-white text-sm px-4 py-3 rounded-2xl shadow-lg">
      <span>Nouvelle version disponible</span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="bg-white text-amber-800 font-semibold px-3 py-1 rounded-full cursor-pointer"
      >
        Mettre à jour
      </button>
      <button onClick={() => setNeedRefresh(false)} className="opacity-60 hover:opacity-100 cursor-pointer">✕</button>
    </div>
  )
}
