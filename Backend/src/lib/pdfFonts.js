/**
 * Makes pdfkit's standard-font metrics resolvable no matter how the server is
 * launched: `node src/server.js`, the esbuild bundle, or the `pkg` exe.
 *
 * pdfkit hardcodes `fs.readFileSync(__dirname + '/data/<Font>.afm')`. In dev
 * __dirname is node_modules/pdfkit/js so it just works; once bundled it becomes
 * dist/ and the read fails unless the files were shipped alongside. The build
 * copies them there (scripts/copy-pdfkit-data.mjs), and this shim covers the
 * case where that asset is missing so a stale build degrades to a readable
 * error instead of a 500 on every payslip.
 *
 * The patch is deliberately narrow: it only intercepts .afm reads that would
 * otherwise throw, and always falls back to the original error.
 */
import fs from "node:fs";
import path from "node:path";

let installed = false;

function candidateDirs() {
  const dirs = [];
  const add = (d) => {
    if (d && !dirs.includes(d)) dirs.push(d);
  };

  // Snapshot/bundle-relative locations (pkg mounts assets under the snapshot).
  add(path.join(path.dirname(process.execPath), "data"));
  add(path.join(path.dirname(process.execPath), "pdf-data"));
  add(path.resolve("dist/data"));
  add(path.resolve("src/assets/pdf-data"));
  add(path.resolve("node_modules/pdfkit/js/data"));

  // __dirname is unavailable in ESM; derive the module dir for relative hops.
  try {
    const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
    add(path.join(here, "../assets/pdf-data"));
    add(path.join(here, "../../dist/data"));
    add(path.join(here, "../../node_modules/pdfkit/js/data"));
  } catch {}

  return dirs;
}

/** Locate a font-metric file by basename, or null. */
function findFontFile(basename) {
  for (const dir of candidateDirs()) {
    const p = path.join(dir, basename);
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return null;
}

export function installPdfFontResolver() {
  if (installed) return;
  installed = true;

  const originalReadFileSync = fs.readFileSync;

  fs.readFileSync = function patchedReadFileSync(target, options) {
    try {
      return originalReadFileSync.call(fs, target, options);
    } catch (err) {
      // Only rescue pdfkit's standard-font metric reads.
      if (typeof target !== "string" || !/\.(afm|icc)$/i.test(target)) throw err;

      const resolved = findFontFile(path.basename(target));
      if (!resolved) throw err;

      console.warn(
        `[pdfFonts] "${target}" unavailable — falling back to ${resolved}. ` +
          "Rebuild the backend (npm run build) to bundle font metrics properly.",
      );
      return originalReadFileSync.call(fs, resolved, options);
    }
  };
}

/**
 * True when at least one standard-font metric file is reachable. Surfaced on
 * /api/health so a broken build is visible without generating a payslip.
 */
export function standardFontsAvailable() {
  return findFontFile("Helvetica.afm") !== null;
}
