import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  selectComposition,
  renderStill,
  renderMedia,
} from "@remotion/renderer";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
const output = path.resolve("../output/playwright/demo-2026-10-16");
mkdirSync(output, { recursive: true });
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  outDir: path.resolve("../tmp/demo-render-bundle"),
});
const browserExecutable =
  process.env.REMOTION_BROWSER_EXECUTABLE ||
  "C:/custom/bins/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";
const browser = await openBrowser("chrome", { browserExecutable });
try {
  const composition = await selectComposition({
    serveUrl,
    id: "StayoraDemo",
    puppeteerInstance: browser,
  });
  const storyboard = JSON.parse(readFileSync("storyboard.json", "utf8"));
  const moments = storyboard.shots.map(
    (shot) => shot.start + Math.max(1, Math.floor(shot.duration * 0.6)),
  );
  for (let i = 0; i < moments.length; i += 3) {
    await Promise.all(
      moments.slice(i, i + 3).map(async (second) => {
        await renderStill({
          composition,
          serveUrl,
          puppeteerInstance: browser,
          frame: second * 30,
          output: path.join(
            output,
            `qa-${String(second).padStart(3, "0")}.png`,
          ),
        });
        console.log(`Checked ${second}s`);
      }),
    );
  }
  writeFileSync(
    path.join(output, "timeline.json"),
    JSON.stringify(
      {
        durationSeconds: storyboard.durationSeconds,
        fps: 30,
        width: 1920,
        height: 1080,
        qaSeconds: moments,
        chapters: storyboard.chapters,
        shots: storyboard.shots,
      },
      null,
      2,
    ),
  );
  if (process.argv.includes("--render")) {
    let last = -1;
    await renderMedia({
      composition,
      serveUrl,
      puppeteerInstance: browser,
      codec: "h264",
      crf: 19,
      concurrency: 8,
      outputLocation: path.join(output, "Stayora-demo-final.mp4"),
      onProgress: ({ progress }) => {
        const percent = Math.floor(progress * 20) * 5;
        if (percent !== last) {
          last = percent;
          console.log(`Export ${percent}%`);
        }
      },
    });
  }
} finally {
  await browser.close({ silent: true });
}
