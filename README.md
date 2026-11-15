# Rewind the Murder — Field Training Edition

A playable 3D murder mystery with TIME, SHADOW and FIRE. Walk an original block-style office, collect evidence, and solve the case. The game lobby plays an eight-second MP4 loop rendered from the same 3D room. Includes a separate hands-on demo. Inspired by sandbox adventures; not affiliated with Roblox.

## Play
Open `dist/index.html` in a modern browser. No installation, external assets or build step is required. Alternatively run `python3 -m http.server 8080 --directory dist` from this directory and open http://localhost:8080.

Choose **Play guided demo** on the title screen, or **Guided demo** in the header. The practice run is separate from your saved investigation. Exit at any time to restore your original case.

## Playable field training
Choose **Play demo** to enter a mission briefing, then begin the simulation.

1. Calibrate your movement by walking two metres with WASD or touch controls.
2. Inspect the locked door and collect its evidence.
3. Set TIME to 10:06, inspect the key and collect the report.
4. Set TIME to 10:09, inspect the clock and collect the contradiction.
5. Toggle SHADOW and collect the footprint trail.
6. Keep SHADOW active and collect the concealed passage.
7. Set TIME to 10:12, toggle FIRE, and collect the burned note.
8. Collect the damaged ledger with FIRE active.
9. Connect the borrowed key and clock evidence to establish the critical minute.

The field HUD tracks nine objectives, active practice time and staged mission phases. Tracking an objective marks it without teleporting, changing time or switching powers. Optional **Guide me to the object** position assists are counted in the field report; they never award clues or change time/vision. Movement is required before investigation stages advance. Briefing and paused time do not count toward active practice time. There is no countdown or time penalty.

A completion report shows objectives completed, active practice duration and assists used. Exit restores your previous case and difficulty; entering training from the lobby returns you there on exit. Training never overwrites saved progress. Closing the briefing starts movement practice; its Exit training button leaves the simulation.

## Controls
- Click an object, select its single focused label, or use **Inspect room** to choose from illustrated object cards.
- **Current objective** shows the next useful action. Its button focuses the relevant object or opens the evidence board.
- WASD: walk. Drag: look. Arrow Up/Down: forward/back; Left/Right: turn. Shift: run. Space: jump.
- Switch **Third person / First person** at any time. **Reset position** returns you to the entrance.
- Touch: hold the on-screen movement buttons and drag the scene to look; Jump and Inspect nearby are on-screen buttons.
- Walls and furniture block movement. Jumping does not bypass furniture collision.
- T: toggle time console. Select a timestamp, use Earlier/Later, or Play scene (2.4 seconds per moment, stopping at 10:12).
- Q: toggle SHADOW. F: toggle FIRE. These scanners are mutually exclusive.
- E: inspect a nearby object you are facing. B: evidence board. Esc: close a panel or pause.
- Opening a panel holds reconstruction playback and environmental animation.
- Sound cues and reduced motion are optional in Settings; the system reduced-motion preference is respected.

## Source files
- `dist/index.html`: title, room, power dock, guided-demo and objective panels.
- `dist/style.css`: responsive cinematic visual design and accessibility states.
- `dist/scene3d.js`: perspective-projected 3D geometry, near-plane clipping, collision movement, third/first-person cameras, block characters and forensic effects.
- `dist/art.js`: photographic scene crops for inspectable objects and clues.
- `dist/engine.js`: canonical clues, suspects, gates, connections and accusation rules.
- `dist/game.js`: interactions, isolated guided demo, objectives, saving, menus, audio and endings.
- `test-engine.cjs`: game-state regression tests.
- `test-interface.cjs`: production handler/renderer tests using a DOM/canvas adapter.
- `MYSTERY_BIBLE.md`: complete solution and consistency notes; contains spoilers.

## Verification
Run `node test-engine.cjs` and `node test-interface.cjs` with Node.js.

Seven engine groups and nineteen interface/renderer groups passed. Additional checks cover keyboard/touch movement, desk/wall collision, jump/landing, clearing held inputs on pause, and menu-video playback controls. These cover timeline/mode gates, reachability of all evidence, duplicate prevention, incomplete/incorrect/valid connections, all accusation outcomes, reset, persistence, menus, camera handlers, inspection clicks versus dragging, finite drawing coordinates, and the nine-objective field demo. Demo tests verify real collection requirements, invalid deduction rejection, successful completion, repeat launch, early exit and restoration of the original save.

JavaScript syntax checks passed. The supported browser QA tool was unavailable. These tests do not verify rendered pixels, actual device input, native focus behavior or audio output. No claim of live browser testing is made.

## Save behavior and limitations
Normal case progress is stored in this browser's localStorage. The guided demo runs in memory and does not overwrite that save. Exit restores the original in-memory case; refreshing during the demo reloads the original saved case. Restart clears normal case progress.

One authored chapter. The room is real-time 3D cuboid geometry projected through Canvas 2D, with collision-based walking and basic jump/gravity. It is not WebGL or a Roblox Studio project. No shooting, multiplayer, voiceover or general rigid-body physics. Timeline changes are discrete reconstructed moments. The 30 fps rendering target depends on device performance. The Site's existing audience is preserved.

## Visual assets
All required visuals are bundled under `dist/assets`. See ASSET_NOTES.md for provenance. The room and menu video use the original 3D scene. Photographic crops remain in the evidence inspection panels.

To regenerate the bundled menu footage, install Node package `@napi-rs/canvas` and ffmpeg, then run `node scripts/render-menu.cjs`. These are build-time tools only; playing the game requires no installation. The MP4 uses H.264 at 960×540, 24 fps, eight seconds, with muted inline autoplay and a poster fallback. Reduce motion pauses the video.

## Difficulty selection
The lobby Play button opens a full-screen difficulty selector before entering the office. All three modes investigate the same case; they are not separate maps or chapters.

- Easy: step-by-step objectives, guided travel to clues, exact time/power prompts, evidence-availability labels.
- Medium: broad hints on request; no guided travel or time/power shortcut buttons.
- Hard: no hints, guided objectives, time/power shortcuts, or evidence-availability labels. Observe and connect evidence yourself.

Each difficulty stores progress separately. Existing saves remain in Easy. Selecting a card does not change your active game until Enter is pressed. Returning to the lobby keeps progress. Training remains an isolated guided practice run and restores your current difficulty's case when exited.

The new original lobby key art is `dist/assets/lobby-keyart.png`. A subtle video layer retains motion, with reduced-motion and pause controls. Automated checks cover selection, back navigation, independent saves and difficulty-specific guidance. Browser visual QA remains unavailable.

## Lobby display fix
Removed legacy direct-child positioning rules that collapsed the decorative artwork layer and placed the video in normal document flow. Background layers now use explicit absolute positioning, and the key art is preloaded. Stylesheet version changed to invalidate stale browser caches.

## Homepage typography
The top label is Gaming Hub; the Solo Adventure label is removed. Nimbus Sans is bundled locally as Hub Sans in regular and bold WOFF files. Restrained tracking, upright titles, a consistent type hierarchy and lighter menu weights replace the earlier Impact/skewed display treatment. No external font service is needed. License information is included in `dist/assets/fonts/LICENSE.txt`.

### Office graphics update
The main office uses WebGL with cast shadows, procedural materials and mixed warm/cool lighting. WebGL-disabled devices fall back to the Canvas renderer. GPU shader compilation and an offline OpenGL ES render were checked; browser visual QA remains unverified. Homepage Gaming Hub label is proportionate to the menu typography.
