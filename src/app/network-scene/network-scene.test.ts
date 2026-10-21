import { describe, expect, it } from "vitest";

import { appSchema } from "../app-schema";
import { getNetworkRuntimeUnitTestName, getNetworkUnitTestName } from "./acceptance-rows";
import { decodeBlock } from "./decode-text";
import { networkExportRenderer } from "./export-renderer";
import { networkRendererPipelineRegistration } from "./pipeline";
import { createRecordingContext } from "./recording-context.test-support";
import { getNetworkShotRect } from "./scene-bounds";
import { drawNetworkFrame } from "./scene-draw";
import { buildNetworkFrame } from "./scene-model";
import { readNetworkSceneParams } from "./scene-params";
import { NETWORK_SHOT_SECONDS } from "./scene-timing";

const frame = getNetworkShotRect({ height: 1080, width: 1920 });
const pausedSeconds = 4.85;

function drawOps(
  values: Readonly<Record<string, unknown>> = {},
  timeSeconds = pausedSeconds,
  durationSeconds = NETWORK_SHOT_SECONDS,
): string[] {
  const context = createRecordingContext();
  const loopTime = ((timeSeconds % durationSeconds) + durationSeconds) % durationSeconds;
  drawNetworkFrame(context, {
    frame,
    params: readNetworkSceneParams(values),
    progress: loopTime / durationSeconds,
    timeSeconds: loopTime,
  });
  return context.ops;
}

function hubScreen(values: Readonly<Record<string, unknown>>, index: 0 | 1) {
  return buildNetworkFrame({
    frame,
    params: readNetworkSceneParams(values),
    progress: pausedSeconds / NETWORK_SHOT_SECONDS,
    timeSeconds: pausedSeconds,
  }).hubs[index].screen;
}

const controlEdits: readonly (readonly [id: string, values: Record<string, unknown>, time?: number])[] = [
  ["squares.spacing", { "squares.spacing": 40 }],
  ["squares.density", { "squares.density": 30 }],
  ["squares.falloff", { "squares.falloff": 600 }],
  ["squares.color", { "squares.color": "#FF0000" }],
  ["dots.opacity", { "dots.opacity": 60 }],
  ["dots.size", { "dots.size": 5 }],
  ["hubs.size", { "hubs.size": 48 }],
  ["hubs.travel", { "hubs.travel": 0 }],
  ["upperHub.color", { "upperHub.color": "#00FFFF" }],
  ["lowerHub.color", { "lowerHub.color": "#FF00FF" }],
  ["spokes.count", { "spokes.count": 4 }],
  ["spokes.width", { "spokes.width": 3 }],
  ["spokes.opacity", { "spokes.opacity": 20 }],
  ["camera.zoom", { "camera.zoom": 2.5 }],
  ["response.status", { "response.status": "< 500 ERR" }],
  ["response.statusOpacity", { "response.statusOpacity": 90 }],
  ["response.body", { "response.body": "credits required 9" }],
  ["request.text", { "request.text": "> GET /v1/models" }],
  ["decode.rate", { "decode.rate": 50 }],
  ["decode.glyphs", { "decode.glyphs": "XYZ" }],
];

describe("network scene controls", () => {
  for (const [id, values, time] of controlEdits) {
    it(getNetworkUnitTestName(id), () => {
      expect(drawOps(values, time)).not.toEqual(drawOps({}, time));
    });
  }

  it(getNetworkUnitTestName("squares.size"), () => {
    const base = drawOps();
    expect(drawOps({ "squares.size": [6, 26] })).not.toEqual(base);
    expect(drawOps({ "squares.size": [1.5, 40] })).not.toEqual(base);
  });

  it(getNetworkUnitTestName("upperHub.anchor"), () => {
    const base = hubScreen({}, 0);
    const right = hubScreen({ "upperHub.anchor": { x: -0.2, y: -0.36 } }, 0);
    const down = hubScreen({ "upperHub.anchor": { x: -0.42, y: -0.1 } }, 0);
    expect(right.x).toBeGreaterThan(base.x);
    expect(right.y).toBeCloseTo(base.y);
    expect(down.y).toBeGreaterThan(base.y);
    expect(down.x).toBeCloseTo(base.x);
  });

  it(getNetworkUnitTestName("lowerHub.anchor"), () => {
    const base = hubScreen({}, 1);
    const left = hubScreen({ "lowerHub.anchor": { x: -0.2, y: 0.34 } }, 1);
    const up = hubScreen({ "lowerHub.anchor": { x: 0.02, y: 0.1 } }, 1);
    expect(left.x).toBeLessThan(base.x);
    expect(up.y).toBeLessThan(base.y);
  });

  it(getNetworkUnitTestName("response.window"), () => {
    const midScramble = 1.5;
    const base = drawOps({}, midScramble);
    expect(drawOps({ "response.window": [30, 48] }, midScramble)).not.toEqual(base);
    expect(drawOps({ "response.window": [22, 30] }, midScramble)).not.toEqual(base);
  });

  it(getNetworkUnitTestName("request.window"), () => {
    const base = drawOps();
    expect(drawOps({ "request.window": [60, 108] })).not.toEqual(base);
    expect(drawOps({ "request.window": [93, 97] })).not.toEqual(base);
  });
});

