import { AlertTriangle } from 'lucide-react'
import { useHmiStore } from '../store/useHmiStore'
import { cn } from '../lib/utils'

export function SafetyStrip() {
  const { laserStatus, target, calibrationStatus } = useHmiStore()

  const messages: string[] = []
  if (laserStatus === 'ARMED') messages.push('LASER ARMED — CONFIRM TARGET')
  if (laserStatus === 'FIRING') messages.push('LASER FIRING')
  if (target?.trackState === 'COAST') messages.push(`TRACK LOST — COASTING ${target.coastTimer}s`)
  if (target?.trackState === 'LOST') messages.push('TRACK LOST — LASER INHIBITED')
  if (calibrationStatus !== 'VALID') messages.push('CALIBRATION CHECK REQUIRED')

  if (messages.length === 0) {
    return (
      <div className="h-8 flex items-center px-4 bg-[#161B22] border-t border-[#30363D] text-[11px] font-mono text-[#3FB950] shrink-0">
        SYSTEM READY
      </div>
    )
  }

  const isDanger =
    laserStatus === 'FIRING' ||
    target?.trackState === 'COAST' ||
    target?.trackState === 'LOST'

  return (
    <div
      className={cn(
        'h-8 flex items-center gap-2 px-4 border-t font-mono text-[11px] font-semibold tracking-wide shrink-0',
        isDanger
          ? 'bg-[#F85149]/15 border-[#F85149]/40 text-[#F85149]'
          : 'bg-[#D29922]/10 border-[#D29922]/30 text-[#D29922]'
      )}
    >
      <AlertTriangle size={14} />
      {messages.join('  ·  ')}
    </div>
  )
}
