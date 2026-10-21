import type { ToolcraftSceneRect } from "@/toolcraft/runtime";

import {
  buildFailoverEffect,
  buildSearchEffect,
  buildSweepEffect,
  type ChapterContext,
  type ChapterEffect,
  type NetworkChapterOverlay,
} from "./chapter-effects";
import {
  fillLabelTokens,
  getNetworkChapter,
  LABEL_TOKEN_PLACEHOLDER,
  type NetworkChapter,
  type NetworkChapterId,
} from "./chapters";
import { decodeBlock, type DecodedBlock } from "./decode-text";
import {
  cellKey,
  getNetworkHubWorldPositions,
  getNetworkZoom,
  getSquareWorldSize,
  isOpenCell,
  type LatticeSquare,
  type NetworkSpoke,
  type NetworkSquare,
} from "./scene-geometry";
import type { NetworkChapterLabel, NetworkPoint, NetworkSceneParams } from "./scene-params";

export { getNetworkHubWorldPositions, getNetworkZoom } from "./scene-geometry";
export type { NetworkSpoke, NetworkSquare } from "./scene-geometry";

export const NETWORK_TEXT_SIZE = 20;
export const NETWORK_TEXT_LINE_HEIGHT = 28;
export const NETWORK_TEXT_GAP = 18;
export const NETWORK_TEXT_FONT = `${NETWORK_TEXT_SIZE}px ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace`;

export type NetworkHub = Readonly<{
  color: string;
  /** Scene-coordinate centre after the camera zoom. */
  screen: NetworkPoint;
  /** Offset from the shot centre before the camera zoom. */
  world: NetworkPoint;
}>;

export type NetworkTextBlock = Readonly<{
  decoded: DecodedBlock | null;
  left: number;
  lines: readonly Readonly<{ alpha: number; text: string }>[];
  top: number;
}>;

export type NetworkFrameModel = Readonly<{
  center: NetworkPoint;
  chapter: NetworkChapter;
  dots: Readonly<{ opacity: number; points: readonly number[]; size: number }>;
  frame: ToolcraftSceneRect;
  hubSize: number;
  hubs: readonly [NetworkHub, NetworkHub];
  label: NetworkTextBlock;
  overlay: NetworkChapterOverlay;
  spokes: readonly NetworkSpoke[];
  squares: readonly NetworkSquare[];
  zoom: number;
}>;

/** Which hub each chapter's label sits beside, and how the chapter plays out. */
const CHAPTERS: Readonly<
  Record<
    NetworkChapterId,
    Readonly<{
      build: (context: ChapterContext) => ChapterEffect;
      hub: 0 | 1;
      label: (params: NetworkSceneParams) => NetworkChapterLabel;
    }>
  >
> = {
  failover: { build: buildFailoverEffect, hub: 0, label: (params) => params.failoverLabel },
  search: { build: buildSearchEffect, hub: 1, label: (params) => params.searchLabel },
  sweep: { build: buildSweepEffect, hub: 1, label: (params) => params.sweepLabel },
};

function collectSquares(
  params: NetworkSceneParams,
  frame: ToolcraftSceneRect,
  center: NetworkPoint,
  zoom: number,
  hubs: readonly [NetworkPoint, NetworkPoint],
  isBlocked: (x: number, y: number, half: number) => boolean,
): LatticeSquare[] {
  const spacing = params.squareSpacing;
  const step = spacing * zoom;
  const margin = params.squareSize[1] * zoom;
  const firstColumn = Math.floor((frame.x - margin - center.x) / step);
  const lastColumn = Math.ceil((frame.x + frame.width + margin - center.x) / step);
  const firstRow = Math.floor((frame.y - margin - center.y) / step);
  const lastRow = Math.ceil((frame.y + frame.height + margin - center.y) / step);
  const squares: LatticeSquare[] = [];
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      if (!isOpenCell(params, column, row)) continue;
      const world = { x: column * spacing, y: row * spacing };
      const x = center.x + world.x * zoom;
      const y = center.y + world.y * zoom;
      const size = getSquareWorldSize(params, world, hubs) * zoom;
      // Squares behind a label are knocked out so the mono text stays legible.
      if (isBlocked(x, y, size / 2)) continue;
      squares.push({ column, row, size, world, x, y });
    }
  }
  return squares;
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

function getLabelBox(left: number, top: number, reservedLines: readonly string[]): LabelBox | null {
  const columns = Math.max(0, ...reservedLines.map((line) => Array.from(line).length));
  if (columns === 0) return null;
  return {
    bottom: top + reservedLines.length * NETWORK_TEXT_LINE_HEIGHT + LABEL_PADDING,
    left: left - LABEL_PADDING,
    right: left + columns * LABEL_CHAR_WIDTH + LABEL_PADDING,
    top: top - LABEL_PADDING,
  };
}

function reserveTokens(text: string): string {
  return text.replace(/\{\w+\}/gu, LABEL_TOKEN_PLACEHOLDER);
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

  const chapter = getNetworkChapter(params, progress);
  const story = CHAPTERS[chapter.id];
  const copy = story.label(params);
  const anchor = hubs[story.hub];
  const labelLeft = anchor.screen.x + hubSize / 2 + NETWORK_TEXT_GAP;
  const labelTop = anchor.screen.y - hubSize / 2;
  // The label reserves its full box for the whole chapter so squares do not
  // pop out when the decode starts or a live token grows.
  const box = getLabelBox(labelLeft, labelTop, [
    copy.title,
    reserveTokens(copy.headline),
    reserveTokens(copy.detail),
  ]);
  const isBlocked = (x: number, y: number, half: number) =>
    box !== null &&
    x + half > box.left &&
    x - half < box.right &&
    y + half > box.top &&
    y - half < box.bottom;

  const lattice = collectSquares(params, frame, center, zoom, hubWorld, isBlocked);
  const effect = story.build({
    center,
    chapter,
    frame,
    hubsWorld: hubWorld,
    isBlocked,
    params,
    squares: lattice,
    timeSeconds,
    zoom,
  });
  const squares: NetworkSquare[] = [];
  const cells: NetworkPoint[] = [];
  for (const square of lattice) {
    const key = cellKey(square.column, square.row);
    if (!effect.spokeExcluded.has(key)) cells.push(square.world);
    if (square.size < 0.2 || effect.replaced.has(key)) continue;
    squares.push({ size: square.size, x: square.x, y: square.y });
  }
  const spokes =
    params.spokeOpacity > 0 && params.spokeCount > 0
      ? [
          ...collectSpokes(params, cells, hubWorld[0], center, zoom),
          ...collectSpokes(params, cells, hubWorld[1], center, zoom),
        ]
      : [];

  const decoded = decodeBlock({
    glyphs: params.decodeGlyphs,
    lines: [fillLabelTokens(copy.headline, effect.tokens), fillLabelTokens(copy.detail, effect.tokens)],
    rate: params.decodeRate,
    shotPercent: chapter.percent,
    timeSeconds,
    window: copy.window,
  });
  const label: NetworkTextBlock = {
    decoded,
    left: labelLeft,
    lines: [
      { alpha: params.labelTitleOpacity, text: copy.title },
      ...(decoded.visible ? decoded.lines.map((line) => ({ alpha: 1, text: line.text })) : []),
    ],
    top: labelTop,
  };

  return {
    center,
    chapter,
    dots: {
      opacity: params.dotOpacity,
      points: collectDots(params, frame, center, zoom, isBlocked),
      size: params.dotSize * zoom,
    },
    frame,
    hubSize,
    hubs,
    label,
    overlay: effect.overlay,
    spokes,
    squares,
    zoom,
  };
}
