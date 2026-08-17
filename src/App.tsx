import { useEffect } from 'react'
import { StatusBar } from './components/StatusBar'
import { MainVideo } from './components/MainVideo'
import { PipWindows } from './components/PipWindows'
import { TargetPanel } from './components/TargetPanel'
import { ControlPanel } from './components/ControlPanel'
import { SafetyStrip } from './components/SafetyStrip'
import { CalibrationWizard } from './components/CalibrationWizard'
import { BiteScreen } from './components/BiteScreen'
import { useHmiStore } from './store/useHmiStore'

export default function App() {
  const { screen, target, tickCoast } = useHmiStore()

  useEffect(() => {
    if (target?.trackState !== 'COAST') return
    const id = setInterval(() => tickCoast(), 1000)
    return () => clearInterval(id)
  }, [target?.trackState, tickCoast])

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0D1117] text-[#E6EDF3] overflow-hidden">
      <StatusBar />

      <div className="flex-1 flex gap-3 p-3 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <MainVideo />
        </div>

        <div className="flex flex-col gap-3 w-56 shrink-0 overflow-y-auto">
          <PipWindows />
          <TargetPanel />
          <ControlPanel />
        </div>
      </div>

      <SafetyStrip />

      {screen === 'CALIBRATION' && <CalibrationWizard />}
      {screen === 'BITE' && <BiteScreen />}
    </div>
  )
}
