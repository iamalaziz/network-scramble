import type { ToolcraftSceneRect } from "@/toolcraft/runtime";

import { getWindowProgress, type NetworkChapter } from "./chapters";
import { type LatticeCell, searchLatticePath } from "./path-search";
import {
  cellKey,
  cellWorld,
  findNearestOpenCell,
  getNetworkHubWorldPositions,
  getSquareWorldSize,
  hashTestFailure,
  isOpenCell,
  type LatticeSquare,
  type NetworkSpoke,
  type NetworkSquare,
} from "./scene-geometry";
import type { NetworkPoint, NetworkSceneParams } from "./scene-params";

/** Chapter share (percent) spent drawing the shortest path after the frontier reaches the goal. */
const PATH_REVEAL_PERCENT = 15;
/** Share of the visited cells highlighted as the live search frontier. */
const FRONTIER_SHARE = 0.06;
const SEARCH_MARGIN_CELLS = 4;
const FAILOVER_BLINK_HZ = 6;

export type ChapterContext = Readonly<{
  center: NetworkPoint;
  chapter: NetworkChapter;
  frame: ToolcraftSceneRect;
  /** Current hub world positions, which set square sizes this frame. */
  hubsWorld: readonly [NetworkPoint, NetworkPoint];
  isBlocked: (x: number, y: number, half: number) => boolean;
  params: NetworkSceneParams;
  squares: readonly LatticeSquare[];
  timeSeconds: number;
  zoom: number;
}>;

export type NetworkChapterOverlay = Readonly<{
  /** Squares redrawn in the accent color: the revealed path and fresh test passes. */
  accentFills: readonly NetworkSquare[];
  /** Accent outlines: the search frontier and the elected replica set. */
  accentOutlines: readonly NetworkSquare[];
  /** Mono outlines replacing a fill: the failed node and failed tests. */
  hollow: readonly NetworkSquare[];
  /** Revealed shortest-path segments. */
  path: readonly NetworkSpoke[];
  /** Scene x of the test scan line while it crosses the frame. */
  scanX: number | null;
  /** Search tree edges from each visited cell to its parent. */
  tree: readonly NetworkSpoke[];
}>;

export type ChapterEffect = Readonly<{
  overlay: NetworkChapterOverlay;
  /** Cells whose plain white fill the overlay replaces. */
  replaced: ReadonlySet<string>;
  /** Cells the hub fans must let go of. */
  spokeExcluded: ReadonlySet<string>;
  tokens: Readonly<Record<string, string>>;
}>;

const EMPTY_OVERLAY: NetworkChapterOverlay = Object.freeze({
  accentFills: [],
  accentOutlines: [],
  hollow: [],
  path: [],
  scanX: null,
  tree: [],
});

function toScreen(context: ChapterContext, world: NetworkPoint): NetworkPoint {
  return {
    x: context.center.x + world.x * context.zoom,
    y: context.center.y + world.y * context.zoom,
  };
}

function cellSquare(context: ChapterContext, cell: LatticeCell): NetworkSquare & { world: NetworkPoint } {
  const world = cellWorld(context.params, cell);
  const screen = toScreen(context, world);
  return {
    size: getSquareWorldSize(context.params, world, context.hubsWorld) * context.zoom,
    world,
    x: screen.x,
    y: screen.y,
  };
}

function outline(context: ChapterContext, square: NetworkSquare): NetworkSquare {
  return { ...square, size: Math.max(square.size, 8 * context.zoom) + 6 };
}

function visible(context: ChapterContext, square: NetworkSquare): boolean {
  return !context.isBlocked(square.x, square.y, square.size / 2);
}

function segment(context: ChapterContext, from: NetworkPoint, to: NetworkPoint, alpha: number): NetworkSpoke | null {
  if (context.isBlocked(from.x, from.y, 0) || context.isBlocked(to.x, to.y, 0)) return null;
  return { alpha, from, to };
}

