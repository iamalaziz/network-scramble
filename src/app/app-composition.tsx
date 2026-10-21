import { composeToolcraftApp } from "@/toolcraft/runtime/react";

import { appSchema } from "./app-schema";
import { networkExportRenderer } from "./network-scene/export-renderer";
import { NetworkCanvas } from "./network-scene/network-canvas";
import { networkRendererPipelineRegistration } from "./network-scene/pipeline";
import { getNetworkShotRect } from "./network-scene/scene-bounds";

export const appComposition = composeToolcraftApp(appSchema, {
  renderer: { pipelineRegistration: networkRendererPipelineRegistration },
  scene: {
    canvasContent: <NetworkCanvas />,
    rasterFrameRenderer: networkExportRenderer,
    renderDefaultCanvasMedia: false,
    sceneBoundsProvider: ({ state }) => [getNetworkShotRect(state.canvas.size)],
  },
});
