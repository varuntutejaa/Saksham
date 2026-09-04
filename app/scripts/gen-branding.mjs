/**
 * Generates all Saksham app icon / splash / favicon assets from inline SVG.
 * Run:  node app/scripts/gen-branding.mjs
 * Uses the `sharp` install from ../../website/node_modules (Next.js ships it).
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const sharp = require(path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../website/node_modules/sharp",
));

const OUT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../assets/images");

const BLUE_DARK = "#1462C6";
const BLUE_LIGHT = "#2B9BF8";
const ACCENT = "#BFE4FF";

/**
 * The Saksham mark: a speech bubble (you speak, in your own language) holding
 * four rising bars (livelihood / skill growth). Drawn on a 100x100 local space,
 * scaled into a `size`x`size` viewBox, centred at ~`scale` of the canvas.
 *
 *   solid=true  -> white bubble, bars punched in `barColor` (for coloured bgs)
 *   solid=false -> outlined bubble + solid bars, all in `color` (mono/foreground)
 */
function mark({ color = "#FFFFFF", barColor = BLUE_DARK, scale = 0.58, solid = true } = {}) {
  const S = 1024;
  const g = (S * (1 - scale)) / 2;
  const w = S * scale;

  const baseline = 56;
  const bars = [
    { x: 25, h: 16 },
    { x: 38, h: 26 },
    { x: 51, h: 36 },
    { x: 64, h: 46 },
  ]
    .map((b) => `<rect x="${b.x}" y="${baseline - b.h}" width="10" height="${b.h}" rx="4"/>`)
    .join("");

  const bubble =
    "M13 9 h74 a11 11 0 0 1 11 11 v40 a11 11 0 0 1 -11 11 h-42 l-14 13 v-13 h-8 a11 11 0 0 1 -11 -11 v-40 a11 11 0 0 1 11 -11 z";

  const inner = solid
    ? `<path d="${bubble}" fill="${color}"/>
       <g fill="${barColor}">${bars}</g>`
    : `<path d="${bubble}" fill="none" stroke="${color}" stroke-width="7" stroke-linejoin="round"/>
       <g fill="${color}">${bars}</g>`;

  return { S, svgInner: `<g transform="translate(${g} ${g}) scale(${w / 100})">${inner}</g>` };
}

function doc(bg, scale, solid = true) {
  const { S, svgInner } = mark({ scale, solid, barColor: BLUE_DARK });
  const background = bg
    ? `<defs>
         <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0" stop-color="${BLUE_DARK}"/>
           <stop offset="1" stop-color="${BLUE_LIGHT}"/>
         </linearGradient>
       </defs>
       <rect width="${S}" height="${S}" fill="url(#bg)"/>`
    : "";
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${background}${svgInner}</svg>`,
  );
}

function monochrome() {
  const { S, svgInner } = mark({ color: "#FFFFFF", scale: 0.52, solid: false });
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${svgInner}</svg>`,
  );
}

const jobs = [
  // main app icon — full-bleed gradient + mark (iOS masks corners itself)
  { name: "icon.png", svg: doc(true, 0.56), size: 1024 },
  // Android adaptive icon — foreground mark only, extra padding for the safe zone
  { name: "android-icon-foreground.png", svg: doc(false, 0.42), size: 1024 },
  { name: "android-icon-monochrome.png", svg: monochrome(), size: 1024 },
  // splash — mark on transparent, shown centred on the blue splash background
  { name: "splash-icon.png", svg: doc(false, 0.62), size: 1024 },
  // web favicon
  { name: "favicon.png", svg: doc(true, 0.6), size: 196 },
  // notification icon (Android) — white mark on transparent
  { name: "notification-icon.png", svg: monochrome(), size: 256 },
];

for (const j of jobs) {
  await sharp(j.svg, { density: 384 })
    .resize(j.size, j.size)
    .png()
    .toFile(path.join(OUT, j.name));
  console.log("✓", j.name, `${j.size}×${j.size}`);
}

// Android adaptive background — flat brand colour
await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: BLUE_DARK },
})
  .png()
  .toFile(path.join(OUT, "android-icon-background.png"));
console.log("✓ android-icon-background.png (flat", BLUE_DARK + ")");

// clean up leftover Expo template art
for (const f of ["expo-badge.png", "expo-badge-white.png", "expo-logo.png", "logo-glow.png", "react-logo.png", "react-logo@2x.png", "react-logo@3x.png", "tutorial-web.png"]) {
  const p = path.join(OUT, f);
  if (fs.existsSync(p)) {
    fs.rmSync(p);
    console.log("✗ removed", f);
  }
}
