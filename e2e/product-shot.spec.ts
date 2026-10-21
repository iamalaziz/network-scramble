import type { Page } from "@playwright/test";

import {
  getToolcraftApplicabilityRequirementId,
  getToolcraftControlApplicabilityCases,
} from "../src/app/app-acceptance";
import { appControlSectionInventory } from "../src/app/app-acceptance-data";
import { appSchema } from "../src/app/app-schema";
import { getNetworkBrowserTestName } from "../src/app/network-scene/acceptance-rows";
import { expectToolcraftExportedArtifact } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftBackgroundOutputSemantics } from "./browser-background-output-evidence";
import { expectToolcraftControlApplicabilityState } from "./browser-control-applicability-evidence";
import {
  expectToolcraftInfinityCanvasBackgroundEvidence,
  expectToolcraftInfinityCanvasImageExportEvidence,
  expectToolcraftInfinityCanvasModeEvidence,
  observeInfinityCanvas,
  observeInfinityCanvasBackground,
} from "./browser-infinity-canvas-evidence";
import { expectToolcraftImageExportArtifact } from "./browser-media-export-evidence";
import { createToolcraftBrowserProofSession, type ToolcraftBrowserProofSession } from "./browser-proof-session";
import { expectToolcraftStandardTimelinePlayback } from "./browser-standard-timeline-evidence";
import { expectToolcraftViewportSideEffect } from "./browser-state-evidence-helpers";
import { inspectToolcraftImageDownload } from "./image-artifact-inspection";
import { expectToolcraftDiscreteSliderMarkers } from "./performance-control-layout-helpers";
import {
  clickExport,
  controlTarget,
  dominantRgba,
  getHubExportRatios,
  LIME,
  minimumAlpha,
  NETWORK_CANVAS,
  openNetworkShot,
  pausePlayback,
  pauseShotAt,
  readFrameCount,
  selectOption,
  setColor,
} from "./product-network-support";
import { expect, expectToolcraftCanvasRenderScaleEvidence, test } from "./toolcraft-product-test";

const SHOT_SECONDS = 5;

async function startSession(page: Page): Promise<ToolcraftBrowserProofSession> {
  await openNetworkShot(page);
  const session = await createToolcraftBrowserProofSession(page);
  await pauseShotAt(page, SHOT_SECONDS);
  return session;
}

async function exportPngInspection(page: Page, backgroundRgba: readonly [number, number, number, number]) {
  return inspectToolcraftImageDownload({ backgroundRgba, download: await clickExport(page), page });
}

test(getNetworkBrowserTestName("background.include"), async ({ page }) => {
  const session = await startSession(page);
  const observePreview = session.observe((root) => {
    const layer = root.querySelector<HTMLElement>("[data-toolcraft-finite-background-layer]");
    return {
      backgroundVisible: layer !== null,
      outputSignature: layer ? `background:${getComputedStyle(layer).backgroundColor}` : "background:none",
    };
  });
  await expectToolcraftBackgroundOutputSemantics(
    observePreview,
    session.controlAction("export.includeBackground", (control) => control.getByRole("switch").click()),
    { backgroundVisible: false, outputSignature: "background:none" },
    session.targetAction("actions.output", (actionPage) => clickExport(actionPage)),
    async (download) => {
      const artifact = await inspectToolcraftImageDownload({ backgroundRgba: [0, 0, 0, 0], download, page });
      return { ...artifact.inspection, backgroundAlpha: minimumAlpha(artifact.observation.normalizedPixels) };
    },
    { requirementId: "shot.background.include" },
  );
  const backgroundSwitch = controlTarget(page, "export.includeBackground").getByRole("switch");
  await backgroundSwitch.click();
  await controlTarget(page, "canvas.infinity").getByRole("switch").click();
  const infinite = await observeInfinityCanvasBackground(page);
  await backgroundSwitch.click();
  const backgroundExcluded = await observeInfinityCanvasBackground(page);
  await backgroundSwitch.click();
  const backgroundRestored = await observeInfinityCanvasBackground(page);
  await expectToolcraftInfinityCanvasBackgroundEvidence(
    { backgroundExcluded, backgroundRestored, infinite },
    { expectedBackgroundColor: "#000000", requirementId: "shot.background.include", target: "export.includeBackground" },
  );
});

