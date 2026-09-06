/**
 * Browser QA harness: logs in for real, screenshots every page at desktop and
 * mobile in both themes, and exercises the interactions that used to have no
 * keyboard or feedback path.
 *
 * Usage: node scripts/_qa.mjs <outDir> [baseUrl]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
import { findChrome, qaEmail, qaPassword } from "./_chrome.mjs";

const CHROME = findChrome();
const outDir = process.argv[2];
const base = process.argv[3] ?? "http://localhost:3000";
mkdirSync(outDir, { recursive: true });

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const EMAIL = qaEmail();
const PASSWORD = qaPassword();

const findings = [];
const consoleErrors = [];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1360, height: 900, deviceScaleFactor: 1 });

// The dirty-form guard raises a native beforeunload prompt; accept it so the
// harness can keep navigating.
page.on("dialog", (d) => d.accept().catch(() => {}));

page.on("console", (msg) => {
  if (msg.type() === "error") {
    const text = msg.text();
    // React's dev-only hydration hints from stripped scripts are not relevant.
    if (/favicon|Download the React DevTools/i.test(text)) return;
    consoleErrors.push(`${page.url().replace(base, "")} :: ${text}`);
  }
});
page.on("pageerror", (err) => consoleErrors.push(`${page.url().replace(base, "")} :: ${err.message}`));

async function shot(name) {
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  console.log("shot", name);
}

async function goto(path) {
  try {
    await page.goto(base + path, { waitUntil: "networkidle2", timeout: 30000 });
  } catch {
    // A blocked unload can stall networkidle2; the document still loads.
    await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 30000 });
  }
  /*
    Tanpa SSR, `networkidle2` bisa selesai sebelum React sempat merender apa
    pun: dokumen pertama hanyalah <div id="root"></div> yang kosong. Menunggu
    root benar-benar terisi mencegah tangkapan layar berisi halaman putih.
  */
  await page
    .waitForFunction(() => document.querySelector("#root")?.children.length, { timeout: 15000 })
    .catch(() => {});
  // Let framer-motion entrance animations settle before capturing.
  await new Promise((r) => setTimeout(r, 550));
}

/**
 * Pins both the stored preference and the OS media feature. Headless Chrome
 * reports prefers-color-scheme: dark by default, so without the emulation the
 * "light" captures came out dark.
 */
async function setTheme(theme) {
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: theme === "dark" ? "dark" : "light" },
  ]);
  await page.evaluate((t) => {
    try {
      localStorage.setItem("theme", t);
    } catch {
      /* private mode */
    }
  }, theme);
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 600));
}

// ---------------------------------------------------------------- login
await goto("/login");
await page.type('input[type="email"]', EMAIL);
await page.type('input[type="password"]', PASSWORD);
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 1200));

if (!page.url().includes("/dashboard")) {
  findings.push(`LOGIN did not reach /dashboard (at ${page.url()})`);
}

// ------------------------------------------------- desktop light captures
await setTheme("light");

const DESKTOP_PAGES = [
  ["dashboard", "/dashboard"],
  ["skm", "/skm"],
  ["skm-new", "/skm/new"],
  ["skm-linkedin", "/skm/linkedin"],
  ["reports", "/reports"],
  ["reports-feed", "/reports/feed"],
  ["reports-new", "/reports/new"],
  ["reports-export", "/reports/export"],
  ["logbook", "/logbook"],
  ["logbook-new", "/logbook/new"],
  ["logbook-supervisors", "/logbook/supervisors"],
  ["logbook-rekap", "/logbook/rekap"],
  ["account", "/account"],
];

for (const [name, path] of DESKTOP_PAGES) {
  await goto(path);
  await shot(`desktop-${name}`);
}

// --------------------------------------------------------- dark mode
await setTheme("dark");
for (const [name, path] of [
  ["dashboard", "/dashboard"],
  ["skm", "/skm"],
  ["reports-new", "/reports/new"],
  ["logbook", "/logbook"],
]) {
  await goto(path);
  await shot(`dark-${name}`);
}

// Print routes must stay light even with the dark theme active.
await goto("/print/formulir2");
await shot("dark-theme-print-formulir2");
await setTheme("light");

// ------------------------------------------------------------- mobile
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
for (const [name, path] of [
  ["dashboard", "/dashboard"],
  ["skm", "/skm"],
  ["reports", "/reports"],
  ["reports-new", "/reports/new"],
  ["reports-export", "/reports/export"],
  ["logbook", "/logbook"],
  ["logbook-supervisors", "/logbook/supervisors"],
]) {
  await goto(path);
  await shot(`mobile-${name}`);
}

// Mobile drawer: opens, traps focus, closes on Escape.
await goto("/dashboard");
await page.click('button[aria-label="Buka menu navigasi"]');
await new Promise((r) => setTimeout(r, 500));
await shot("mobile-drawer-open");

const drawerOpen = await page.$('[role="dialog"]');
if (!drawerOpen) findings.push("DRAWER did not open on mobile");

await page.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 400));
const drawerClosed = !(await page.$('[role="dialog"]'));
if (!drawerClosed) findings.push("DRAWER did not close on Escape");

// Mobile dark
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await setTheme("dark");
await goto("/skm");
await shot("mobile-dark-skm");
await setTheme("light");

// --------------------------------------- desktop interaction checks
await page.setViewport({ width: 1360, height: 900, deviceScaleFactor: 1 });

/** Runs one named check; a failure is recorded, never fatal. */
async function check(name, fn) {
  try {
    await fn();
    console.log("ok  ", name);
  } catch (err) {
    findings.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    console.log("FAIL", name);
  }
}

