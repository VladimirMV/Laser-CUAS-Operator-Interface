import { useState, useEffect, useRef } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────
type LaserState = 'SAFE' | 'ARMED' | 'FIRING'
type TrackState = 'SEARCH' | 'TRACKING' | 'COAST' | 'LOST'
type OpMode = 'MANUAL' | 'SEMI' | 'AUTO'
type CamType = 'LONG' | 'WIDE' | 'IR'
type AppScreen = 'COMBAT' | 'CALIBRATION' | 'BITE' | 'MAINTENANCE'

interface Telemetry {
  range: number
  az: number
  el: number
  omega: number
  targetClass: string
  trackQuality: number
  tempLaser: number
  tempBoard: number
  pulseCount: number
  time: Date
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: '#0D1117',
  panel: '#161B22',
  panel2: '#1C2128',
  border: '#30363D',
  border2: '#21262D',
  text: '#E6EDF3',
  dim: '#8B949E',
  safe: '#3FB950',
  armed: '#D29922',
  danger: '#F85149',
  reticle: '#FFA657',
  accent: '#58A6FF',
  fired: '#FF7B72',
}

const mono = "'Roboto Mono', monospace"

// ── Helpers ───────────────────────────────────────────────────────────────────
function px(n: number) { return `${n}px` }
function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)) }

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<AppScreen>('COMBAT')
  const [laser, setLaser] = useState<LaserState>('SAFE')
  const [track, setTrack] = useState<TrackState>('TRACKING')
  const [mode, setMode] = useState<OpMode>('MANUAL')
  const [cam, setCam] = useState<CamType>('LONG')
  const [zoom, setZoom] = useState(4)
  const [coastTimer, setCoastTimer] = useState(0)
  const [firingMs, setFiringMs] = useState(0)
  const [blink, setBlink] = useState(false)
  const [calStep, setCalStep] = useState(0)
  const [armConfirm, setArmConfirm] = useState(false)
  const [autoConfirmPending, setAutoConfirmPending] = useState(false)

  const [telem, setTelem] = useState<Telemetry>({
    range: 1847,
    az: 127.4, el: 8.2, omega: 3.7,
    targetClass: 'FPV DRONE',
    trackQuality: 94,
    tempLaser: 42, tempBoard: 38, pulseCount: 12847,
    time: new Date(),
  })

  const [targetPos, setTargetPos] = useState({ x: 52, y: 44 })
  const firingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 500 ms blink tick
  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 500)
    return () => clearInterval(id)
  }, [])

  // Target drift
  useEffect(() => {
    if (track === 'SEARCH' || track === 'LOST') return
    const id = setInterval(() => {
      setTargetPos(p => ({
        x: clamp(p.x + (Math.random() - 0.5) * 0.25, 20, 80),
        y: clamp(p.y + (Math.random() - 0.5) * 0.15, 20, 75),
      }))
    }, 80)
    return () => clearInterval(id)
  }, [track])

  // Telemetry churn
  useEffect(() => {
    const id = setInterval(() => {
      setTelem(t => ({
        ...t,
        range: Math.round(clamp(t.range + (Math.random() - 0.5) * 8, 200, 5000)),
        az: parseFloat((t.az + (Math.random() - 0.5) * 0.04).toFixed(1)),
        el: parseFloat((t.el + (Math.random() - 0.5) * 0.02).toFixed(1)),
        omega: parseFloat(clamp(t.omega + (Math.random() - 0.5) * 0.12, 0, 25).toFixed(1)),
        trackQuality: clamp(t.trackQuality + Math.round((Math.random() - 0.48) * 2), 0, 99),
        time: new Date(),
      }))
    }, 250)
    return () => clearInterval(id)
  }, [])

  // Coasting countdown → LOST
  useEffect(() => {
    if (track !== 'COAST') { setCoastTimer(0); return }
    const id = setInterval(() => {
      setCoastTimer(t => {
        if (t >= 10) { setTrack('LOST'); setLaser('SAFE'); return 0 }
        return t + 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [track])

  // Firing timer
  useEffect(() => {
    if (laser === 'FIRING') {
      setFiringMs(0)
      firingRef.current = setInterval(() => setFiringMs(t => t + 100), 100)
    } else {
      if (firingRef.current) clearInterval(firingRef.current)
      setFiringMs(0)
    }
    return () => { if (firingRef.current) clearInterval(firingRef.current) }
  }, [laser])

  // Auto-mode: propose fire when tracking
  useEffect(() => {
    if (mode === 'AUTO' && track === 'TRACKING' && laser === 'SAFE') {
      const id = setTimeout(() => setAutoConfirmPending(true), 3000)
      return () => clearTimeout(id)
    } else {
      setAutoConfirmPending(false)
    }
  }, [mode, track, laser])

  // Parallax offset (baseline at 2000 m)
  const parallax = { x: (2000 / telem.range) * 3.8, y: (2000 / telem.range) * 1.4 }
  const laserPos = { x: targetPos.x + parallax.x * 0.45, y: targetPos.y - parallax.y * 0.45 }

  const laserColor = laser === 'SAFE' ? C.safe : laser === 'ARMED' ? C.armed : C.danger
  const trackColor =
    track === 'LOST' ? C.danger :
    track === 'COAST' ? C.armed :
    telem.trackQuality > 75 ? C.safe : C.armed

  if (screen === 'CALIBRATION') {
    return <CalWizard step={calStep} setStep={setCalStep} onExit={() => { setCalStep(0); setScreen('COMBAT') }} />
  }
  if (screen === 'BITE') {
    return <BITEScreen telem={telem} onExit={() => setScreen('COMBAT')} />
  }
  if (screen === 'MAINTENANCE') {
    return <MaintScreen telem={telem} onExit={() => setScreen('COMBAT')} />
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── STATUS BAR ─────────────────────────────────────────────────── */}
      <div style={{
        height: 42, background: C.panel, borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 24, flexShrink: 0,
      }}>
        <span style={{ fontFamily: mono, fontSize: 11, color: C.accent, letterSpacing: 2, fontWeight: 700 }}>
          CLT C-UAS
        </span>
        <div style={{ width: 1, height: 20, background: C.border }} />
        <StatusChip label="SYS" value="ONLINE" color={C.safe} />
        <StatusChip label="CAL" value="VALID" color={C.safe} />
        <StatusChip label="SAFETY" value={laser} color={laserColor} blink={laser === 'FIRING' && blink} />
        <StatusChip label="TRACK" value={track} color={trackColor} blink={track === 'COAST' && blink} />
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setScreen('CALIBRATION')}
          style={navBtn}
        >CAL</button>
        <button
          onClick={() => setScreen('BITE')}
          style={navBtn}
        >BITE</button>
        <button
          onClick={() => setScreen('MAINTENANCE')}
          style={navBtn}
        >MAINT</button>
        <div style={{ width: 1, height: 20, background: C.border }} />
        <span style={{ fontFamily: mono, fontSize: 11, color: C.dim }}>
          {telem.time.toLocaleTimeString('uk-UA', { hour12: false })} UTC+3
        </span>
        <span style={{ fontFamily: mono, fontSize: 11, color: C.dim }}>v1.0</span>
      </div>

      {/* ── MAIN AREA ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: 1, background: C.border }}>

        {/* ── VIDEO FEED ───────────────────────────────────────────────── */}
        <div style={{ flex: '1 1 0', position: 'relative', overflow: 'hidden', background: '#040a04' }}>
          <VideoFeed
            cam={cam}
            track={track}
            targetPos={targetPos}
            laserPos={laserPos}
            laser={laser}
            trackColor={trackColor}
            blink={blink}
            zoom={zoom}
            firingMs={firingMs}
          />

          {/* Mode badge */}
          <div style={{
            position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
            padding: '3px 18px', background: 'rgba(0,0,0,0.6)',
            border: `1px solid ${mode === 'AUTO' ? C.danger : mode === 'SEMI' ? C.armed : C.border}`,
            fontFamily: mono, fontSize: 12, letterSpacing: 3, fontWeight: 700,
            color: mode === 'AUTO' ? C.danger : mode === 'SEMI' ? C.armed : C.dim,
          }}>
            {mode}
          </div>

          {/* Corner HUD labels */}
          <div style={{ position: 'absolute', bottom: 14, left: 14, fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 1 }}>
            {cam === 'IR' ? 'LWIR' : 'EO'} {cam} ×{cam === 'WIDE' ? 1 : zoom} | FOV {cam === 'WIDE' ? '45.0' : (45 / zoom).toFixed(1)}°
          </div>
          <div style={{ position: 'absolute', bottom: 14, right: 14, fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 1 }}>
            AZ {telem.az.toFixed(1)}° / EL {telem.el.toFixed(1)}°
          </div>

          {/* TRACK LOST overlay */}
          {(track === 'COAST' || track === 'LOST') && (
            <div style={{
              position: 'absolute', inset: 0,
              border: `3px solid ${track === 'LOST' ? C.danger : C.armed}`,
              pointerEvents: 'none',
              animation: track === 'LOST' ? 'blink-red 0.5s ease-in-out infinite' : undefined,
            }}>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}>
                <div style={{
                  background: track === 'LOST' ? 'rgba(248,81,73,0.25)' : 'rgba(210,153,34,0.2)',
                  border: `2px solid ${track === 'LOST' ? C.danger : C.armed}`,
                  padding: '12px 32px',
                }}>
                  <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: track === 'LOST' ? C.danger : C.armed, letterSpacing: 4 }}>
                    {track === 'LOST' ? 'TRACK LOST' : 'COASTING'}
                  </div>
                  {track === 'COAST' && (
                    <div style={{ fontFamily: mono, fontSize: 14, color: C.armed, marginTop: 6 }}>
                      TIMEOUT {10 - coastTimer}s — SEARCHING…
                    </div>
                  )}
                  {track === 'LOST' && (
                    <div style={{ fontFamily: mono, fontSize: 12, color: C.dim, marginTop: 6 }}>
                      LASER INHIBITED — REACQUIRE TARGET
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AUTO confirm dialog */}
          {autoConfirmPending && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              background: C.panel2, border: `2px solid ${C.armed}`,
              padding: '20px 32px', textAlign: 'center', minWidth: 320,
            }}>
              <div style={{ fontFamily: mono, fontSize: 13, color: C.armed, letterSpacing: 2, marginBottom: 12 }}>
                AUTO-ENGAGE PROPOSED
              </div>
              <div style={{ color: C.dim, fontSize: 12, marginBottom: 16 }}>
                Target: {telem.targetClass} at {telem.range} m<br />
                Track quality: {telem.trackQuality}%
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setAutoConfirmPending(false); setLaser('ARMED') }} style={confirmBtn('#3FB950', 'rgba(63,185,80,0.15)')}>
                  APPROVE ARMED
                </button>
                <button onClick={() => { setAutoConfirmPending(false); setMode('MANUAL') }} style={confirmBtn('#F85149', 'rgba(248,81,73,0.1)')}>
                  OVERRIDE / MANUAL
                </button>
              </div>
            </div>
          )}

          {/* Firing flash overlay */}
          {laser === 'FIRING' && blink && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              border: `4px solid ${C.danger}`,
              boxShadow: `inset 0 0 60px rgba(248,81,73,0.2)`,
            }} />
          )}
        </div>

        {/* ── RIGHT SIDEBAR ───────────────────────────────────────────── */}
        <div style={{ width: 336, display: 'flex', flexDirection: 'column', gap: 1, background: C.border, flexShrink: 0 }}>

          {/* PIP Windows */}
          <div style={{ display: 'flex', gap: 1, height: 130 }}>
            <PIPWindow label="WIDE" type="wide" active={cam === 'WIDE'} onClick={() => setCam('WIDE')} />
            <PIPWindow label="IR" type="ir" active={cam === 'IR'} onClick={() => setCam('IR')} />
          </div>

          {/* Target Data */}
          <div style={panelStyle}>
            <PanelHeader>TARGET DATA</PanelHeader>
            <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
              <DataRow label="RANGE" value={`${telem.range} m`} hi />
              <DataRow label="CLASS" value={telem.targetClass} />
              <DataRow label="AZ" value={`${telem.az.toFixed(1)}°`} />
              <DataRow label="EL" value={`${telem.el.toFixed(1)}°`} />
              <DataRow label="ω" value={`${telem.omega.toFixed(1)} °/s`} />
              <DataRow label="TRK Q" value={`${telem.trackQuality}%`} color={telem.trackQuality > 75 ? C.safe : C.armed} />
            </div>
            <div style={{ margin: '0 12px 10px', background: C.panel2, height: 6, borderRadius: 3 }}>
              <div style={{
                height: 6, borderRadius: 3, width: `${telem.trackQuality}%`,
                background: telem.trackQuality > 75 ? C.safe : C.armed,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {/* Laser Status */}
          <div style={{ ...panelStyle, background: laser === 'SAFE' ? 'rgba(63,185,80,0.07)' : laser === 'ARMED' ? 'rgba(210,153,34,0.1)' : 'rgba(248,81,73,0.12)' }}>
            <PanelHeader>LASER STATUS</PanelHeader>
            <div style={{ padding: '10px 12px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: laserColor,
                  boxShadow: `0 0 8px ${laserColor}`,
                  animation: laser === 'FIRING' ? 'blink-red 0.4s infinite' : laser === 'ARMED' ? 'blink-amber 1s infinite' : undefined,
                  flexShrink: 0,
                }} />
                <span style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: laserColor, letterSpacing: 3 }}>
                  {laser}
                </span>
              </div>
              {laser === 'FIRING' && (
                <div style={{ fontFamily: mono, fontSize: 11, color: C.danger, letterSpacing: 1 }}>
                  BURST {(firingMs / 1000).toFixed(1)}s &nbsp;|&nbsp; E: {Math.round(firingMs * 0.08)} J
                </div>
              )}
              {laser === 'ARMED' && (
                <div style={{ fontFamily: mono, fontSize: 11, color: C.armed, letterSpacing: 1 }}>
                  READY TO FIRE — TRIGGER LIVE
                </div>
              )}
              {laser === 'SAFE' && (
                <div style={{ fontFamily: mono, fontSize: 11, color: C.dim, letterSpacing: 1 }}>
                  INTERLOCKED — ALL SAFE
                </div>
              )}
            </div>
          </div>

          {/* Mode Select */}
          <div style={panelStyle}>
            <PanelHeader>ENGAGE MODE</PanelHeader>
            <div style={{ padding: '8px 12px', display: 'flex', gap: 6 }}>
              {(['MANUAL', 'SEMI', 'AUTO'] as OpMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setAutoConfirmPending(false) }}
                  style={{
                    flex: 1, padding: '8px 4px',
                    fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: 2,
                    background: mode === m ? (m === 'AUTO' ? 'rgba(248,81,73,0.2)' : m === 'SEMI' ? 'rgba(210,153,34,0.2)' : 'rgba(88,166,255,0.15)') : C.panel2,
                    border: `1px solid ${mode === m ? (m === 'AUTO' ? C.danger : m === 'SEMI' ? C.armed : C.accent) : C.border2}`,
                    color: mode === m ? (m === 'AUTO' ? C.danger : m === 'SEMI' ? C.armed : C.accent) : C.dim,
                    cursor: 'pointer',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Camera & Zoom */}
          <div style={panelStyle}>
            <PanelHeader>CAMERA / ZOOM</PanelHeader>
            <div style={{ padding: '8px 12px', display: 'flex', gap: 6, marginBottom: 8 }}>
              {(['LONG', 'WIDE', 'IR'] as CamType[]).map(c => (
                <button
                  key={c}
                  onClick={() => setCam(c)}
                  style={{
                    flex: 1, padding: '7px 4px',
                    fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: 1,
                    background: cam === c ? 'rgba(88,166,255,0.15)' : C.panel2,
                    border: `1px solid ${cam === c ? C.accent : C.border2}`,
                    color: cam === c ? C.accent : C.dim,
                    cursor: 'pointer',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            <div style={{ padding: '0 12px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: mono, fontSize: 10, color: C.dim, minWidth: 30 }}>ZOOM</span>
              <input
                type="range" min={1} max={20} value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ flex: 1, accentColor: C.accent }}
              />
              <span style={{ fontFamily: mono, fontSize: 12, color: C.text, minWidth: 28, textAlign: 'right' }}>×{zoom}</span>
            </div>
          </div>

          {/* Laser Controls */}
          <div style={{ ...panelStyle, flex: 1 }}>
            <PanelHeader>LASER CONTROL</PanelHeader>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* SAFE button */}
              <button
                onClick={() => { setLaser('SAFE'); setArmConfirm(false) }}
                style={{
                  padding: '10px', fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: 3,
                  background: laser === 'SAFE' ? 'rgba(63,185,80,0.2)' : C.panel2,
                  border: `2px solid ${laser === 'SAFE' ? C.safe : C.border2}`,
                  color: laser === 'SAFE' ? C.safe : C.dim, cursor: 'pointer',
                }}
              >
                SAFE
              </button>

              {/* ARM button — 2-step confirm */}
              {!armConfirm ? (
                <button
                  onClick={() => { if (track !== 'LOST' && track !== 'SEARCH') setArmConfirm(true) }}
                  disabled={track === 'LOST' || track === 'SEARCH'}
                  style={{
                    padding: '10px', fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: 3,
                    background: laser === 'ARMED' ? 'rgba(210,153,34,0.2)' : C.panel2,
                    border: `2px solid ${laser === 'ARMED' ? C.armed : C.border2}`,
                    color: track === 'LOST' || track === 'SEARCH' ? C.border : laser === 'ARMED' ? C.armed : C.dim,
                    cursor: track === 'LOST' || track === 'SEARCH' ? 'not-allowed' : 'pointer',
                  }}
                >
                  ARM
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontFamily: mono, fontSize: 10, color: C.armed, textAlign: 'center', letterSpacing: 1 }}>
                    CONFIRM ARM?
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => { setLaser('ARMED'); setArmConfirm(false) }}
                      style={{
                        flex: 1, padding: '8px', fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: 2,
                        background: 'rgba(210,153,34,0.25)', border: `2px solid ${C.armed}`, color: C.armed, cursor: 'pointer',
                      }}
                    >
                      CONFIRM
                    </button>
                    <button
                      onClick={() => setArmConfirm(false)}
                      style={{
                        flex: 1, padding: '8px', fontFamily: mono, fontSize: 11, fontWeight: 700,
                        background: C.panel2, border: `1px solid ${C.border}`, color: C.dim, cursor: 'pointer',
                      }}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {/* FIRE button */}
              <button
                onMouseDown={() => { if (laser === 'ARMED') setLaser('FIRING') }}
                onMouseUp={() => { if (laser === 'FIRING') setLaser('ARMED') }}
                onMouseLeave={() => { if (laser === 'FIRING') setLaser('ARMED') }}
                disabled={laser !== 'ARMED'}
                style={{
                  padding: '14px', fontFamily: mono, fontSize: 14, fontWeight: 700, letterSpacing: 4,
                  background: laser === 'ARMED' ? 'rgba(248,81,73,0.25)' : C.panel2,
                  border: `2px solid ${laser === 'ARMED' ? C.danger : C.border2}`,
                  color: laser === 'ARMED' ? C.danger : C.border,
                  cursor: laser === 'ARMED' ? 'pointer' : 'not-allowed',
                  animation: laser === 'FIRING' ? 'blink-red 0.4s infinite' : undefined,
                }}
              >
                {laser === 'FIRING' ? '■ FIRING ■' : 'FIRE'}
              </button>

              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button
                  onClick={() => { if (track !== 'LOST') setTrack('COAST') }}
                  style={smallBtn}
                >
                  SIM COAST
                </button>
                <button
                  onClick={() => setTrack('TRACKING')}
                  style={smallBtn}
                >
                  REACQUIRE
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── SAFETY STRIP ─────────────────────────────────────────────── */}
      <div style={{
        height: 36, flexShrink: 0,
        background: laser === 'FIRING' ? (blink ? 'rgba(248,81,73,0.35)' : 'rgba(248,81,73,0.15)') :
          laser === 'ARMED' ? 'rgba(210,153,34,0.15)' : C.panel2,
        borderTop: `1px solid ${laser === 'FIRING' ? C.danger : laser === 'ARMED' ? C.armed : C.border}`,
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: laserColor, boxShadow: `0 0 6px ${laserColor}` }} />
          <span style={{ fontFamily: mono, fontSize: 11, color: laserColor, letterSpacing: 2, fontWeight: 700 }}>
            LASER {laser}
          </span>
        </div>
        <div style={{ width: 1, height: 16, background: C.border }} />
        {track !== 'TRACKING' && (
          <>
            <span style={{ fontFamily: mono, fontSize: 11, color: track === 'LOST' ? C.danger : C.armed, letterSpacing: 2 }}>
              ⚠ {track === 'COAST' ? `COASTING — TIMEOUT IN ${10 - coastTimer}s` : 'TRACK LOST — LASER INHIBITED'}
            </span>
            <div style={{ width: 1, height: 16, background: C.border }} />
          </>
        )}
        {mode !== 'MANUAL' && (
          <span style={{ fontFamily: mono, fontSize: 11, color: mode === 'AUTO' ? C.danger : C.armed, letterSpacing: 2 }}>
            ● {mode} MODE ACTIVE
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: mono, fontSize: 10, color: C.dim }}>
          PARALLAX ΔX {parallax.x.toFixed(1)} px / ΔY {parallax.y.toFixed(1)} px @ {telem.range} m
        </span>
        <span style={{ fontFamily: mono, fontSize: 10, color: C.dim }}>
          PULSE #{telem.pulseCount}
        </span>
      </div>
    </div>
  )
}

// ── Video Feed ────────────────────────────────────────────────────────────────
function VideoFeed({
  cam, track, targetPos, laserPos, laser, trackColor, blink, zoom, firingMs
}: {
  cam: CamType; track: TrackState; targetPos: { x: number; y: number };
  laserPos: { x: number; y: number }; laser: LaserState; trackColor: string;
  blink: boolean; zoom: number; firingMs: number;
}) {
  const irTint = cam === 'IR'
  const wideTint = cam === 'WIDE'

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: irTint
        ? 'radial-gradient(ellipse at 55% 40%, #1a2a18 0%, #080e08 100%)'
        : wideTint
        ? 'radial-gradient(ellipse at 50% 45%, #0d1a10 0%, #050c07 100%)'
        : 'radial-gradient(ellipse at 58% 38%, #162010 0%, #070d07 100%)',
      filter: irTint ? 'hue-rotate(80deg) saturate(0.6)' : undefined,
    }}>
      {/* Terrain horizon SVG */}
      <svg
        width="100%" height="100%"
        style={{ position: 'absolute', inset: 0, opacity: 0.5 }}
        preserveAspectRatio="none"
      >
        {/* Sky gradient */}
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={irTint ? '#1a3a1a' : '#0a1a0a'} />
            <stop offset="60%" stopColor={irTint ? '#0d200d' : '#070e07'} />
          </linearGradient>
          <linearGradient id="terrain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={irTint ? '#2a4a1a' : '#111a08'} />
            <stop offset="100%" stopColor={irTint ? '#152a0d' : '#0a100a'} />
          </linearGradient>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feBlend in="SourceGraphic" mode="multiply" />
          </filter>
        </defs>
        <rect width="100%" height="65%" fill="url(#sky)" />
        <rect y="65%" width="100%" height="35%" fill="url(#terrain)" />
        {/* Terrain edge */}
        <polyline
          points="0,65 8,63 18,66 28,62 40,64 55,61 68,65 78,62 90,66 100,63"
          fill="none"
          stroke={irTint ? 'rgba(80,160,60,0.3)' : 'rgba(40,80,30,0.4)'}
          strokeWidth="0.3"
          vectorEffect="non-scaling-stroke"
        />
        {/* Building silhouettes */}
        <rect x="15%" y="55%" width="3%" height="9%" fill={irTint ? 'rgba(60,120,50,0.2)' : 'rgba(20,40,15,0.3)'} />
        <rect x="20%" y="52%" width="2%" height="12%" fill={irTint ? 'rgba(50,100,40,0.2)' : 'rgba(20,40,15,0.25)'} />
        <rect x="75%" y="57%" width="4%" height="7%" fill={irTint ? 'rgba(60,120,50,0.2)' : 'rgba(20,40,15,0.3)'} />
      </svg>

      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)',
      }} />

      {/* Grid overlay (EOsensor graticule) */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.08 }}>
        {[25, 50, 75].map(p => (
          <g key={p}>
            <line x1={`${p}%`} y1="0" x2={`${p}%`} y2="100%" stroke="white" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1={`${p}%`} x2="100%" y2={`${p}%`} stroke="white" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>

      {/* Main SVG overlay: reticles, tracking gate */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {/* Target heat blob (IR) or optical signature */}
        {track !== 'SEARCH' && track !== 'LOST' && (
          <ellipse
            cx={targetPos.x} cy={targetPos.y}
            rx={irTint ? 0.9 : 0.5} ry={irTint ? 0.5 : 0.3}
            fill={irTint ? 'rgba(255,200,100,0.7)' : 'rgba(255,255,255,0.5)'}
          />
        )}

        {/* Tracking gate */}
        {(track === 'TRACKING' || track === 'COAST') && (
          <>
            <rect
              x={targetPos.x - 4.5} y={targetPos.y - 3.5}
              width={9} height={7}
              fill="none" stroke={trackColor} strokeWidth="0.3"
              strokeDasharray={track === 'COAST' ? '1 0.5' : 'none'}
              opacity={track === 'COAST' && blink ? 0.5 : 1}
            />
            {/* Corner brackets only */}
            {[[-4.5, -3.5], [4.5, -3.5], [-4.5, 3.5], [4.5, 3.5]].map(([cx, cy], i) => (
              <g key={i} transform={`translate(${targetPos.x + cx}, ${targetPos.y + cy})`}>
                <line x1={cx > 0 ? -1 : 0} y1={0} x2={cx > 0 ? 0 : 1} y2={0} stroke={trackColor} strokeWidth="0.5" />
                <line x1={0} y1={cy > 0 ? -0.8 : 0} x2={0} y2={cy > 0 ? 0 : 0.8} stroke={trackColor} strokeWidth="0.5" />
              </g>
            ))}
            {/* Lead point indicator */}
            <polygon
              points={`${targetPos.x - 0.6},${targetPos.y - 4.8} ${targetPos.x + 0.6},${targetPos.y - 4.8} ${targetPos.x},${targetPos.y - 4}`}
              fill={trackColor} opacity={0.8}
            />
          </>
        )}

        {/* Camera reticle — thin white cross at center */}
        <g opacity={0.7}>
          <line x1={50} y1={44} x2={50} y2={48} stroke="white" strokeWidth="0.25" />
          <line x1={50} y1={52} x2={50} y2={56} stroke="white" strokeWidth="0.25" />
          <line x1={44} y1={50} x2={48} y2={50} stroke="white" strokeWidth="0.25" />
          <line x1={52} y1={50} x2={56} y2={50} stroke="white" strokeWidth="0.25" />
          <circle cx={50} cy={50} r={1} fill="none" stroke="white" strokeWidth="0.2" />
          <circle cx={50} cy={50} r={0.2} fill="white" />
        </g>

        {/* Laser reticle — bright orange, offset by parallax, ONLY when ARMED or FIRING */}
        {(laser === 'ARMED' || laser === 'FIRING') && track !== 'LOST' && (
          <g opacity={laser === 'FIRING' && blink ? 0.4 : 1}>
            {/* Diagonal cross marks for visual distinction */}
            <line
              x1={laserPos.x - 2} y1={laserPos.y - 2}
              x2={laserPos.x + 2} y2={laserPos.y + 2}
              stroke={C.reticle} strokeWidth="0.45"
            />
            <line
              x1={laserPos.x + 2} y1={laserPos.y - 2}
              x2={laserPos.x - 2} y2={laserPos.y + 2}
              stroke={C.reticle} strokeWidth="0.45"
            />
            {/* Outer ring */}
            <circle
              cx={laserPos.x} cy={laserPos.y} r={2.2}
              fill="none" stroke={C.reticle} strokeWidth="0.35"
            />
            {/* Center dot */}
            <circle cx={laserPos.x} cy={laserPos.y} r={0.3} fill={C.reticle} />
            {/* Dashed line from camera to laser reticle showing parallax offset */}
            <line
              x1={50} y1={50} x2={laserPos.x} y2={laserPos.y}
              stroke={C.reticle} strokeWidth="0.2" strokeDasharray="0.8 0.5" opacity={0.4}
            />
            {/* FIRE beam effect */}
            {laser === 'FIRING' && !blink && (
              <line
                x1={laserPos.x} y1={laserPos.y}
                x2={targetPos.x} y2={targetPos.y}
                stroke={C.fired} strokeWidth="0.15" opacity={0.6}
              />
            )}
          </g>
        )}

        {/* Range ring at 1 mrad */}
        <circle cx={50} cy={50} r={8} fill="none" stroke="white" strokeWidth="0.15" strokeDasharray="0.5 1.5" opacity={0.15} />
        <circle cx={50} cy={50} r={16} fill="none" stroke="white" strokeWidth="0.15" strokeDasharray="0.5 1.5" opacity={0.1} />
      </svg>

      {/* Reticle legend bottom-left of video */}
      <div style={{
        position: 'absolute', top: 14, left: 14,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width={14} height={14}><circle cx={7} cy={7} r={3} fill="none" stroke="white" strokeWidth={1} opacity={0.7} /><line x1={7} y1={2} x2={7} y2={5} stroke="white" strokeWidth={1} opacity={0.7} /><line x1={7} y1={9} x2={7} y2={12} stroke="white" strokeWidth={1} opacity={0.7} /></svg>
          <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>CAM RETICLE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width={14} height={14}><line x1={2} y1={2} x2={12} y2={12} stroke={C.reticle} strokeWidth={1.5} /><line x1={12} y1={2} x2={2} y2={12} stroke={C.reticle} strokeWidth={1.5} /></svg>
          <span style={{ fontFamily: mono, fontSize: 9, color: C.reticle, letterSpacing: 1 }}>LASER RETICLE</span>
        </div>
      </div>
    </div>
  )
}

// ── PIP Window ────────────────────────────────────────────────────────────────
function PIPWindow({ label, type, active, onClick }: { label: string; type: 'wide' | 'ir'; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, cursor: 'pointer', position: 'relative', overflow: 'hidden',
        background: type === 'ir'
          ? 'radial-gradient(ellipse at 50% 40%, #162616 0%, #050e05 100%)'
          : 'radial-gradient(ellipse at 50% 45%, #0d180a 0%, #040a04 100%)',
        border: `2px solid ${active ? C.accent : 'transparent'}`,
        filter: type === 'ir' ? 'hue-rotate(70deg) saturate(0.5)' : undefined,
      }}
    >
      {/* Mini terrain */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
        <rect width="100%" height="60%" fill={type === 'ir' ? '#1a2e1a' : '#0d1a0a'} />
        <rect y="60%" width="100%" height="40%" fill={type === 'ir' ? '#0d1e0a' : '#080e08'} />
        <polyline points="0,60 15,55 35,62 60,56 80,60 100,57"
          fill="none" stroke={type === 'ir' ? 'rgba(100,200,80,0.3)' : 'rgba(60,100,40,0.4)'} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* Mini scan target blob */}
      <div style={{
        position: 'absolute', top: '38%', left: '55%',
        width: 4, height: 3,
        background: type === 'ir' ? 'rgba(255,200,80,0.8)' : 'rgba(255,255,255,0.4)',
        borderRadius: '50%',
      }} />
      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)',
      }} />
      <div style={{
        position: 'absolute', bottom: 4, left: 6,
        fontFamily: mono, fontSize: 9, color: active ? C.accent : 'rgba(255,255,255,0.4)',
        letterSpacing: 1,
      }}>
        {type === 'ir' ? 'LWIR' : 'EO WA'} {label}
      </div>
      {active && (
        <div style={{
          position: 'absolute', top: 4, right: 6,
          fontFamily: mono, fontSize: 8, color: C.accent, letterSpacing: 1,
        }}>
          MAIN
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatusChip({ label, value, color, blink }: { label: string; value: string; color: string; blink?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: blink === false ? 1 : 1 }}>
      <span style={{ fontFamily: mono, fontSize: 9, color: C.dim, letterSpacing: 1 }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color, letterSpacing: 1, opacity: blink ? 0.4 : 1 }}>
        {value}
      </span>
    </div>
  )
}

