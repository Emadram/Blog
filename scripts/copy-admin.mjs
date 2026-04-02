import { cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist");
const srcDir = path.join(root, "admin");
const destDir = path.join(distDir, "admin");

if (!existsSync(distDir)) {
  throw new Error("dist folder not found. Run astro build first.");
}

if (!existsSync(srcDir)) {
  throw new Error("admin folder not found.");
}

await rm(destDir, { recursive: true, force: true });
await cp(srcDir, destDir, { recursive: true });

console.log("Copied admin to dist/admin.");
