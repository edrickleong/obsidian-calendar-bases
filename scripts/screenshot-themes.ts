/**
 * Screenshot test script for calendar-bases plugin.
 *
 * Captures screenshots of embedded and standalone calendar views across
 * all installed themes, saving them into `test-screenshots/` for visual
 * comparison.
 *
 * Usage:
 *   bun run scripts/screenshot-themes.ts
 *
 * Prerequisites:
 *   - Obsidian must be running with the test-vault open
 *   - The `obsidian` CLI must be available on PATH
 */

import { execSync } from "node:child_process";
import { mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const VAULT = "test-vault";
const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_DIR = join(ROOT, "test-screenshots");
const EMBEDDED_NOTE = "Embedded Calendar Base.md";
const STANDALONE_BASE = "Events.base";

function obsidian(command: string): string {
  return execSync(`obsidian ${command}`, {
    encoding: "utf-8",
    timeout: 30_000,
  }).trim();
}

function sleep(ms: number): void {
  execSync(`sleep ${ms / 1000}`);
}

function setTheme(theme: string): void {
  const escaped = theme.replace(/'/g, "\\'");
  obsidian(
    `eval code="app.customCss.setTheme('${escaped}'); 'ok';" vault="${VAULT}"`,
  );
  sleep(1000);
}

function openFile(path: string): void {
  obsidian(`open path="${path}" vault="${VAULT}"`);
  sleep(2000);
  // Verify the correct file is active before proceeding
  const active = obsidian(`eval code="app.workspace.getActiveFile()?.path" vault="${VAULT}"`);
  if (!active.includes(path.replace(/\.md$/, "").replace(/\.base$/, ""))) {
    // Retry with longer wait
    sleep(2000);
  }
}

function screenshot(filePath: string): void {
  obsidian(`dev:screenshot path="${filePath}" vault="${VAULT}"`);
}

function discoverThemes(): string[] {
  const themesDir = join(ROOT, VAULT, ".obsidian", "themes");
  if (!existsSync(themesDir)) return [];
  return readdirSync(themesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name);
}

// ── Main ──────────────────────────────────────────────────────────────────

const themes = ["", ...discoverThemes()]; // "" = default (no theme)

mkdirSync(OUTPUT_DIR, { recursive: true });

console.log(`📸 Capturing screenshots for ${themes.length} theme(s)`);
console.log(`   Output: ${OUTPUT_DIR}\n`);

for (const theme of themes) {
  const label = theme || "default";
  console.log(`── Theme: ${label} ──`);

  setTheme(theme);

  // Standalone view (rendered first — simpler, loads faster)
  openFile(STANDALONE_BASE);
  const standalonePath = join(OUTPUT_DIR, `standalone-${label}.png`);
  screenshot(standalonePath);
  console.log(`  ✓ standalone → standalone-${label}.png`);

  // Embedded view (needs more time for the plugin to render inside the note)
  openFile(EMBEDDED_NOTE);
  sleep(2000); // extra wait for embedded base to render
  const embeddedPath = join(OUTPUT_DIR, `embedded-${label}.png`);
  screenshot(embeddedPath);
  console.log(`  ✓ embedded  → embedded-${label}.png`);
}

// Reset to default theme
setTheme("");
console.log(
  `\n✅ Done — ${themes.length * 2} screenshots saved to test-screenshots/`,
);
