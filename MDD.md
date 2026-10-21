# Top Down Racer — Master Design Document (MDD)

## 1. Overview

**Working title:** Top Down Racer (rename freely)
**Type:** Single-player, top-down 2D car racing game
**Platform:** Web app / PWA (desktop keyboard + mobile landscape touch)
**Tech:** Plain HTML/CSS/JS + three.js (no build step)
**Dev workflow:** Claude Code in VS Code → push to GitHub repo → GitHub Pages → play at URL → "Add to Home Screen" as PWA

**Pitch:** Pick up and race. You and 3 AI cars take on a short closed circuit for 3 laps. Simple controls, quick rounds, fun to replay.

## 2. Goals and Non-Goals

**Goals**
- Playable in under 5 seconds from opening the URL.
- Works great on desktop (WASD) and iPhone/Android landscape (on-screen pedals + steering).
- Installable as a PWA and playable offline.
- 60 FPS on a mid-range phone.
- Small, readable codebase that Claude Code can extend.

**Non-Goals (v1)**
- No online multiplayer, accounts, or backend.
- No 3D models or complex physics engine.
- No car upgrades or in-app purchases.

## 3. Core Gameplay

- **Race:** 4 cars (1 player + 3 AI) start on a grid. First to finish **3 laps** wins.
- **Flow:** Title screen → Countdown (3-2-1-GO) → Race → Results → Race Again / Menu.
- **HUD:** Lap counter (e.g. 2/3), race position (e.g. 3rd/4), current lap time, best lap time, speed.
- **Track:** One closed-loop circuit for v1 (add more later). Light grass/off-track slows the car.
- **Collisions:** Cars bump each other with soft push-apart (no damage). Track walls/barriers stop or slide the car.
- **Win condition:** Cross the finish line after completing 3 valid laps. Others keep racing; results show final order when all finish or after the player finishes plus a short grace timer.

## 4. Controls

### 4.1 Desktop (keyboard)
| Key | Action |
|---|---|
| W | Accelerate |
| S | Brake / reverse |
| A | Steer left |
| D | Steer right |
| R | Restart race |
| Esc / P | Pause |

Arrow keys also work as an alternate.

### 4.2 Mobile PWA (landscape only)
Layout (landscape, thumbs at the lower corners):

```
+-----------------------------------------------------------+
| Lap 1/3   P2/4                         Best 00:42.1  [II] |
|                                                           |
|                    (game view)                            |
|                                                           |
|  +---------+                                  +----+----+ |
|  |  GAS    |                                  | <  |  > | |
|  +---------+                                  |    |    | |
|  |  BRAKE  |                                  +----+----+ |
|  +---------+                                              |
+-----------------------------------------------------------+
```

- **Lower-left:** Two stacked touch zones. **Top = Accelerate (up)**, **bottom = Brake (down)**. Large, semi-transparent, with icons (up/down arrows).
- **Lower-right:** Two side-by-side touch zones. **Left arrow = steer left**, **right arrow = steer right**.
- Multi-touch required: the player must hold gas and steer at the same time. Track touches by `pointerId`/`touch.identifier`.
- Buttons light up when pressed. Use `touch-action: none`, prevent context menu, text selection, and double-tap zoom.
- Controls are shown only on touch devices (detect with `pointer: coarse` / `ontouchstart`); hidden on desktop.
- **Portrait handling:** show a full-screen "Rotate your device" overlay and pause the game. Request landscape via manifest `"orientation": "landscape"`.
- Safe-area support: pad with `env(safe-area-inset-*)` so controls clear the iPhone notch and home bar.
- Optional (v1.1): haptic tick via `navigator.vibrate` where supported.

## 5. Rendering with three.js

Use three.js purely as a 2D top-down renderer:

- **Camera:** `OrthographicCamera` looking straight down the -Y axis (or Z, pick one and stay consistent). Follows the player car with smooth lerp; fixed zoom that scales with screen height so the same amount of track is visible on every device.
- **Scene:** Flat meshes on the XZ plane (or XY with camera on Z):
  - Ground: large plane, grass colour.
  - Track: built from a closed spline (`CatmullRomCurve3`) extruded into a ribbon mesh (asphalt colour), with edge lines/kerbs (red/white alternating) and a checkered start/finish strip.
  - Cars: simple low-poly boxes/extruded shapes with a colour each (player = bright red, AI = blue, yellow, green). A small body + windshield + 4 wheel boxes is enough. No external models needed.
  - Scenery: a few trees (cone + cylinder) and barriers outside the track for visual interest. Keep draw calls low (use `InstancedMesh` for repeated trees/kerbs).
- **Effects (cheap):** tyre skid marks (fading quads), small dust particles on grass, subtle camera tilt/shake on collision. Optional.
- **Lighting:** One ambient + one directional light. Flat/toon-ish look; no shadows in v1 (performance).
- **Renderer:** `WebGLRenderer({ antialias: true })`, `setPixelRatio(Math.min(devicePixelRatio, 2))`, resize on `resize`/`orientationchange`.
- **Loading three.js:** Download `three.module.min.js` into `/lib/` and import it locally via an ES module import (or import map). Do **not** rely on a CDN, so the service worker can cache it and the game works offline.

