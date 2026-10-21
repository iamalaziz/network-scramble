import type {
  ToolcraftComponentAcceptance,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftProductReadiness,
  ToolcraftTransferMode,
} from "./acceptance/types";
import { appSchema } from "./app-schema";
import {
  getNetworkBrowserTestName,
  getNetworkRuntimeUnitTestName,
  NETWORK_RUNTIME_BROWSER_SPEC,
  networkControlRows,
} from "./network-scene/acceptance-rows";
import { NETWORK_SHOT_SECONDS } from "./network-scene/scene-timing";

const persistenceSlices =
  appSchema.persistence.storage === "localStorage"
    ? appSchema.persistence.include
    : [];

export const appTransferMode: ToolcraftTransferMode = {
  animationIntent: {
    loopDuration: {
      evidence:
        'The request times the late block at "~4.7 – 5.03" and says it is still mid-scramble "when the scene cuts", so one shot lasts 5.03 s and the loop seam is that cut.',
      seconds: NETWORK_SHOT_SECONDS,
      source: "user-request",
    },
    mode: "timeline-playback",
  },
  mode: "new-toolcraft-app",
  referenceInputs: [],
};

export const appProductReadiness: ToolcraftProductReadiness = {
  exportIntent: {
    image: { mode: "toolcraft-default" },
    svg: { mode: "not-requested" },
    video: { mode: "not-requested" },
  },
  interactionOwnership: [
    {
      alternative: {
        reason:
          "A canvas handle would chase a hub that keeps moving during playback and would only reach its current position, not the authored path midpoint.",
        surface: "canvas",
      },
      capability: "property-edit",
      evidence: {
        detail:
          "Usability comparison: the anchor is the midpoint of a timeline-driven path, so a stable pad edits it precisely while the hub animates.",
        source: "usability-analysis",
      },
      id: "upper-hub-anchor",
      reason: "The panel Vector pad edits the upper hub's path anchor as a stable authored parameter.",
      selectionScope: { mode: "global" },
      surface: "panel",
      target: "upperHub.anchor",
    },
    {
      alternative: {
        reason:
          "A canvas handle would chase a hub that keeps moving during playback and would only reach its current position, not the authored path midpoint.",
        surface: "canvas",
      },
      capability: "property-edit",
      evidence: {
        detail:
          "Usability comparison: the anchor is the midpoint of a timeline-driven path, so a stable pad edits it precisely while the hub animates.",
        source: "usability-analysis",
      },
      id: "lower-hub-anchor",
      reason: "The panel Vector pad edits the lower hub's path anchor as a stable authored parameter.",
      selectionScope: { mode: "global" },
      surface: "panel",
      target: "lowerHub.anchor",
    },
    {
      alternative: {
        reason: "Panel buttons would separate continuous panning from the viewport it moves.",
        surface: "panel",
      },
      capability: "direct-spatial-edit",
      evidence: {
        detail: "Usability comparison selects direct canvas dragging for continuous viewport offset feedback.",
        source: "usability-analysis",
      },
      id: "viewport-pan",
      reason: "The canvas owns viewport panning because the gesture directly moves the visible world frame.",
      surface: "canvas",
      target: "canvas.setOffset",
    },
    {
      alternative: {
        reason: "Panel controls would duplicate runtime zoom tools and detach zoom focus from the canvas.",
        surface: "panel",
      },
      capability: "direct-spatial-edit",
      evidence: {
        detail: "Usability comparison selects canvas wheel and runtime zoom gestures around the active focus.",
        source: "usability-analysis",
      },
      id: "viewport-zoom",
      reason: "The canvas owns viewport zoom because scale and focus need immediate spatial feedback.",
      surface: "canvas",
      target: "canvas.setViewport",
    },
  ],
  mode: "product",
  productName: "Network Scramble",
  productSummary:
    "An animated network shot: a zooming sparse matrix of white squares over a faint dot grid, two travelling lime hubs whose spoke fans re-target nearby squares, and mono labels that materialize through left-to-right glyph-scramble decoding.",
  requestedBehavior:
    "Play, scrub and tune the shot with controls for the grid, hubs, spokes, camera push-in and the decoded text blocks, then export the current frame.",
  viewInteraction: {
    mode: "non-spatial",
    reason: "The shot is a flat two-dimensional graphic with a 2D camera push-in and no 3D model or camera.",
  },
};

