import type { Download, Locator, Page } from "@playwright/test";

import { buildNetworkFrame } from "../src/app/network-scene/scene-model";
import { readNetworkSceneParams } from "../src/app/network-scene/scene-params";
import { NETWORK_SHOT_SECONDS } from "../src/app/network-scene/scene-timing";
import { expect } from "./toolcraft-product-test";

export const NETWORK_CANVAS = 'canvas[data-toolcraft-product-output="network-scene"]';
export const LIME: readonly [number, number, number] = [218, 251, 51];

export function controlTarget(page: Page, target: string): Locator {
  return page.locator(`[data-toolcraft-control-target="${target}"]`);
}

export async function openNetworkShot(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator(NETWORK_CANVAS)).toBeVisible();
  await expect(page.locator(NETWORK_CANVAS)).toHaveAttribute("data-network-frame-count", /\d+/u);
}

export async function showTimelineScrubber(page: Page): Promise<Locator> {
  const scrubber = page.getByRole("slider", { name: "Playback position" });
  if (!(await scrubber.isVisible())) {
    await controlTarget(page, "panels.timeline.extended").getByRole("switch").click();
    await expect(scrubber).toBeVisible();
  }
  return scrubber;
}

export async function pausePlayback(page: Page): Promise<void> {
  const pause = page.getByRole("button", { name: "Pause playback" });
  if (await pause.isVisible()) await pause.click();
  await expect(page.getByRole("button", { name: "Play playback" })).toBeVisible();
}

/** Pause the shot and scrub to a time reachable by the 0.5 s scrubber step. */
export async function pauseShotAt(page: Page, seconds: number): Promise<void> {
  const scrubber = await showTimelineScrubber(page);
  await pausePlayback(page);
  await scrubber.press("Home");
  for (let step = 0; step < 40; step += 1) {
    if (Number(await scrubber.getAttribute("aria-valuenow")) >= seconds - 1e-6) break;
    await scrubber.press("ArrowRight");
  }
  await expect(scrubber).toHaveAttribute("aria-valuenow", String(seconds));
  await expect(page.locator(NETWORK_CANVAS)).toHaveAttribute(
    "data-network-rendered-time",
    seconds.toFixed(3),
  );
}

export async function dragSliderThumb(
  page: Page,
  control: Locator,
  thumbIndex: number,
  toFraction: number,
): Promise<void> {
  const thumb = control.getByRole("slider").nth(thumbIndex);
  await thumb.scrollIntoViewIfNeeded();
  const track = control.locator('[data-slot="slider"]').first();
  const thumbBox = await thumb.boundingBox();
  const trackBox = await track.boundingBox();
  if (!thumbBox || !trackBox) throw new Error("Slider thumb or track has no bounding box.");
  const y = thumbBox.y + thumbBox.height / 2;
  await page.mouse.move(thumbBox.x + thumbBox.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(trackBox.x + trackBox.width * toFraction, y, { steps: 6 });
  await page.mouse.up();
}

export async function fillField(control: Locator, value: string): Promise<void> {
  const textarea = control.locator("textarea");
  const multiline = (await textarea.count()) > 0;
  const field = multiline ? textarea.first() : control.getByRole("textbox").first();
  await field.scrollIntoViewIfNeeded();
  await field.fill(value);
  if (!multiline) await field.press("Enter");
}

export async function setColor(page: Page, target: string, hex: string): Promise<void> {
  const input = controlTarget(page, target).getByRole("textbox");
  await input.scrollIntoViewIfNeeded();
  await input.fill(hex);
  await input.press("Enter");
}

export async function selectOption(page: Page, target: string, optionName: string): Promise<void> {
  const trigger = controlTarget(page, target).getByRole("combobox");
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: optionName }).click();
  await expect(trigger).toContainText(optionName);
}

export async function clickExport(page: Page, label = "Export PNG"): Promise<Download> {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: label }).click();
  return download;
}

/** Hub centre in normalized export coordinates for the default 1920×1080 shot. */
export function getHubExportRatios(
  values: Readonly<Record<string, unknown>>,
  seconds: number,
): readonly { readonly x: number; readonly y: number; readonly half: number }[] {
  const frame = { height: 1080, width: 1920, x: -960, y: -540 };
  const model = buildNetworkFrame({
    frame,
    params: readNetworkSceneParams(values),
    progress: seconds / NETWORK_SHOT_SECONDS,
    timeSeconds: seconds,
  });
  return model.hubs.map((hub) => ({
    half: model.hubSize / 2 / frame.width,
    x: (hub.screen.x - frame.x) / frame.width,
    y: (hub.screen.y - frame.y) / frame.height,
  }));
}

export async function readFrameCount(page: Page): Promise<number> {
  return Number(await page.locator(NETWORK_CANVAS).getAttribute("data-network-frame-count"));
}

export function minimumAlpha(pixels: Uint8ClampedArray): number {
  let minimum = 255;
  for (let index = 3; index < pixels.length; index += 4) minimum = Math.min(minimum, pixels[index]!);
  return minimum;
}

export function dominantRgba(pixels: Uint8ClampedArray): readonly number[] {
  const counts = new Map<string, number>();
  for (let index = 0; index < pixels.length; index += 4) {
    const key = Array.from(pixels.subarray(index, index + 4)).join(",");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [key] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]!;
  return key.split(",").map(Number);
}