/** Algorithm: Dijkstra from the upper hub to the lower hub, replayed as a growing frontier. */
export function buildSearchEffect(context: ChapterContext): ChapterEffect {
  const { chapter, params } = context;
  const hubsAtStart = getNetworkHubWorldPositions(params, context.frame, chapter.startProgress);
  const start = findNearestOpenCell(params, hubsAtStart[0]);
  const goal = findNearestOpenCell(params, hubsAtStart[1], { maxX: hubsAtStart[1].x });
  if (!start || !goal) {
    return { overlay: EMPTY_OVERLAY, replaced: new Set(), spokeExcluded: new Set(), tokens: { cost: "--", total: "0", visited: "0" } };
  }
  const result = searchLatticePath({
    goal,
    isOpen: (column, row) => isOpenCell(params, column, row),
    margin: SEARCH_MARGIN_CELLS,
    start,
  });
  const total = result.order.length;
  const shown = Math.floor(getWindowProgress(chapter.percent, params.searchWindow) * total);
  const screens = result.order.slice(0, shown).map((cell) => cellSquare(context, cell));

  const tree: NetworkSpoke[] = [];
  for (let index = 1; index < shown; index += 1) {
    const line = segment(context, screens[result.parents[index]!]!, screens[index]!, params.searchTreeOpacity);
    if (line) tree.push(line);
  }
  const accentOutlines: NetworkSquare[] = [];
  if (shown > 0 && shown < total) {
    const frontier = Math.max(1, Math.ceil(total * FRONTIER_SHARE));
    for (const square of screens.slice(Math.max(0, shown - frontier))) {
      if (visible(context, square)) accentOutlines.push(outline(context, square));
    }
  }

  const reveal = getWindowProgress(chapter.percent, [
    params.searchWindow[1],
    params.searchWindow[1] + PATH_REVEAL_PERCENT,
  ]);
  const path: NetworkSpoke[] = [];
  const accentFills: NetworkSquare[] = [];
  const replaced = new Set<string>();
  if (result.path && reveal > 0) {
    const cells = result.path.map((cell) => cellSquare(context, cell));
    const reach = reveal * (cells.length - 1);
    cells.forEach((square, index) => {
      if (index > reach || !visible(context, square)) return;
      accentFills.push(square);
      replaced.add(cellKey(result.path![index]!.column, result.path![index]!.row));
    });
    for (let index = 0; index < cells.length - 1 && index < reach; index += 1) {
      const from = cells[index]!;
      const to = cells[index + 1]!;
      const share = Math.min(1, reach - index);
      const end = { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share };
      const line = segment(context, from, end, 1);
      if (line) path.push(line);
    }
  }
  return {
    overlay: { ...EMPTY_OVERLAY, accentFills, accentOutlines, path, tree },
    replaced,
    spokeExcluded: new Set(),
    tokens: {
      cost: reveal > 0 && result.cost !== null ? result.cost.toFixed(1) : "--",
      total: String(total),
      visited: String(shown),
    },
  };
}

/** Distributed: the node beside the upper hub fails, the fans let go, and replicas are elected. */
export function buildFailoverEffect(context: ChapterContext): ChapterEffect {
  const { chapter, params } = context;
  const tokens = { replicas: String(params.failoverReplicas) };
  const hub = getNetworkHubWorldPositions(params, context.frame, chapter.startProgress)[0];
  const failed = findNearestOpenCell(params, hub, { maxX: hub.x });
  const [failAt, electAt] = params.failoverWindow;
  if (!failed || chapter.percent < failAt) {
    return { overlay: EMPTY_OVERLAY, replaced: new Set(), spokeExcluded: new Set(), tokens };
  }
  const key = cellKey(failed.column, failed.row);
  const square = cellSquare(context, failed);
  const elected = chapter.percent >= electAt;
  // Detection blinks the node on and off; after the election it stays hollow.
  const hollowNow = elected || Math.floor(context.timeSeconds * FAILOVER_BLINK_HZ) % 2 === 1;
  const hollow = hollowNow && visible(context, square) ? [square] : [];
  const accentOutlines: NetworkSquare[] = [];
  if (elected) {
    const chosen = new Set([key]);
    for (let index = 0; index < params.failoverReplicas; index += 1) {
      const replica = findNearestOpenCell(params, square.world, { exclude: chosen, maxX: hub.x });
      if (!replica) break;
      chosen.add(cellKey(replica.column, replica.row));
      const replicaSquare = cellSquare(context, replica);
      if (visible(context, replicaSquare)) accentOutlines.push(outline(context, replicaSquare));
    }
  }
  return {
    overlay: { ...EMPTY_OVERLAY, accentOutlines, hollow },
    replaced: hollowNow ? new Set([key]) : new Set(),
    spokeExcluded: new Set([key]),
    tokens,
  };
}

/** Testing: a scan line crosses the frame; passes flash in the accent, failures stay hollow. */
export function buildSweepEffect(context: ChapterContext): ChapterEffect {
  const { chapter, frame, params } = context;
  const active = chapter.percent > params.sweepWindow[0];
  const progress = getWindowProgress(chapter.percent, params.sweepWindow);
  // The line travels one trail length past the right edge so the last flashes clear.
  const scanX = frame.x + (frame.width + params.sweepTrail) * progress;
  const right = frame.x + frame.width;
  const bottom = frame.y + frame.height;
  const accentFills: NetworkSquare[] = [];
  const hollow: NetworkSquare[] = [];
  const replaced = new Set<string>();
  let passed = 0;
  let failedCount = 0;
  let total = 0;
  for (const square of context.squares) {
    if (square.size < 0.2 || square.x < frame.x || square.x > right || square.y < frame.y || square.y > bottom) continue;
    total += 1;
    if (!active || square.x > scanX) continue;
    if (hashTestFailure(square.column, square.row) < params.sweepFailRate) {
      failedCount += 1;
      hollow.push(square);
      replaced.add(cellKey(square.column, square.row));
    } else {
      passed += 1;
      if (scanX - square.x < params.sweepTrail) {
        accentFills.push(square);
        replaced.add(cellKey(square.column, square.row));
      }
    }
  }
  const coverage = active ? Math.round(Math.min(1, Math.max(0, (scanX - frame.x) / frame.width)) * 100) : 0;
  return {
    overlay: {
      ...EMPTY_OVERLAY,
      accentFills,
      hollow,
      scanX: active && progress < 1 && scanX <= right ? scanX : null,
    },
    replaced,
    spokeExcluded: new Set(),
    tokens: {
      coverage: String(coverage),
      failed: String(failedCount),
      passed: String(passed),
      total: String(total),
    },
  };
}
