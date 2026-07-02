# Notre Dame Cathedral 3D

Interactive Three.js model of Notre Dame Cathedral, built from the reference cues in `Assests/`: twin western towers, rose windows, three pointed portals, gallery tracery, flying buttresses, ribbed roofs, spire, gargoyles, stained glass, plaza, river, and warm night illumination.

## Run

```powershell
pnpm install
pnpm run dev
```

Open the local URL printed by Vite. In this Codex session it is running at:

```text
http://127.0.0.1:5173/
```

## Controls

- Sun, dusk, and moon buttons jump between day, dusk, and night.
- The time slider drives sky color, sun/moon position, fog, stained glass glow, and automatic cathedral lights.
- Light buttons switch between automatic, forced on, and forced off.
- Camera buttons jump to west facade, buttress side, and aerial views.
- The `4K` button exports a 3840x2160 PNG render from the current camera and lighting state.
