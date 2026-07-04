// Generates the Trackd app icon set from a drawn "t." mark.
// Vector paths (not text) so rendering is font-independent and identical
// across platforms. Run: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');
mkdirSync(assets, { recursive: true });

const GREEN_BG = '#0A2E1F';
const INK = '#F0FAF6';
const DOT = '#1D9E75';

// The "t." mark, designed on a 1024 canvas, centered.
// stem + serif foot as one stroked path, crossbar as a second stroke, dot circle.
function mark({ scale = 1, dx = 0, dy = 0 } = {}) {
  return `
    <g transform="translate(${dx},${dy}) translate(512,512) scale(${scale}) translate(-512,-512)">
      <path d="M455 262 L455 612 Q455 700 548 700 L566 700"
            fill="none" stroke="${INK}" stroke-width="80"
            stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M338 372 L588 372"
            fill="none" stroke="${INK}" stroke-width="72" stroke-linecap="round"/>
      <circle cx="650" cy="658" r="52" fill="${DOT}"/>
    </g>`;
}

function svg({ bg, scale, dx = 0, dy = 0 }) {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : ''}
    ${mark({ scale, dx, dy })}
  </svg>`;
}

async function render(name, source, size, { opaque = false } = {}) {
  let img = sharp(Buffer.from(source)).resize(size, size);
  // Apple rejects the App Store icon if it has an alpha channel, even a fully
  // opaque one — sharp's PNG output is RGBA by default, so fully-opaque icons
  // must be explicitly flattened. Only for icons with a real solid
  // background; adaptive-icon/splash need genuine transparency and must keep it.
  if (opaque) img = img.flatten({ background: GREEN_BG });
  await img.png().toFile(join(assets, name));
  console.log('wrote', name, `${size}x${size}`);
}

// iOS / store icon: full-bleed green background, mark centered. Must be opaque.
await render('icon.png', svg({ bg: GREEN_BG, scale: 1 }), 1024, { opaque: true });

// Android adaptive foreground: transparent, mark in central safe zone (~62%).
await render('adaptive-icon.png', svg({ bg: null, scale: 0.62 }), 1024);

// Splash: transparent mark (app.json centers it on deep green via "contain").
await render('splash.png', svg({ bg: null, scale: 0.7 }), 1024);

// Web favicon.
await render('favicon.png', svg({ bg: GREEN_BG, scale: 1 }), 48, { opaque: true });

console.log('done');
