#!/usr/bin/env node
// Copy the server's static asset trees into dist/ after tsc.
//
// Replaces `mkdir -p ... && cp -R ...` in server/package.json's build script.
// Those are Unix commands, so the build failed on Windows with "The syntax of
// the command is incorrect" even though tsc itself succeeded.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// [source, destination] relative to server/
const TREES = [
  ["src/onboarding-assets", "dist/onboarding-assets"],
  ["src/built-ins", "dist/built-ins"],
];

for (const [from, to] of TREES) {
  const sourceDir = resolve(serverDir, from);
  const destinationDir = resolve(serverDir, to);
  if (!existsSync(sourceDir)) {
    console.warn(`[build-assets] skipping ${from}: not found`);
    continue;
  }
  mkdirSync(destinationDir, { recursive: true });
  cpSync(sourceDir, destinationDir, { recursive: true });
  console.log(`[build-assets] ${from} -> ${to}`);
}
