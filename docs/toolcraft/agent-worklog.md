# Toolcraft App Agent Worklog

## Status

Mode: product

Network Scramble: an animated network shot (zooming sparse square matrix over a faint dot grid, two travelling lime hubs with re-targeting spoke fans, glyph-scramble decoded mono labels) with controls to reach the requested case and PNG export of the current frame.

Active change: network-scramble-first-delivery

## Decision Trail

### network-scramble-first-delivery

- Change ID: network-scramble-first-delivery
- Request: "I am implement the animation below. Create controls the help to reach the case below" — followed by the scene description: `< 200 OK` / `request_id req_123` dim and steady; `credits required 5` / `ratelimit 2 / 50 tokens` decoded beside the lower hub; a late `> POST /v2/...` / `> key ...` block (~4.7–5.03 s) still mid-scramble when the scene cuts; black field with a faint dot grid and a sparse matrix of white squares whose size falls off radially from two lime (#DAFB33) hubs; 1px white spokes from each hub to about a dozen squares; hubs travel on independent paths (upper-left, lower-center) with fans re-targeting; continuous slow zoom; left-to-right glyph-scramble decode.
- Task type: first product delivery (app assembly, schema/controls, custom Canvas 2D renderer, playback timeline, image export).
- User-visible result: a 5.03 s playback shot rendered on the Toolcraft canvas with 11 product sections (Squares, Dot Grid, Hubs, Upper Hub, Lower Hub, Spokes, Camera, Status Lines, Body Lines, Response, Request Lines, Request, Decode) plus runtime Setup/Background and Image Export.
- Source/reference checked: the user's text description only.
- Reference inputs: None — the request is a written description; no video, GIF, frames, Figma or reference app was supplied, so `referenceInputs: []` and no reference study.
- Docs/contracts read: AGENTS.md, workflow.md, core/runtime-boundary.md, assembly-workflow.md, core/control-selection.md, core/layout.md, core/timeline-animation.md, core/performance.md, core/setup-export.md, core/media-upload.md, core/slider-ranges.md, core/app-cover.md, core/development-files.md, decision-contract.md, schema-reference.md, component-rules.md, renderer-technique.md, performance.md, vector-controls.md, acceptance-testing.md.
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, canvas-surface-preserved, infinity-canvas-scene-bounds, interaction-surface-ownership, timeline-mode-choice, timeline-enabled-behavior, controls-product-coverage, output-export-required, controls-section-inventory-required, renderer-technique-inventory, renderer-view-interaction, acceptance-product-observable, performance-coverage-levels, persistence-policy-explicit, workflow-required.
- View interaction intent: `non-spatial` — the shot is a flat 2D graphic with a 2D camera push-in; no 3D model or camera exists, so no orientation gizmo.
- Interaction ownership: hub anchors are panel Vector pads (property-edit; a canvas handle would chase a hub that moves during playback and reach only its current position, not the authored path midpoint); viewport pan and zoom stay on the canvas. All other controls are non-spatial properties with no plausible canvas surface.
- Decision: Canvas 2D foreground renderer driven by Toolcraft timeline loop progress; every scene event is expressed as shot percentage so a duration edit rescales the same shot. The loop seam is the scene cut the request describes (end of shot → first frame, forward-only). Labels are decoded by a deterministic glyph scramble (`decode-text.ts`) that shows every character as random glyphs at once and locks real characters left-to-right; the status lines never scramble. Squares and dots behind label boxes are knocked out so the mono text stays legible. Image export is the Toolcraft default; SVG and video were not requested.
- Alternatives rejected: SVG/DOM renderer (thousands of animated nodes per frame); WebGL (shader + glyph atlas complexity for flat rects, lines and a few text runs); no-timeline autonomous animation (the shot needs scrub/pause/duration); fontPicker typography (the request fixes white mono text; exposing font size would require the full fontPicker block); a request-block fade-in (the request explicitly forbids fades/typing).
- State/output mapping: `squares.*` → lattice spacing, occupancy hash threshold, size range (edge→hub) and Gaussian falloff from the nearest hub; `squares.color` → mono foreground for squares, spokes, dots and labels; `dots.*` → faint lattice dot layer; `hubs.size`/`hubs.travel` → hub square size and path length; `upperHub.*`/`lowerHub.*` → hub color and path midpoint (normalized to the frame); `spokes.*` → nearest-neighbour fan size (cross-faded at the boundary), line width and opacity; `camera.zoom` → exponential push-in from 1 to the value at the cut; `response.status`/`response.statusOpacity` → steady dim lines; `response.body`/`response.window` and `request.text`/`request.window` → decoded blocks and their shot-percentage windows (values >100% keep a block mid-scramble at the cut); `decode.rate`/`decode.glyphs` → scramble cadence and charset; timeline time → loop progress for every element; `export.includeBackground`/`appearance.background` → runtime background only; `scene.rasterFrameRenderer` paints the identical frame at the playhead time for PNG/JPG.
- Verification: product unit tests (`src/app/network-scene/network-scene.test.ts`, 39 passed); product browser acceptance (`e2e/product-network.spec.ts` network domain, `e2e/product-shot.spec.ts` shot domain, 36 passed) plus the signed persistence reload spec and the `app-controls` smoke spec passed; `npm run ai:check` passed; all product acceptance/performance/worklog Vitest gates passed (743 of 745). `npm run verify:delivery` built the app and then stopped in its Vitest step on two signed framework tests that do not touch product code: the framework-boundary alias test compares `D:/…` with `D:\…` (fails on Windows every run) and the product-test-timeout fixture took ~5 s against its 5 s limit under full-suite load (passes in isolation at 4.98 s). No initial delivery receipt was produced.
- Risks: Risk: the signed framework test "resolves configured app aliases as local module dependencies" compares `D:/...` with `D:\...` on Windows and fails independently of product code. Risk: label widths use an approximate monospace advance (0.62 em) for the knock-out boxes; unusual system mono fonts may leave a small gap or overlap.

### rename-network-scramble

- Request: "change project name to network-scramble".
- Changed owner: `package.json` / `package-lock.json` name and `src/app/app-identity.ts` (`id: "network-scramble"`, `title: "Network Scramble"`). Signed `index.html` title/meta (`Crawler`) left unchanged.
- Result: the app id now keys persistence as `toolcraft:network-scramble:state:*`, so workspace state saved under the old `crawler` id is no longer loaded.
- Checks: `tsc --noEmit` passed; `vitest run src/app` 744 passed, 1 failed (the known Windows path-separator framework test above).

## Decisions

### Renderer

- Decision: Custom Canvas 2D foreground (`NetworkCanvas`) using `useToolcraftProductSceneFrame`, Resolution scale backing (CSS × DPR × scale), and one registered pipeline (`preview-frame` composite per frame, `export-frame` batch export).
- Reason: Dense animated rectangles, lines and a few text runs redraw every frame; Canvas 2D matches the PNG artifact and keeps preview/export on one drawing function.
- Evidence: `src/app/network-scene/scene-draw.ts`, `pipeline.ts`, `export-renderer.ts`; unit test "export.image runtime contract" proves export draws the same operations as preview.

### View Interaction

- Decision: non-spatial.
- Reason: Flat 2D shot with a 2D camera push-in; no 3D model or camera.
- Evidence: `appProductReadiness.viewInteraction`; mode non-spatial, source usability analysis, no orientation targets.

### Interaction Ownership

- Decision: Panel owns hub anchors (Vector) and all properties; canvas owns viewport pan/zoom.
- Reason: Hubs move during playback, so the stable anchor is edited precisely in the panel.
- Evidence: `interactionOwnership` entries upper-hub-anchor, lower-hub-anchor, viewport-pan, viewport-zoom; vector-screen-motion browser proof tracks the lime hub moving with each pad drag.

### Timeline

- Decision: Playback timeline, default 5.03 s from the request's "~4.7 – 5.03 … when the scene cuts"; seamless forward-only loop whose seam is the scene cut.
- Reason: Product animation needs scrub, pause and duration; events scale with duration because they are shot percentages.
- Evidence: unit test "timeline.playback runtime contract" (frame at duration equals frame at 0 for two durations); browser `expectToolcraftStandardTimelinePlayback`.

### Layers

- Decision: No Layers.
- Reason: No user-requested layer workflow.
- Evidence: schema has no `layersModule()`.

### Controls

- Decision: 26 built-in product controls in sections per entity; code editors render as standalone sections, so the Response and Request entities use workflow stages (copy vs timing).
- Reason: Built-in slider, rangeSlider (size range, decode windows), color, vector, code and text controls cover every value model; no custom controls.
- Evidence: `appControlSectionInventory`; base-coverage and section gates pass.

### Export

- Decision: Toolcraft default image export (PNG/JPG, 2K/4K/8K); SVG and video not requested.
- Reason: The request asks for the animation and controls, not an artifact format.
- Evidence: `exportIntent` image toolcraft-default, svg/video not-requested; browser rows export.image, export.image-format, export.image-resolution, canvas.infinity-export.

### Performance

- Decision: Workload dimensions `grid-spacing` (schema `squares.spacing`, minimum boundary 20 px) and `export-long-edge` (image resolution, 8192 px); passes `preview-frame` (composite, frame, main, retina) and `export-frame` (export, batch); viewport drag/zoom invalidate nothing and painting is suspended during viewport interaction.
- Reason: Lattice spacing sets squares/dots per frame; export resolution scales export pixels.
- Evidence: `src/app/app-performance.ts`; structural performance gate passes. Measured performance was not run (first delivery is functional-only).

## Evidence

- Source reviewed: `src/app/app-schema.ts`, `src/app/app-composition.tsx`, `src/app/app-acceptance-data.ts`, `src/app/app-performance.ts`, `src/app/network-scene/*`, `e2e/product-network.spec.ts`.
- References: the user's written scene description (no media reference inputs).
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, output-export-required, controls-section-inventory-required, timeline-enabled-behavior, acceptance-product-observable, performance-coverage-levels.

## Cover

- Capture: `public/toolcraft/cover.png` from the app's own Export PNG at 2K, default values, paused at 5.0 s; settings in `app-cover-state.json`, metadata in `app-cover.json`. Inspected visually: both hubs, fans, resolved response block and mid-scramble request block, no editor UI.

## Verification

Verification tier: Tier 4
Reason: first product delivery — new schema, custom Canvas 2D renderer, timeline, export and acceptance matrix.
Run: product unit tests, product browser acceptance, `npm run verify:delivery`.
Skip: measured performance (`verify:perf`, kernel benchmarks) — not authorized for first delivery.

## Risks

- Risk: the protected delivery gate cannot complete on this Windows machine until the signed framework-boundary alias test is fixed upstream (path separators) and the timeout fixture has headroom; both are framework-owned and must be fixed in the Toolcraft source and regenerated, not patched here.
- Risk: approximate monospace advance for label knock-out boxes.