function runtimeRow(
  row: Omit<ToolcraftComponentAcceptance, "automated" | "automatedTestName" | "browser"> &
    Partial<Pick<ToolcraftComponentAcceptance, "browser">>,
): ToolcraftComponentAcceptance {
  return {
    automated: true,
    automatedTestName: getNetworkRuntimeUnitTestName(row.id),
    browser: {
      budget: "standard",
      file: NETWORK_RUNTIME_BROWSER_SPEC,
      testName: getNetworkBrowserTestName(row.id),
    },
    ...row,
    id: `shot.${row.id}`,
  };
}

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = [
  {
    automated: true,
    automatedTestName: "declares production reload coverage for the network scramble schema",
    browser: {
      budget: "extended-io",
      file: "e2e/app-persistence.spec.ts",
      testName: "browser: app restores exact canvas, values, and panel workspace slices after reload",
    },
    componentType: "persistence",
    evidence: "persistence-state",
    expectedObservable:
      "Canvas size and zoom, product values, timeline settings and the panel workspace restore after a real reload.",
    fixture: "network scramble persisted workspace",
    id: "persistence.reload",
    kind: "runtime",
    persistenceCoverage: "reload",
    persistenceSlices,
    target: "canvas.size.width",
    userAction: "Edit Canvas width and zoom, move and collapse Controls, wait for persistence, and reload.",
  },
  ...networkControlRows,
  runtimeRow({
    backgroundOutputCoverage: [
      "preview-hidden-when-excluded",
      "image-transparent-when-excluded",
      "infinity-viewport-color-and-dependency",
    ],
    componentType: "switch",
    evidence: "rendered-pixels",
    expectedObservable:
      "Turning Background off removes the black fill behind the shot and exports a transparent PNG; turning it on restores the fill.",
    fixture: "default network shot",
    id: "background.include",
    kind: "control",
    target: "export.includeBackground",
    userAction: "Toggle Background and compare preview and PNG alpha.",
  }),
  runtimeRow({
    componentType: "color",
    evidence: "exported-bytes",
    expectedObservable: "The selected Background color fills empty areas of the exported PNG.",
    fixture: "default network shot",
    id: "background.color",
    kind: "control",
    target: "appearance.background",
    userAction: "Change Background color and inspect decoded export pixels.",
  }),
  runtimeRow({
    componentType: "select",
    evidence: "exported-bytes",
    expectedObservable: "Selecting PNG or JPG downloads a decodable image of that type through the relabelled export button.",
    fixture: "network image formats",
    id: "export.image-format",
    kind: "control",
    optionCoverage: ["png", "jpg"],
    target: "export.image.format",
    userAction: "Select JPG and PNG, export each and decode the downloads.",
  }),
  runtimeRow({
    componentType: "select",
    evidence: "exported-bytes",
    expectedObservable: "2K, 4K and 8K exports decode to 2048, 4096 and 8192 pixel long edges.",
    fixture: "network image resolutions",
    id: "export.image-resolution",
    kind: "control",
    optionCoverage: ["2k", "4k", "8k"],
    target: "export.image.resolution",
    userAction: "Select 2K, 4K and 8K, export each and decode the image dimensions.",
  }),
  runtimeRow({
    actionCoverage: ["export.png"],
    componentType: "panelActions",
    evidence: "exported-bytes",
    exportArtifactCoverage: "all-required-image-export-behavior",
    expectedObservable:
      "Export PNG downloads the shot frame at the playhead time with lime hub and white square pixels at the selected resolution.",
    fixture: "network shot paused at 5.0 s",
    id: "export.image",
    kind: "control",
    target: "actions.output",
    userAction: "Pause the shot, click Export PNG and decode the download.",
  }),
  runtimeRow({
    componentType: "canvas",
    evidence: "rendered-pixels",
    expectedObservable:
      "The product canvas backing stays CSS size × device pixel ratio × selected Resolution scale while steady, during viewport interaction and during playback.",
    fixture: "default network shot at Resolution scale 2",
    id: "canvas.render-scale",
    kind: "runtime",
    renderScaleCoverage: {
      kind: "selected-backing-pixels",
      states: ["interaction", "playback", "steady"],
    },
    target: "canvas.renderScale",
    userAction: "Keep Resolution scale at 2 and inspect live backing pixels while steady, panning and playing.",
  }),
  runtimeRow({
    componentType: "timeline",
    evidence: "timeline-output",
    expectedObservable:
      "Scrubbing changes the frame, the end of the shot cuts back to its first frame, a duration edit rescales the same shot, and pause holds the frame.",
    fixture: "5.03 s network shot",
    id: "timeline.playback",
    kind: "runtime",
    target: "timeline.playback",
    timelineCoverage: "playback",
    timelineLoopProof: {
      direction: "forward-only",
      durationChange: "reproved-after-edit",
      reversePlayback: "forbidden",
      seam: "first-last-match",
    },
    timelinePlaybackCoverage: "all-playback-behavior",
    userAction: "Scrub to start, end and middle, edit the duration, then play, pause and resume.",
  }),
  runtimeRow({
    componentType: "canvas",
    evidence: "viewport-side-effect",
    expectedObservable:
      "Infinity canvas removes only the finite boundary while the shot frame, canvas element, backing and pixels stay continuous, and turning it off restores the same artboard.",
    fixture: "default network shot paused at 5.0 s",
    id: "canvas.infinity-mode",
    infinityCanvasCoverage: "mode-continuity-and-restoration",
    kind: "runtime",
    target: "canvas.infinity",
    userAction: "Toggle Infinity canvas on and off and compare frame, element identity, backing and pixels.",
  }),
  runtimeRow({
    componentType: "canvas",
    evidence: "exported-bytes",
    expectedObservable:
      "Infinity PNG export keeps the shot frame dimensions, crop, background and decoded pixels of the finite export.",
    fixture: "default network shot paused at 5.0 s",
    id: "canvas.infinity-export",
    infinityCanvasCoverage: "scene-bounds-image-export",
    kind: "runtime",
    target: "canvas.infinity",
    userAction: "Export PNG in finite and Infinity mode and compare decoded artifacts.",
  }),
  runtimeRow({
    componentType: "canvas viewport",
    evidence: "viewport-side-effect",
    expectedObservable:
      "Panning the canvas holds the painted frame without redrawing while playback keeps running, then resumes at the current time.",
    fixture: "playing network shot",
    id: "viewport.pan",
    interactionId: "viewport-pan",
    kind: "runtime",
    target: "canvas.setOffset",
    userAction: "Space-drag the canvas during playback.",
  }),
  runtimeRow({
    componentType: "canvas viewport",
    evidence: "viewport-side-effect",
    expectedObservable:
      "Zooming the canvas changes the viewport zoom while the shot keeps its output size and resumes drawing at the current time.",
    fixture: "playing network shot",
    id: "viewport.zoom",
    interactionId: "viewport-zoom",
    kind: "runtime",
    target: "canvas.setViewport",
    userAction: "Ctrl-wheel zoom the canvas during playback.",
  }),
];


