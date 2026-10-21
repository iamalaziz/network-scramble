import type { ToolcraftSceneRect } from "@/toolcraft/runtime";

import {
  buildNetworkFrame,
  NETWORK_TEXT_FONT,
  NETWORK_TEXT_LINE_HEIGHT,
  type NetworkFrameModel,
  type NetworkSpoke,
  type NetworkSquare,
  type NetworkTextBlock,
} from "./scene-model";
import type { NetworkSceneParams } from "./scene-params";

export type NetworkFrameInput = Readonly<{
  frame: ToolcraftSceneRect;
  params: NetworkSceneParams;
  progress: number;
  timeSeconds: number;
}>;

export type NetworkFrameSummary = Readonly<{
  chapter: string;
  labelLocked: string;
  spokes: number;
  squares: number;
}>;

function describeLocks(block: NetworkTextBlock): string {
  if (!block.decoded?.visible) return "hidden";
  return block.decoded.lines.map((line) => line.locked).join(",");
}

function strokeSquares(context: CanvasRenderingContext2D, squares: readonly NetworkSquare[]): void {
  if (squares.length === 0) return;
  context.beginPath();
  for (const square of squares) {
    const half = square.size / 2;
    context.rect(square.x - half, square.y - half, square.size, square.size);
  }
  context.stroke();
}

function fillSquares(context: CanvasRenderingContext2D, squares: readonly NetworkSquare[]): void {
  if (squares.length === 0) return;
  context.beginPath();
  for (const square of squares) {
    const half = square.size / 2;
    context.rect(square.x - half, square.y - half, square.size, square.size);
  }
  context.fill();
}

function strokeLines(context: CanvasRenderingContext2D, lines: readonly NetworkSpoke[], opacity: number): void {
  for (const line of lines) {
    context.globalAlpha = line.alpha * opacity;
    context.beginPath();
    context.moveTo(line.from.x, line.from.y);
    context.lineTo(line.to.x, line.to.y);
    context.stroke();
  }
}

/**
 * Draws one transparent-foreground frame in scene coordinates. The caller has
 * already mapped scene units to backing pixels and clipped to the frame; the
 * runtime owns the background fill.
 */
export function paintNetworkFrame(
  context: CanvasRenderingContext2D,
  model: NetworkFrameModel,
  params: NetworkSceneParams,
): void {
  context.save();
  context.globalAlpha = model.dots.opacity;
  context.fillStyle = params.squareColor;
  const dotSize = model.dots.size;
  const dotHalf = dotSize / 2;
  context.beginPath();
  for (let index = 0; index < model.dots.points.length; index += 2) {
    context.rect(
      model.dots.points[index]! - dotHalf,
      model.dots.points[index + 1]! - dotHalf,
      dotSize,
      dotSize,
    );
  }
  context.fill();

  const overlay = model.overlay;
  context.lineWidth = params.spokeWidth;
  context.strokeStyle = params.squareColor;
  strokeLines(context, model.spokes, params.spokeOpacity);
  strokeLines(context, overlay.tree, 1);

  context.globalAlpha = 1;
  context.fillStyle = params.squareColor;
  fillSquares(context, model.squares);
  strokeSquares(context, overlay.hollow);

  context.strokeStyle = params.chapterAccent;
  context.lineWidth = params.searchPathWidth;
  strokeLines(context, overlay.path, 1);
  context.globalAlpha = 1;
  context.fillStyle = params.chapterAccent;
  fillSquares(context, overlay.accentFills);
  context.lineWidth = 1.5;
  strokeSquares(context, overlay.accentOutlines);
  if (overlay.scanX !== null) {
    context.fillRect(overlay.scanX - 1, model.frame.y, 2, model.frame.height);
  }

  const hubHalf = model.hubSize / 2;
  for (const hub of model.hubs) {
    context.fillStyle = hub.color;
    context.fillRect(hub.screen.x - hubHalf, hub.screen.y - hubHalf, model.hubSize, model.hubSize);
  }

  context.font = NETWORK_TEXT_FONT;
  context.textBaseline = "top";
  context.textAlign = "left";
  context.fillStyle = params.squareColor;
  const block = model.label;
  block.lines.forEach((line, index) => {
    if (line.alpha <= 0 || line.text.length === 0) return;
    context.globalAlpha = line.alpha;
    context.fillText(line.text, block.left, block.top + index * NETWORK_TEXT_LINE_HEIGHT);
  });
  context.restore();
}

export function summarizeNetworkFrame(model: NetworkFrameModel): NetworkFrameSummary {
  return Object.freeze({
    chapter: model.chapter.id,
    labelLocked: describeLocks(model.label),
    spokes: model.spokes.length,
    squares: model.squares.length,
  });
}

export function drawNetworkFrame(
  context: CanvasRenderingContext2D,
  input: NetworkFrameInput,
): NetworkFrameSummary {
  const model = buildNetworkFrame(input);
  paintNetworkFrame(context, model, input.params);
  return summarizeNetworkFrame(model);
}
