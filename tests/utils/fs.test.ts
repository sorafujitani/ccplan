import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirExists, fileExists } from "../../src/utils/fs.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "ccplan-fs-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("dirExists", () => {
  it("returns true for existing directory", async () => {
    expect(await dirExists(tempDir)).toBe(true);
  });

  it("returns false for non-existent path", async () => {
    expect(await dirExists(join(tempDir, "nonexistent"))).toBe(false);
  });

  it("returns false for file path", async () => {
    const filePath = join(tempDir, "file.txt");
    await writeFile(filePath, "content");
    expect(await dirExists(filePath)).toBe(false);
  });
});

describe("fileExists", () => {
  it("returns true for existing file", async () => {
    const filePath = join(tempDir, "file.txt");
    await writeFile(filePath, "content");
    expect(await fileExists(filePath)).toBe(true);
  });

  it("returns false for non-existent path", async () => {
    expect(await fileExists(join(tempDir, "nonexistent.txt"))).toBe(false);
  });

  it("returns false for directory path", async () => {
    const dirPath = join(tempDir, "subdir");
    await mkdir(dirPath);
    expect(await fileExists(dirPath)).toBe(false);
  });
});
