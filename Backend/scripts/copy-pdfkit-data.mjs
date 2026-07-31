/**
 * Copy pdfkit's font-metric data next to the esbuild output.
 *
 * pdfkit reads its 14 standard-font metrics at runtime with a hardcoded
 * `fs.readFileSync(__dirname + '/data/<Font>.afm')`. Bundling collapses pdfkit
 * into dist/server.cjs, so __dirname becomes `dist/` and it looks for
 * `dist/data/Helvetica.afm` — a path that only exists if we put it there.
 * `pkg` then snapshots it via the `dist/data/**\/*` asset glob.
 *
 * Without this step the packaged exe throws
 *   "File 'C:\**\dist\data\Helvetica.afm' was not included into executable"
 * on the first PDF it tries to generate.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = path.resolve(fileURLToPath(import.meta.url), "../..");
const srcDir = path.join(backendDir, "node_modules", "pdfkit", "js", "data");
const outDir = path.join(backendDir, "dist", "data");

if (!fs.existsSync(srcDir)) {
  console.error(`[copy-pdfkit-data] pdfkit data dir not found: ${srcDir}`);
  console.error("[copy-pdfkit-data] run `npm install` first.");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(srcDir);
for (const file of files) {
  fs.copyFileSync(path.join(srcDir, file), path.join(outDir, file));
}

// Mirror into src/assets so the runtime resolver in src/lib/pdfFonts.js has a
// second place to look if the dist/data asset ever goes missing.
const assetsDir = path.join(backendDir, "src", "assets", "pdf-data");
fs.mkdirSync(assetsDir, { recursive: true });
for (const file of files) {
  fs.copyFileSync(path.join(srcDir, file), path.join(assetsDir, file));
}

console.log(
  `[copy-pdfkit-data] copied ${files.length} font-metric files -> dist/data and src/assets/pdf-data`,
);