function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '6px 12px',
      borderBottom: `1px solid ${C.border2}`,
      fontFamily: mono, fontSize: 9, fontWeight: 700,
      color: C.dim, letterSpacing: 2,
    }}>
      {children}
    </div>
  )
}

function DataRow({ label, value, hi, color }: { label: string; value: string; hi?: boolean; color?: string }) {
  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 9, color: C.dim, letterSpacing: 1, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: hi ? 14 : 12, fontWeight: hi ? 700 : 500, color: color ?? C.text, letterSpacing: 1 }}>
        {value}
      </div>
    </div>
  )
}

// ── Calibration Wizard ────────────────────────────────────────────────────────
const CAL_STEPS = [
  {
    title: 'STEP 1 — SAFETY CHECK',
    desc: 'Ensure laser aperture cover is installed. Set laser to SAFE. Confirm no personnel in danger zone. Unlock calibration mode with supervisor key.',
    action: 'CONFIRM SAFETY & PROCEED',
    detail: ['● Aperture cover: INSTALLED', '● Laser state: SAFE', '● Range safety: CLEAR', '● Supervisor key: INSERT AND TURN'],
  },
  {
    title: 'STEP 2 — BORESIGHT TARGET',
    desc: 'Place retroreflector target at 500 m on known azimuth. Enter exact distance and target type. System will switch to maximum zoom.',
    action: 'TARGET ACQUIRED — NEXT',
    detail: ['● Distance: 500 m', '● Target: RETROREFLECTOR 50×50 cm', '● Zoom: ×20 LONG-FOCUS', '● AZ: 127.4° / EL: 8.2°'],
  },
  {
    title: 'STEP 3 — CAMERA RETICLE CENTERING',
    desc: 'Use manual azimuth/elevation controls to center the white camera reticle on the target. Confirm RMS < 0.1 mrad.',
    action: 'CAMERA CENTERED — NEXT',
    detail: ['● Camera offset X: 0.04 mrad', '● Camera offset Y: 0.02 mrad', '● RMS: 0.045 mrad ✓', '● Status: WITHIN TOLERANCE'],
  },
  {
    title: 'STEP 4 — LASER PARALLAX @ 500 m',
    desc: 'Enable low-power alignment beam. Observe laser spot on target via camera. Adjust parallax compensation until laser reticle overlaps target center.',
    action: 'PARALLAX 500 m OK — NEXT',
    detail: ['● Laser spot offset X: 2.8 px', '● Laser spot offset Y: 1.1 px', '● Corrected: ΔX 0.1 / ΔY 0.0', '● Compensation applied ✓'],
  },
  {
    title: 'STEP 5 — PARALLAX @ 3000 m',
    desc: 'Reposition target to 3000 m. Verify parallax model accuracy. System computes quadratic compensation curve across full range envelope.',
    action: 'PARALLAX 3000 m OK — NEXT',
    detail: ['● Laser spot offset X: 0.5 px', '● Laser spot offset Y: 0.2 px', '● Model RMS: 0.08 mrad ✓', '● Curve fit: VALID'],
  },
  {
    title: 'CALIBRATION RESULTS — SUMMARY',
    desc: 'Calibration complete. All parameters within specification. Results saved to non-volatile storage with timestamp.',
    action: 'SAVE & EXIT CALIBRATION',
    detail: ['● Boresight RMS: 0.045 mrad ✓', '● Parallax RMS: 0.08 mrad ✓', '● Valid range: 200–5000 m', '● Cal ID: CAL-2026-0816-001'],
  },
]