## 6. Game Systems

### 6.1 Game loop
- `requestAnimationFrame` loop with a **fixed-timestep physics update** (e.g. 60 Hz) and render interpolation; clamp large delta times (tab-switch protection).
- States: `LOADING`, `MENU`, `COUNTDOWN`, `RACING`, `PAUSED`, `FINISHED`.

### 6.2 Car physics (arcade, simple)
Per car store: `position (x,z)`, `heading`, `velocity`, `speed`, `steerAngle`.
- Acceleration force along heading; braking reduces speed, then reverses slowly.
- Drag/friction so the car coasts to a stop.
- **Steering:** turn rate proportional to speed (can't turn when stopped); reduce turn rate at top speed.
- **Grip/drift (light):** blend velocity toward heading direction using a grip factor, so the car slides slightly in sharp turns. Lower grip on grass.
- **Off-track:** when outside the track ribbon, apply a speed cap (~40%) and extra drag.
- Tunable constants live in one `config.js` (max speed, accel, brake, turn rate, grip, grass penalty, AI difficulty).

### 6.3 Track model
- Define the centreline as an array of control points → `CatmullRomCurve3` (closed).
- Sample the curve into N points (e.g. 300) used for: mesh generation, AI waypoints, lap/progress tracking, and nearest-point "on track" checks.
- Track width constant (e.g. 14 units). A car is on-track if its distance to the nearest centreline point < width / 2.
- v1 layout: one interesting circuit (a few left/right turns, one hairpin, one long straight). Keep it easy to add more by exporting arrays of points.

### 6.4 Lap and position tracking
- Each car tracks `progress` = (laps completed + fraction along centreline). Position ranking = sort by progress.
- **Checkpoints:** 3-4 invisible gates around the loop must be passed in order before the finish line counts a lap (prevents cheating by reversing over the line).
- Record lap times, best lap, and finish time per car.
- Wrong-way detection: if the player's heading opposes track direction for >2s, show a "WRONG WAY" warning.

### 6.5 AI opponents (3 cars)
- Follow the centreline waypoints with a look-ahead target; steer toward it with a proportional controller.
- Slow down before sharp corners (use upcoming curvature to set target speed).
- **Difficulty variance:** each AI has a different top-speed multiplier (e.g. 0.92, 0.96, 1.0), a small lateral offset from the racing line, and slight random mistakes so they don't feel robotic.
- **Rubber-banding (light):** gently speed up AI that are far behind and slow those far ahead so races stay close. Keep it subtle.
- Basic avoidance: nudge laterally away from a car directly ahead.
- Optional difficulty selector (Easy / Normal / Hard) that scales AI speed multipliers.

### 6.6 Collisions
- Use circle/capsule approximations per car (2-3 circles). Resolve overlaps by pushing apart and exchanging a bit of momentum; reduce speed slightly on impact.
- Track barriers: if the car goes past a hard outer boundary, push it back in and kill most of its speed component into the wall.
- No external physics library; keep it hand-rolled and cheap.

### 6.7 Audio (optional v1.1)
- Engine pitch tied to speed (WebAudio oscillator), countdown beeps, tyre squeal, collision thump.
- Audio must start after the first user gesture (mobile requirement). Include a mute toggle saved in `localStorage`.

## 7. UI / Screens

- **Title screen:** game name, "Race" button, difficulty selector, mute toggle, best-time display. Short controls hint (WASD or touch).
- **Countdown:** large 3-2-1-GO centred text; cars locked until GO.
- **HUD:** top-left lap + position, top-right best/current time, small speedometer or speed number, pause button.
- **Pause menu:** Resume, Restart, Quit to menu.
- **Results screen:** final standings (1st-4th with car colours and times), best lap, "Race Again" and "Menu".
- **Rotate-device overlay:** shown in portrait on mobile.
- **Style:** bold, clean, arcade look. Big tap targets (min 64px). Readable on small screens. One accent colour plus car colours.
- Persist `bestLap` and settings (difficulty, mute) in `localStorage`.

## 8. PWA Requirements

- `manifest.webmanifest`: `name`, `short_name`, `start_url: "./"`, `scope: "./"`, `display: "standalone"`, `orientation: "landscape"`, `background_color`, `theme_color`, icons (192, 512, plus 512 maskable, plus 180 apple-touch-icon).
- `index.html` meta: viewport (`viewport-fit=cover`, `user-scalable=no`), `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `theme-color`, link to manifest and apple-touch-icon.
- `service-worker.js`: precache the app shell (HTML, JS, CSS, three.js, icons, manifest) with a versioned cache name; cache-first for static assets; delete old caches on activate. Bump the version string each deploy so updates reach players.
- All paths **relative** (`./`) because GitHub Pages serves from `/<repo-name>/`.
- Fully playable offline after first load.
- Icons: generate simple placeholders (car silhouette on coloured background) and note they can be replaced.

## 9. Project Structure

```
top-down-racer/
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── README.md
├── MDD.md
├── css/
│   └── style.css
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-512-maskable.png
│   └── apple-touch-icon.png
├── lib/
│   └── three.module.min.js
└── js/
    ├── main.js          // bootstrap, state machine, game loop
    ├── config.js        // all tunable constants
    ├── track.js         // spline, mesh, on-track checks, checkpoints
    ├── car.js           // car mesh + physics
    ├── ai.js            // AI driver logic
    ├── input.js         // keyboard + touch input -> unified controls object
    ├── race.js          // laps, positions, timing, results
    ├── ui.js            // HUD, menus, overlays
    ├── audio.js         // optional sounds
    └── storage.js       // localStorage helpers
```

Input abstraction: `input.js` exposes `{ throttle: 0..1, brake: 0..1, steer: -1..1 }` so keyboard, touch, and AI all drive cars through the same interface.

## 10. Build Plan (for Claude Code)

Work in small milestones; run locally (`npx serve` or VS Code Live Server) and commit after each.

1. **Scaffold:** repo, `index.html`, three.js vendored locally, renders a spinning cube to confirm setup.
2. **Track:** spline-based track mesh, grass ground, start/finish line, top-down ortho camera.
3. **Player car:** mesh + arcade physics, keyboard WASD, camera follow.
4. **Off-track + barriers:** speed penalty on grass, boundary push-back.
5. **Laps:** checkpoints, lap counter, lap timer, finish detection.
6. **AI cars:** 3 waypoint-following cars with varied speeds; grid start and countdown.
7. **Collisions:** car-to-car push apart.
8. **HUD + menus:** title, pause, results, best lap saved.
9. **Touch controls:** landscape layout, multi-touch gas/brake left and steering right, rotate overlay, safe areas.
10. **PWA:** manifest, icons, service worker, offline test.
11. **Polish:** skid marks, dust, camera shake, audio, tuning of handling and AI.
12. **Deploy:** push to GitHub, enable Pages, test on phone, install to home screen.

## 11. Deployment (GitHub Pages)

1. Create a GitHub repo (e.g. `top-down-racer`) and push the project root (no build step; `index.html` at repo root).
2. Repo **Settings → Pages → Build and deployment**: Source = "Deploy from a branch", Branch = `main`, Folder = `/ (root)`.
3. Play at `https://<username>.github.io/top-down-racer/`.
4. **Install:** iPhone Safari → Share → Add to Home Screen. Android Chrome → menu → Install app.
5. After updating, bump the cache version in `service-worker.js` so installed PWAs pick up the new build (may need to close and reopen the app).

## 12. Performance Budget and Compatibility

- Target 60 FPS on iPhone 12-class devices; cap pixel ratio at 2.
- Under ~50 draw calls; use instancing for repeated scenery; no shadows or post-processing in v1.
- Total payload under ~2 MB (three.js min is the bulk).
- Test: Safari iOS, Chrome Android, Chrome/Firefox/Safari desktop.
- Prevent page scroll/bounce and pull-to-refresh on mobile (`overscroll-behavior: none`, `touch-action: none`).

## 13. Acceptance Checklist

- [ ] Opens at the GitHub Pages URL and shows the title screen.
- [ ] WASD (and arrows) drive the car on desktop.
- [ ] On a phone in landscape: gas/brake zones bottom-left, steer arrows bottom-right, and gas + steer work simultaneously.
- [ ] Portrait shows a rotate prompt and pauses.
- [ ] 3 AI cars race the circuit and complete laps without getting stuck.
- [ ] Lap counting resists cheating (checkpoints) and finishes after 3 laps.
- [ ] Position, lap, and timing HUD are accurate.
- [ ] Results screen shows standings; Race Again works.
- [ ] Best lap persists after reload.
- [ ] Installs to home screen and launches full-screen with correct icon.
- [ ] Works offline after first load.
- [ ] Holds ~60 FPS on a recent phone.

## 14. Future Ideas (post-v1)

- More tracks and a track selector; weather/night variants.
- Car selection (speed/handling tradeoffs) and colour customisation.
- Ghost car of your best lap.
- Time Trial mode.
- Nitro boost pickups.
- Local leaderboard and shareable results.
- Wifi/online multiplayer (separate backend needed).

## 15. Instructions for Claude Code

> Read this MDD fully before writing code. Build milestone by milestone (Section 10), keeping files small and modular per Section 9. Use only plain ES modules and a locally vendored three.js; no bundler. Keep all tunable numbers in `config.js`. Use relative paths everywhere for GitHub Pages. After each milestone, tell me how to test it locally, then commit. Ask before adding any dependency not listed here.