test(getNetworkBrowserTestName("background.color"), async ({ page }) => {
  const session = await startSession(page);
  const cases = getToolcraftControlApplicabilityCases({
    schema: appSchema,
    sectionInventory: appControlSectionInventory,
    target: "appearance.background",
  });
  expect(cases.length).toBeGreaterThan(0);
  const ordered = [...cases].sort((left) => (left.selectorValue === false ? -1 : 1));
  for (const applicabilityCase of ordered) {
    const included = applicabilityCase.selectorValue === true;
    await expectToolcraftControlApplicabilityState(
      session,
      session.controlAction("export.includeBackground", async (control) => {
        const toggle = control.getByRole("switch");
        if ((await toggle.getAttribute("aria-checked")) !== String(included)) await toggle.click();
      }),
      applicabilityCase,
      { baseRequirementId: "shot.background.color" },
    );
    const color = included ? "#203040" : "#405060";
    await setColor(page, "appearance.background", color);
    await expectToolcraftExportedArtifact(
      session.targetAction("appearance.background", (actionPage) => clickExport(actionPage)),
      async (download) => {
        const artifact = await inspectToolcraftImageDownload({ backgroundRgba: [0, 0, 0, 0], download, page });
        if (included) {
          expect(dominantRgba(artifact.observation.normalizedPixels)).toEqual([32, 48, 64, 255]);
        } else {
          expect(minimumAlpha(artifact.observation.normalizedPixels)).toBe(0);
        }
        return artifact.inspection;
      },
      { requirementId: getToolcraftApplicabilityRequirementId("shot.background.color", applicabilityCase) },
    );
  }
});

test(getNetworkBrowserTestName("export.image-format"), async ({ page }) => {
  const session = await startSession(page);
  for (const [option, label, mediaType] of [
    ["JPG", "Export JPG", "image/jpeg"],
    ["PNG", "Export PNG", "image/png"],
  ] as const) {
    await selectOption(page, "export.image.format", option);
    await expectToolcraftExportedArtifact(
      session.targetAction("export.image.format", (actionPage) => clickExport(actionPage, label)),
      async (download) => {
        const artifact = await inspectToolcraftImageDownload({ backgroundRgba: [0, 0, 0, 255], download, page });
        expect(artifact.inspection.mediaType).toBe(mediaType);
        return artifact.inspection;
      },
      { requirementId: "shot.export.image-format" },
    );
  }
});

test(getNetworkBrowserTestName("export.image-resolution"), async ({ page }) => {
  const session = await startSession(page);
  for (const [option, width, height] of [
    ["2K", 2048, 1152],
    ["8K", 8192, 4608],
    ["4K", 4096, 2304],
  ] as const) {
    await selectOption(page, "export.image.resolution", option);
    await expectToolcraftExportedArtifact(
      session.targetAction("export.image.resolution", (actionPage) => clickExport(actionPage)),
      async (download) => {
        const artifact = await inspectToolcraftImageDownload({ backgroundRgba: [0, 0, 0, 255], download, page });
        expect({ height: artifact.inspection.height, width: artifact.inspection.width }).toEqual({ height, width });
        return artifact.inspection;
      },
      { requirementId: "shot.export.image-resolution" },
    );
  }
});

/** Black mono foreground on black leaves the two lime hubs as the only product pixels. */
async function prepareHubOnlyShot(page: Page): Promise<void> {
  await setColor(page, "squares.color", "#000000");
  const hubSize = controlTarget(page, "hubs.size").getByRole("slider");
  await hubSize.focus();
  await hubSize.press("End");
  await expect(hubSize).toHaveAttribute("aria-valuenow", "64");
}

test(getNetworkBrowserTestName("export.image"), async ({ page }) => {
  const session = await startSession(page);
  await prepareHubOnlyShot(page);
  const hubs = getHubExportRatios({ "hubs.size": 64, "squares.color": "#000000" }, SHOT_SECONDS);
  const left = Math.min(...hubs.map((hub) => hub.x - hub.half));
  const right = Math.max(...hubs.map((hub) => hub.x + hub.half));
  const halfHeight = hubs[0]!.half * (1920 / 1080);
  const top = Math.min(...hubs.map((hub) => hub.y - halfHeight));
  const bottom = Math.max(...hubs.map((hub) => hub.y + halfHeight));
  await expectToolcraftImageExportArtifact(
    session.targetAction("actions.output", (actionPage) => clickExport(actionPage)),
    {
      backgroundRgba: [0, 0, 0, 255],
      expectedBounds: { height: bottom - top, width: right - left, x: left, y: top },
      expectedHeight: 2304,
      expectedMediaType: "image/png",
      expectedPixels: [
        ...hubs.map((hub) => ({ rgba: [...LIME, 255] as [number, number, number, number], xRatio: hub.x, yRatio: hub.y })),
        { rgba: [0, 0, 0, 255], xRatio: 0.98, yRatio: 0.98 },
      ],
      expectedWidth: 4096,
      page,
      requirementId: "shot.export.image",
    },
  );
});

