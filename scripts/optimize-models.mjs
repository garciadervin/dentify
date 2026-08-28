#!/usr/bin/env node
/**
 * Optimize the bundled dental GLB models for mobile.
 *
 * Applies (all safe for Expo Go / three.js GLTFLoader, no external decoders):
 *   1. `dedup` — welds duplicate vertices.
 *   2. `quantize` — writes KHR_mesh_quantization (native three.js support).
 *   3. Texture re-encode — downsizes to ≤2048px and re-encodes PNG → JPEG.
 *
 * Preserves the KHR_materials_specular extension used by the source models.
 * Originals are backed up to assets/models/.originals/ before rewriting.
 *
 * Usage:
 *   node scripts/optimize-models.mjs [--restore] [--target <file.glb>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { dedup, quantize } from '@gltf-transform/functions';
import { KHRMeshQuantization, KHRMaterialsSpecular } from '@gltf-transform/extensions';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.resolve(__dirname, '..', 'assets', 'models');
const BACKUP_DIR = path.join(MODELS_DIR, '.originals');

const io = new NodeIO().registerExtensions([KHRMeshQuantization, KHRMaterialsSpecular]);

const args = process.argv.slice(2);
const restore = args.includes('--restore');
const targetIdx = args.indexOf('--target');
const only = targetIdx !== -1 ? args[targetIdx + 1] : null;

const glbs = fs
  .readdirSync(MODELS_DIR)
  .filter((f) => f.endsWith('.glb') && !f.startsWith('.'))
  .filter((f) => (only ? f === only : true));

if (glbs.length === 0) {
  console.log('No .glb files to process in', MODELS_DIR);
  process.exit(0);
}

if (restore) {
  for (const f of glbs) {
    const src = path.join(BACKUP_DIR, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(MODELS_DIR, f));
      console.log('restored', f);
    } else {
      console.log('no backup for', f);
    }
  }
  process.exit(0);
}

// Back up originals once.
fs.mkdirSync(BACKUP_DIR, { recursive: true });
for (const f of glbs) {
  const dst = path.join(BACKUP_DIR, f);
  if (!fs.existsSync(dst)) {
    fs.copyFileSync(path.join(MODELS_DIR, f), dst);
  }
}

const MAX_TEXTURE = 2048;
let totalBefore = 0;
let totalAfter = 0;

for (const f of glbs) {
  const filePath = path.join(MODELS_DIR, f);
  const before = fs.statSync(filePath).size;
  totalBefore += before;

  try {
    const doc = await io.read(filePath);
    await doc.transform(
      dedup(),
      quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 })
    );

    for (const texture of doc.getRoot().listTextures()) {
      const image = Buffer.from(texture.getImage());
      const resized = await sharp(image)
        .resize({ width: MAX_TEXTURE, height: MAX_TEXTURE, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      texture.setImage(new Uint8Array(resized));
      texture.setMimeType('image/jpeg');
    }

    await io.write(filePath, doc);
    const after = fs.statSync(filePath).size;
    totalAfter += after;
    const pct = (100 * (1 - after / before)).toFixed(0);
    console.log(`${f.padEnd(42)} ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB (-${pct}%)`);
  } catch (err) {
    console.error(`✗ ${f}: ${err.message}`);
  }
}

console.log('\nTotal:', (totalBefore / 1024).toFixed(0) + 'KB →', (totalAfter / 1024).toFixed(0) + 'KB', `(-${(100 * (1 - totalAfter / totalBefore)).toFixed(0)}%)`);
console.log('Backups en', BACKUP_DIR);
