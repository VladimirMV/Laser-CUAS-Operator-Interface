# Laser C-UAS Operator Console v1.1

Modernized HMI: components, Zustand, parallax Δθ=α+β/R, calibration wizard, **BITE**, **EN/UA i18n**, convenient camera switching.

## Run
```bash
npm install
npm run dev
```

## Features
- Combat screen: LONG / WIDE / IR with one-tap switch (PIP + strip)
- Laser SAFE → ARM (2-step) → FIRE (hold)
- Track loss + coasting
- Calibration wizard (100 m … 5 km, RMS)
- **BITE** — Built-In Test & System Status
- Language toggle EN ↔ UA (top bar)
- Safety locks on service modes

## Camera UX
- Active channel = main video
- Other two shown as PIP — click to promote
- Strip LONG | WIDE | IR always visible for instant switch back to LONG
