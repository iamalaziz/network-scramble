import type { ToolcraftSceneRect } from "@/toolcraft/runtime";

/** The shot frame is the saved canvas size, centred on the world origin, in both canvas modes. */
export function getNetworkShotRect(
  size: Readonly<{ height: number; width: number }>,
): ToolcraftSceneRect {
  return { height: size.height, width: size.width, x: -size.width / 2, y: -size.height / 2 };
}
