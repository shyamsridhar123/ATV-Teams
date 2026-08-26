#!/usr/bin/env node
// Reapply the fork's user-visible rebrand to files taken from upstream.
//
// The helper intentionally does not rename package names, wire fields,
// persisted keys, file names, or other runtime contracts. CSS identifiers are
// renamed only through the explicit allowlist below.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SENTINELS = new Map([
  ["@paperclipai/", "__ATV_REBRAND_PACKAGE_SCOPE__"],
  ["paperclipai", "__ATV_REBRAND_CLI_BINARY__"],
  ["~/.paperclip", "__ATV_REBRAND_CONFIG_HOME__"],
  [".paperclip/", "__ATV_REBRAND_CONFIG_DIR__"],
  ["X-Paperclip-", "__ATV_REBRAND_HEADER__"],
  ["x-paperclip-", "__ATV_REBRAND_HEADER_LOWER__"],
  ["PAPERCLIP_TELEMETRY_DISABLED", "__ATV_REBRAND_TELEMETRY_ENV__"],
]);

const SOURCE_CSS_PREFIXES = [
  "paperclip-doc-annotation-",
  "paperclip-thinking-",
  "paperclip-mdxeditor",
  "paperclip-task-chat-composer",
  "paperclip-edit-in-place-content",
  "paperclip-markdown",
  "paperclip-mention-",
  "paperclip-project-mention-",
  "paperclip-workspace-file-link",
  "paperclip-mermaid",
  "paperclip-story",
];

function protectInternals(input) {
  let output = input;
  output = output.replace(/paperclipai\/paperclip/g, "shyamsridhar123/ATV-Teams");
  for (const [value, sentinel] of SENTINELS) {
    output = output.replaceAll(value, sentinel);
  }
  return output;
}

function restoreInternals(input) {
  let output = input;
  for (const [value, sentinel] of SENTINELS) {
    output = output.replaceAll(sentinel, value);
  }
  return output;
}

function rebrandCssIdentifiers(filePath, input) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".css") {
    return input.replaceAll("paperclip-", "atv-");
  }

  let output = input;
  for (const prefix of SOURCE_CSS_PREFIXES) {
    output = output.replaceAll(prefix, prefix.replace("paperclip-", "atv-"));
  }
  return output.replaceAll("data-paperclip-", "data-atv-");
}

export function rebrandText(filePath, input) {
  let output = protectInternals(input);
  output = rebrandCssIdentifiers(filePath, output);
  output = output
    .replace(/https:\/\/paperclip\.ing\/docs/g, "https://github.com/shyamsridhar123/ATV-Teams/tree/master/doc")
    .replace(/https:\/\/paperclip\.ing/g, "https://github.com/shyamsridhar123/ATV-Teams")
    .replace(/\bPaperclip\b/g, "ATV-Teams")
    .replace(/npx __ATV_REBRAND_CLI_BINARY__/g, "pnpm __ATV_REBRAND_CLI_BINARY__");
  return restoreInternals(output);
}

export function rebrandFiles(files) {
  let changed = 0;
  for (const file of files) {
    const before = readFileSync(file, "utf8");
    const after = rebrandText(file, before);
    if (after !== before) {
      writeFileSync(file, after);
      changed += 1;
    }
  }
  return changed;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const files = process.argv.slice(2);
  const changed = rebrandFiles(files);
  console.log(`rebranded ${changed}/${files.length} files`);
}
