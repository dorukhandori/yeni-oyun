#!/usr/bin/env node
/**
 * Generate a still via Gemini native image models.
 * Usage:
 *   GEMINI_API_KEY=... node scripts/gen-gemini-image.mjs --prompt-file docs/art/prompts/character-turnaround.md --variant 01
 *   GEMINI_API_KEY=... node scripts/gen-gemini-image.mjs --text "..." --out art-source/raw/test.png
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DEFAULT_MODEL = 'gemini-2.5-flash-image';

function parseArgs(argv) {
  const opts = {
    model: DEFAULT_MODEL,
    variant: '01',
    out: null,
    promptFile: null,
    text: null,
    section: 'Gemini',
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--model') opts.model = argv[++i];
    else if (a === '--variant') opts.variant = argv[++i];
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--prompt-file') opts.promptFile = argv[++i];
    else if (a === '--text') opts.text = argv[++i];
    else if (a === '--section') opts.section = argv[++i];
  }
  return opts;
}

function extractPromptFromMarkdown(md, sectionTag) {
  const header = `## Prompt — ${sectionTag}`;
  const start = md.indexOf(header);
  if (start === -1) throw new Error(`Section not found: ${header}`);
  const fenceStart = md.indexOf('```text', start);
  if (fenceStart === -1) throw new Error('No ```text block after section');
  const bodyStart = fenceStart + '```text\n'.length;
  const fenceEnd = md.indexOf('```', bodyStart);
  if (fenceEnd === -1) throw new Error('Unclosed ```text block');
  return md.slice(bodyStart, fenceEnd).trim();
}

async function generateImage(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(JSON.stringify(data.error ?? data, null, 2));
  }
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart) {
    const text = parts.find((p) => p.text)?.text ?? '';
    throw new Error(`No image in response. Text: ${text.slice(0, 200)}`);
  }
  return {
    bytes: Buffer.from(imagePart.inlineData.data, 'base64'),
    mime: imagePart.inlineData.mimeType ?? 'image/png',
    text: parts.find((p) => p.text)?.text ?? '',
  };
}

const opts = parseArgs(process.argv);
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is required');
  process.exit(1);
}

let prompt = opts.text;
if (!prompt && opts.promptFile) {
  const md = readFileSync(opts.promptFile, 'utf8');
  prompt = extractPromptFromMarkdown(md, opts.section);
}
if (!prompt) {
  console.error('Provide --text or --prompt-file');
  process.exit(1);
}

const out =
  opts.out ??
  join('art-source', 'raw', `char_odysseus_turnaround_${opts.variant}_ref_2048.png`);

mkdirSync(dirname(out), { recursive: true });

console.log(`Model: ${opts.model}`);
console.log(`Output: ${out}`);
console.log(`Prompt length: ${prompt.length} chars`);

const { bytes, mime, text } = await generateImage(apiKey, opts.model, prompt);
writeFileSync(out, bytes);
console.log(`Saved ${bytes.length} bytes (${mime})`);
if (text) console.log(`Model note: ${text.slice(0, 300)}`);
