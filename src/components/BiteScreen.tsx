import { useHmiStore } from '../store/useHmiStore'
import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'
import type { TranslationKey } from '../i18n/translations'
import { Activity } from 'lucide-react'

const LABEL_KEYS: Record<string, TranslationKey> = {
  laserModule: 'laserModule',
  longFocusCam: 'longFocusCam',
  wideCam: 'wideCam',
  irCam: 'irCam',
  gimbal: 'gimbal',
  rangeFinder: 'rangeFinder',
  powerSupply: 'powerSupply',
  cooling: 'cooling',
  calibStatus: 'calibStatus',
}

export function BiteScreen() {
  const { biteItems, biteRunning, runBite, closeBite, extras, calibrationStatus } = useHmiStore()
  const { t } = useT()

  const statusColor = (s: string) =>
    s === 'OK' ? 'text-[#3FB950]' : s === 'DEGRADED' ? 'text-[#D29922]' : 'text-[#F85149]'

  const statusBg = (s: string) =>
    s === 'OK' ? 'bg-[#3FB950]/15' : s === 'DEGRADED' ? 'bg-[#D29922]/15' : 'bg-[#F85149]/15'

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-6">
      <div className="bg-[#161B22] border border-[#30363D] rounded-lg w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#30363D] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-[#58A6FF]" />
            <div>
              <h2 className="text-base font-semibold">{t('biteTitle')}</h2>
              <p className="text-xs text-[#8B949E] mt-0.5">{t('biteSubtitle')}</p>
            </div>
          </div>
          <button onClick={closeBite} className="text-[#8B949E] hover:text-[#E6EDF3] text-sm font-mono px-2">
            ✕
          </button>
        </div>

        <div className="px-5 py-3 grid grid-cols-3 gap-2 text-xs font-mono border-b border-[#30363D]">
          <div className="bg-[#0D1117] rounded p-2 border border-[#30363D]">
            <div className="text-[#8B949E]">{t('tempLaser')}</div>
            <div className="text-[#E6EDF3] font-semibold mt-0.5">{extras.tempLaser} °C</div>
          </div>
          <div className="bg-[#0D1117] rounded p-2 border border-[#30363D]">
            <div className="text-[#8B949E]">{t('tempBoard')}</div>
            <div className="text-[#E6EDF3] font-semibold mt-0.5">{extras.tempBoard} °C</div>
          </div>
          <div className="bg-[#0D1117] rounded p-2 border border-[#30363D]">
            <div className="text-[#8B949E]">{t('pulseCount')}</div>
            <div className="text-[#E6EDF3] font-semibold mt-0.5">{extras.pulseCount.toLocaleString()}</div>
          </div>
        </div>

        <div className="px-5 py-3">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-[#8B949E] border-b border-[#30363D]">
                <th className="py-2 text-left font-medium">{t('subsystem')}</th>
                <th className="py-2 text-left font-medium">{t('status')}</th>
                <th className="py-2 text-right font-medium">{t('value')}</th>
              </tr>
            </thead>
            <tbody>
              {biteItems.map((item) => (
                <tr key={item.id} className="border-b border-[#21262D]">
                  <td className="py-2 text-[#E6EDF3]">
                    {t(LABEL_KEYS[item.id] ?? 'subsystem')}
                  </td>
                  <td className="py-2">
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', statusBg(item.status), statusColor(item.status))}>
                      {item.status === 'OK' ? t('ok') : item.status === 'DEGRADED' ? t('degraded') : t('fault')}
                    </span>
                  </td>
                  <td className="py-2 text-right text-[#8B949E]">
                    {item.id === 'calibStatus'
                      ? calibrationStatus === 'VALID'
                        ? t('valid')
                        : t('check')
                      : item.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[#30363D] flex justify-between gap-2">
          <button
            onClick={closeBite}
            className="px-4 py-2 rounded border border-[#30363D] text-sm font-mono text-[#8B949E] hover:border-[#8B949E]"
          >
            {t('close')}
          </button>
          <button
            onClick={runBite}
            disabled={biteRunning}
            className={cn(
              'px-4 py-2 rounded border text-sm font-mono transition-colors',
              biteRunning
                ? 'border-[#30363D] text-[#8B949E] opacity-60'
                : 'border-[#58A6FF]/50 bg-[#58A6FF]/10 text-[#58A6FF] hover:bg-[#58A6FF]/20'
            )}
          >
            {biteRunning ? '…' : t('runBite')}
          </button>
        </div>
      </div>
    </div>
  )
}
