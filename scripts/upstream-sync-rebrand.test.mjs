import test from "node:test";
import assert from "node:assert/strict";
import { rebrandText } from "./upstream-sync-rebrand.mjs";

test("preserves runtime and compatibility identifiers", () => {
  const source = [
    ".paperclip-runtime",
    "paperclip-bridge-server.mjs",
    "paperclip-upload-artifact.sh",
    "paperclip-plugin-linear",
    "paperclip-create-agent",
    "paperclip-release:v1",
    "paperclip.theme",
    "x-paperclip-cloud-paperclip-company-id",
  ].join("\n");

  assert.equal(rebrandText("example.ts", source), source);
});

test("rebrands only allowlisted CSS identifiers in source files", () => {
  const source = [
    'className="paperclip-markdown paperclip-mention-chip"',
    'const runtime = ".paperclip-runtime";',
  ].join("\n");

  assert.equal(
    rebrandText("component.tsx", source),
    [
      'className="atv-markdown atv-mention-chip"',
      'const runtime = ".paperclip-runtime";',
    ].join("\n"),
  );
});

test("rebrands CSS files and user-visible product identity", () => {
  assert.equal(
    rebrandText("index.css", ".paperclip-markdown { color: red; }"),
    ".atv-markdown { color: red; }",
  );
  assert.equal(
    rebrandText("README.md", "Paperclip https://github.com/paperclipai/paperclip"),
    "ATV-Teams https://github.com/shyamsridhar123/ATV-Teams",
  );
});
