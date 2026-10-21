import type { ToolcraftSceneRect } from "@/toolcraft/runtime";

import { decodeBlock, type DecodedBlock } from "./decode-text";
import type { NetworkPoint, NetworkSceneParams } from "./scene-params";

export const NETWORK_TEXT_SIZE = 20;
export const NETWORK_TEXT_LINE_HEIGHT = 28;
export const NETWORK_TEXT_GAP = 18;
export const NETWORK_TEXT_FONT = `${NETWORK_TEXT_SIZE}px ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace`;

const UPPER_HUB_DIRECTION = normalize({ x: 0.92, y: 0.39 });
const LOWER_HUB_DIRECTION = normalize({ x: -0.95, y: -0.31 });

function normalize(point: NetworkPoint): NetworkPoint {
  const length = Math.hypot(point.x, point.y) || 1;
  return { x: point.x / length, y: point.y / length };
}

/** Deterministic lattice occupancy hash in [0, 1). */
export function hashCell(column: number, row: number): number {
  let hash = Math.imul(column, 374_761_393) + Math.imul(row, 668_265_263);
  hash = Math.imul(hash ^ (hash >>> 13), 1_274_126_177);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4_294_967_296;
}

export type NetworkHub = Readonly<{
  color: string;
  /** Scene-coordinate centre after the camera zoom. */
  screen: NetworkPoint;
  /** Offset from the shot centre before the camera zoom. */
  world: NetworkPoint;
}>;

export type NetworkSquare = Readonly<{ size: number; x: number; y: number }>;

export type NetworkSpoke = Readonly<{
  alpha: number;
  from: NetworkPoint;
  to: NetworkPoint;
}>;

export type NetworkTextBlock = Readonly<{
  decoded: DecodedBlock | null;
  left: number;
  lines: readonly Readonly<{ alpha: number; text: string }>[];
  top: number;
}>;

export type NetworkFrameModel = Readonly<{
  center: NetworkPoint;
  dots: Readonly<{ opacity: number; points: readonly number[]; size: number }>;
  hubSize: number;
  hubs: readonly [NetworkHub, NetworkHub];
  request: NetworkTextBlock;
  response: NetworkTextBlock;
  spokes: readonly NetworkSpoke[];
  squares: readonly NetworkSquare[];
  zoom: number;
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

function collectSquares(
  params: NetworkSceneParams,
  frame: ToolcraftSceneRect,
  center: NetworkPoint,
  zoom: number,
  hubs: readonly [NetworkPoint, NetworkPoint],
  isBlocked: (x: number, y: number, half: number) => boolean,
): { cells: NetworkPoint[]; squares: NetworkSquare[] } {
  const spacing = params.squareSpacing;
  const [smallest, largest] = params.squareSize;
  const falloff = params.squareFalloff;
  const step = spacing * zoom;
  const margin = largest * zoom;
  const firstColumn = Math.floor((frame.x - margin - center.x) / step);
  const lastColumn = Math.ceil((frame.x + frame.width + margin - center.x) / step);
  const firstRow = Math.floor((frame.y - margin - center.y) / step);
  const lastRow = Math.ceil((frame.y + frame.height + margin - center.y) / step);
  const cells: NetworkPoint[] = [];
  const squares: NetworkSquare[] = [];
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      if (hashCell(column, row) >= params.squareDensity) continue;
      const world = { x: column * spacing, y: row * spacing };
      const screenX = center.x + world.x * zoom;
      const screenY = center.y + world.y * zoom;
      const distance = Math.min(
        Math.hypot(world.x - hubs[0].x, world.y - hubs[0].y),
        Math.hypot(world.x - hubs[1].x, world.y - hubs[1].y),
      );
      const weight = Math.exp(-0.5 * (distance / falloff) ** 2);
      const size = (smallest + (largest - smallest) * weight) * zoom;
      // Squares behind a label are knocked out so the mono text stays legible.
      if (isBlocked(screenX, screenY, size / 2)) continue;
      cells.push(world);
      if (size < 0.2) continue;
      squares.push({ size, x: screenX, y: screenY });
    }
  }
  return { cells, squares };
}

function collectSpokes(
  params: NetworkSceneParams,
  cells: readonly NetworkPoint[],
  hub: NetworkPoint,
  center: NetworkPoint,
  zoom: number,
): NetworkSpoke[] {
  const limit = params.spokeCount + 1;
  const nearest: { distance: number; point: NetworkPoint }[] = [];
  const exclusion = params.squareSpacing * 0.35;
  for (const cell of cells) {
    const distance = Math.hypot(cell.x - hub.x, cell.y - hub.y);
    if (distance < exclusion) continue;
    if (nearest.length === limit && distance >= nearest[limit - 1]!.distance) continue;
    let index = nearest.length;
    while (index > 0 && nearest[index - 1]!.distance > distance) index -= 1;
    nearest.splice(index, 0, { distance, point: cell });
    if (nearest.length > limit) nearest.pop();
  }
  const count = Math.min(params.spokeCount, nearest.length);
  const cutoff =
    nearest.length > params.spokeCount
      ? (nearest[params.spokeCount - 1]!.distance + nearest[params.spokeCount]!.distance) / 2
      : Number.POSITIVE_INFINITY;
  const softness = params.squareSpacing * 0.5;
  const from = { x: center.x + hub.x * zoom, y: center.y + hub.y * zoom };
  const spokes: NetworkSpoke[] = [];
  for (let index = 0; index < nearest.length; index += 1) {
    const { distance, point } = nearest[index]!;
    // Neighbours entering or leaving the fan cross-fade instead of popping.
    const alpha =
      index < count || Number.isFinite(cutoff)
        ? Math.min(1, Math.max(0, 0.5 + (cutoff - distance) / softness))
        : 0;
    if (alpha <= 0) continue;
    spokes.push({
      alpha,
      from,
      to: { x: center.x + point.x * zoom, y: center.y + point.y * zoom },
    });
  }
  return spokes;
}

