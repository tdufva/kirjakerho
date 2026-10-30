# Bold impressionism — 30 October 2026

The application lives on a materially rich, dark oil-painted ground. Broad ochre, copper and olive gestures replace thin decorative rules. Hero and welcome images have loose painted edges and offset pigment behind them, with no enclosing fine frame. Book jackets sit at varied angles on individual pigment daubs; the home favourites are staggered. Section numbers, scores, active navigation and actions use painted swatches. Atlas themes and utility panels are irregular colour fields, and map/network backgrounds are painted grounds with open edges. The responsive two-column theme layout constrains long Finnish labels inside each field.

`src/night.css` retains the semantic dark foundation; `src/paint.css` owns this visual composition across every route and its phone/tablet variants. `brush-swipe.svg` and `paint-patch.svg` are native, scalable masks. Thick strokes range from 3–5 px on data marks and form boundaries to 7–16 px on accents and section rules. Cover artwork uses broader organic paths. Typography, numeric values, focus indicators and data positions remain precise. Background pigment is static; reduced-motion mode disables the optional hover transitions.

The dark background uses `background-blend-mode: darken` over #43432E to cap bright pigment flecks under text. Secondary text is #D5C7B4. Fields and dialogs have opaque dark green surfaces, clear focus rings and stronger boundaries. Interactive elements retain their ordinary rectangular hit areas; only their decorative paint is masked. Art that extends beyond a layout edge is clipped at the app shell, while matrix, chart and category scrollers retain their own scrolling.

## New background asset

- Final project file: `src/assets/pigment-ground.webp`, 1120 × 1120, about 261 kB.
- Source: `/Users/tdufva/.codex/generated_images/01a18791-3c1f-7c73-98d5-70fce562b286/exec-39a2ae20-80ec-4e5d-9ac6-5a5031f1b0d0.png`.
- Tool: built-in ImageGen, new generation, transparent background false. The selected output was resized and encoded to WebP for the application; the original remains in the image library.
- The two people-free salon/reading-room paintings and their responsive variants remain in use. No stars, people, instruments or new archive entries were added.

## Exact ImageGen prompt

Use case: stylized-concept. Asset type: seamless square background texture for a dark, bold impressionist literary jazz-club app. Create an abstract oil-painted ground, edge-to-edge, no frame, no objects and no text. A tactile hand-painted canvas built from broad overlapping palette-knife and flat-brush strokes, broken pigment and small rich tonal changes. The entire image stays very DARK: deep walnut, burnt umber and near-black olive, approximately #171812 to #34271E, with restrained smoky sage #3C4030, tarnished ochre #58451E and dried copper #573021 patches. Overall value structure must stay low so ivory interface text placed anywhere will remain readable. Make it materially rich and painterly, not flat digital noise or a smooth gradient. Intermittent directional strokes and subtle impasto ridges, dry-brush gaps showing dark canvas, oblique scumbling, no regular repeated pattern. It should tile without a visible seam, avoiding distinctive focal elements. No bright highlights, ivory patches, white paint, people, silhouettes, portraits, instruments, stars, sparkles, asterisks, symbols, letters, typography, watermark, border or UI mockup. This is only the dark abstract painted ground; visual energy comes from thick paint and variation within dark tones.
