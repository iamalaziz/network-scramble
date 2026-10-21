import type { Locator, Page } from "@playwright/test";

import { getNetworkBrowserTestName, NETWORK_CHAPTER_SECONDS as at } from "../src/app/network-scene/acceptance-rows";
import { createToolcraftBrowserProofSession, type ToolcraftBrowserProofSession } from "./browser-proof-session";
import { expectToolcraftCompoundControlPartOutcome } from "./browser-state-evidence-helpers";
import { expectToolcraftVectorScreenMotion } from "./browser-vector-screen-motion";
import { expectToolcraftDiscreteSliderMarkers } from "./performance-control-layout-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import {
  controlTarget,
  dragSliderThumb,
  fillField,
  LIME,
  NETWORK_CANVAS,
  openNetworkShot,
  pauseShotAt,
  setColor,
} from "./product-network-support";
import { expect, test } from "./toolcraft-product-test";

const SHOT_SECONDS = 5;

type ControlCase = Readonly<{
  act: (control: Locator, page: Page) => Promise<void>;
  id: string;
  seconds?: number;
}>;

const drag = (toFraction: number, thumb = 0) => (control: Locator, page: Page) =>
  dragSliderThumb(page, control, thumb, toFraction);
const fill = (value: string) => (control: Locator) => fillField(control, value);

const productCases: readonly ControlCase[] = [
  { act: drag(0.1), id: "squares.spacing" },
  { act: drag(0.2), id: "squares.density" },
  { act: drag(0.8), id: "squares.falloff" },
  { act: fill("#FF3B30"), id: "squares.color" },
  { act: drag(0.9), id: "dots.opacity" },
  { act: drag(0.9), id: "dots.size" },
  { act: drag(0.9), id: "hubs.size" },
  { act: drag(0), id: "hubs.travel" },
  { act: fill("#00FFFF"), id: "upperHub.color" },
  { act: fill("#FF00FF"), id: "lowerHub.color" },
  { act: drag(0.05), id: "spokes.count" },
  { act: drag(0.9), id: "spokes.width" },
  { act: drag(0.05), id: "spokes.opacity" },
  { act: drag(0.95), id: "camera.zoom" },
  { act: fill("#00FFFF"), id: "chapters.accent", seconds: at.path },
  { act: drag(0.95), id: "search.treeOpacity", seconds: at.search },
  { act: drag(0.9), id: "search.pathWidth", seconds: at.path },
  { act: fill("09 · graphs"), id: "search.title", seconds: at.search },
  { act: fill("a-star · web-app -> users-api"), id: "search.headline", seconds: at.search },
  { act: fill("expanded {visited} of {total}"), id: "search.detail", seconds: at.search },
  { act: drag(0.95), id: "failover.replicas", seconds: at.elected },
  { act: fill("09 · cluster"), id: "failover.title", seconds: at.failover },
  { act: fill("billing-svc shard-3 timed out"), id: "failover.headline", seconds: at.failover },
  { act: fill("raft term 43 · {replicas} followers"), id: "failover.detail", seconds: at.failover },
  { act: drag(0.8), id: "sweep.failRate", seconds: at.sweep },
  { act: drag(0.9), id: "sweep.trail", seconds: at.sweep },
  { act: fill("09 · qa"), id: "sweep.title", seconds: at.sweep },
  { act: fill("api contract · {failed} broken"), id: "sweep.headline", seconds: at.sweep },
  { act: fill("{passed} of {total} green"), id: "sweep.detail", seconds: at.sweep },
  { act: drag(0.05), id: "decode.rate" },
  { act: fill("XYZ"), id: "decode.glyphs" },
  { act: drag(0.95), id: "decode.titleOpacity" },
];

const discreteSliders = new Set(["spokes.count", "failover.replicas"]);

async function startSession(page: Page, seconds = SHOT_SECONDS): Promise<ToolcraftBrowserProofSession> {
  await openNetworkShot(page);
  const session = await createToolcraftBrowserProofSession(page);
  await pauseShotAt(page, seconds);
  return session;
}

for (const controlCase of productCases) {
  test(getNetworkBrowserTestName(controlCase.id), async ({ page }) => {
    const session = await startSession(page, controlCase.seconds);
    await expectToolcraftProductObservableToChange(
      session,
      session.controlAction(controlCase.id, controlCase.act),
      { requirementId: `network.${controlCase.id}`, selector: NETWORK_CANVAS },
    );
    if (discreteSliders.has(controlCase.id)) {
      await expectToolcraftDiscreteSliderMarkers(page, controlCase.id, `network.${controlCase.id}`);
    }
  });
}

