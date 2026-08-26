#!/usr/bin/env node
// Copy the server's required static asset trees into dist/ after tsc.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) copyBuildAssets();