describe("network scene decode", () => {
  it("locks characters left to right and never fades the block in", () => {
    const lines = ["credits required 5"];
    const decode = (shotPercent: number) =>
      decodeBlock({ glyphs: "@#", lines, rate: 24, shotPercent, timeSeconds: 1, window: [20, 40] });
    expect(decode(10).visible).toBe(false);
    expect(decode(20).lines[0]!.locked).toBe(0);
    expect(decode(30).lines[0]!.text.startsWith("credits r")).toBe(true);
    expect(decode(40).lines[0]!.text).toBe("credits required 5");
  });

  it("keeps the request block mid-scramble at the cut with default timing", () => {
    const model = buildNetworkFrame({
      frame,
      params: readNetworkSceneParams({}),
      progress: 0.9999,
      timeSeconds: NETWORK_SHOT_SECONDS * 0.9999,
    });
    const [first] = model.request.decoded!.lines;
    expect(first!.text.startsWith("> POST /v2")).toBe(true);
    expect(first!.locked).toBeLessThan(Array.from("> POST /v2/messages/batch").length);
  });
});

describe("network scene runtime", () => {
  it("declares production reload coverage for the network scramble schema", () => {
    expect(appSchema.persistence.storage).toBe("localStorage");
    expect(appSchema.persistence.storage === "localStorage" && appSchema.persistence.include).toEqual(
      expect.arrayContaining(["canvas", "panels", "timeline", "values"]),
    );
  });

  it(getNetworkRuntimeUnitTestName("background.include"), () => {
    expect(drawOps({ "export.includeBackground": false })).toEqual(drawOps());
  });

  it(getNetworkRuntimeUnitTestName("background.color"), () => {
    expect(drawOps({ "appearance.background": "#203040" })).toEqual(drawOps());
  });

  it(getNetworkRuntimeUnitTestName("export.image-format"), () => {
    expect(JSON.stringify(appSchema)).toContain("export.image.format");
  });

  it(getNetworkRuntimeUnitTestName("export.image-resolution"), () => {
    expect(JSON.stringify(appSchema)).toContain("export.image.resolution");
  });

  it(getNetworkRuntimeUnitTestName("export.image"), async () => {
    const context = createRecordingContext();
    await networkExportRenderer.renderFrame({
      context,
      frame,
      pixelRatio: 2,
      rendererPipeline: null,
      signal: new AbortController().signal,
      state: {
        timeline: { durationSeconds: NETWORK_SHOT_SECONDS },
        values: {},
      } as never,
      timeSeconds: pausedSeconds,
      timelineProgress: pausedSeconds / NETWORK_SHOT_SECONDS,
    });
    expect(context.ops.slice(1, -1)).toEqual(drawOps());
    expect(context.ops.some((op) => op.startsWith("fillRect") && op.includes("#DAFB33"))).toBe(true);
  });

  it(getNetworkRuntimeUnitTestName("canvas.render-scale"), () => {
    expect(JSON.stringify(appSchema)).toContain("canvas.renderScale");
  });

  it(getNetworkRuntimeUnitTestName("timeline.playback"), () => {
    for (const duration of [NETWORK_SHOT_SECONDS, 3]) {
      expect(drawOps({}, duration, duration)).toEqual(drawOps({}, 0, duration));
      expect(drawOps({}, duration / 2, duration)).not.toEqual(drawOps({}, 0, duration));
    }
  });

  it(getNetworkRuntimeUnitTestName("canvas.infinity-mode"), () => {
    expect(getNetworkShotRect({ height: 1080, width: 1920 })).toEqual({
      height: 1080,
      width: 1920,
      x: -960,
      y: -540,
    });
  });

  it(getNetworkRuntimeUnitTestName("canvas.infinity-export"), () => {
    const model = buildNetworkFrame({
      frame,
      params: readNetworkSceneParams({}),
      progress: 0.5,
      timeSeconds: 2.5,
    });
    for (const square of model.squares) {
      expect(square.x).toBeGreaterThan(frame.x - 60);
      expect(square.x).toBeLessThan(frame.x + frame.width + 60);
    }
  });

  const viewportPaths = networkRendererPipelineRegistration.interactionInvalidation;

  it(getNetworkRuntimeUnitTestName("viewport.pan"), () => {
    const pan = viewportPaths.find((entry) => entry.interaction === "viewport-drag");
    expect(pan?.invalidates).toEqual([]);
    expect(pan?.mustNotInvalidate).toContain("preview-frame");
  });

  it(getNetworkRuntimeUnitTestName("viewport.zoom"), () => {
    const zoom = viewportPaths.find((entry) => entry.interaction === "viewport-zoom");
    expect(zoom?.invalidates).toEqual([]);
    expect(zoom?.mustNotInvalidate).toContain("preview-frame");
  });
});
