// scripts/ledger.mjs — requirement ledger derived from docs/BRIEF.md.
// Why a script: "every requirement was done" must be a mechanical fact, not a memory.
// The brief is the only source of IDs; this file can never drift from it.
//
//   node scripts/ledger.mjs init                         create or refresh docs/LEDGER.json
//   node scripts/ledger.mjs set <ID> <status> "<evidence>"
//   node scripts/ledger.mjs check --gate <n>             phases 0..n must all pass
//   node scripts/ledger.mjs check --final                every phase must pass
//   node scripts/ledger.mjs report                       per-phase summary + open items
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const BRIEF = process.env.BRIEF ?? 'docs/BRIEF.md';
const LEDGER = process.env.LEDGER ?? 'docs/LEDGER.json';
const STATUSES = ['todo', 'built', 'verified', 'user-check', 'deviation'];
const PASSING = new Set(['verified', 'user-check', 'deviation']);
const ID_PATTERN = /\[([A-Z]{2,6})-(\d{2})\](†?)/g;

function fail(message) {
  console.error(`ledger: ${message}`);
  process.exit(1);
}

function parseBrief() {
  if (!existsSync(BRIEF)) fail(`${BRIEF} not found`);
  const text = readFileSync(BRIEF, 'utf8');
  const block = text.match(/```phase-map\r?\n([\s\S]*?)```/);
  if (!block) fail('no ```phase-map block in the brief');
  const phaseOfArea = new Map();
  for (const line of block[1].trim().split(/\r?\n/)) {
    const [phase, ...areas] = line.trim().split(/\s+/);
    for (const area of areas) phaseOfArea.set(area, Number(phase.slice(1)));
  }
  const requirements = new Map();
  const duplicates = new Set();
  for (const line of text.split(/\r?\n/)) {
    for (const match of line.matchAll(ID_PATTERN)) {
      const [, area, number, dagger] = match;
      const id = `${area}-${number}`;
      if (requirements.has(id)) {
        duplicates.add(id);
        continue;
      }
      if (!phaseOfArea.has(area)) fail(`area ${area} (${id}) is missing from the phase-map`);
      const summary = line
        .replace(ID_PATTERN, '')
        .replace(/^[\s|*-]+/, '')
        .replace(/[*`|]/g, '')
        .trim()
        .slice(0, 140);
      requirements.set(id, { id, phase: phaseOfArea.get(area), userCheckAllowed: dagger === '†', summary });
    }
  }
  if (duplicates.size) fail(`duplicate requirement IDs: ${[...duplicates].join(', ')}`);
  if (!requirements.size) fail('no requirement IDs found in the brief');
  return requirements;
}

function load() {
  return existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : { entries: {} };
}

function save(ledger) {
  mkdirSync(dirname(LEDGER), { recursive: true });
  const ordered = Object.values(ledger.entries).sort((a, b) => a.phase - b.phase || a.id.localeCompare(b.id));
  ledger.entries = Object.fromEntries(ordered.map((entry) => [entry.id, entry]));
  writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);
}

function sync() {
  const requirements = parseBrief();
  const ledger = load();
  let added = 0;
  let removed = 0;
  for (const [id, requirement] of requirements) {
    const previous = ledger.entries[id];
    if (!previous) added += 1;
    ledger.entries[id] = { status: 'todo', evidence: '', updated: '', ...previous, ...requirement };
  }
  for (const id of Object.keys(ledger.entries)) {
    if (!requirements.has(id)) {
      delete ledger.entries[id];
      removed += 1;
    }
  }
  save(ledger);
  return { ledger, added, removed, total: requirements.size };
}

function problemsOf(entry) {
  const problems = [];
  if (!PASSING.has(entry.status)) problems.push(`status is ${entry.status}`);
  else if (!entry.evidence.trim()) problems.push('no evidence');
  if (entry.status === 'user-check' && !entry.userCheckAllowed) problems.push('user-check is not allowed for this ID (no † in the brief)');
  return problems;
}

const [command, ...args] = process.argv.slice(2);

if (command === 'init') {
  const { added, removed, total } = sync();
  console.log(`ledger: ${total} requirements (${added} added, ${removed} removed) -> ${LEDGER}`);
} else if (command === 'set') {
  const [id, status, ...rest] = args;
  const evidence = rest.join(' ').trim();
  const { ledger } = sync();
  const entry = ledger.entries[id];
  if (!entry) fail(`unknown ID ${id}`);
  if (!STATUSES.includes(status)) fail(`status must be one of: ${STATUSES.join(', ')}`);
  if (PASSING.has(status) && !evidence) fail(`${status} needs evidence (file:line, screenshot path, or measured value)`);
  if (status === 'user-check' && !entry.userCheckAllowed) fail(`${id} cannot be user-check: verify it here`);
  Object.assign(entry, { status, evidence, updated: new Date().toISOString() });
  save(ledger);
  console.log(`ledger: ${id} -> ${status}`);
} else if (command === 'check') {
  const final = args.includes('--final');
  const gateIndex = args.indexOf('--gate');
  if (!final && gateIndex === -1) fail('use check --gate <n> or check --final');
  const gate = final ? Infinity : Number(args[gateIndex + 1]);
  if (!final && !Number.isInteger(gate)) fail('--gate needs a phase number');
  const { ledger } = sync();
  const scope = Object.values(ledger.entries).filter((entry) => entry.phase <= gate);
  const failing = scope.map((entry) => ({ entry, problems: problemsOf(entry) })).filter((item) => item.problems.length);
  for (const { entry, problems } of failing) console.log(`FAIL ${entry.id} (P${entry.phase}): ${problems.join('; ')} | ${entry.summary}`);
  const deviations = scope.filter((entry) => entry.status === 'deviation');
  for (const entry of deviations) console.log(`DEVIATION ${entry.id}: ${entry.evidence}`);
  console.log(`ledger: ${scope.length - failing.length}/${scope.length} pass ${final ? '(final)' : `(gate ${gate})`}; ${deviations.length} deviation(s)`);
  process.exit(failing.length ? 1 : 0);
} else if (command === 'report') {
  const { ledger } = sync();
  const entries = Object.values(ledger.entries);
  const phases = [...new Set(entries.map((entry) => entry.phase))].sort((a, b) => a - b);
  for (const phase of phases) {
    const inPhase = entries.filter((entry) => entry.phase === phase);
    const passing = inPhase.filter((entry) => !problemsOf(entry).length).length;
    console.log(`P${phase} ${passing}/${inPhase.length}`);
  }
  for (const entry of entries.filter((item) => item.status === 'user-check' || item.status === 'deviation')) {
    console.log(`${entry.status.toUpperCase()} ${entry.id}: ${entry.evidence}`);
  }
} else {
  fail('commands: init | set <ID> <status> "<evidence>" | check --gate <n> | check --final | report');
}