function collectDots(
  params: NetworkSceneParams,
  frame: ToolcraftSceneRect,
  center: NetworkPoint,
  zoom: number,
  isBlocked: (x: number, y: number, half: number) => boolean,
): number[] {
  if (params.dotOpacity <= 0) return [];
  // The faint dot grid marks every lattice point; squares sit on top of it.
  const step = params.squareSpacing * zoom;
  const firstColumn = Math.ceil((frame.x - center.x) / step);
  const lastColumn = Math.floor((frame.x + frame.width - center.x) / step);
  const firstRow = Math.ceil((frame.y - center.y) / step);
  const lastRow = Math.floor((frame.y + frame.height - center.y) / step);
  const points: number[] = [];
  const half = (params.dotSize * zoom) / 2;
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const x = center.x + column * step;
      const y = center.y + row * step;
      if (!isBlocked(x, y, half)) points.push(x, y);
    }
  }
  return points;
}

type LabelBox = Readonly<{ bottom: number; left: number; right: number; top: number }>;

const LABEL_CHAR_WIDTH = NETWORK_TEXT_SIZE * 0.62;
const LABEL_PADDING = 10;

function getLabelBox(block: NetworkTextBlock, reservedLines: readonly string[]): LabelBox | null {
  if (block.lines.length === 0) return null;
  const columns = Math.max(0, ...reservedLines.map((line) => Array.from(line).length));
  if (columns === 0) return null;
  return {
    bottom: block.top + reservedLines.length * NETWORK_TEXT_LINE_HEIGHT + LABEL_PADDING,
    left: block.left - LABEL_PADDING,
    right: block.left + columns * LABEL_CHAR_WIDTH + LABEL_PADDING,
    top: block.top - LABEL_PADDING,
  };
}

export function buildNetworkFrame({
  frame,
  params,
  progress,
  timeSeconds,
}: Readonly<{
  frame: ToolcraftSceneRect;
  params: NetworkSceneParams;
  progress: number;
  timeSeconds: number;
}>): NetworkFrameModel {
  const center = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
  const zoom = getNetworkZoom(params, progress);
  const hubWorld = getNetworkHubWorldPositions(params, frame, progress);
  const hubSize = params.hubSize * zoom;
  const hubs = [
    {
      color: params.upperHubColor,
      screen: { x: center.x + hubWorld[0].x * zoom, y: center.y + hubWorld[0].y * zoom },
      world: hubWorld[0],
    },
    {
      color: params.lowerHubColor,
      screen: { x: center.x + hubWorld[1].x * zoom, y: center.y + hubWorld[1].y * zoom },
      world: hubWorld[1],
    },
  ] as const;

  const shotPercent = progress * 100;
  const decode = (lines: readonly string[], window: readonly [number, number]) =>
    decodeBlock({
      glyphs: params.decodeGlyphs,
      lines,
      rate: params.decodeRate,
      shotPercent,
      timeSeconds,
      window,
    });
  const textLeft = (hub: NetworkHub) => hub.screen.x + hubSize / 2 + NETWORK_TEXT_GAP;
  const textTop = (hub: NetworkHub) => hub.screen.y - hubSize / 2;

  const body = decode(params.responseBodyLines, params.responseWindow);
  const response: NetworkTextBlock = {
    decoded: body,
    left: textLeft(hubs[1]),
    lines: [
      ...params.responseStatusLines.map((text) => ({
        alpha: params.responseStatusOpacity,
        text,
      })),
      ...(body.visible
        ? body.lines.map((line) => ({ alpha: 1, text: line.text }))
        : []),
    ],
    top: textTop(hubs[1]),
  };
  const requestBlock = decode(params.requestLines, params.requestWindow);
  const request: NetworkTextBlock = {
    decoded: requestBlock,
    left: textLeft(hubs[0]),
    lines: requestBlock.visible
      ? requestBlock.lines.map((line) => ({ alpha: 1, text: line.text }))
      : [],
    top: textTop(hubs[0]),
  };

  // The response block reserves its body lines up front so squares do not
  // pop out when the decode starts.
  const labelBoxes = [
    getLabelBox(response, [...params.responseStatusLines, ...params.responseBodyLines]),
    getLabelBox(request, params.requestLines),
  ].filter((box): box is LabelBox => box !== null);
  const isBlocked = (x: number, y: number, half: number) =>
    labelBoxes.some(
      (box) => x + half > box.left && x - half < box.right && y + half > box.top && y - half < box.bottom,
    );

  const { cells, squares } = collectSquares(params, frame, center, zoom, hubWorld, isBlocked);
  const spokes =
    params.spokeOpacity > 0 && params.spokeCount > 0
      ? [
          ...collectSpokes(params, cells, hubWorld[0], center, zoom),
          ...collectSpokes(params, cells, hubWorld[1], center, zoom),
        ]
      : [];

  return {
    center,
    dots: {
      opacity: params.dotOpacity,
      points: collectDots(params, frame, center, zoom, isBlocked),
      size: params.dotSize * zoom,
    },
    hubSize,
    hubs,
    request,
    response,
    spokes,
    squares,
    zoom,
  };
}
