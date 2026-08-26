import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { cleanPaths, copyFiles, copyTree, markExecutable } from "./fs-build-utils.mjs";

test("cleans paths and copies files and trees", async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "fs-build-utils-"));
  try {
    await fsp.mkdir(path.join(root, "src", "tree"), { recursive: true });
    await fsp.writeFile(path.join(root, "src", "one.txt"), "one", "utf8");
    await fsp.writeFile(path.join(root, "src", "two.txt"), "two", "utf8");
    await fsp.writeFile(path.join(root, "src", "tree", "nested.txt"), "nested", "utf8");
    await fsp.mkdir(path.join(root, "stale"), { recursive: true });

    copyFiles("dist/files", ["src/one.txt", "src/two.txt"], root);
    copyTree("src/tree", "dist/tree", root);
    markExecutable("dist/files/one.txt", root);
    cleanPaths(["stale"], root);

    assert.equal(fs.readFileSync(path.join(root, "dist", "files", "one.txt"), "utf8"), "one");
    assert.equal(fs.readFileSync(path.join(root, "dist", "files", "two.txt"), "utf8"), "two");
    assert.equal(fs.readFileSync(path.join(root, "dist", "tree", "nested.txt"), "utf8"), "nested");
    if (process.platform !== "win32") {
      assert.equal(fs.statSync(path.join(root, "dist", "files", "one.txt")).mode & 0o111, 0o111);
    }
    assert.equal(fs.existsSync(path.join(root, "stale")), false);
  } finally {
    await fsp.rm(root, { recursive: true, force: true });
  }
});
