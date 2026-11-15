# Cinematic assets

Generated with the built-in image-generation tool for this project.

- room-12.png: Photoreal cinematic antique locked office, rain window, desk and green lamp, wall clock, bookcase, fireplace, covered victim; amber fire and blue moonlight. No gore.
- room-03.png: Same office and composition at 10:03, scientist alive at desk, upright chair, no body.
- room-06.png: Same office at 10:06, scientist and anonymous dark-coated visitor by desk, key transaction.
- room-09.png: Same office at 10:09, non-graphic victim on rug, departing visitor by bookshelf, altered wall clock.
- suspects.png: Three fictional photographic portraits: Lena Voss, Mara Rook and Elias Thorn, neutral dark background.
- crime-scene.jpg: User-supplied crime-scene reference, used on the title screen.
- stair-shadow.jpg: User-supplied stairwell silhouette, used as a movement evidence visual.
- reference-board.jpg: User-supplied corkboard reference, retained as an art reference; functional evidence board is rendered in HTML/CSS.

The promotional image containing a third-party watermark was not reused. Generated room images are illustrative reconstructions; inspection reports define the exact clues. Rendering crops images at runtime without external services.

## Walkable sandbox edition
`menu-loop.mp4` and `menu-poster.png` are rendered from this project’s original 3D geometry by `scripts/render-menu.cjs`. They are not generated from the office photographs. The playable office and suspect portraits now use original block geometry. Earlier photographic assets remain in evidence panels and as retained reference artwork.

## Campaign lobby key art
Final asset: dist/assets/lobby-keyart.png. Generated using the built-in image-generation tool.
Prompt: Premium landscape game lobby key art for an original detective mystery; Roblox-inspired blocky detective in navy tactical clothing, glowing cyan pocket watch, amber fire wisps and purple temporal shadow echo, atmospheric teal-blue office with rain windows, wooden desk, bookshelf and clock. Character on right; dark negative space on left for actual menu buttons. Dimensional cinematic 3D styling; no text, logos or watermarks.

## Reference-inspired office update
The playable office uses original real-time geometry inspired by the supplied office video: walnut paneling, wood desk, brass clock, green lamp and rounded characters. The homepage artwork is unchanged. office-ambience.mp3 contains the supplied video’s audio, trimmed with fades and enabled through Sound in the playable game. This is not an isolated music stem.
Roca 2 was requested but no font file was supplied; the licensed bundled Hub Sans remains until the user provides Roca 2.

## WebGL office rendering
The office now uses original local WebGL shaders, a depth buffer, shadow map, procedural wood grain, leather, fabric and stone surface variation. No external rendering dependency or downloaded 3D assets are required. The Canvas renderer remains a compatibility fallback. Furniture height, entry camera and character proportions were revised. This is a real-time modeled environment, not a photorealistic scan.
