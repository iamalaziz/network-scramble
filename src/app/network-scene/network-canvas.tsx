import * as React from "react";

import { getToolcraftTimelineLoopProgress, getToolcraftTimelineLoopTime } from "@/toolcraft/runtime";
import {
  useToolcraftPipeline,
  useToolcraftProductSceneFrame,
  useToolcraftSelector,
  useToolcraftValue,
  useToolcraftViewportInteractionActive,
} from "@/toolcraft/runtime/react";

import { presentNetworkFrame, type NetworkPreviewCanvas } from "./present-frame";
import { readNetworkSceneParams, type NetworkSceneParams } from "./scene-params";

function readRenderScale(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 2;
}

function useNetworkSceneParams(): NetworkSceneParams {
  const values = useToolcraftSelector((state) => state.values);
  // Runtime-only values (background, export settings) leave the key unchanged,
  // so they never redraw the product foreground.
  const paramsKey = React.useMemo(
    () => JSON.stringify(readNetworkSceneParams(values)),
    [values],
  );
  return React.useMemo(() => JSON.parse(paramsKey) as NetworkSceneParams, [paramsKey]);
}

export function NetworkCanvas(): React.JSX.Element | null {
  const canvasRef = React.useRef<NetworkPreviewCanvas | null>(null);
  const frameCountRef = React.useRef(0);
  const generationRef = React.useRef(0);
  const sceneFrame = useToolcraftProductSceneFrame();
  const pipeline = useToolcraftPipeline();
  const params = useNetworkSceneParams();
  const interactionActive = useToolcraftViewportInteractionActive();
  const renderScale = readRenderScale(useToolcraftValue("canvas.renderScale"));
  const currentTimeSeconds = useToolcraftSelector((state) => state.timeline.currentTimeSeconds);
  const durationSeconds = useToolcraftSelector((state) => state.timeline.durationSeconds);
  const playing = useToolcraftSelector((state) => state.timeline.isPlaying);
  const devicePixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const rect = sceneFrame.kind === "ready" ? sceneFrame.rect : null;
  const backingWidth = rect ? Math.max(1, Math.round(rect.width * devicePixelRatio * renderScale)) : 0;
  const backingHeight = rect ? Math.max(1, Math.round(rect.height * devicePixelRatio * renderScale)) : 0;
  const timeSeconds = getToolcraftTimelineLoopTime({ currentTimeSeconds, durationSeconds });
  const progress = getToolcraftTimelineLoopProgress({ currentTimeSeconds, durationSeconds });

  React.useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rect) return;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    presentNetworkFrame(canvas, {
      backingHeight,
      backingWidth,
      frame: { height: rect.height, width: rect.width, x: rect.x, y: rect.y },
      interactionActive,
      isCurrent: () => generation === generationRef.current,
      nextFrameNumber: () => {
        const next = frameCountRef.current + 1;
        frameCountRef.current = next;
        return next;
      },
      params,
      pipeline,
      playing,
      progress,
      timeSeconds,
    });
  }, [
    backingHeight,
    backingWidth,
    interactionActive,
    params,
    pipeline,
    playing,
    progress,
    rect?.height,
    rect?.width,
    rect?.x,
    rect?.y,
    timeSeconds,
  ]);

  if (!rect) return null;
  return (
    <canvas
      aria-label="Network scramble scene"
      data-toolcraft-product-output="network-scene"
      ref={canvasRef}
      role="img"
      style={{ display: "block", height: rect.height, width: rect.width }}
    />
  );
}
