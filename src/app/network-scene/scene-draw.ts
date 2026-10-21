import type { ToolcraftSceneRect } from "@/toolcraft/runtime";

import {
  buildNetworkFrame,
  NETWORK_TEXT_FONT,
  NETWORK_TEXT_LINE_HEIGHT,
  type NetworkFrameModel,
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
  requestLocked: string;
  responseLocked: string;
  spokes: number;
  squares: number;
}>;

function describeLocks(block: NetworkTextBlock): string {
  if (!block.decoded?.visible) return "hidden";
  return block.decoded.lines.map((line) => line.locked).join(",");
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

  context.lineWidth = params.spokeWidth;
  context.strokeStyle = params.squareColor;
  for (const spoke of model.spokes) {
    context.globalAlpha = spoke.alpha * params.spokeOpacity;
    context.beginPath();
    context.moveTo(spoke.from.x, spoke.from.y);
    context.lineTo(spoke.to.x, spoke.to.y);
    context.stroke();
  }

  context.globalAlpha = 1;
  context.fillStyle = params.squareColor;
  context.beginPath();
  for (const square of model.squares) {
    const half = square.size / 2;
    context.rect(square.x - half, square.y - half, square.size, square.size);
  }
  context.fill();

  const hubHalf = model.hubSize / 2;
  for (const hub of model.hubs) {
    context.fillStyle = hub.color;
    context.fillRect(hub.screen.x - hubHalf, hub.screen.y - hubHalf, model.hubSize, model.hubSize);
  }

  context.font = NETWORK_TEXT_FONT;
  context.textBaseline = "top";
  context.textAlign = "left";
  context.fillStyle = params.squareColor;
  for (const block of [model.response, model.request]) {
    block.lines.forEach((line, index) => {
      if (line.alpha <= 0 || line.text.length === 0) return;
      context.globalAlpha = line.alpha;
      context.fillText(line.text, block.left, block.top + index * NETWORK_TEXT_LINE_HEIGHT);
    });
  }
  context.restore();
}

export function summarizeNetworkFrame(model: NetworkFrameModel): NetworkFrameSummary {
  return Object.freeze({
    requestLocked: describeLocks(model.request),
    responseLocked: describeLocks(model.response),
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
