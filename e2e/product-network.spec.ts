import type { Locator, Page } from "@playwright/test";

import { getNetworkBrowserTestName } from "../src/app/network-scene/acceptance-rows";
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
  { act: fill("< 503 RETRY\nrequest_id req_999"), id: "response.status" },
  { act: drag(0.95), id: "response.statusOpacity" },
  { act: fill("credits required 9\nratelimit 7 / 50 tokens"), id: "response.body" },
  { act: fill("> GET /v1/models\n> key zz99"), id: "request.text" },
  { act: drag(0.05), id: "decode.rate" },
  { act: fill("XYZ"), id: "decode.glyphs" },
];

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
    if (controlCase.id === "spokes.count") {
      await expectToolcraftDiscreteSliderMarkers(page, "spokes.count", "network.spokes.count");
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
  { id: "response.window", lower: [0.25, 0.08], seconds: 1.5, upper: 0.22 },
  { id: "request.window", lower: [0.45, 0.3], seconds: SHOT_SECONDS, upper: 0.66 },
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
