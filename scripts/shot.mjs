/**
 * Tangkap layar halaman publik + laporkan galat konsol.
 *   node scripts/shot.mjs <outDir> [baseUrl]
 *
 * Sengaja terpisah dari scripts/_qa.mjs: harness itu login betulan dan butuh
 * QA_EMAIL/QA_PASSWORD, sedangkan yang ini memeriksa halaman bergerbang-login
 * tanpa kredensial apa pun — cukup untuk membuktikan bundel merender dan design
 * system-nya hidup.
 */
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";
import { findChrome } from "./_chrome.mjs";

const outDir = process.argv[2] ?? "qa-shots";
const base = (process.argv[3] ?? "http://localhost:3000").replace(/\/$/, "");
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

const errors = [];
const page = await browser.newPage();
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`[console] ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

const VIEWS = [
  { name: "desktop", width: 1360, height: 900 },
  { name: "mobile", width: 360, height: 740 },
];
const PAGES = ["/login", "/register", "/faq", "/offline", "/nope-404"];

for (const view of VIEWS) {
  await page.setViewport({ width: view.width, height: view.height, deviceScaleFactor: 1 });

  for (const path of PAGES) {
    await page.goto(base + path, { waitUntil: "networkidle0", timeout: 30_000 });
    // SPA merender setelah bundel dieksekusi; tunggu #root benar-benar terisi.
    await page.waitForFunction(() => document.querySelector("#root")?.children.length, {
      timeout: 10_000,
    });

    // Scrollbar mendatar adalah kegagalan responsif, bukan sekadar kosmetik:
    // bayangan liat menyembul beberapa piksel keluar dari setiap kartu.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    if (overflow) errors.push(`[overflow-x] ${view.name} ${path}`);

    const file = `${outDir}/${view.name}${path.replace(/\//g, "-")}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`${overflow ? "OVERFLOW" : "  ok    "}  ${view.name.padEnd(7)} ${path}`);
  }
}

await browser.close();

if (errors.length) {
  console.error("\nGalat:");
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log("\nSemua halaman publik merender bersih, tanpa scrollbar mendatar.");
