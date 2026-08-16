import { useHmiStore } from '../store/useHmiStore'
import { cn } from '../lib/utils'

export function PipWindows() {
  const { activeCamera, setActiveCamera } = useHmiStore()

  const pipes = [
    { id: 'WIDE' as const, label: 'WIDE', bg: 'from-[#0a1520] via-[#0d1a28] to-[#061018]' },
    { id: 'IR' as const, label: 'IR', bg: 'from-[#1a0a0a] via-[#2a1510] to-[#0d0505]' },
  ]

  return (
    <div className="flex gap-1.5">
      {pipes.map((p) => (
        <button
          key={p.id}
          onClick={() => setActiveCamera(p.id)}
          className={cn(
            'relative h-[7.5rem] flex-1 rounded border overflow-hidden transition-all',
            activeCamera === p.id
              ? 'border-[#3FB950] ring-1 ring-[#3FB950]/40'
              : 'border-[#30363D] hover:border-[#8B949E]'
          )}
        >
          <div className={cn('absolute inset-0 bg-gradient-to-br', p.bg)} />
          <div className="absolute bottom-1 left-1.5 text-[10px] font-mono tracking-wider text-white/70 bg-black/50 px-1.5 py-0.5 rounded">
            {p.label}
          </div>
        </button>
      ))}
    </div>
  )
}
