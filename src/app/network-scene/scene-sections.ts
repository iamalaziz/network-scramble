import type { ToolcraftControlSectionSchema } from "@/toolcraft/runtime";

import { networkSceneDefaults as d, networkSceneLimits } from "./scene-params";

const always = { mode: "always" } as const;
const redraw = "Redraws the Canvas 2D shot frame with constant per-frame cost.";

export const backgroundSection = {
  controls: {
    includeBackground: {
      applicability: always,
      defaultValue: true,
      description: "Fills the shot with the background color in preview and PNG; off exports a transparent PNG.",
      label: "Include",
      performanceReason: "Runtime-owned background fill; the product foreground is not redrawn.",
      performanceRole: "responsiveness",
      target: "export.includeBackground",
      type: "switch",
    },
    background: {
      applicability: always,
      defaultValue: d.background,
      label: false,
      performanceReason: "Runtime-owned background fill; the product foreground is not redrawn.",
      performanceRole: "responsiveness",
      target: "appearance.background",
      type: "color",
    },
  },
  id: "background",
  layoutGroups: [{ columns: 2, controls: ["includeBackground", "background"], layout: "inline" }],
  title: "Background",
} satisfies ToolcraftControlSectionSchema;

export const squaresSection = {
  controls: {
    spacing: {
      applicability: always,
      defaultValue: d.squareSpacing,
      description: "Distance between lattice points of the square matrix and the faint dot grid.",
      label: "Spacing",
      max: networkSceneLimits.squareSpacingMax,
      min: networkSceneLimits.squareSpacingMin,
      performanceReason: "Smaller spacing increases the number of lattice cells drawn every frame.",
      performanceRole: "workload",
      sliderValueKind: "continuous",
      step: 1,
      target: "squares.spacing",
      type: "slider",
      unit: "px",
    },
    density: {
      applicability: always,
      defaultValue: d.squareDensity,
      description: "Share of lattice points that carry a square; the rest stay empty.",
      label: "Density",
      max: 100,
      min: 0,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 1,
      target: "squares.density",
      type: "slider",
      unit: "%",
    },
    size: {
      applicability: always,
      defaultValue: [...d.squareSize],
      description: "Square size at the outer edges (low) and right beside the hubs (high).",
      label: "Size",
      max: 48,
      min: 0,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 0.5,
      target: "squares.size",
      type: "rangeSlider",
      unit: "px",
    },
    falloff: {
      applicability: always,
      defaultValue: d.squareFalloff,
      description: "Radius over which squares shrink from hub size toward edge size.",
      label: "Falloff",
      max: 1200,
      min: 80,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 10,
      target: "squares.falloff",
      type: "slider",
      unit: "px",
    },
    color: {
      applicability: always,
      defaultValue: d.squareColor,
      description: "Mono foreground shared by squares, spokes, the dot grid and the labels.",
      label: "Color",
      performanceReason: redraw,
      performanceRole: "responsiveness",
      target: "squares.color",
      type: "color",
    },
  },
  id: "squares",
  title: "Squares",
} satisfies ToolcraftControlSectionSchema;

export const dotGridSection = {
  controls: {
    opacity: {
      applicability: always,
      defaultValue: d.dotOpacity,
      label: "Opacity",
      max: 100,
      min: 0,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 1,
      target: "dots.opacity",
      type: "slider",
      unit: "%",
    },
    size: {
      applicability: always,
      defaultValue: d.dotSize,
      label: "Size",
      max: 6,
      min: 0.5,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 0.5,
      target: "dots.size",
      type: "slider",
      unit: "px",
    },
  },
  id: "dots",
  title: "Dot Grid",
} satisfies ToolcraftControlSectionSchema;

export const hubsSection = {
  controls: {
    size: {
      applicability: always,
      defaultValue: d.hubSize,
      label: "Size",
      max: 64,
      min: 6,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 1,
      target: "hubs.size",
      type: "slider",
      unit: "px",
    },
    travel: {
      applicability: always,
      defaultValue: d.hubTravel,
      description: "Distance each hub glides across the grid over one shot; 0 holds them in place.",
      label: "Travel",
      max: 800,
      min: 0,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 10,
      target: "hubs.travel",
      type: "slider",
      unit: "px",
    },
  },
  id: "hubs",
  title: "Hubs",
} satisfies ToolcraftControlSectionSchema;

function hubSection(
  id: "upperHub" | "lowerHub",
  title: string,
  color: string,
  anchor: Readonly<{ x: number; y: number }>,
) {
  return {
    controls: {
      color: {
        applicability: always,
        defaultValue: color,
        label: "Color",
        performanceReason: redraw,
        performanceRole: "responsiveness",
        target: `${id}.color`,
        type: "color",
      },
      anchor: {
        applicability: always,
        defaultValue: { x: anchor.x, y: anchor.y },
        description: "Midpoint of the hub's path across the shot, relative to the frame.",
        label: "Anchor",
        performanceReason: redraw,
        performanceRole: "responsiveness",
        target: `${id}.anchor`,
        type: "vector",
      },
    },
    id: id === "upperHub" ? "upper-hub" : "lower-hub",
    title,
  } satisfies ToolcraftControlSectionSchema;
}

