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

const windowDescription =
  "Shot percentage where the glyph scramble starts and where the last character locks. Values above 100% keep the block mid-scramble at the cut.";

function linesSection(
  id: string,
  title: string,
  target: string,
  defaultValue: string,
  description: string,
) {
  return {
    controls: {
      lines: {
        applicability: always,
        defaultValue,
        description,
        label: false,
        performanceReason: redraw,
        performanceRole: "responsiveness",
        target,
        textValueKind: "multiline",
        type: "code",
      },
    },
    id,
    title,
  } satisfies ToolcraftControlSectionSchema;
}

export const responseStatusSection = linesSection(
  "response-status",
  "Status Lines",
  "response.status",
  d.responseStatus,
  "Dim lines beside the lower hub. They hold steady and never scramble.",
);

export const responseBodySection = linesSection(
  "response-body",
  "Body Lines",
  "response.body",
  d.responseBody,
  "Lines that materialize as glyph scramble below the status lines.",
);

export const responseSection = {
  controls: {
    statusOpacity: {
      applicability: always,
      defaultValue: d.responseStatusOpacity,
      label: "Status opacity",
      max: 100,
      min: 0,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 1,
      target: "response.statusOpacity",
      type: "slider",
      unit: "%",
    },
    window: {
      applicability: always,
      defaultValue: [...d.responseWindow],
      description: windowDescription,
      label: "Decode window",
      max: 150,
      min: 0,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 0.5,
      target: "response.window",
      type: "rangeSlider",
      unit: "%",
    },
  },
  id: "response",
  title: "Response",
} satisfies ToolcraftControlSectionSchema;

export const requestTextSection = linesSection(
  "request-text",
  "Request Lines",
  "request.text",
  d.requestText,
  "Second block beside the upper hub. It appears late in the shot.",
);

export const requestSection = {
  controls: {
    window: {
      applicability: always,
      defaultValue: [...d.requestWindow],
      description: windowDescription,
      label: "Decode window",
      max: 150,
      min: 0,
      performanceReason: redraw,
      performanceRole: "responsiveness",
      sliderValueKind: "continuous",
      step: 0.5,
      target: "request.window",
      type: "rangeSlider",
      unit: "%",
    },
  },
  id: "request",
  title: "Request",
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
  responseStatusSection,
  responseBodySection,
  responseSection,
  requestTextSection,
  requestSection,
  decodeSection,
] as const;
