import { describe, expect, it } from "vitest";
import { pickToken } from "./execute.js";

describe("Copilot credential selection", () => {
  it("uses only the resolved adapter environment", () => {
    process.env.GH_TOKEN = "host-ci-token";
    process.env.GITHUB_TOKEN = "host-github-token";
    try {
      expect(pickToken({})).toBeNull();
      expect(pickToken({ GH_TOKEN: "agent-token" })).toBe("agent-token");
    } finally {
      delete process.env.GH_TOKEN;
      delete process.env.GITHUB_TOKEN;
    }
  });

  it("preserves Copilot CLI token precedence", () => {
    expect(
      pickToken({
        GITHUB_TOKEN: "github",
        GH_TOKEN: "gh",
        COPILOT_GITHUB_TOKEN: "copilot",
      }),
    ).toBe("copilot");
  });
});
