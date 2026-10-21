import {
  getToolcraftTimelineLoopProgress,
  getToolcraftTimelineLoopTime,
  type ToolcraftProductExportRenderer,
} from "@/toolcraft/runtime";

import { exportFramePass } from "./pipeline";
import { drawNetworkFrame } from "./scene-draw";
import { readNetworkSceneParams } from "./scene-params";

/** Shared deterministic frame for runtime image export at the playhead time. */
export const networkExportRenderer: ToolcraftProductExportRenderer = {
  baseFileName: "network-scramble",
  async renderFrame({ context, frame, rendererPipeline, signal, state, timeSeconds }) {
    signal.throwIfAborted();
    const loop = { currentTimeSeconds: timeSeconds, durationSeconds: state.timeline.durationSeconds };
    const input = {
      frame,
      params: readNetworkSceneParams(state.values),
      progress: getToolcraftTimelineLoopProgress(loop),
      timeSeconds: getToolcraftTimelineLoopTime(loop),
    };
    const paint = () => {
      signal.throwIfAborted();
      context.save();
      try {
        return drawNetworkFrame(context, input);
      } finally {
        context.restore();
      }
    };
    if (rendererPipeline) {
      await rendererPipeline.runPass(exportFramePass, undefined, paint);
    } else {
      paint();
    }
  },
};
