/**
 * Fails the build if a server-only secret reached the client bundle.
 *
 * Next's `server-only` package catches the common case at compile time; this is
 * the backstop that inspects what actually shipped. It scans every JS chunk
 * served to browsers for (a) the literal values of secret env vars, and
 * (b) variable names that should never be inlined.
 *
 * Usage: node scripts/audit-bundle.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const CLIENT_DIRS = [".next/static"];

/** Env vars whose *values* must never appear in a client chunk. */
const SECRET_VALUE_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_JWT_SECRET",
  "RESEND_API_KEY",
  "CRON_SECRET",
  "ANTHROPIC_API_KEY",
];

/** Names that should never be inlined, regardless of whether a value was set. */
const SECRET_NAME_PATTERNS = [
  /SUPABASE_SERVICE_ROLE_KEY/,
  /SUPABASE_JWT_SECRET/,
  /RESEND_API_KEY/,
  /CRON_SECRET/,
  /ANTHROPIC_API_KEY/,
];

/** Short/placeholder values would cause false positives; ignore them. */
const MIN_SECRET_LENGTH = 16;

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(js|mjs|cjs)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = CLIENT_DIRS.flatMap(walk);

if (files.length === 0) {
  console.error("✗ No client chunks found under .next/static — run `npm run build` first.");
  process.exit(1);
}

const findings = [];

for (const file of files) {
  const contents = readFileSync(file, "utf8");

  for (const name of SECRET_VALUE_VARS) {
    const value = process.env[name];
    if (value && value.length >= MIN_SECRET_LENGTH && contents.includes(value)) {
      findings.push(`${file}: contains the VALUE of ${name}`);
    }
  }

  for (const pattern of SECRET_NAME_PATTERNS) {
    if (pattern.test(contents)) {
      findings.push(`${file}: references ${pattern.source}`);
    }
  }
}

if (findings.length > 0) {
  console.error("✗ Secret material found in the client bundle:\n");
  for (const f of new Set(findings)) console.error(`  ${f}`);
  console.error('\nMove the offending code behind `import "server-only"`.');
  process.exit(1);
}

console.log(`✓ Bundle audit clean — scanned ${files.length} client chunks, no secrets found.`);
