#!/usr/bin/env node
import { basename, resolve } from "node:path";
import { chmodSync, cpSync, mkdirSync, rmSync } from "node:fs";

export function cleanPaths(paths, cwd = process.cwd()) {
  for (const target of paths) {
    rmSync(resolve(cwd, target), { recursive: true, force: true });
  }
}

export function copyFiles(destinationDir, sources, cwd = process.cwd()) {
  const destination = resolve(cwd, destinationDir);
  mkdirSync(destination, { recursive: true });
  for (const source of sources) {
    const absoluteSource = resolve(cwd, source);
    cpSync(absoluteSource, resolve(destination, basename(source)));
  }
}

export function copyTree(source, destination, cwd = process.cwd()) {
  cpSync(resolve(cwd, source), resolve(cwd, destination), { recursive: true });
}

export function markExecutable(filePath, cwd = process.cwd()) {
  chmodSync(resolve(cwd, filePath), 0o755);
}

function usage() {
  console.error(
    "Usage: fs-build-utils.mjs clean <path...> | copy-files <dest-dir> <source...> | copy-tree <source> <dest> | chmod-exec <path>",
  );
}

function main(argv) {
  const [command, ...args] = argv;
  if (command === "clean" && args.length > 0) {
    cleanPaths(args);
    return;
  }
  if (command === "copy-files" && args.length > 1) {
    copyFiles(args[0], args.slice(1));
    return;
  }
  if (command === "copy-tree" && args.length === 2) {
    copyTree(args[0], args[1]);
    return;
  }
  if (command === "chmod-exec" && args.length === 1) {
    markExecutable(args[0]);
    return;
  }
  usage();
  process.exitCode = 1;
}

if (process.argv[1]?.endsWith("fs-build-utils.mjs")) {
  main(process.argv.slice(2));
}
