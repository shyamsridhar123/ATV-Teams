import { existsSync, readFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { copyBuildAssets } from "../../scripts/copy-build-assets-lib.mjs";

const packageJsonPath = fileURLToPath(new URL("../../package.json", import.meta.url));
const copyScriptPath = fileURLToPath(new URL("../../scripts/copy-build-assets.mjs", import.meta.url));
const copyLibraryPath = fileURLToPath(new URL("../../scripts/copy-build-assets-lib.mjs", import.meta.url));

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
    const copyLibrary = readFileSync(copyLibraryPath, "utf8");
    expect(copyScript).toContain("copyBuildAssets");
    expect(copyLibrary).toContain("src/onboarding-assets");
    expect(copyLibrary).toContain("dist/onboarding-assets");
    expect(copyLibrary).toContain("src/built-ins");
    expect(copyLibrary).toContain("dist/built-ins");
  });

  it("fails when a required runtime asset tree is missing", async () => {
    const serverDir = await fs.mkdtemp(path.join(os.tmpdir(), "server-build-assets-"));
    try {
      await fs.mkdir(path.join(serverDir, "src", "onboarding-assets"), { recursive: true });
      expect(() => copyBuildAssets(serverDir)).toThrow(
        "required source directory is missing: src/built-ins",
      );
      expect(existsSync(path.join(serverDir, "dist", "onboarding-assets"))).toBe(true);
    } finally {
      await fs.rm(serverDir, { recursive: true, force: true });
    }
  });
});
