import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultServerDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TREES = [
  ["src/onboarding-assets", "dist/onboarding-assets"],
  ["src/built-ins", "dist/built-ins"],
];

export function copyBuildAssets(serverDir = defaultServerDir) {
  for (const [from, to] of TREES) {
    const sourceDir = resolve(serverDir, from);
    const destinationDir = resolve(serverDir, to);
    if (!existsSync(sourceDir)) {
      throw new Error(`[build-assets] required source directory is missing: ${from}`);
    }
    mkdirSync(destinationDir, { recursive: true });
    cpSync(sourceDir, destinationDir, { recursive: true });
    console.log(`[build-assets] ${from} -> ${to}`);
  }
}