test(getNetworkBrowserTestName("canvas.render-scale"), async ({ page }) => {
  await openNetworkShot(page);
  await expectToolcraftDiscreteSliderMarkers(page, "canvas.renderScale", "shot.canvas.render-scale");
  const renderScale = controlTarget(page, "canvas.renderScale").getByRole("slider");
  await expect(renderScale).toHaveAttribute("aria-valuenow", "2");
  const viewport = page.getByRole("application", { name: "Canvas viewport" });
  const box = await viewport.boundingBox();
  if (!box) throw new Error("Canvas viewport has no bounding box.");
  await expectToolcraftCanvasRenderScaleEvidence(page, {
    canvasSelector: NETWORK_CANVAS,
    requirementId: "shot.canvas.render-scale",
    selectedScale: 2,
    stateTransitions: [
      { run: () => pauseShotAt(page, SHOT_SECONDS), state: "steady" },
      {
        run: async () => {
          await page.mouse.move(box.x + 300, box.y + 300);
          await viewport.focus();
          await page.keyboard.down("Space");
          await page.mouse.down();
          await page.mouse.move(box.x + 320, box.y + 310, { steps: 3 });
        },
        state: "interaction",
      },
      {
        run: async () => {
          await page.mouse.up();
          await page.keyboard.up("Space");
          await page.getByRole("button", { name: "Play playback" }).click();
          const before = await readFrameCount(page);
          await expect.poll(() => readFrameCount(page)).toBeGreaterThan(before + 2);
        },
        state: "playback",
      },
    ],
    target: "canvas.renderScale",
  });
});

test(getNetworkBrowserTestName("timeline.playback"), async ({ page }) => {
  await openNetworkShot(page);
  const session = await createToolcraftBrowserProofSession(page);
  await expectToolcraftStandardTimelinePlayback(session, {
    markerSelector: NETWORK_CANVAS,
    requirementId: "shot.timeline.playback",
  });
});

function observeViewport(session: ToolcraftBrowserProofSession) {
  return session.observe((root) => {
    const world = root.querySelector<HTMLElement>("[data-toolcraft-canvas-world]");
    const canvas = root.querySelector<HTMLCanvasElement>('canvas[data-toolcraft-product-output="network-scene"]');
    return {
      offsetX: Number(world?.dataset.toolcraftCanvasOffsetX),
      offsetY: Number(world?.dataset.toolcraftCanvasOffsetY),
      outputHeight: canvas?.height ?? 0,
      outputWidth: canvas?.width ?? 0,
      zoom: Number(world?.dataset.toolcraftCanvasZoom) / 100,
    };
  });
}

async function startPlaying(page: Page): Promise<void> {
  await pausePlayback(page);
  await page.getByRole("button", { name: "Play playback" }).click();
  const before = await readFrameCount(page);
  await expect.poll(() => readFrameCount(page)).toBeGreaterThan(before + 2);
}

test(getNetworkBrowserTestName("viewport.pan"), async ({ page }) => {
  await openNetworkShot(page);
  const session = await createToolcraftBrowserProofSession(page);
  await startPlaying(page);
  const canvas = page.locator(NETWORK_CANVAS);
  const viewport = page.getByRole("application", { name: "Canvas viewport" });
  const box = await viewport.boundingBox();
  if (!box) throw new Error("Canvas viewport has no bounding box.");
  await expectToolcraftViewportSideEffect(
    observeViewport(session),
    session.targetAction("canvas.setOffset", async (actionPage) => {
      await actionPage.mouse.move(box.x + 300, box.y + 300);
      await viewport.focus();
      await actionPage.keyboard.down("Space");
      await actionPage.mouse.down();
      await actionPage.mouse.move(box.x + 301, box.y + 301);
      await expect(canvas).toHaveAttribute("data-network-interaction-active", "true");
      const heldFrames = await readFrameCount(actionPage);
      await actionPage.mouse.move(box.x + 360, box.y + 330, { steps: 4 });
      await actionPage.waitForTimeout(150);
      // Painting is suspended while the viewport is dragged.
      expect(await readFrameCount(actionPage)).toBe(heldFrames);
      await actionPage.mouse.up();
      await actionPage.keyboard.up("Space");
      await expect.poll(() => readFrameCount(actionPage)).toBeGreaterThan(heldFrames);
    }),
    { offsetX: 60, offsetY: 30, outputHeight: 2160, outputWidth: 3840, zoom: 1 },
    { requirementId: "shot.viewport.pan" },
  );
  await expect(canvas).toHaveAttribute("data-network-playing", "true");
});

