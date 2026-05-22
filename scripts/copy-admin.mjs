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

const configPath = path.join(srcDir, "config.js");
if (!existsSync(configPath)) {
  throw new Error(
    "admin/config.js not found. Copy admin/.env.example to admin/.env, fill values, then run: npm run admin:config"
  );
}

const shouldCopy = (src) => {
  const base = path.basename(src);
  if (base === ".env" || base === ".env.example") {
    return false;
  }
  return true;
};

await rm(destDir, { recursive: true, force: true });
await cp(srcDir, destDir, { recursive: true, filter: shouldCopy });

console.log("Copied admin to dist/admin.");
