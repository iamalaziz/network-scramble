import type { ToolcraftSceneRect } from "@/toolcraft/runtime";

import type { LatticeCell } from "./path-search";
import type { NetworkPoint, NetworkSceneParams } from "./scene-params";

const UPPER_HUB_DIRECTION = normalize({ x: 0.92, y: 0.39 });
const LOWER_HUB_DIRECTION = normalize({ x: -0.95, y: -0.31 });

function normalize(point: NetworkPoint): NetworkPoint {
  const length = Math.hypot(point.x, point.y) || 1;
  return { x: point.x / length, y: point.y / length };
}

function mixHash(column: number, row: number, seed: number): number {
  let hash = Math.imul(column, 374_761_393) + Math.imul(row, 668_265_263) + Math.imul(seed, 2_246_822_519);
  hash = Math.imul(hash ^ (hash >>> 13), 1_274_126_177);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4_294_967_296;
}

/** Deterministic lattice occupancy hash in [0, 1). */
export function hashCell(column: number, row: number): number {
  return mixHash(column, row, 0);
}

/** Independent per-cell hash that decides which squares fail the test sweep. */
export function hashTestFailure(column: number, row: number): number {
  return mixHash(column, row, 7);
}

export function isOpenCell(params: NetworkSceneParams, column: number, row: number): boolean {
  return hashCell(column, row) < params.squareDensity;
}

export function cellKey(column: number, row: number): string {
  return `${column},${row}`;
}

export type NetworkSquare = Readonly<{ size: number; x: number; y: number }>;

export type NetworkSpoke = Readonly<{
  alpha: number;
  from: NetworkPoint;
  to: NetworkPoint;
}>;

/** One occupied lattice cell that survived the label knock-out this frame. */
export type LatticeSquare = Readonly<{
  column: number;
  row: number;
  size: number;
  world: NetworkPoint;
  x: number;
  y: number;
}>;

/** Camera magnification grows exponentially so the push-in reads as constant speed. */
export function getNetworkZoom(params: NetworkSceneParams, progress: number): number {
  return params.cameraZoom ** Math.min(1, Math.max(0, progress));
}

export function getNetworkHubWorldPositions(
  params: NetworkSceneParams,
  frame: ToolcraftSceneRect,
  progress: number,
): readonly [NetworkPoint, NetworkPoint] {
  const sweep = progress - 0.5;
  const turn = Math.PI * 2 * progress;
  const place = (
    anchor: NetworkPoint,
    direction: NetworkPoint,
    phase: number,
  ): NetworkPoint => ({
    x:
      (anchor.x * frame.width) / 2 +
      params.hubTravel * (direction.x * sweep + 0.08 * Math.sin(turn + phase)),
    y:
      (anchor.y * frame.height) / 2 +
      params.hubTravel * (direction.y * sweep + 0.08 * Math.cos(turn * 0.7 + phase)),
  });
  return [
    place(params.upperHubAnchor, UPPER_HUB_DIRECTION, 0.4),
    place(params.lowerHubAnchor, LOWER_HUB_DIRECTION, 2.1),
  ];
}

/** Square size before the camera zoom: large beside a hub, small at the edges. */
export function getSquareWorldSize(
  params: NetworkSceneParams,
  world: NetworkPoint,
  hubs: readonly [NetworkPoint, NetworkPoint],
): number {
  const [smallest, largest] = params.squareSize;
  const distance = Math.min(
    Math.hypot(world.x - hubs[0].x, world.y - hubs[0].y),
    Math.hypot(world.x - hubs[1].x, world.y - hubs[1].y),
  );
  const weight = Math.exp(-0.5 * (distance / params.squareFalloff) ** 2);
  return smallest + (largest - smallest) * weight;
}

export function cellWorld(params: NetworkSceneParams, cell: LatticeCell): NetworkPoint {
  return { x: cell.column * params.squareSpacing, y: cell.row * params.squareSpacing };
}

/**
 * Nearest occupied cell to a point, skipping the cell under the point itself.
 * `maxX` keeps the choice left of a label that starts beside a hub.
 */
export function findNearestOpenCell(
  params: NetworkSceneParams,
  point: NetworkPoint,
  options: Readonly<{ exclude?: ReadonlySet<string>; maxX?: number }> = {},
): LatticeCell | null {
  const spacing = params.squareSpacing;
  const originColumn = Math.round(point.x / spacing);
  const originRow = Math.round(point.y / spacing);
  const minimum = spacing * 0.35;
  for (const radius of [4, 10]) {
    let best: { cell: LatticeCell; distance: number } | null = null;
    for (let row = originRow - radius; row <= originRow + radius; row += 1) {
      for (let column = originColumn - radius; column <= originColumn + radius; column += 1) {
        if (!isOpenCell(params, column, row)) continue;
        if (options.exclude?.has(cellKey(column, row))) continue;
        const x = column * spacing;
        const y = row * spacing;
        if (options.maxX !== undefined && x > options.maxX) continue;
        const distance = Math.hypot(x - point.x, y - point.y);
        if (distance < minimum) continue;
        if (!best || distance < best.distance) best = { cell: { column, row }, distance };
      }
    }
    if (best) return best.cell;
  }
  return null;
}
