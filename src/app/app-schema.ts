import {
  defineToolcraft,
  imageExportModule,
  timelineModule,
  videoExportModule,
} from "@/toolcraft/runtime";

import appDefaults from "./app-defaults.json" with { type: "json" };
import { appIdentity } from "./app-identity";
import { NETWORK_SHOT_SECONDS } from "./network-scene/scene-timing";
import { networkSceneSections } from "./network-scene/scene-sections";

export const appSchema = defineToolcraft({
  defaults: appDefaults,
  base: {
    canvas: {
      enabled: true,
      renderScale: true,
      size: { height: 1080, unit: "px", width: 1920 },
      sizing: { mode: "editable-output" },
    },
    identity: appIdentity,
    panels: {
      controls: {
        sections: networkSceneSections,
        title: "Network Scramble",
      },
    },
    toolbar: {
      history: true,
      radar: true,
      zoom: true,
    },
  },
  modules: [
    imageExportModule(),
    videoExportModule(),
    timelineModule({ defaultDurationSeconds: NETWORK_SHOT_SECONDS, mode: "playback" }),
  ],
});
