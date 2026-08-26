import test from "node:test";
import assert from "node:assert/strict";
import { parseAllowlist } from "./check-token-gates.mjs";

test("parses allowlist entries from CRLF token files", () => {
  const css = [
    "/* ALLOWLIST",
    " * allow ui/src/pages/Example.tsx — intentional test value",
    " */",
    "",
  ].join("\r\n");

  assert.deepEqual(parseAllowlist(css), [
    {
      path: "ui/src/pages/Example.tsx",
      reason: "intentional test value",
    },
  ]);
});