test(getNetworkBrowserTestName("viewport.zoom"), async ({ page }) => {
  await openNetworkShot(page);
  const session = await createToolcraftBrowserProofSession(page);
  await startPlaying(page);
  const canvas = page.locator(NETWORK_CANVAS);
  await expectToolcraftViewportSideEffect(
    observeViewport(session),
    session.targetAction("canvas.setViewport", async (actionPage) => {
      await actionPage.getByRole("button", { name: /zoom in/iu }).first().click();
    }),
    { offsetX: 0, offsetY: 0, outputHeight: 2160, outputWidth: 3840, zoom: 1.1 },
    { requirementId: "shot.viewport.zoom" },
  );
  const frames = await readFrameCount(page);
  await expect.poll(() => readFrameCount(page)).toBeGreaterThan(frames);
  await expect(canvas).toHaveAttribute("data-network-playing", "true");
});

test(getNetworkBrowserTestName("canvas.infinity-mode"), async ({ page }) => {
  await openNetworkShot(page);
  await pauseShotAt(page, SHOT_SECONDS);
  const infinitySwitch = () => controlTarget(page, "canvas.infinity").getByRole("switch");
  const captureIdentity = () =>
    page.evaluateHandle(() => ({
      host: document.querySelector("[data-toolcraft-product-scene]"),
      output: document.querySelector('canvas[data-toolcraft-product-output="network-scene"]'),
    }));
  const compare = (identity: Awaited<ReturnType<typeof captureIdentity>>) =>
    page.evaluate(
      (baseline) => ({
        productHostPreserved:
          baseline.host !== null && baseline.host === document.querySelector("[data-toolcraft-product-scene]"),
        productOutputPreserved:
          baseline.output !== null &&
          baseline.output === document.querySelector('canvas[data-toolcraft-product-output="network-scene"]'),
      }),
      identity,
    );
  const before = await observeInfinityCanvas(page);
  const initialIdentity = await captureIdentity();
  await infinitySwitch().click();
  const enabled = await observeInfinityCanvas(page);
  const beforeToEnabled = await compare(initialIdentity);
  const viewport = page.getByRole("application", { name: "Canvas viewport" });
  const box = await viewport.boundingBox();
  if (!box) throw new Error("Canvas viewport has no bounding box.");
  await page.mouse.move(box.x + 300, box.y + 300);
  await viewport.focus();
  await page.keyboard.down("Space");
  await page.mouse.down();
  await page.mouse.move(box.x + 340, box.y + 324, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up("Space");
  const afterPan = await observeInfinityCanvas(page);
  await expect(page.getByText("Saving paused")).toHaveCount(0);
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.locator(NETWORK_CANVAS)).toBeVisible();
  await pausePlayback(page);
  const afterReload = await observeInfinityCanvas(page);
  const restoredIdentity = await captureIdentity();
  await infinitySwitch().click();
  const restored = await observeInfinityCanvas(page);
  const afterReloadToRestored = await compare(restoredIdentity);
  await page.getByRole("button", { name: "Undo" }).click();
  const undone = await observeInfinityCanvas(page);
  const restoredToUndone = await compare(restoredIdentity);
  await page.getByRole("button", { name: "Redo" }).click();
  const redone = await observeInfinityCanvas(page);
  const undoneToRedone = await compare(restoredIdentity);
  await expectToolcraftInfinityCanvasModeEvidence(
    { afterPan, afterReload, before, enabled, redone, restored, undone },
    { afterReloadToRestored, beforeToEnabled, restoredToUndone, undoneToRedone },
    {
      expectedFiniteSize: { height: 1080, width: 1920 },
      expectedSceneRect: { height: 1080, width: 1920, x: -960, y: -540 },
      requirementId: "shot.canvas.infinity-mode",
      target: "canvas.infinity",
    },
  );
});

test(getNetworkBrowserTestName("canvas.infinity-export"), async ({ page }) => {
  await startSession(page);
  const finite = await exportPngInspection(page, [0, 0, 0, 255]);
  await controlTarget(page, "canvas.infinity").getByRole("switch").click();
  const infinite = await exportPngInspection(page, [0, 0, 0, 255]);
  await expectToolcraftInfinityCanvasImageExportEvidence(
    { finite: finite.inspection, infinite: infinite.inspection },
    {
      expectedSize: { height: 2304, width: 4096 },
      requirementId: "shot.canvas.infinity-export",
      target: "canvas.infinity",
    },
  );
});
