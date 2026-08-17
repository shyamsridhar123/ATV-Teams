import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageJsonPath = fileURLToPath(new URL("../../package.json", import.meta.url));
const copyScriptPath = fileURLToPath(new URL("../../scripts/copy-build-assets.mjs", import.meta.url));

describe("server package build script", () => {
  it("copies static runtime asset directories into dist", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    const buildScript = packageJson.scripts?.build ?? "";

    // The copy step runs through scripts/copy-build-assets.mjs rather than
    // `mkdir -p && cp -R`. Those are Unix-only, so the build failed on Windows
    // after tsc succeeded. Assert the behaviour (both trees reach dist) instead
    // of a specific shell incantation.
    expect(buildScript).toContain("tsc");
    expect(buildScript).toContain("scripts/copy-build-assets.mjs");

    const copyScript = readFileSync(copyScriptPath, "utf8");
    expect(copyScript).toContain("src/onboarding-assets");
    expect(copyScript).toContain("dist/onboarding-assets");
    expect(copyScript).toContain("src/built-ins");
    expect(copyScript).toContain("dist/built-ins");
  });
});