export const upperHubSection = hubSection("upperHub", "Upper Hub", d.upperHubColor, d.upperHubAnchor);
export const lowerHubSection = hubSection("lowerHub", "Lower Hub", d.lowerHubColor, d.lowerHubAnchor);

export const spokesSection = {
  controls: {
    count: {
      applicability: always,
      defaultValue: d.spokeCount,
      description: "Nearest squares each hub connects to; neighbours cross-fade in and out as the hubs move.",
      label: "Count",
      max: 24,
      min: 3,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "discrete",
      step: 1,
      target: "spokes.count",
      type: "slider",
      variant: "discrete",
    },
    width: {
      applicability: always,
      defaultValue: d.spokeWidth,
      label: "Width",
      max: 4,
      min: 0.5,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 0.25,
      target: "spokes.width",
      type: "slider",
      unit: "px",
    },
    opacity: {
      applicability: always,
      defaultValue: d.spokeOpacity,
      label: "Opacity",
      max: 100,
      min: 0,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 1,
      target: "spokes.opacity",
      type: "slider",
      unit: "%",
    },
  },
  id: "spokes",
  title: "Spokes",
} satisfies ToolcraftControlSectionSchema;

export const cameraSection = {
  controls: {
    zoom: {
      applicability: always,
      defaultValue: d.cameraZoom,
      description: "Magnification reached at the cut. The shot starts at 1 and pushes in continuously.",
      label: "Zoom",
      max: 3,
      min: 1,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 0.01,
      target: "camera.zoom",
      type: "slider",
    },
  },
  id: "camera",
  title: "Camera",
} satisfies ToolcraftControlSectionSchema;

const percentRange = (
  target: string,
  label: string,
  defaultValue: readonly [number, number],
  description: string,
  max = 100,
) =>
  ({
    applicability: always,
    defaultValue: [...defaultValue],
    description,
    label,
    max,
    min: 0,
    performanceReason: redraw,
    performanceRole: "responsiveness",
    sliderValueKind: "continuous",
    step: 0.5,
    target,
    type: "rangeSlider",
    unit: "%",
  }) as const;

const tokenHelp = (tokens: string) => `Live values: ${tokens}.`;

/** Dim steady title plus two decoded lines beside the chapter's hub. */
function labelControls(
  prefix: "search" | "failover" | "sweep",
  copy: Readonly<{ detail: string; headline: string; title: string; window: readonly [number, number] }>,
  tokens: string,
) {
  const text = (field: "title" | "headline" | "detail", label: string, defaultValue: string, description: string) =>
    ({
      applicability: always,
      defaultValue,
      description,
      label,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      target: `${prefix}.${field}`,
      textValueKind: "single-line",
      type: "text",
    }) as const;
  return {
    title: text("title", "Title", copy.title, "Dim chapter line that holds steady and never scrambles."),
    headline: text("headline", "Headline", copy.headline, `First decoded line. ${tokenHelp(tokens)}`),
    detail: text("detail", "Detail", copy.detail, `Second decoded line. ${tokenHelp(tokens)}`),
    labelWindow: percentRange(
      `${prefix}.labelWindow`,
      "Decode window",
      copy.window,
      "Chapter percentage where the glyph scramble starts and where the last character locks. Values above 100% keep the label mid-scramble when the chapter cuts.",
      150,
    ),
  };
}

export const chaptersSection = {
  controls: {
    cuts: {
      ...percentRange(
        "chapters.cuts",
        "Cut points",
        d.chapterCuts,
        "Shot percentages where the story cuts from Algorithm to Distributed and from Distributed to Testing.",
      ),
      max: 95,
      min: 5,
    },
    accent: {
      applicability: always,
      defaultValue: d.chapterAccent,
      description: "Highlight for the shortest path, the search frontier, elected replicas and passing tests.",
      label: "Accent",
      performanceReason: redraw,
      performanceRole: "responsiveness",
      target: "chapters.accent",
      type: "color",
    },
  },
  description: "The shot tells three chapters in order: an Algorithm path search, a Distributed failover and a Testing sweep.",
  id: "chapters",
  title: "Chapters",
} satisfies ToolcraftControlSectionSchema;

