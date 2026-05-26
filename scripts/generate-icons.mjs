#!/usr/bin/env node
// scripts/generate-icons.mjs
// Generates minimal SVG-based PNG icons for the PWA manifest.
// Run once: node scripts/generate-icons.mjs
// Requires: npm install canvas (or just create the icons manually)

// This script creates placeholder icons if you don't have a design tool.
// For production, replace /public/icons/icon-192.png and icon-512.png
// with proper branded icons.

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#4f46e5'; // indigo-600
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.35}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AF', size / 2, size / 2);

  return canvas.toBuffer('image/png');
}

const iconsDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(iconsDir, { recursive: true });

[192, 512].forEach((size) => {
  const buffer = generateIcon(size);
  const outPath = join(iconsDir, `icon-${size}.png`);
  writeFileSync(outPath, buffer);
  console.log(`✓ Generated ${outPath}`);
});

console.log('Icons generated. Install `canvas` npm package to run this script.');
