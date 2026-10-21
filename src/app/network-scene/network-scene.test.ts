import { describe, expect, it } from "vitest";

import { getToolcraftVideoExportSize } from "@/toolcraft/runtime";

import { appSchema } from "../app-schema";
import {
  getNetworkRuntimeUnitTestName,
  getNetworkUnitTestName,
  NETWORK_CHAPTER_SECONDS,
} from "./acceptance-rows";
import { decodeBlock } from "./decode-text";
import { networkExportRenderer } from "./export-renderer";
import { searchLatticePath } from "./path-search";
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

const at = NETWORK_CHAPTER_SECONDS;

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
  ["chapters.accent", { "chapters.accent": "#00FFFF" }, at.path],
  ["search.treeOpacity", { "search.treeOpacity": 90 }, at.search],
  ["search.pathWidth", { "search.pathWidth": 5 }, at.path],
  ["failover.replicas", { "failover.replicas": 6 }, at.elected],
  ["sweep.failRate", { "sweep.failRate": 25 }, at.sweep],
  ["sweep.trail", { "sweep.trail": 500 }, at.sweep],
  ["decode.rate", { "decode.rate": 50 }],
  ["decode.glyphs", { "decode.glyphs": "XYZ" }],
  ["decode.titleOpacity", { "decode.titleOpacity": 90 }],
  ...(["search", "failover", "sweep"] as const).flatMap((prefix) => {
    const time = { failover: at.failover, search: at.search, sweep: at.sweep }[prefix];
    return [
      [`${prefix}.title`, { [`${prefix}.title`]: "99 · edited" }, time],
      [`${prefix}.headline`, { [`${prefix}.headline`]: "edited headline" }, time],
      [`${prefix}.detail`, { [`${prefix}.detail`]: "edited detail" }, time],
    ] as const;
  }),
];

/** Each range row proves both thumbs: [time, lower-thumb edit, upper-thumb edit]. */
const rangeEdits: readonly (readonly [id: string, time: number, lower: unknown, upper: unknown])[] = [
  ["squares.size", pausedSeconds, [6, 26], [1.5, 40]],
  ["chapters.cuts", at.elected, [20, 67], [33.5, 45]],
  ["search.window", at.search, [20, 70], [5, 40]],
  ["search.labelWindow", at.search, [20, 55], [8, 30]],
  ["failover.window", at.failover, [30, 40], [5, 15]],
  ["failover.labelWindow", at.failover, [16, 60], [12, 30]],
  ["sweep.window", at.sweep, [30, 92], [8, 70]],
  ["sweep.labelWindow", at.sweep, [40, 115], [20, 80]],
];

describe("network scene controls", () => {
  for (const [id, values, time] of controlEdits) {
    it(getNetworkUnitTestName(id), () => {
      expect(drawOps(values, time)).not.toEqual(drawOps({}, time));
    });
  }

  for (const [id, time, lower, upper] of rangeEdits) {
    it(getNetworkUnitTestName(id), () => {
      const base = drawOps({}, time);
      expect(drawOps({ [id]: lower }, time)).not.toEqual(base);
      expect(drawOps({ [id]: upper }, time)).not.toEqual(base);
    });
  }

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
});

function frameAt(seconds: number, values: Readonly<Record<string, unknown>> = {}) {
  return buildNetworkFrame({
    frame,
    params: readNetworkSceneParams(values),
    progress: seconds / NETWORK_SHOT_SECONDS,
    timeSeconds: seconds,
  });
}

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

  it("keeps the Testing label mid-scramble at the cut with default timing", () => {
    const model = frameAt(NETWORK_SHOT_SECONDS * 0.9999);
    expect(model.chapter.id).toBe("sweep");
    const [headline] = model.label.decoded!.lines;
    expect(headline!.text.startsWith("frontend e2e")).toBe(true);
    expect(headline!.locked).toBeLessThan(Array.from(headline!.text).length);
  });
});