export const appControlSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] = [
  {
    entity: "Shot background",
    entityId: "shot-background",
    finiteSelectors: [
      {
        affectedTargets: ["appearance.background"],
        reason: "Background inclusion decides whether its color fills the preview and PNG.",
        role: "branch",
        target: "export.includeBackground",
      },
    ],
    groupingReason: "Inclusion and color jointly define the fill behind the transparent network foreground.",
    id: "background",
    targets: ["export.includeBackground", "appearance.background"],
    title: "Background",
  },
  {
    entity: "Square matrix",
    entityId: "square-matrix",
    finiteSelectors: [],
    groupingReason: "Spacing, density, size range, falloff and color together define the sparse square matrix.",
    id: "squares",
    targets: ["squares.spacing", "squares.density", "squares.size", "squares.falloff", "squares.color"],
    title: "Squares",
  },
  {
    entity: "Background dot grid",
    entityId: "dot-grid",
    finiteSelectors: [],
    groupingReason: "Opacity and size tune the faint dot layer under the squares.",
    id: "dots",
    targets: ["dots.opacity", "dots.size"],
    title: "Dot Grid",
  },
  {
    entity: "Hub motion",
    entityId: "hub-motion",
    finiteSelectors: [],
    groupingReason: "Size and travel apply to both hubs and reset together.",
    id: "hubs",
    targets: ["hubs.size", "hubs.travel"],
    title: "Hubs",
  },
  {
    entity: "Upper hub",
    entityId: "upper-hub",
    finiteSelectors: [],
    groupingReason: "Color and path anchor define the upper hub.",
    id: "upper-hub",
    targets: ["upperHub.color", "upperHub.anchor"],
    title: "Upper Hub",
  },
  {
    entity: "Lower hub",
    entityId: "lower-hub",
    finiteSelectors: [],
    groupingReason: "Color and path anchor define the lower hub.",
    id: "lower-hub",
    targets: ["lowerHub.color", "lowerHub.anchor"],
    title: "Lower Hub",
  },
  {
    entity: "Spoke fans",
    entityId: "spoke-fans",
    finiteSelectors: [
      {
        reason: "Spoke count changes only how many neighbours each hub fans out to.",
        role: "parameter",
        target: "spokes.count",
      },
    ],
    groupingReason: "Count, width and opacity define the 1px fans radiating from each hub.",
    id: "spokes",
    targets: ["spokes.count", "spokes.width", "spokes.opacity"],
    title: "Spokes",
  },
  {
    entity: "Camera push-in",
    entityId: "camera",
    finiteSelectors: [],
    groupingReason: "Zoom sets how far the continuous push-in travels by the cut.",
    id: "camera",
    targets: ["camera.zoom"],
    title: "Camera",
  },
  {
    entity: "Response block",
    entityId: "response-block",
    finiteSelectors: [],
    groupingReason: "The dim status lines are the first text of the label beside the lower hub.",
    id: "response-status",
    splitReason: "Multiline text editors render as standalone sections; editing the status copy is its own task with its own reset.",
    targets: ["response.status"],
    title: "Status Lines",
    workflowStage: "status-copy",
  },
  {
    entity: "Response block",
    entityId: "response-block",
    finiteSelectors: [],
    groupingReason: "The body lines are the decoded text of the label beside the lower hub.",
    id: "response-body",
    splitReason: "Multiline text editors render as standalone sections; editing the decoded copy is its own task with its own reset.",
    targets: ["response.body"],
    title: "Body Lines",
    workflowStage: "body-copy",
  },
  {
    entity: "Response block",
    entityId: "response-block",
    finiteSelectors: [],
    groupingReason: "Status dimming and the body decode window time and style the label beside the lower hub.",
    id: "response",
    splitReason: "Timing and dimming are tuned separately from the copy and reset without discarding edited text.",
    targets: ["response.statusOpacity", "response.window"],
    title: "Response",
    workflowStage: "timing",
  },
  {
    entity: "Request block",
    entityId: "request-block",
    finiteSelectors: [],
    groupingReason: "The request copy is the late block beside the upper hub.",
    id: "request-text",
    splitReason: "Multiline text editors render as standalone sections; editing the request copy is its own task with its own reset.",
    targets: ["request.text"],
    title: "Request Lines",
    workflowStage: "copy",
  },
  {
    entity: "Request block",
    entityId: "request-block",
    finiteSelectors: [],
    groupingReason: "The decode window times when the request block appears and how far it resolves before the cut.",
    id: "request",
    splitReason: "Timing is tuned separately from the copy and resets without discarding edited text.",
    targets: ["request.window"],
    title: "Request",
    workflowStage: "timing",
  },
  {
    entity: "Glyph scramble",
    entityId: "glyph-scramble",
    finiteSelectors: [],
    groupingReason: "Rate and glyph set define the scramble shared by both decoding blocks.",
    id: "decode",
    targets: ["decode.rate", "decode.glyphs"],
    title: "Decode",
  },
  {
    entity: "Image delivery",
    entityId: "image-delivery",
    finiteSelectors: [
      {
        reason: "Image format changes its own exported artifact encoding.",
        role: "parameter",
        target: "export.image.format",
      },
      {
        reason: "Image resolution changes its own exported artifact dimensions.",
        role: "parameter",
        target: "export.image.resolution",
      },
    ],
    groupingReason: "Format and resolution jointly configure the exported frame.",
    id: "runtime.image-export",
    targets: ["export.image.format", "export.image.resolution"],
    title: "Image Export",
  },
];
