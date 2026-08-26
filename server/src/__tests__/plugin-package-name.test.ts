import { describe, expect, it } from "vitest";
import { isPluginPackageName, NPM_PLUGIN_PACKAGE_PREFIX } from "../services/plugin-loader.js";

describe("plugin npm package compatibility", () => {
  it("keeps the canonical unscoped package prefix", () => {
    expect(NPM_PLUGIN_PACKAGE_PREFIX).toBe("paperclip-plugin-");
    expect(isPluginPackageName("paperclip-plugin-linear")).toBe(true);
    expect(isPluginPackageName("atv-plugin-linear")).toBe(false);
  });

  it("continues to accept scoped plugin packages", () => {
    expect(isPluginPackageName("@acme/plugin-linear")).toBe(true);
    expect(isPluginPackageName("@paperclipai/plugin-example")).toBe(true);
  });
});
