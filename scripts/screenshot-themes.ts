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
const COLOR_SCHEMES = ["light", "dark"] as const;

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

function setColorScheme(scheme: "light" | "dark"): void {
  obsidian(
    `eval code="app.changeTheme('${scheme === 'dark' ? 'obsidian' : 'moonstone'}'); 'ok';" vault="${VAULT}"`,
  );
  sleep(500);
}

function openFile(path: string): void {
  obsidian(`open path="${path}" vault="${VAULT}"`);
  sleep(2000);
  const active = obsidian(`eval code="app.workspace.getActiveFile()?.path" vault="${VAULT}"`);
  if (!active.includes(path.replace(/\.md$/, "").replace(/\.base$/, ""))) {
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
const totalScreenshots = themes.length * COLOR_SCHEMES.length * 2;

mkdirSync(OUTPUT_DIR, { recursive: true });

console.log(`📸 Capturing screenshots for ${themes.length} theme(s) × ${COLOR_SCHEMES.length} color scheme(s)`);
console.log(`   Output: ${OUTPUT_DIR}\n`);

for (const theme of themes) {
  const themeLabel = theme || "default";
  setTheme(theme);

  for (const scheme of COLOR_SCHEMES) {
    console.log(`── Theme: ${themeLabel} (${scheme}) ──`);

    setColorScheme(scheme);

    // Standalone view (rendered first — simpler, loads faster)
    openFile(STANDALONE_BASE);
    const standalonePath = join(OUTPUT_DIR, `standalone-${themeLabel}-${scheme}.png`);
    screenshot(standalonePath);
    console.log(`  ✓ standalone → standalone-${themeLabel}-${scheme}.png`);

    // Embedded view (needs more time for the plugin to render inside the note)
    openFile(EMBEDDED_NOTE);
    sleep(2000); // extra wait for embedded base to render
    const embeddedPath = join(OUTPUT_DIR, `embedded-${themeLabel}-${scheme}.png`);
    screenshot(embeddedPath);
    console.log(`  ✓ embedded  → embedded-${themeLabel}-${scheme}.png`);
  }
}

// Reset to default theme and light mode
setTheme("");
setColorScheme("dark");
console.log(
  `\n✅ Done — ${totalScreenshots} screenshots saved to test-screenshots/`,
);
