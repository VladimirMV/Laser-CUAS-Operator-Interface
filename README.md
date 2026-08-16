# Laser C-UAS Operator Console

Modernized operator HMI for laser dazzler / camera-killer C-UAS station.

Based on Figma Make prototype, refactored to production-oriented architecture.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Zustand
- Framer Motion
- Lucide React

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## What was modernized

- Split monolithic App.tsx into components
- Zustand store for all state
- Correct parallax model: Δθ = α + β/R (convergence ≈ 2000 m)
- Calibration wizard with range table 100 m … 5 km and RMS check
- Safety locks: CAL blocked when ARMED/FIRING; FIRE only when ARMED
- Track loss + coasting timer
- Tailwind instead of inline styles
- Framer Motion transitions

## Demo controls

- **ARM** → 2-step confirm → laser reticle appears with parallax offset
- **FIRE** (hold) → FIRING pulse
- **Simulate Track Loss** → COAST timer → SEARCH
- **Calibration** → wizard (only from SAFE)
