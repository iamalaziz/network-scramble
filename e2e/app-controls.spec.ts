import { NETWORK_CANVAS } from "./product-network-support";
import { expect, test } from "./toolcraft-product-test";

test("browser: network scramble opens with its shot and product sections", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toBeVisible();
  await expect(page.getByRole("application", { name: "Canvas viewport" })).toBeVisible();
  await expect(page.locator(NETWORK_CANVAS)).toBeVisible();
  for (const title of ["Squares", "Dot Grid", "Hubs", "Spokes", "Camera", "Decode"]) {
    await expect(page.getByRole("button", { name: `Toggle ${title} section` })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Export PNG" })).toBeVisible();
});
