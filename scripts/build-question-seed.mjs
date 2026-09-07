#!/usr/bin/env node
/**
 * build-question-seed — converts scripts/question-bank/*.json into the
 * SQL migration for the varied question bank (Duolingo-style).
 *
 * Usage: node scripts/build-question-seed.mjs
 * Reads: scripts/question-bank/<slug>.json   (array of questions)
 * Writes: supabase/migrations/20260831000001_question_bank.sql
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const BANK_DIR = join(process.cwd(), 'scripts', 'question-bank');
const OUT_FILE = join(process.cwd(), 'supabase', 'migrations', '20260831000001_question_bank.sql');

const TYPES = ['mcq', 'true_false', 'fill_blank', 'multi_select', 'match', 'order', 'case'];

function sqlStr(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  if (value === null || value === undefined) return 'NULL';
  return sqlStr(JSON.stringify(value));
}

function sqlIntArray(value) {
  if (!Array.isArray(value) || value.length === 0) return 'NULL';
  return `'{${value.join(',')}}'`;
}

function sqlTextArray(value) {
  if (!Array.isArray(value) || value.length === 0) return 'NULL';
  const items = value.map((t) => `"${String(t).replace(/"/g, '""')}"`).join(',');
  return `'{${items}}'`;
}

function defaultPoints(q) {
  const base = (q.level ?? 1) * 10;
  return ['match', 'order', 'case'].includes(q.type) ? base + 5 : base;
}

function validate(q, slug, index) {
  const errs = [];
  if (!q.question || typeof q.question !== 'string') errs.push('question vacía');
  if (!q.explanation || typeof q.explanation !== 'string') errs.push('explicación vacía');
  if (!TYPES.includes(q.type)) errs.push(`tipo inválido: ${q.type}`);
  if (typeof q.level !== 'number' || q.level < 1 || q.level > 3) errs.push(`nivel inválido: ${q.level}`);

  if (['mcq', 'true_false', 'fill_blank'].includes(q.type)) {
    if (!Array.isArray(q.options) || q.options.length < 2) errs.push('options ausentes');
    if (typeof q.correctIndex !== 'number') errs.push('correctIndex ausente');
    else if (Array.isArray(q.options) && (q.correctIndex < 0 || q.correctIndex >= q.options.length)) {
      errs.push(`correctIndex ${q.correctIndex} fuera de rango (${q.options.length} options)`);
    }
  }
  if (q.type === 'multi_select') {
    if (!Array.isArray(q.options) || q.options.length < 2) errs.push('options ausentes');
    if (!Array.isArray(q.correctIndexes) || q.correctIndexes.length < 2) errs.push('correctIndexes inválido');
    else if (Array.isArray(q.options)) {
      for (const ci of q.correctIndexes) {
        if (ci < 0 || ci >= q.options.length) errs.push(`correctIndex ${ci} fuera de rango`);
      }
    }
  }
  if (q.type === 'match') {
    if (!Array.isArray(q.pairs) || q.pairs.length < 2) errs.push('pairs inválido');
    else for (const p of q.pairs) {
      if (!p?.left || !p?.right) errs.push('pair incompleto');
    }
  }
  if (q.type === 'order') {
    if (!Array.isArray(q.orderItems) || q.orderItems.length < 3) errs.push('orderItems inválido');
    else {
      const positions = q.orderItems.map((o) => o.position).sort((a, b) => a - b);
      const expected = q.orderItems.map((_, i) => i + 1);
      if (JSON.stringify(positions) !== JSON.stringify(expected)) errs.push('positions de order no son 1..n');
    }
  }
  if (q.type === 'case') {
    if (!q.caseId || !q.caseText) errs.push('caseId/caseText ausente');
    if (!Array.isArray(q.options) || typeof q.correctIndex !== 'number') errs.push('sub-pregunta sin options/correctIndex');
  }

  if (errs.length) {
    throw new Error(`${slug}[${index}] ${errs.join('; ')} — ${q.question?.slice(0, 60)}`);
  }
}

function toRow(q) {
  const t = q.type;
  let options = 'NULL';
  let correctIndex = 'NULL';
  let correctIndexes = 'NULL';
  let pairs = 'NULL';
  let orderItems = 'NULL';
  let caseId = 'NULL';

  if (['mcq', 'true_false', 'fill_blank', 'multi_select'].includes(t)) options = sqlJson(q.options);
  if (['mcq', 'true_false', 'fill_blank'].includes(t)) correctIndex = q.correctIndex;
  if (t === 'multi_select') correctIndexes = sqlIntArray(q.correctIndexes);
  if (t === 'match') pairs = sqlJson(q.pairs);
  if (t === 'order') orderItems = sqlJson(q.orderItems);
  if (t === 'case') {
    // Case sub-questions are graded as MCQ: they carry options + correctIndex.
    caseId = sqlStr(q.caseId);
    options = sqlJson(q.options);
    correctIndex = q.correctIndex;
  }

  const points = q.points ?? defaultPoints(q);
  // questions.specialty_slug was normalized away; resolve the slug to the
  // specialty surrogate id inline so the generated SQL stays standalone.
  const specId = `(select id from public.specialties where slug = ${sqlStr(q.specialty_slug)})`;
  return `(${specId}, ${q.level}, ${sqlStr(t)}, ${sqlStr(q.question)}, ${options}, ${correctIndex}, ${correctIndexes}, ${pairs}, ${orderItems}, ${caseId}, ${q.hint ? sqlStr(q.hint) : 'NULL'}, ${points}, ${q.level}, ${sqlTextArray(q.tags)})`;
}

const files = readdirSync(BANK_DIR).filter((f) => f.endsWith('.json'));
if (files.length === 0) {
  console.error('No hay archivos JSON en scripts/question-bank/');
  process.exit(1);
}

let allRows = [];
let total = 0;
const seen = new Set();
const cases = new Map(); // case_id → case_text (deduplicated for clinical_cases)

for (const file of files.sort()) {
  const slug = basename(file, '.json');
  const questions = JSON.parse(readFileSync(join(BANK_DIR, file), 'utf8'));
  if (!Array.isArray(questions)) {
    console.error(`ERROR: ${file} no es un array JSON`);
    process.exit(1);
  }
  questions.forEach((q, i) => {
    validate(q, slug, i);
    const key = `${q.specialty_slug}|${q.level}|${q.question}`;
    if (seen.has(key)) {
      console.error(`ERROR: pregunta duplicada en ${file}[${i}]: ${q.question.slice(0, 60)}`);
      process.exit(1);
    }
    seen.add(key);
    allRows.push(toRow(q));
    if (q.type === 'case' && !cases.has(q.caseId)) cases.set(q.caseId, q.caseText);
  });
  total += questions.length;
}

// 20 rows per INSERT to keep statements readable.
const CHUNK = 20;
const inserts = [];
for (let i = 0; i < allRows.length; i += CHUNK) {
  const chunk = allRows.slice(i, i + CHUNK).join(',\n  ');
  inserts.push(`insert into public.questions (specialty_id, level, question_type, question, options, correct_index, correct_indexes, pairs, order_items, case_id, hint, points, difficulty, tags)
  values
  ${chunk};`);
}

// Clinical cases go to their own normalized table (3NF); questions reference them.
const caseInserts = [...cases.entries()]
  .map(([id, text]) => `  (${sqlStr(id)}, ${sqlStr(text)})`)
  .join(',\n');
const caseSql = caseInserts
  ? `insert into public.clinical_cases (id, text)\nvalues\n${caseInserts}\non conflict (id) do nothing;\n\n`
  : '';

const sql = `-- Varied question bank (Duolingo-style) — generated by scripts/build-question-seed.mjs
-- Source: scripts/question-bank/*.json (thesis annex; clinical review recommended).

${caseSql}${inserts.join('\n\n')}

-- Question bank validation
select question_type, count(*) from public.questions group by 1 order by 1;
`;

writeFileSync(OUT_FILE, sql, 'utf8');
console.log(`OK: ${total} preguntas → ${OUT_FILE}`);