/** Product canvas pixels compared with a baseline captured just before each part edit. */
function observePartOutput(session: ToolcraftBrowserProofSession) {
  return session.observe((root) => {
    const canvas = root.querySelector<HTMLCanvasElement>(
      'canvas[data-toolcraft-product-output="network-scene"]',
    );
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return { partOutput: "missing" };
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 0x811c9dc5;
    for (let index = 0; index < data.length; index += 7) hash = Math.imul(hash ^ data[index]!, 0x01000193);
    const signature = (hash >>> 0).toString(16);
    const baseline = (window as unknown as { __networkPartBaseline?: string }).__networkPartBaseline;
    return { partOutput: signature === baseline ? "baseline" : "changed" };
  });
}

async function captureBaseline(page: Page): Promise<void> {
  await page.locator(NETWORK_CANVAS).evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 0x811c9dc5;
    for (let index = 0; index < data.length; index += 7) hash = Math.imul(hash ^ data[index]!, 0x01000193);
    (window as unknown as { __networkPartBaseline?: string }).__networkPartBaseline = (hash >>> 0).toString(16);
  });
}

const rangeCases = [
  { id: "squares.size", lower: [0.2, 0.05], seconds: SHOT_SECONDS, upper: 0.95 },
  // Lower 59% → 23% and upper 45.5% move the 2.5 s frame through all three chapters.
  { id: "chapters.cuts", lower: [0.6, 0.2], seconds: at.elected, upper: 0.45 },
  { id: "search.window", lower: [0.2, 0.05], seconds: at.search, upper: 0.4 },
  { id: "search.labelWindow", lower: [0.1, 0.03], seconds: at.search, upper: 0.25 },
  // Lower 30% delays the failure past the 2.0 s frame; upper 15% elects replicas before it.
  { id: "failover.window", lower: [0.3, 0.05], seconds: at.failover, upper: 0.15 },
  { id: "failover.labelWindow", lower: [0.1, 0.03], seconds: at.failover, upper: 0.2 },
  { id: "sweep.window", lower: [0.3, 0.05], seconds: at.sweep, upper: 0.8 },
  { id: "sweep.labelWindow", lower: [0.25, 0.1], seconds: at.sweep, upper: 0.5 },
] as const;

for (const rangeCase of rangeCases) {
  test(getNetworkBrowserTestName(rangeCase.id), async ({ page }) => {
    const session = await startSession(page, rangeCase.seconds);
    await expectToolcraftProductObservableToChange(
      session,
      session.controlAction(rangeCase.id, drag(rangeCase.lower[0], 0)),
      { requirementId: `network.${rangeCase.id}`, selector: NETWORK_CANVAS },
    );
    await captureBaseline(page);
    await expectToolcraftCompoundControlPartOutcome(
      observePartOutput(session),
      session.controlAction(rangeCase.id, drag(rangeCase.lower[1], 0)),
      { partOutput: "changed" },
      { part: "rangeSlider.lower", requirementId: `network.${rangeCase.id}` },
    );
    await captureBaseline(page);
    await expectToolcraftCompoundControlPartOutcome(
      observePartOutput(session),
      session.controlAction(rangeCase.id, drag(rangeCase.upper, 1)),
      { partOutput: "changed" },
      { part: "rangeSlider.upper", requirementId: `network.${rangeCase.id}` },
    );
  });
}

async function setAnchorAxis(page: Page, target: string, axis: "X" | "Y", value: number): Promise<void> {
  const control = controlTarget(page, target);
  await control.getByRole("button", { name: `Edit Anchor ${axis} value` }).click();
  const input = control.getByRole("textbox");
  await input.fill(String(value));
  await input.press("Enter");
}

for (const [id, otherHub] of [
  ["upperHub.anchor", "lowerHub"],
  ["lowerHub.anchor", "upperHub"],
] as const) {
  test(getNetworkBrowserTestName(id), async ({ page }) => {
    await openNetworkShot(page);
    const session = await createToolcraftBrowserProofSession(page);
    // A 640 px shot stays fully visible beside the panel at 100% zoom.
    const width = controlTarget(page, "canvas.size.width").getByRole("textbox");
    await width.fill("640");
    await width.press("Enter");
    await pauseShotAt(page, SHOT_SECONDS);
    // The recipe recentres the pad first; holding the hub on its anchor and
    // parking the other hub outside the shot keeps the tracked hub isolated.
    const travel = controlTarget(page, "hubs.travel").getByRole("slider");
    await travel.focus();
    await travel.press("Home");
    await expect(travel).toHaveAttribute("aria-valuenow", "0");
    await setColor(page, `${otherHub}.color`, "#FF00FF");
    await setAnchorAxis(page, `${otherHub}.anchor`, "X", 0.95);
    await setAnchorAxis(page, `${otherHub}.anchor`, "Y", 0.95);
    await expectToolcraftVectorScreenMotion({
      markers: [{ rgb: LIME, selector: NETWORK_CANVAS }],
      proofSession: session,
      requirementId: `network.${id}`,
      target: id,
    });
  });
}
