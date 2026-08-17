import { useHmiStore } from '../store/useHmiStore'
import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'
import type { CameraChannel } from '../types/hmi'

const CHANNELS: { id: CameraChannel; bg: string }[] = [
  { id: 'LONG', bg: 'from-[#0D1117] via-[#12181F] to-[#0A0E14]' },
  { id: 'WIDE', bg: 'from-[#0a1520] via-[#0d1a28] to-[#061018]' },
  { id: 'IR', bg: 'from-[#1a0a0a] via-[#2a1510] to-[#0d0505]' },
]

export function PipWindows() {
  const { activeCamera, setActiveCamera } = useHmiStore()
  const { t } = useT()

  const label = (id: CameraChannel) =>
    id === 'LONG' ? t('long') : id === 'WIDE' ? t('wide') : t('ir')

  const pips = CHANNELS.filter((c) => c.id !== activeCamera)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[10px] text-[#8B949E] font-mono tracking-wider px-0.5">
        {t('camera')}: <span className="text-[#3FB950]">{label(activeCamera)}</span> ({t('main')})
      </div>
      <div className="flex gap-1.5">
        {pips.map((p) => (
          <button
            key={p.id}
            onClick={() => setActiveCamera(p.id)}
            className="relative h-[6.5rem] flex-1 rounded border overflow-hidden transition-all border-[#30363D] hover:border-[#3FB950] hover:ring-1 hover:ring-[#3FB950]/30"
            title={`${label(p.id)} → ${t('main')}`}
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br', p.bg)} />
            <div className="absolute bottom-1 left-1.5 text-[10px] font-mono tracking-wider text-white/80 bg-black/55 px-1.5 py-0.5 rounded">
              {label(p.id)}
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCamera(c.id)}
            className={cn(
              'flex-1 py-1 text-[10px] font-mono font-semibold rounded border transition-colors',
              activeCamera === c.id
                ? 'border-[#3FB950] text-[#3FB950] bg-[#3FB950]/10'
                : 'border-[#30363D] text-[#8B949E] hover:border-[#8B949E]'
            )}
          >
            {label(c.id)}
          </button>
        ))}
      </div>
    </div>
  )
}
