#!/usr/bin/env node
/**
 * Dentify RAG ingestion — chunk, embed, and load ./docs clinical manuals
 * into the Supabase `clinical_manuals` table (PRD §5, Appendix A).
 *
 * Usage:
 *   node scripts/ingest-rag.mjs [--dry-run] [--embedder hash|openai]
 *                                [--chunk-size 500] [--overlap 50]
 *
 * Embedders:
 *   hash   (default) — deterministic offline bag-of-words vectorizer, mirrors
 *          src/services/embeddings.ts. No API key needed.
 *   openai — text-embedding-3-small via OPENAI_API_KEY (1536 dims).
 *
 * Database:
 *   Reads SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL and a write-capable key
 *   (SUPABASE_SERVICE_ROLE_KEY preferred; anon works only for local dev if the
 *   insert policy allows it). If no credentials are found, or --dry-run is
 *   passed, the chunks+embeddings are exported to docs/rag-export.json so the
 *   work is not lost while the Supabase project is stopped.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');

// ── .env loader (so EXPO_PUBLIC_* vars are available) ──────────────────────
function loadEnv(file) {
  try {
    const txt = fs.readFileSync(file, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
      }
    }
  } catch {
    /* no .env — rely on real env vars */
  }
}
loadEnv(path.join(ROOT, '.env'));

// ── Embedding (must mirror src/services/embeddings.ts EXACTLY) ─────────────
const EMBEDDING_DIM = 1536;
const STOP_WORDS = new Set([
  'que', 'para', 'como', 'con', 'por', 'del', 'las', 'los', 'una', 'uno',
  'unos', 'unas', 'cual', 'cuales', 'dime', 'explica', 'puedo', 'debe',
  'deben', 'tiene', 'tienen', 'esta', 'este', 'esto', 'estos', 'estas', 'ser',
  'son', 'era', 'mas', 'pero', 'sin', 'sobre', 'entre', 'hacia', 'desde',
  'hasta', 'todo', 'toda', 'todos', 'todas', 'sus', 'su', 'sea', 'sean', 'hay',
  'fue', 'nada', 'muy', 'asi', 'cada', 'luego', 'donde', 'cuando',
]);

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function embedText(text) {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  for (const token of tokenize(text)) {
    vec[fnv1a(token) % EMBEDDING_DIM] += 1;
  }
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm !== 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) vec[i] /= norm;
  }
  return vec;
}

// ── OpenAI embedder ────────────────────────────────────────────────────────
async function embedOpenAI(texts, apiKey, model = 'text-embedding-3-small') {
  const out = new Array(texts.length);
  const BATCH = 128;
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, input: batch }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`OpenAI embeddings error ${res.status}: ${e?.error?.message ?? ''}`);
    }
    const data = await res.json();
    for (const item of data.data) out[i + item.index] = item.embedding;
  }
  return out;
}

// ── Chunking (PRD Appendix A: 500-token fragments, 50-token overlap) ───────
function chunkPage(pageText, chunkSize, overlap) {
  const words = pageText.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const step = Math.max(1, chunkSize - overlap);
  const chunks = [];
  for (let i = 0; i < words.length; i += step) {
    const slice = words.slice(i, i + chunkSize).join(' ');
    if (slice.length >= 60) chunks.push(slice);
  }
  return chunks;
}

async function parsePdf(filePath) {
  const data = fs.readFileSync(filePath);
  const parser = new PDFParse({ data, verbosity: 0 });
  try {
    const result = await parser.getText();
    return result.pages ?? [];
  } finally {
    await parser.destroy();
  }
}

