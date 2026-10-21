import type { ToolcraftRendererPipelineClient, ToolcraftSceneRect } from "@/toolcraft/runtime";

import { previewFramePass } from "./pipeline";
import { paintNetworkFrame, summarizeNetworkFrame } from "./scene-draw";
import { buildNetworkFrame, type NetworkFrameModel } from "./scene-model";
import type { NetworkSceneParams } from "./scene-params";

export type NetworkPreviewCanvas = HTMLCanvasElement;

export type NetworkPresentRequest = Readonly<{
  backingHeight: number;
  backingWidth: number;
  frame: ToolcraftSceneRect;
  interactionActive: boolean;
  isCurrent: () => boolean;
  nextFrameNumber: () => number;
  params: NetworkSceneParams;
  pipeline: ToolcraftRendererPipelineClient | null;
  playing: boolean;
  progress: number;
  timeSeconds: number;
}>;

/**
 * Sizes the preview backing and paints one frame. The pipeline pass builds the
 * pure frame model; painting and DOM bookkeeping happen after it settles,
 * outside the pipeline boundary.
 */
export function presentNetworkFrame(
  canvas: NetworkPreviewCanvas,
  request: NetworkPresentRequest,
): void {
  canvas.dataset.networkInteractionActive = String(request.interactionActive);
  canvas.dataset.networkPlaying = String(request.playing);
  // Viewport pan/zoom only transforms the already-painted frame; playback
  // keeps advancing in the runtime and the next frame resumes at its time.
  if (request.interactionActive) return;
  if (canvas.width !== request.backingWidth) canvas.width = request.backingWidth;
  if (canvas.height !== request.backingHeight) canvas.height = request.backingHeight;
  const context = canvas.getContext("2d");
  if (!context) return;
  const { frame, isCurrent, params, progress, timeSeconds } = request;
  const build = () => (isCurrent() ? buildNetworkFrame({ frame, params, progress, timeSeconds }) : null);
  if (!request.pipeline) {
    paintPreview(canvas, context, request, build());
    return;
  }
  void request.pipeline
    .runPass(previewFramePass, undefined, build)
    .then((model) => paintPreview(canvas, context, request, model));
}

function paintPreview(
  canvas: NetworkPreviewCanvas,
  context: CanvasRenderingContext2D,
  request: NetworkPresentRequest,
  model: NetworkFrameModel | null,
): void {
  const { frame, isCurrent, params, progress, timeSeconds } = request;
  if (!model || !isCurrent()) return;
  const scaleX = request.backingWidth / frame.width;
  const scaleY = request.backingHeight / frame.height;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, request.backingWidth, request.backingHeight);
  context.setTransform(scaleX, 0, 0, scaleY, -frame.x * scaleX, -frame.y * scaleY);
  paintNetworkFrame(context, model, params);
  const summary = summarizeNetworkFrame(model);
  canvas.dataset.networkFrameCount = String(request.nextFrameNumber());
  canvas.dataset.networkRenderedTime = timeSeconds.toFixed(3);
  // Shot progress of the painted frame; the end of the shot cuts back to 0.
  canvas.dataset.timelineProgress = progress.toFixed(4);
  canvas.dataset.networkChapter = summary.chapter;
  canvas.dataset.networkLabelLocked = summary.labelLocked;
}