/** First element matching `selector` that is actually visible. */
async function visible(selector) {
  const handles = await page.$$(selector);
  for (const h of handles) {
    const box = await h.boundingBox();
    if (box && box.width > 0 && box.height > 0) return h;
  }
  return null;
}

// Delete confirmation is a real dialog, not window.confirm.
await check("delete opens AlertDialog", async () => {
  await goto("/logbook");
  const href = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a[href^="/logbook/"]')).find((el) =>
      el.getAttribute("href")?.endsWith("/edit"),
    );
    return a?.getAttribute("href") ?? null;
  });
  if (!href) throw new Error("no logbook edit link found");

  await goto(href);

  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Hapus",
    );
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!clicked) throw new Error("Hapus button not found");

  await new Promise((r) => setTimeout(r, 600));
  if (!(await page.$('[role="alertdialog"]'))) throw new Error("AlertDialog did not open");
  await shot("desktop-confirm-dialog");

  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 400));
  if (await page.$('[role="alertdialog"]')) throw new Error("AlertDialog did not close on Escape");
});

// URL-synced filters restore from the query string.
await check("filters restore from URL", async () => {
  await goto("/reports?kategori=Dokumentasi");
  const label = await page.evaluate(
    () => document.getElementById("f-kategori-lap")?.textContent?.trim() ?? "",
  );
  if (!label.includes("Dokumentasi")) throw new Error(`trigger shows "${label}"`);
  await shot("desktop-filter-from-url");
});

// Pagination writes the page into the URL.
await check("search writes to URL", async () => {
  await goto("/reports");
  await page.type("#filter-cari", "Handover", { delay: 60 });
  // router.replace is noticeably slower in dev; poll instead of a fixed wait.
  for (let i = 0; i < 20 && !page.url().includes("q=Handover"); i++) {
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!page.url().includes("q=Handover")) throw new Error(`url is ${page.url()}`);
});

// Unsaved-changes bar appears once the form is dirty.
await check("unsaved bar appears", async () => {
  await goto("/reports/new");
  await page.type("#judul", "Uji coba bar perubahan");
  await new Promise((r) => setTimeout(r, 700));
  const shown = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="status"]')).some((el) =>
      el.textContent?.includes("belum disimpan"),
    ),
  );
  if (!shown) throw new Error("bar not rendered");
  await shot("desktop-unsaved-bar");
});

// Toast on a validation failure.
await check("toast on invalid submit", async () => {
  await goto("/reports/new");
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Simpan Laporan"),
    );
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 900));
  if (!(await page.$("[data-sonner-toast]"))) throw new Error("no toast element");
  await shot("desktop-toast");
});

// Overnight shift is accepted and its duration computed.
await check("overnight shift accepted", async () => {
  await goto("/reports/new");
  await page.evaluate(() => {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (!el) return;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    set("jam-mulai", "22:00");
    set("jam-selesai", "06:00");
  });
  await new Promise((r) => setTimeout(r, 600));
  const text = await page.evaluate(() => document.body.innerText);
  if (!text.includes("8 Jam")) throw new Error("duration not shown as 8 Jam");
  if (!text.includes("Lintas hari")) throw new Error("overnight badge missing");
  await shot("desktop-overnight");
});

// Certificate dialog closes on Escape.
await check("certificate dialog keyboard", async () => {
  await goto("/skm");
  const opened = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Lihat",
    );
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!opened) return; // No certificate uploaded — nothing to assert.

  await new Promise((r) => setTimeout(r, 600));
  if (!(await page.$('[role="dialog"]'))) throw new Error("dialog did not open");
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 400));
  if (await page.$('[role="dialog"]')) throw new Error("dialog did not close on Escape");
});

// No duplicate DOM ids (breaks <label for> and aria-describedby).
await check("no duplicate DOM ids", async () => {
  for (const path of ["/reports", "/skm", "/logbook", "/reports/new", "/account"]) {
    await goto(path);
    const dupes = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll("[id]")).map((e) => e.id);
      return Array.from(new Set(ids.filter((id, i) => ids.indexOf(id) !== i)));
    });
    if (dupes.length) throw new Error(`${path} -> ${dupes.join(", ")}`);
  }
});

// PWA manifest + maskable icon.
await check("PWA manifest", async () => {
  const manifest = await page.evaluate(async () => {
    const res = await fetch("/manifest.webmanifest");
    return { status: res.status, body: await res.json() };
  });
  if (manifest.status !== 200) throw new Error(`status ${manifest.status}`);
  if (!manifest.body?.icons?.some((i) => i.purpose === "maskable")) {
    throw new Error("no maskable icon");
  }
  if (!manifest.body?.shortcuts?.length) throw new Error("no shortcuts");
});

// Skip-to-content link is reachable by keyboard.
await check("skip link focusable", async () => {
  await goto("/dashboard");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
  if (!focused.includes("Lompat ke konten")) throw new Error(`first tab stop is "${focused}"`);
});

writeFileSync(
  `${outDir}/report.json`,
  JSON.stringify({ findings, consoleErrors: [...new Set(consoleErrors)] }, null, 2),
  "utf8",
);

const NL = String.fromCharCode(10);
console.log(NL + "=== FINDINGS ===");
console.log(findings.length ? findings.map((f) => " - " + f).join(NL) : "none");
console.log(NL + "=== CONSOLE ERRORS ===");
const uniq = [...new Set(consoleErrors)];
console.log(
  uniq.length ? uniq.map((e) => " - " + e.split(NL)[0].slice(0, 200)).join(NL) : "none",
);

await browser.close();