function CalWizard({ step, setStep, onExit }: { step: number; setStep: (n: number) => void; onExit: () => void }) {
  const s = CAL_STEPS[step]
  const isLast = step === CAL_STEPS.length - 1
  return (
    <div style={{
      width: '100vw', height: '100vh', background: C.bg, color: C.text,
      display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        height: 52, background: C.panel, borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
      }}>
        <span style={{ fontFamily: mono, fontSize: 12, color: C.armed, letterSpacing: 3, fontWeight: 700 }}>
          CALIBRATION WIZARD
        </span>
        <span style={{ fontFamily: mono, fontSize: 11, color: C.dim }}>BORESIGHT / PARALLAX — PROTECTED MODE</span>
        <div style={{ flex: 1 }} />
        <button onClick={onExit} style={{ ...navBtn, color: C.danger, borderColor: C.danger }}>
          ABORT & EXIT
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Step list */}
        <div style={{ width: 240, background: C.panel, borderRight: `1px solid ${C.border}`, padding: 16, flexShrink: 0 }}>
          {CAL_STEPS.map((cs, i) => (
            <div
              key={i}
              style={{
                padding: '10px 12px', marginBottom: 4, cursor: 'pointer',
                background: i === step ? 'rgba(88,166,255,0.1)' : i < step ? 'rgba(63,185,80,0.07)' : 'transparent',
                border: `1px solid ${i === step ? C.accent : i < step ? 'rgba(63,185,80,0.3)' : C.border2}`,
              }}
              onClick={() => setStep(i)}
            >
              <div style={{ fontFamily: mono, fontSize: 10, color: i < step ? C.safe : i === step ? C.accent : C.dim, letterSpacing: 1 }}>
                {i < step ? '✓' : i === step ? '▶' : `${i + 1}`} STEP {i + 1}
              </div>
              <div style={{ fontSize: 10, color: i === step ? C.text : C.dim, marginTop: 2, lineHeight: 1.3 }}>
                {cs.title.split(' — ')[1]}
              </div>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 10, color: C.dim, letterSpacing: 2, marginBottom: 8 }}>
              STEP {step + 1} OF {CAL_STEPS.length}
            </div>
            <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: 2, marginBottom: 16 }}>
              {s.title}
            </div>
            <div style={{ color: C.dim, fontSize: 14, lineHeight: 1.7, maxWidth: 560 }}>
              {s.desc}
            </div>
          </div>

          {/* Status readout */}
          <div style={{
            background: C.panel, border: `1px solid ${C.border}`,
            padding: 20, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 440,
          }}>
            {s.detail.map((d, i) => (
              <div key={i} style={{ fontFamily: mono, fontSize: 12, color: d.includes('✓') ? C.safe : C.text }}>
                {d}
              </div>
            ))}
          </div>

          {/* Step 3: fake meter */}
          {step === 2 && (
            <div style={{ maxWidth: 440 }}>
              <div style={{ fontFamily: mono, fontSize: 10, color: C.dim, marginBottom: 6, letterSpacing: 1 }}>ALIGNMENT METER</div>
              <div style={{ background: C.panel2, height: 8, borderRadius: 4 }}>
                <div style={{ width: '96%', height: 8, borderRadius: 4, background: C.safe }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{
                  padding: '12px 24px', fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: 2,
                  background: C.panel, border: `1px solid ${C.border}`, color: C.dim, cursor: 'pointer',
                }}
              >
                ← BACK
              </button>
            )}
            <button
              onClick={() => isLast ? onExit() : setStep(step + 1)}
              style={{
                padding: '12px 28px', fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: 2,
                background: isLast ? 'rgba(63,185,80,0.2)' : 'rgba(88,166,255,0.15)',
                border: `2px solid ${isLast ? C.safe : C.accent}`,
                color: isLast ? C.safe : C.accent, cursor: 'pointer',
              }}
            >
              {s.action} →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── BITE Screen ───────────────────────────────────────────────────────────────
