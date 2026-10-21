import {
  registerToolcraftRendererPipeline,
  type ToolcraftRendererPipelinePassContract,
} from "@/toolcraft/runtime";

import type { NetworkFrameSummary } from "./scene-draw";
import type { NetworkFrameModel } from "./scene-model";

type NetworkRendererPasses = {
  "export-frame": ToolcraftRendererPipelinePassContract<NetworkFrameSummary>;
  "preview-frame": ToolcraftRendererPipelinePassContract<NetworkFrameModel | null>;
};

/** Every slider-like control whose pointer drag redraws the live frame. */
export const networkDragTargets = [
  "squares.spacing",
  "squares.density",
  "squares.size",
  "squares.falloff",
  "dots.opacity",
  "dots.size",
  "hubs.size",
  "hubs.travel",
  "upperHub.anchor",
  "lowerHub.anchor",
  "spokes.count",
  "spokes.width",
  "spokes.opacity",
  "camera.zoom",
  "response.statusOpacity",
  "response.window",
  "request.window",
  "decode.rate",
] as const;

/** Discrete edits (colors, text, canvas sizing) that redraw the live frame. */
export const networkChangeTargets = [
  "squares.color",
  "upperHub.color",
  "lowerHub.color",
  "response.status",
  "response.body",
  "request.text",
  "decode.glyphs",
  "canvas.infinity",
  "canvas.aspectRatio",
  "canvas.size.width",
  "canvas.size.height",
  "canvas.renderScale",
] as const;

/** Runtime-owned surfaces that never touch the product foreground. */
export const networkRuntimeOnlyTargets = [
  "export.includeBackground",
  "appearance.background",
  "export.image.format",
  "export.image.resolution",
] as const;

const intrinsicShotBounds = {
  kind: "intrinsic",
  reason:
    "The output is one camera shot: the grid, hubs, spokes and labels are composed only inside the shot frame, which is the product's authored framing.",
} as const;

export const networkRendererPipelineRegistration =
  registerToolcraftRendererPipeline<NetworkRendererPasses>()({
    interactionInvalidation: [
      {
        interaction: "initial-render",
        invalidates: ["preview-frame"],
        targets: ["canvas.initial-render"],
      },
      {
        interaction: "control-drag",
        invalidates: ["preview-frame"],
        targets: networkDragTargets,
      },
      {
        interaction: "control-change",
        invalidates: ["preview-frame"],
        targets: networkChangeTargets,
      },
      {
        interaction: "control-change",
        invalidates: [],
        mustNotInvalidate: ["preview-frame"],
        targets: networkRuntimeOnlyTargets,
      },
      {
        interaction: "timeline-playback",
        invalidates: ["preview-frame"],
        targets: ["timeline.time"],
      },
      {
        interaction: "timeline-scrub",
        invalidates: ["preview-frame"],
        targets: ["timeline.time"],
      },
      {
        interaction: "viewport-drag",
        invalidates: [],
        mustNotInvalidate: ["preview-frame"],
        targets: ["canvas.viewport.offset"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["preview-frame"],
        targets: ["canvas.viewport.zoom"],
      },
      {
        interaction: "export",
        invalidates: ["export-frame"],
        mustNotInvalidate: ["preview-frame"],
        targets: ["actions.output"],
      },
    ],
    passes: [
      {
        cost: {
          dimensions: ["grid-spacing"],
          frequency: "frame",
          relationship: "linear",
        },
        id: "preview-frame",
        inputs: ["product.values", "timeline.time", "canvas.backing.width", "canvas.backing.height"],
        invalidatedBy: ["product.values", "timeline.time", "canvas.backing.width", "canvas.backing.height"],
        // Builds the frame's squares, spokes and decoded labels; the result is
        // painted as flat rectangles, lines and text runs on the retained canvas.
        kind: "vector-build",
        lifecycle: { cache: "none", resourceScope: "call" },
        output: "preview",
        quality: "retina",
        runsOn: "main",
        sceneBounds: intrinsicShotBounds,
      },
      {
        cost: {
          dimensions: ["grid-spacing", "export-long-edge"],
          frequency: "batch",
          relationship: "product",
        },
        id: "export-frame",
        inputs: ["product.values", "timeline.time", "destination.context"],
        invalidatedBy: ["product.values", "timeline.time", "destination.context"],
        kind: "export",
        lifecycle: { cache: "none", resourceScope: "call" },
        output: "export",
        quality: "export",
        runsOn: "main",
      },
    ],
    runtimeId: "network-scramble-v1",
  });

export const previewFramePass = networkRendererPipelineRegistration.getPass("preview-frame");
export const exportFramePass = networkRendererPipelineRegistration.getPass("export-frame");
