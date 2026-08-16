import { create } from 'zustand'
import type {
  LaserStatus,
  OperationMode,
  CameraChannel,
  AppScreen,
  SystemStatus,
  CalibrationStatus,
  TargetData,
  ParallaxCoeffs,
  TelemetryExtras,
  CalMeasurement,
} from '../types/hmi'
import { fitParallax } from '../lib/utils'

interface HmiStore {
  systemStatus: SystemStatus
  laserStatus: LaserStatus
  calibrationStatus: CalibrationStatus
  mode: OperationMode
  activeCamera: CameraChannel
  zoom: number
  screen: AppScreen
  target: TargetData | null
  parallax: ParallaxCoeffs
  extras: TelemetryExtras
  calStep: number
  calMeasurements: CalMeasurement[]
  armConfirm: boolean

  setLaserStatus: (s: LaserStatus) => void
  setMode: (m: OperationMode) => void
  setActiveCamera: (c: CameraChannel) => void
  setZoom: (z: number) => void
  setScreen: (s: AppScreen) => void
  setArmConfirm: (v: boolean) => void

  arm: () => void
  confirmArm: () => void
  safe: () => void
  fireStart: () => void
  fireEnd: () => void

  loseTrack: () => void
  reacquire: () => void
  tickCoast: () => void

  openCalibration: () => void
  nextCalStep: () => void
  prevCalStep: () => void
  addCalMeasurement: (m: CalMeasurement) => void
  finishCalibration: () => void
  cancelCalibration: () => void
}

const initialTarget: TargetData = {
  range: 1847,
  azimuth: 127.4,
  elevation: 8.2,
  omegaAz: 0.35,
  omegaEl: -0.12,
  classification: 'FPV DRONE',
  trackQuality: 94,
  trackState: 'TRACKING',
  coastTimer: 0,
  posX: 52,
  posY: 44,
}

/** Default coeffs: convergence ~2000 m, small residual offsets */
const defaultParallax: ParallaxCoeffs = {
  a: -0.40,
  c: 800,
  d: 0.15,
  e: -300,
  r0: 2000,
}

export const useHmiStore = create<HmiStore>((set, get) => ({
  systemStatus: 'OK',
  laserStatus: 'SAFE',
  calibrationStatus: 'VALID',
  mode: 'MANUAL',
  activeCamera: 'LONG',
  zoom: 4.2,
  screen: 'COMBAT',
  target: initialTarget,
  parallax: defaultParallax,
  extras: { tempLaser: 42, tempBoard: 38, pulseCount: 12847 },
  calStep: 0,
  calMeasurements: [],
  armConfirm: false,

  setLaserStatus: (s) => set({ laserStatus: s }),
  setMode: (m) => set({ mode: m }),
  setActiveCamera: (c) => set({ activeCamera: c }),
  setZoom: (z) => set({ zoom: z }),
  setScreen: (s) => set({ screen: s }),
  setArmConfirm: (v) => set({ armConfirm: v }),

  arm: () => {
    const { laserStatus, target } = get()
    if (laserStatus !== 'SAFE') return
    if (!target || target.trackState !== 'TRACKING') return
    set({ armConfirm: true })
  },

  confirmArm: () => {
    const { target } = get()
    if (!target || target.trackState !== 'TRACKING') {
      set({ armConfirm: false })
      return
    }
    set({ laserStatus: 'ARMED', armConfirm: false })
  },

  safe: () => set({ laserStatus: 'SAFE', armConfirm: false }),

  fireStart: () => {
    if (get().laserStatus === 'ARMED') set({ laserStatus: 'FIRING' })
  },

  fireEnd: () => {
    if (get().laserStatus === 'FIRING') set({ laserStatus: 'ARMED' })
  },

  loseTrack: () => {
    const t = get().target
    if (!t || t.trackState === 'LOST' || t.trackState === 'SEARCH') return
    set({
      laserStatus: 'SAFE',
      armConfirm: false,
      target: {
        ...t,
        trackState: 'COAST',
        trackQuality: 18,
        coastTimer: 8,
      },
    })
  },

  reacquire: () => {
    set({
      target: { ...initialTarget, trackQuality: 88, trackState: 'TRACKING' },
    })
  },

  tickCoast: () => {
    const t = get().target
    if (!t || t.trackState !== 'COAST') return
    if (t.coastTimer <= 1) {
      set({ target: null })
    } else {
      set({
        target: { ...t, coastTimer: t.coastTimer - 1, trackQuality: Math.max(5, t.trackQuality - 8) },
      })
    }
  },

  openCalibration: () => {
    if (get().laserStatus !== 'SAFE') return
    set({ screen: 'CALIBRATION', calStep: 0, calMeasurements: [] })
  },

  nextCalStep: () => set((s) => ({ calStep: Math.min(s.calStep + 1, 5) })),
  prevCalStep: () => set((s) => ({ calStep: Math.max(s.calStep - 1, 0) })),

  addCalMeasurement: (m) =>
    set((s) => ({ calMeasurements: [...s.calMeasurements, m] })),

  finishCalibration: () => {
    const { calMeasurements } = get()
    const fit = fitParallax(calMeasurements)
    if (fit && fit.rms <= 0.25) {
      set({
        parallax: { a: fit.a, c: fit.c, d: fit.d, e: fit.e, r0: fit.r0 },
        calibrationStatus: 'VALID',
        screen: 'COMBAT',
        calStep: 0,
      })
    } else if (fit) {
      set({
        parallax: { a: fit.a, c: fit.c, d: fit.d, e: fit.e, r0: fit.r0 },
        calibrationStatus: 'CHECK_REQUIRED',
        screen: 'COMBAT',
        calStep: 0,
      })
    } else {
      set({ screen: 'COMBAT', calStep: 0 })
    }
  },

  cancelCalibration: () => set({ screen: 'COMBAT', calStep: 0, calMeasurements: [] }),
}))