export const pathSearchSection = {
  controls: {
    window: percentRange(
      "search.window",
      "Timing",
      d.searchWindow,
      "Chapter percentage where Dijkstra starts expanding from the upper hub and where it reaches the lower hub. The shortest path then draws in.",
    ),
    treeOpacity: {
      applicability: always,
      defaultValue: d.searchTreeOpacity,
      description: "Lines from each visited node back to the node it was reached from.",
      label: "Tree opacity",
      max: 100,
      min: 0,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 1,
      target: "search.treeOpacity",
      type: "slider",
      unit: "%",
    },
    pathWidth: {
      applicability: always,
      defaultValue: d.searchPathWidth,
      label: "Path width",
      max: 6,
      min: 0.5,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 0.25,
      target: "search.pathWidth",
      type: "slider",
      unit: "px",
    },
    ...labelControls(
      "search",
      { detail: d.searchDetail, headline: d.searchHeadline, title: d.searchTitle, window: d.searchLabelWindow },
      "{visited} nodes settled, {total} nodes searched, {cost} path cost",
    ),
  },
  description: "Algorithm chapter: a Dijkstra search across the occupied squares, labelled beside the lower hub.",
  id: "path-search",
  title: "Path Search",
} satisfies ToolcraftControlSectionSchema;

export const failoverSection = {
  controls: {
    window: percentRange(
      "failover.window",
      "Timing",
      d.failoverWindow,
      "Chapter percentage where the node beside the upper hub fails and starts blinking, and where it goes dark and the replica set is elected.",
    ),
    replicas: {
      applicability: always,
      defaultValue: d.failoverReplicas,
      description: "Neighbours of the failed node outlined as the elected replica set.",
      label: "Replicas",
      max: 6,
      min: 1,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "discrete",
      step: 1,
      target: "failover.replicas",
      type: "slider",
      variant: "discrete",
    },
    ...labelControls(
      "failover",
      { detail: d.failoverDetail, headline: d.failoverHeadline, title: d.failoverTitle, window: d.failoverLabelWindow },
      "{replicas} replica count",
    ),
  },
  description: "Distributed chapter: a node fails, the hub fans let go of it and a replica set takes over, labelled beside the upper hub.",
  id: "failover",
  title: "Failover",
} satisfies ToolcraftControlSectionSchema;

export const testSweepSection = {
  controls: {
    window: percentRange(
      "sweep.window",
      "Timing",
      d.sweepWindow,
      "Chapter percentage where the scan line enters the left edge and where it has crossed the frame.",
    ),
    failRate: {
      applicability: always,
      defaultValue: d.sweepFailRate,
      description: "Share of squares that fail when the scan line reaches them and stay hollow.",
      label: "Fail rate",
      max: 30,
      min: 0,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 0.5,
      target: "sweep.failRate",
      type: "slider",
      unit: "%",
    },
    trail: {
      applicability: always,
      defaultValue: d.sweepTrail,
      description: "Distance behind the scan line where passing squares still flash in the accent.",
      label: "Trail",
      max: 600,
      min: 0,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 10,
      target: "sweep.trail",
      type: "slider",
      unit: "px",
    },
    ...labelControls(
      "sweep",
      { detail: d.sweepDetail, headline: d.sweepHeadline, title: d.sweepTitle, window: d.sweepLabelWindow },
      "{passed}, {failed} and {total} squares, {coverage} percent of the frame scanned",
    ),
  },
  description: "Testing chapter: a scan line validates every square, labelled beside the lower hub.",
  id: "test-sweep",
  title: "Test Sweep",
} satisfies ToolcraftControlSectionSchema;

export const decodeSection = {
  controls: {
    rate: {
      applicability: always,
      defaultValue: d.decodeRate,
      description: "How often unlocked characters swap to a new random glyph.",
      label: "Scramble rate",
      max: 60,
      min: 1,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 1,
      target: "decode.rate",
      type: "slider",
      unit: "fps",
    },
    glyphs: {
      applicability: always,
      defaultValue: d.decodeGlyphs,
      description: "Characters the scramble cycles through before each real character locks in.",
      label: "Glyphs",
      performanceReason: redraw,
      performanceRole: "responsiveness",
      target: "decode.glyphs",
      textValueKind: "single-line",
      type: "text",
    },
    titleOpacity: {
      applicability: always,
      defaultValue: d.labelTitleOpacity,
      description: "Brightness of the steady chapter titles above each decoded label.",
      label: "Title opacity",
      max: 100,
      min: 0,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 1,
      target: "decode.titleOpacity",
      type: "slider",
      unit: "%",
    },
  },
  id: "decode",
  title: "Decode",
} satisfies ToolcraftControlSectionSchema;

export const networkSceneSections = [
  backgroundSection,
  squaresSection,
  dotGridSection,
  hubsSection,
  upperHubSection,
  lowerHubSection,
  spokesSection,
  cameraSection,
  chaptersSection,
  pathSearchSection,
  failoverSection,
  testSweepSection,
  decodeSection,
] as const;