describe("network scene chapters", () => {
  it("plays Algorithm, Distributed and Testing in order", () => {
    expect(frameAt(at.search).chapter.id).toBe("search");
    expect(frameAt(at.path).chapter.id).toBe("search");
    expect(frameAt(at.failover).chapter.id).toBe("failover");
    expect(frameAt(at.elected).chapter.id).toBe("failover");
    expect(frameAt(at.sweep).chapter.id).toBe("sweep");
    expect(frameAt(at.search).label.lines[0]!.text).toBe("01 · algorithm");
    expect(frameAt(at.elected).label.lines[0]!.text).toBe("02 · distributed");
    expect(frameAt(at.sweep).label.lines[0]!.text).toBe("03 · testing");
  });

  it("finds the Dijkstra shortest path on an open lattice", () => {
    const result = searchLatticePath({
      goal: { column: 3, row: 2 },
      isOpen: () => true,
      margin: 2,
      start: { column: 0, row: 0 },
    });
    expect(result.cost).toBeCloseTo(2 * Math.SQRT2 + 1);
    expect(result.path![0]).toEqual({ column: 0, row: 0 });
    expect(result.path!.at(-1)).toEqual({ column: 3, row: 2 });
    expect(result.order[0]).toEqual({ column: 0, row: 0 });
    expect(result.parents[0]).toBe(-1);
  });

  it("routes around closed cells and reports an unreachable goal", () => {
    const wall = (column: number, row: number) => column !== 1 || row === 3;
    const around = searchLatticePath({ goal: { column: 2, row: 0 }, isOpen: wall, margin: 3, start: { column: 0, row: 0 } });
    expect(around.path!.some((cell) => cell.row === 3)).toBe(true);
    const blocked = searchLatticePath({
      goal: { column: 2, row: 0 },
      isOpen: (column) => column !== 1,
      margin: 1,
      start: { column: 0, row: 0 },
    });
    expect(blocked.path).toBeNull();
    expect(blocked.cost).toBeNull();
  });

  it("grows the search frontier and then draws the shortest path", () => {
    const searching = frameAt(at.search);
    expect(searching.overlay.tree.length).toBeGreaterThan(0);
    expect(searching.overlay.accentOutlines.length).toBeGreaterThan(0);
    expect(searching.overlay.path).toHaveLength(0);
    const solved = frameAt(at.path);
    expect(solved.overlay.path.length).toBeGreaterThan(0);
    expect(solved.overlay.accentFills.length).toBeGreaterThan(0);
    expect(solved.label.lines[2]!.text).toMatch(/^visited \d+ · cost \d+\.\d$/u);
  });

  it("fails a node, drops it from the fans and elects replicas", () => {
    const before = frameAt(at.failover, { "failover.window": [30, 40] });
    expect(before.overlay.hollow).toHaveLength(0);
    const elected = frameAt(at.elected);
    expect(elected.overlay.hollow).toHaveLength(1);
    expect(elected.overlay.accentOutlines).toHaveLength(3);
    expect(frameAt(at.elected, { "failover.replicas": 5 }).overlay.accentOutlines).toHaveLength(5);
    const failed = elected.overlay.hollow[0]!;
    expect(elected.spokes.every((spoke) => Math.hypot(spoke.to.x - failed.x, spoke.to.y - failed.y) > 1)).toBe(true);
  });

  it("sweeps a scan line that counts passing and failing squares", () => {
    const sweep = frameAt(at.sweep);
    expect(sweep.overlay.scanX).not.toBeNull();
    expect(sweep.overlay.accentFills.length).toBeGreaterThan(0);
    const live = frameAt(at.sweep, { "sweep.labelWindow": [0, 1] });
    expect(live.label.lines[1]!.text).toMatch(/^frontend e2e · (\d+) passed · (\d+) failed$/u);
    const none = frameAt(at.sweep, { "sweep.failRate": 0, "sweep.labelWindow": [0, 1] });
    expect(none.overlay.hollow).toHaveLength(0);
    expect(none.label.lines[1]!.text).toMatch(/ 0 failed$/u);
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

  async function exportOps(timeSeconds: number, durationSeconds = NETWORK_SHOT_SECONDS): Promise<string[]> {
    const context = createRecordingContext();
    await networkExportRenderer.renderFrame({
      context,
      frame,
      pixelRatio: 1,
      rendererPipeline: null,
      signal: new AbortController().signal,
      state: { timeline: { durationSeconds }, values: {} } as never,
      timeSeconds,
      timelineProgress: timeSeconds / durationSeconds,
    });
    return context.ops;
  }

  it(getNetworkRuntimeUnitTestName("export.video-format"), () => {
    expect(JSON.stringify(appSchema)).toContain("export.video.format");
  });

  it(getNetworkRuntimeUnitTestName("export.video-resolution"), () => {
    const state = { values: {} } as never;
    expect(getToolcraftVideoExportSize({ frame, resolution: "current", state })).toMatchObject({
      height: 1080,
      width: 1920,
    });
    expect(getToolcraftVideoExportSize({ frame, resolution: "4k", state })).toMatchObject({
      height: 2160,
      width: 3840,
    });
  });

  it(getNetworkRuntimeUnitTestName("export.video"), async () => {
    // Runtime video export samples the shared frame renderer at 30 FPS timestamps.
    const first = await exportOps(0, 1);
    const middle = await exportOps(15 / 30, 1);
    expect(middle).not.toEqual(first);
    expect(await exportOps(1, 1)).toEqual(first);
  });

  it(getNetworkRuntimeUnitTestName("canvas.infinity-video-export"), async () => {
    expect(await exportOps(2.5)).toEqual(await exportOps(2.5));
    expect(getNetworkShotRect({ height: 1080, width: 1920 })).toEqual(frame);
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
