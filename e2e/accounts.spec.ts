import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The whole way a team gets going, in two separate browsers: Ana makes an
 * account and starts an office, makes an invite link, Ben opens it, makes
 * his own account and joins, and they see each other live. Then Ben signs out
 * and logs back in.
 *
 * It creates real accounts in the live project, so it only runs when asked:
 * E2E_ACCOUNTS=1. Clean up afterwards by deleting the users whose email starts
 * with "pookies-test-" (Supabase → Authentication → Users).
 */

const run = Math.random().toString(36).slice(2, 8);
const ANA = { name: `Ana ${run}`, email: `pookies-test-ana-${run}@example.com`, password: `walk-in-${run}-A1` };
const BEN = { name: `Ben ${run}`, email: `pookies-test-ben-${run}@example.com`, password: `walk-in-${run}-B1` };
const OFFICE = `Test Office ${run}`;

async function fillSignUp(page: Page, person: typeof ANA): Promise<void> {
  await page.getByLabel("Your name").fill(person.name);
  await page.getByLabel("Email", { exact: true }).fill(person.email);
  await page.locator('input[type="password"]').fill(person.password);
  await page.getByRole("button", { name: "Sign up" }).click();
}

function personRow(page: Page, name: string): Locator {
  return page.locator("#office-panel-people li", { hasText: name });
}

/** Where a person's character stands, as "x,y" in world pixels. */
async function positionOf(page: Page, firstName: string): Promise<string> {
  const avatar = page.locator("#office-world [data-walking]", { hasText: firstName });
  return avatar.evaluate((node) => {
    const { x, y } = (node as HTMLElement).dataset;
    return x && y ? `${x},${y}` : "";
  });
}

test("make an account, start an office, invite a friend, and see each other live", async ({ browser }) => {
  test.skip(process.env.E2E_ACCOUNTS !== "1", "Creates real accounts: set E2E_ACCOUNTS=1 to run it.");
  test.setTimeout(180_000);

  const anaContext = await browser.newContext();
  const benContext = await browser.newContext();
  const ana = await anaContext.newPage();
  const ben = await benContext.newPage();

  try {
    await test.step("Ana makes an account and starts an office", async () => {
      await ana.goto("/signup");
      await fillSignUp(ana, ANA);
      await expect(ana.getByRole("heading", { name: "Set up your office" })).toBeVisible({ timeout: 30_000 });
      await ana.getByLabel("Workspace name").fill(OFFICE);
      await ana.getByRole("button", { name: "Create workspace" }).click();
      await expect(ana).toHaveURL(/\/office$/, { timeout: 30_000 });
      await expect(ana.getByRole("heading", { level: 1, name: /, Ana$/ })).toBeVisible({ timeout: 30_000 });
    });

    let invitePath = "";
    await test.step("Ana makes an invite link", async () => {
      await ana.goto("/admin");
      await ana.getByRole("button", { name: "New invite link" }).click();
      const link = ana.locator('a[href^="/join/"]').first();
      await expect(link).toBeVisible();
      invitePath = (await link.getAttribute("href")) ?? "";
      expect(invitePath).toMatch(/^\/join\/[a-z0-9]+$/);
    });

    await test.step("Ben opens the link, makes an account and joins", async () => {
      await ben.goto(invitePath);
      await expect(ben.getByRole("heading", { name: `Join ${OFFICE}` })).toBeVisible({ timeout: 30_000 });
      await ben.getByRole("link", { name: "Sign up to join" }).click();
      await fillSignUp(ben, BEN);
      await expect(ben.getByRole("heading", { name: `Join ${OFFICE}` })).toBeVisible({ timeout: 30_000 });
      await ben.getByRole("button", { name: /^Join as/ }).click();
      await expect(ben).toHaveURL(/\/office$/, { timeout: 30_000 });
      await expect(ben.getByRole("heading", { level: 1, name: /, Ben$/ })).toBeVisible({ timeout: 30_000 });
    });

    await test.step("they see each other, online, in the same office", async () => {
      await ana.goto("/office");
      await expect(personRow(ana, BEN.name)).toContainText("Online", { timeout: 30_000 });
      await expect(personRow(ben, ANA.name)).toContainText("Online", { timeout: 30_000 });
    });

    await test.step("walking shows up for the other person", async () => {
      const before = await positionOf(ana, "Ben");
      await ben.bringToFront();
      await ben.locator("#office-world").hover();
      await ben.keyboard.down("KeyD");
      await ben.waitForTimeout(900);
      await ben.keyboard.up("KeyD");
      await expect.poll(() => positionOf(ana, "Ben"), { timeout: 15_000 }).not.toBe(before);
    });

    await test.step("Ben signs out and logs back in to the same office", async () => {
      await ben.goto("/profile");
      await ben.getByRole("button", { name: "Sign out" }).click();
      await expect(ben.getByRole("link", { name: "Log in" })).toBeVisible({ timeout: 30_000 });
      await expect(personRow(ana, BEN.name)).toContainText("Offline", { timeout: 30_000 });

      await ben.goto("/login");
      await ben.getByLabel("Email", { exact: true }).fill(BEN.email);
      await ben.locator('input[type="password"]').fill(BEN.password);
      await ben.getByRole("button", { name: "Log in" }).click();
      await expect(ben).toHaveURL(/\/office$/, { timeout: 30_000 });
      await expect(ben.getByRole("heading", { level: 1, name: /, Ben$/ })).toBeVisible({ timeout: 30_000 });
      await expect(personRow(ana, BEN.name)).toContainText("Online", { timeout: 30_000 });
    });
  } finally {
    await anaContext.close();
    await benContext.close();
  }
});