// ── CLI ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { dryRun: false, embedder: 'hash', chunkSize: 500, overlap: 50, pdfs: [] };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--dry-run': args.dryRun = true; break;
      case '--embedder': args.embedder = argv[++i]; break;
      case '--chunk-size': args.chunkSize = Number(argv[++i]); break;
      case '--overlap': args.overlap = Number(argv[++i]); break;
      case '--pdfs': args.pdfs = args.pdfs.concat(argv[++i].split(',')); break;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pdfFiles = args.pdfs.length
    ? args.pdfs.map((p) => path.resolve(ROOT, p))
    : fs.readdirSync(DOCS_DIR).filter((f) => f.toLowerCase().endsWith('.pdf')).map((f) => path.join(DOCS_DIR, f));

  if (pdfFiles.length === 0) {
    console.error('No PDFs found in ./docs. Add clinical manuals and re-run.');
    process.exit(1);
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (args.embedder === 'openai' && !openaiKey) {
    console.error('--embedder openai requires OPENAI_API_KEY in .env or env.');
    process.exit(1);
  }

  const records = [];
  for (const file of pdfFiles) {
    const source = path.basename(file);
    const pages = await parsePdf(file);
    console.log(`📄 ${source} — ${pages.length} páginas`);
    const chunks = [];
    for (const page of pages) {
      for (const text of chunkPage(page.text ?? '', args.chunkSize, args.overlap)) {
        chunks.push({ page_number: page.num ?? 0, text });
      }
    }
    console.log(`   → ${chunks.length} fragmentos`);
    records.push({ source, title: source.replace(/\.pdf$/i, ''), chunks });
  }

  // Embed
  const allChunks = records.flatMap((r) => r.chunks.map((c) => c.text));
  let embeddings;
  if (args.embedder === 'openai') {
    console.log('⚡ Generando embeddings con OpenAI text-embedding-3-small…');
    embeddings = await embedOpenAI(allChunks, openaiKey);
  } else {
    console.log('⚡ Generando embeddings locales (hash, 1536-dim)…');
    embeddings = allChunks.map((t) => embedText(t));
  }

  let i = 0;
  for (const rec of records) {
    for (const chunk of rec.chunks) {
      chunk.embedding = embeddings[i++];
    }
  }

  const totalChunks = allChunks.length;
  const summary = records.map((r) => `${r.source}: ${r.chunks.length} fragmentos`).join(', ');

  // Determine DB write vs export
  // NOTE: only plain SUPABASE_SERVICE_ROLE_KEY is accepted — never an
  // EXPO_PUBLIC_* name, which would be inlined into the client bundle.
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = serviceKey;
  const canWrite = supabaseUrl && key && !args.dryRun;

  if (!canWrite) {
    const exportPath = path.join(DOCS_DIR, 'rag-export.json');
    fs.writeFileSync(
      exportPath,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          embedder: args.embedder,
          dimension: EMBEDDING_DIM,
          chunks: records.flatMap((r) =>
            r.chunks.map((c) => ({
              title: r.title,
              source_document: r.source,
              page_number: c.page_number,
              content: c.text,
              embedding: c.embedding,
            }))
          ),
        },
        null,
        2
      )
    );
    console.log(`⚠️  Sin credenciales de Supabase (o --dry-run). Exportado a docs/rag-export.json`);
    console.log(`   Resumen: ${summary}`);
    console.log(`   Para cargar: node scripts/ingest-rag.mjs --embedder ${args.embedder} (cuando el proyecto esté activo)`);
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, key);
  if (!serviceKey) {
    console.warn('⚠️  Usando anon key: RLS puede bloquear inserts salvo que el rol sea admin. Prefiere SUPABASE_SERVICE_ROLE_KEY.');
  }

  for (const rec of records) {
    const { error: delErr } = await supabase
      .from('clinical_manuals')
      .delete()
      .eq('source_document', rec.source);
    if (delErr) {
      console.error(`✗ No se pudo limpiar ${rec.source}: ${delErr.message}`);
      process.exit(1);
    }
    const rows = rec.chunks.map((c) => ({
      title: rec.title,
      content: c.text,
      source_document: rec.source,
      page_number: c.page_number,
      embedding: c.embedding,
    }));
    for (let b = 0; b < rows.length; b += 100) {
      const { error } = await supabase.from('clinical_manuals').insert(rows.slice(b, b + 100));
      if (error) {
        console.error(`✗ Insert en ${rec.source}: ${error.message}`);
        process.exit(1);
      }
    }
    console.log(`✔ ${rec.source} — ${rec.chunks.length} fragmentos cargados`);
  }

  console.log(`\nListo: ${totalChunks} fragmentos en clinical_manuals.`);
  console.log(`Prueba de búsqueda: supabase rpc match_manuals con un embedding de consulta.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
