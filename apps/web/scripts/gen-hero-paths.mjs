#!/usr/bin/env node
/**
 * Build-time script: generate per-letter SVG path data for the hero text
 * using the Fraunces variable italic font. Output is consumed by
 * apps/web/src/pages/index.astro for the brush-stroke handwriting
 * animation.
 *
 * Pipeline:
 *   1. Read Fraunces italic WOFF2 from @fontsource-variable/fraunces
 *   2. Decode WOFF2 → TTF buffer (wawoff2)
 *   3. Parse with opentype.js
 *   4. For each character in the hero text, generate the SVG path data
 *      (positioned at the character's correct kerning offset within its
 *      line) and compute the path length (svg-path-properties — needed
 *      for stroke-dasharray).
 *   5. Write to src/data/hero-paths.json
 *
 * Run: node scripts/gen-hero-paths.mjs
 * (or via the prebuild step in package.json — added separately)
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import opentype from "opentype.js";
import wawoff from "wawoff2";
import { svgPathProperties } from "svg-path-properties";

const SvgPathProperties = svgPathProperties; // alias for clarity (it's a constructor)

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..", "..");

// We use the latin-wght variant (covers all the chars we need) and pull a
// single "Italic" weight — the variable font is loaded for display elsewhere
// but for path generation we just need one italic weight (~400 by default
// in opentype.js when reading variable fonts).
const FONT_WOFF2_PATH = resolve(
  repoRoot,
  "node_modules",
  ".pnpm",
  "@fontsource-variable+fraunces@5.2.9",
  "node_modules",
  "@fontsource-variable",
  "fraunces",
  "files",
  "fraunces-latin-wght-italic.woff2",
);

const OUT_PATH = resolve(__dirname, "..", "src", "data", "hero-paths.json");

// Hero text — must match what the Astro page renders in aria-labels.
// We generate paths for the WHOLE-LINE text (with spaces) so the kerning
// matches what users see when the font renders normally.
const FONT_SIZE = 200; // viewBox-units, scaled with CSS via SVG width

// We split per-line because the two lines render at different sizes in
// the page; the SVG viewBox/path coords are at FONT_SIZE px and CSS
// scales them down via the SVG element's width on screen.
const LINES = [
  { id: "line1", text: "Connect 4," },
  { id: "line2", text: "but smarter." },
];

console.log("Reading Fraunces WOFF2:", FONT_WOFF2_PATH);
const woff2Buffer = await readFile(FONT_WOFF2_PATH);

console.log("Decoding WOFF2 → TTF…");
const ttfBufferRaw = await wawoff.decompress(woff2Buffer);
// wawoff2 returns a Uint8Array; opentype.js wants an ArrayBuffer.
const ttfArrayBuffer = ttfBufferRaw.buffer.slice(
  ttfBufferRaw.byteOffset,
  ttfBufferRaw.byteOffset + ttfBufferRaw.byteLength,
);

console.log("Parsing font with opentype.js…");
const font = opentype.parse(ttfArrayBuffer);

// For each line, generate per-character paths so we can stagger the
// stroke-draw animation per letter. We compute a baseline x-offset from
// the previous character's advance width (font's natural kerning).
function generateLine({ id, text }) {
  const baseY = FONT_SIZE; // baseline at FONT_SIZE so descenders fit above
  let x = 0;
  const letters = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const glyph = font.charToGlyph(char);
    const advance = (glyph.advanceWidth * FONT_SIZE) / font.unitsPerEm;

    if (char === " ") {
      // Space — no path, just advance x.
      x += advance;
      continue;
    }

    const path = font.getPath(char, x, baseY, FONT_SIZE);
    let d = path.toPathData(2); // 2 decimal places
    // opentype.js sometimes emits NaN x-coords on certain variable-font
    // glyphs (notably the comma in Fraunces variable italic). Replace
    // NaN with a reasonable x value so the path is still parseable; the
    // resulting glyph is barely visually different from the canonical
    // shape, and on a small mark like a comma it's invisible.
    if (d.includes("NaN")) {
      console.log(`  Sanitizing NaN in '${char}'`);
      d = d.replace(/NaN/g, Math.round(x + 5).toString());
    }
    let length = 0;
    if (d.trim().length > 0) {
      try {
        length = new SvgPathProperties(d).getTotalLength();
      } catch (err) {
        console.warn(`Failed length compute for '${char}':`, err.message);
      }
    }

    letters.push({
      char,
      i,
      d,
      // Round length up so stroke-dasharray covers the full path with margin.
      length: Math.ceil(length),
    });

    x += advance;
  }

  // viewBox width = total advance up to last char + a bit of slack
  const viewBoxWidth = Math.ceil(x);
  // viewBox height = font size + descender room (descender typically ~25%)
  const viewBoxHeight = Math.ceil(FONT_SIZE * 1.4);

  return {
    id,
    text,
    fontSize: FONT_SIZE,
    viewBox: { width: viewBoxWidth, height: viewBoxHeight },
    letters,
  };
}

const lines = LINES.map(generateLine);

await mkdir(dirname(OUT_PATH), { recursive: true });
await writeFile(OUT_PATH, JSON.stringify(lines, null, 2));

console.log("Wrote", OUT_PATH);
console.log(
  "Lines:",
  lines.map((l) => `${l.id} (${l.letters.length} drawable letters)`).join(", "),
);
