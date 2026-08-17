export type LaserStatus = 'SAFE' | 'ARMED' | 'FIRING'
export type TrackState = 'SEARCH' | 'TRACKING' | 'COAST' | 'LOST'
export type OperationMode = 'MANUAL' | 'SEMI' | 'AUTO'
export type CameraChannel = 'LONG' | 'WIDE' | 'IR'
export type AppScreen = 'COMBAT' | 'CALIBRATION' | 'BITE' | 'MAINTENANCE'
export type SystemStatus = 'OK' | 'DEGRADED' | 'FAULT'
export type CalibrationStatus = 'VALID' | 'CHECK_REQUIRED' | 'EXPIRED'
export type Lang = 'en' | 'ua'

export interface ParallaxCoeffs {
  a: number
  c: number
  d: number
  e: number
  r0: number
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
  posX: number
  posY: number
}

export interface TelemetryExtras {
  tempLaser: number
  tempBoard: number
  pulseCount: number
}

export interface CalMeasurement {
  range: number
  du: number
  dv: number
}

export interface BiteItem {
  id: string
  status: 'OK' | 'DEGRADED' | 'FAULT'
  value: string
}
