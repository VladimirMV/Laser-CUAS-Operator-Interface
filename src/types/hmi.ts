export type LaserStatus = 'SAFE' | 'ARMED' | 'FIRING'
export type TrackState = 'SEARCH' | 'TRACKING' | 'COAST' | 'LOST'
export type OperationMode = 'MANUAL' | 'SEMI' | 'AUTO'
export type CameraChannel = 'LONG' | 'WIDE' | 'IR'
export type AppScreen = 'COMBAT' | 'CALIBRATION' | 'BITE' | 'MAINTENANCE'
export type SystemStatus = 'OK' | 'DEGRADED' | 'FAULT'
export type CalibrationStatus = 'VALID' | 'CHECK_REQUIRED' | 'EXPIRED'

/** Parallax model: Δu = a + c/R , Δv = d + e/R  (R in meters, result in mrad) */
export interface ParallaxCoeffs {
  a: number // fixed offset X [mrad]
  c: number // parallax term X [mrad·m]
  d: number // fixed offset Y [mrad]
  e: number // parallax term Y [mrad·m]
  r0: number // convergence distance [m]
}

export interface TargetData {
  range: number
  azimuth: number
  elevation: number
  omegaAz: number
  omegaEl: number
  classification: string
  trackQuality: number
  trackState: TrackState
  coastTimer: number
  posX: number // % of video frame
  posY: number
}

export interface TelemetryExtras {
  tempLaser: number
  tempBoard: number
  pulseCount: number
}

export interface CalMeasurement {
  range: number
  du: number // measured offset X [mrad]
  dv: number // measured offset Y [mrad]
}

export interface HmiState {
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
}
