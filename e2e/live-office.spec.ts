import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The one promise Pookies has to keep: what one person does shows up for
 * everyone else straight away, without a reload. Ana creates an office, Ben
 * opens her invite link and joins with a nickname, and they watch each other
 * in two separate browsers.
 */

const run = Math.random().toString(36).slice(2, 6);
const ANA = `Ana ${run}`;
const BEN = `Ben ${run}`;

/** Waits until this person is inside; false if guests are switched off. */
async function inside(page: Page, name: string): Promise<boolean> {
  const office = page.getByRole("heading", { level: 1, name: new RegExp(`, ${name.split(" ")[0]}$`) });
  const refused = page.getByText("Guests are switched off");
  await expect(office.or(refused)).toBeVisible({ timeout: 30_000 });
  return office.isVisible();
}

/** Makes a new office as `name`. Returns its code, or null if guests are switched off. */
async function createOffice(page: Page, name: string): Promise<string | null> {
  await page.goto("/office");
  await page.getByLabel("Your nickname").fill(name);
  await page.getByRole("button", { name: "Create a new office" }).click();
  if (!(await inside(page, name))) return null;
  return page.locator("[data-office-code]").getAttribute("data-office-code");
}

/** Opens a shared invite link and joins as `name`. */
async function joinOffice(page: Page, name: string, code: string): Promise<void> {
  await page.goto(`/join/${code}`);
  await expect(page.getByLabel("Office code")).toHaveValue(code);
  await page.getByLabel("Your nickname").fill(name);
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await inside(page, name);
}

/** Closes any popover so the next click lands on the map. */
async function closePopovers(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
}

async function leave(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: "Leave office" });
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    await expect(page.getByLabel("Your nickname")).toBeVisible();
  }
}

/** Picks a status from the status pill over the map. */
async function setStatus(page: Page, status: "online" | "busy" | "away"): Promise<void> {
  const radio = page.locator(`input[name="my-status"][value="${status}"]`);
  if (!(await radio.count())) await page.getByRole("button", { name: /^Your status/ }).click();
  await radio.check({ force: true });
}

/** A person's row in the People list. */
function personRow(page: Page, name: string): Locator {
  return page.locator("#office-panel-people li", { hasText: name });
}

/** Where a person's character stands in the office, as "x,y" in world pixels. */
async function positionOf(page: Page, firstName: string): Promise<string> {
  const avatar = page.locator("#office-world [data-walking]", { hasText: firstName });
  // Both the 2D and 3D offices stamp each character's world position on its tag.
  return avatar.evaluate((node) => {
    const { x, y } = (node as HTMLElement).dataset;
    return x && y ? `${x},${y}` : "";
  });
}

test("two people see each other's presence, movement and check-ins live", async ({ browser }) => {
  const anaContext = await browser.newContext();
  const benContext = await browser.newContext();
  const ana = await anaContext.newPage();
  const ben = await benContext.newPage();

  try {
    const code = await createOffice(ana, ANA);
    test.skip(!code, "Guests are off: turn on anonymous sign-ins in Supabase to run this.");
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    await joinOffice(ben, BEN, code!);

    await test.step("each sees the other arrive, online", async () => {
      await expect(personRow(ana, BEN)).toContainText("Online");
      await expect(personRow(ben, ANA)).toContainText("Online");
      await expect(ben.locator("#office-world [data-walking]", { hasText: "Ana" })).toHaveCSS("opacity", "1");
    });

    await test.step("a status change and note reach the other browser", async () => {
      await setStatus(ana, "busy");
      await expect(personRow(ben, ANA)).toContainText("Busy");

      const note = ana.getByLabel(/Add a note/);
      await note.fill("Deep in a test");
      await note.press("Enter");
      await expect(personRow(ben, ANA)).toContainText("Deep in a test");
    });

    await test.step("walking shows up for the other person", async () => {
      const before = await positionOf(ben, "Ana");
      await ana.bringToFront();
      // Out of the status note box first, or the keys would type into it.
      await closePopovers(ana);
      await ana.locator("#office-world").hover();
      await ana.keyboard.down("KeyD");
      await ana.waitForTimeout(900);
      await ana.keyboard.up("KeyD");
      await expect.poll(() => positionOf(ben, "Ana")).not.toBe(before);
      // Once Ana stops, Ben's picture of her settles on the very spot she is standing.
      await expect.poll(async () => positionOf(ben, "Ana")).toBe(await positionOf(ana, "You"));
    });

    await test.step("walking into a room changes your status for everyone", async () => {
      await setStatus(ana, "online");
      await expect(personRow(ben, ANA)).toContainText("Online");
      // Straight right from the desks, through the wide opening, into the lounge.
      await closePopovers(ana);
      await ana.locator("#office-world").hover();
      await ana.keyboard.down("KeyD");
      await ana.waitForTimeout(3500);
      await ana.keyboard.up("KeyD");
      await expect(ana.locator("#office-world p[aria-live]")).toContainText("Lounge", { timeout: 20_000 });
      await expect(personRow(ben, ANA)).toContainText("Away");
    });

    await test.step("a check-in appears for the other person without a reload", async () => {
      await ana.getByRole("tab", { name: /Check-ins/ }).click();
      await ana.getByLabel("What's next today?").fill(`Testing live updates ${run}`);
      await ana.getByRole("button", { name: "Post check-in" }).click();

      await ben.getByRole("tab", { name: /Check-ins/ }).click();
      await expect(ben.locator("#office-panel-check-ins")).toContainText(`Testing live updates ${run}`);
    });

    await test.step("leaving removes you from the other person's office", async () => {
      await ben.getByRole("tab", { name: /People/ }).click();
      await leave(ana);
      await expect(personRow(ben, ANA)).toHaveCount(0);
    });
  } finally {
    // Guests can't sign back in, so never leave test people sitting in the demo office.
    await leave(ana).catch(() => {});
    await leave(ben).catch(() => {});
    await anaContext.close();
    await benContext.close();
  }
});