function BITEScreen({ telem, onExit }: { telem: Telemetry; onExit: () => void }) {
  const checks = [
    { name: 'Laser power supply', status: 'OK', val: '48.2 V' },
    { name: 'Beam quality M²', status: 'OK', val: '1.12' },
    { name: 'Coolant temp', status: 'OK', val: `${telem.tempLaser}°C` },
    { name: 'Board temp', status: 'OK', val: `${telem.tempBoard}°C` },
    { name: 'Gimbal servo X', status: 'OK', val: '0.02 mrad err' },
    { name: 'Gimbal servo Y', status: 'OK', val: '0.01 mrad err' },
    { name: 'Long-focus camera', status: 'OK', val: 'LINK ACTIVE' },
    { name: 'Wide-angle camera', status: 'OK', val: 'LINK ACTIVE' },
    { name: 'IR camera (LWIR)', status: 'OK', val: 'LINK ACTIVE' },
    { name: 'Laser safety interlock', status: 'OK', val: 'ENGAGED' },
    { name: 'GPS / INS sync', status: 'OK', val: '12 SATs / 0.4 m' },
    { name: 'Tracker CPU load', status: 'OK', val: '34 %' },
    { name: 'Calibration validity', status: 'OK', val: 'CAL-2026-0816' },
    { name: 'Fan #1', status: 'WARN', val: '3820 RPM ↓' },
    { name: 'Fan #2', status: 'OK', val: '4100 RPM' },
  ]

  return (
    <div style={{ width: '100vw', height: '100vh', background: C.bg, color: C.text, display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      <div style={{
        height: 52, background: C.panel, borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
      }}>
        <span style={{ fontFamily: mono, fontSize: 12, color: C.accent, letterSpacing: 3, fontWeight: 700 }}>
          BITE — BUILT-IN TEST & SYSTEM STATUS
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={onExit} style={navBtn}>← BACK TO COMBAT</button>
      </div>
      <div style={{ flex: 1, padding: 32, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: C.border, maxWidth: 900 }}>
          {checks.map((c, i) => (
            <div key={i} style={{ background: C.panel, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: C.text }}>{c.name}</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: C.dim, marginTop: 2 }}>{c.val}</div>
              </div>
              <div style={{
                fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: 1,
                color: c.status === 'OK' ? C.safe : C.armed,
                padding: '3px 8px',
                background: c.status === 'OK' ? 'rgba(63,185,80,0.1)' : 'rgba(210,153,34,0.15)',
                border: `1px solid ${c.status === 'OK' ? 'rgba(63,185,80,0.3)' : 'rgba(210,153,34,0.4)'}`,
              }}>
                {c.status}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, fontFamily: mono, fontSize: 11, color: C.dim }}>
          LAST BITE RUN: {telem.time.toLocaleString('uk-UA')} &nbsp;|&nbsp; RESULT: 1 WARNING, 0 FAILURES
        </div>
      </div>
    </div>
  )
}

// ── Maintenance Screen ────────────────────────────────────────────────────────
function MaintScreen({ telem, onExit }: { telem: Telemetry; onExit: () => void }) {
  const logs = [
    '2026-08-16 07:42:11 — System startup OK, BITE pass',
    '2026-08-16 07:43:05 — Calibration loaded CAL-2026-0816-001',
    '2026-08-16 08:15:33 — ARMED event, track quality 94%',
    '2026-08-16 08:15:41 — FIRING 0.8s, pulse burst #12845-12847',
    '2026-08-16 08:15:44 — SAFE, engagement complete',
    '2026-08-16 08:33:20 — Fan #1 degraded: 3820 RPM (nominal 4000+)',
  ]
  return (
    <div style={{ width: '100vw', height: '100vh', background: C.bg, color: C.text, display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      <div style={{
        height: 52, background: C.panel, borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
      }}>
        <span style={{ fontFamily: mono, fontSize: 12, color: C.accent, letterSpacing: 3, fontWeight: 700 }}>
          MAINTENANCE
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={onExit} style={navBtn}>← BACK TO COMBAT</button>
      </div>
      <div style={{ flex: 1, padding: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, overflow: 'auto' }}>
        {/* Counters */}
        <div>
          <div style={{ fontFamily: mono, fontSize: 10, color: C.dim, letterSpacing: 2, marginBottom: 16 }}>SYSTEM COUNTERS</div>
          <div style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            {[
              ['Total pulse count', telem.pulseCount.toLocaleString(), 'pulses'],
              ['Operating hours', '847', 'h'],
              ['Engagements', '23', 'events'],
              ['Last service', '2026-07-12', ''],
              ['Next service at', '15 000', 'pulses'],
              ['Laser temp (now)', `${telem.tempLaser}°C`, ''],
              ['Board temp (now)', `${telem.tempBoard}°C`, ''],
            ].map(([k, v, u], i) => (
              <div key={i} style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border2}`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.dim, fontSize: 12 }}>{k}</span>
                <span style={{ fontFamily: mono, fontSize: 13, color: C.text }}>
                  {v} <span style={{ color: C.dim, fontSize: 10 }}>{u}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Event log */}
        <div>
          <div style={{ fontFamily: mono, fontSize: 10, color: C.dim, letterSpacing: 2, marginBottom: 16 }}>SYSTEM LOG</div>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, overflow: 'auto', maxHeight: 320 }}>
            {logs.map((l, i) => (
              <div key={i} style={{
                padding: '8px 14px', borderBottom: `1px solid ${C.border2}`,
                fontFamily: mono, fontSize: 10,
                color: l.includes('FIRING') ? C.danger : l.includes('ARMED') ? C.armed : l.includes('degraded') ? C.armed : C.dim,
              }}>
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const panelStyle: React.CSSProperties = {
  background: C.panel, flexShrink: 0,
}

const navBtn: React.CSSProperties = {
  padding: '4px 12px', fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: 1,
  background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, cursor: 'pointer',
}

const smallBtn: React.CSSProperties = {
  flex: 1, padding: '6px 4px', fontFamily: mono, fontSize: 9, fontWeight: 600, letterSpacing: 1,
  background: C.panel2, border: `1px solid ${C.border2}`, color: C.dim, cursor: 'pointer',
}

function confirmBtn(border: string, bg: string): React.CSSProperties {
  return {
    flex: 1, padding: '8px', fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: 1,
    background: bg, border: `1px solid ${border}`, color: border, cursor: 'pointer',
  }
}
