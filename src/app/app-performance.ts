import {
  defineToolcraftDiscreteFixtureAdapter,
  defineToolcraftFixtureAdapter,
  defineToolcraftPerformance,
  deriveToolcraftPerformancePaths,
  type ToolcraftEnvelopePerformanceConfig,
  type ToolcraftPerformanceScenario,
} from "@/toolcraft/runtime";

import { appSchema } from "./app-schema";
import { networkRendererPipelineRegistration } from "./network-scene/pipeline";
import { networkSceneDefaults, networkSceneLimits } from "./network-scene/scene-params";

const gridSpacingFixture = defineToolcraftFixtureAdapter<number>({
  apply: (value) => value,
  dimensionId: "grid-spacing",
  observe: (value) => value,
});

const exportLongEdgeFixture = defineToolcraftDiscreteFixtureAdapter({
  dimensionId: "export-long-edge",
  domain: {
    kind: "schema-options",
    optionValues: ["2k", "4k", "8k"],
    target: "export.image.resolution",
  },
  entries: [
    { appliedValue: "2k", value: 2_048 },
    { appliedValue: "4k", value: 4_096 },
    { appliedValue: "8k", value: 8_192 },
  ],
});

const basePerformance = defineToolcraftPerformance({
  fixtureAdapters: {
    dimensions: {
      "export-long-edge": exportLongEdgeFixture,
      "grid-spacing": gridSpacingFixture,
    },
  },
  rendererPipeline: networkRendererPipelineRegistration,
  rendererStrategy: "canvas-2d",
  rendererTechnique: {
    exportRenderer: "canvas-2d",
    fidelityRisks: [
      "Preview and export must evaluate the same shot progress so the decoded characters and hub positions match.",
      "Monospace label metrics come from the system font stack and can differ slightly between platforms.",
    ],
    intentionalRasterizationReason:
      "The shot is a dense animated field of squares, dots and lines redrawn every frame; Canvas 2D raster output matches the PNG artifact.",
    layers: [
      {
        content: ["dense-pattern", "geometry", "text"],
        exportMode: "included",
        id: "networkShot",
        kind: "product-foreground",
        primitiveCount: "high",
        renderer: "canvas-2d",
        uiSelector: 'canvas[data-toolcraft-product-output="network-scene"]',
      },
    ],
    performanceRisks: [
      "Smaller lattice spacing multiplies the squares and dots drawn every frame.",
      "Nearest-neighbour spoke selection scans every visible lattice cell per hub per frame.",
    ],
    previewRenderer: "canvas-2d",
    productRepresentation: "pixel",
    rendererStrategy: "canvas-2d",
    sourceRepresentation: "procedural-data",
    whyNotAlternativeStrategies: [
      "SVG/DOM would mount thousands of animated nodes and reconcile them every frame.",
      "WebGL adds shader and glyph-atlas complexity for flat rectangles, lines and a few text lines that Canvas 2D draws directly.",
    ],
  },
  scenarios: [],
  usesCustomRenderer: true,
  workloadEnvelope: {
    dimensions: [
      {
        batchMax: 8_192,
        defaultValue: 4_096,
        id: "export-long-edge",
        mapping: "direct",
        source: { kind: "schema-target", target: "export.image.resolution" },
        unit: "pixels",
      },
      {
        batchMax: networkSceneLimits.squareSpacingMin,
        defaultValue: networkSceneDefaults.squareSpacing,
        id: "grid-spacing",
        interactiveMax: networkSceneLimits.squareSpacingMin,
        mapping: "direct",
        source: {
          kind: "schema-target",
          target: "squares.spacing",
          workloadBoundary: "minimum",
        },
        unit: "px",
      },
    ],
  },
} satisfies ToolcraftEnvelopePerformanceConfig);

function getScenarioLocator(
  path: Readonly<{ interaction: string; targets: readonly string[] }>,
): Readonly<Record<string, string>> {
  if (path.interaction === "control-drag") return { controlLabel: "Spacing" };
  if (path.interaction === "control-change") {
    const [target] = path.targets;
    return target ? { uiSelector: `[data-toolcraft-control-target="${target}"]` } : {};
  }
  if (path.interaction === "timeline-playback" || path.interaction === "timeline-scrub") {
    return { uiSelector: '[aria-label="Playback position"]' };
  }
  return {};
}

function createScenarios(performance: ToolcraftEnvelopePerformanceConfig): ToolcraftPerformanceScenario[] {
  return deriveToolcraftPerformancePaths(appSchema, performance).map(
    (path): ToolcraftPerformanceScenario => {
      const common = {
        automated: true,
        automatedTestName: `perf: network ${path.id}`,
        browser: true,
        browserTestName: `browser perf: network ${path.id}`,
        coversTargets: path.targets,
        expectedObservable: `The ${path.interaction} path keeps the network shot at full Resolution scale.`,
        fixture: "network scramble shot",
        id: `network-${path.id}`,
        pathId: path.id,
        ...(path.targets.length === 1 ? { target: path.targets[0] } : {}),
      };
      if (path.interaction === "export") {
        return {
          ...common,
          actionValue: "export.png",
          completionEvidence: "download",
          controlLabel: "Export PNG",
          interaction: "export",
        };
      }
      return { ...common, ...getScenarioLocator(path), interaction: path.interaction };
    },
  );
}

export const appPerformance = defineToolcraftPerformance({
  ...basePerformance,
  scenarios: createScenarios(basePerformance),
});
