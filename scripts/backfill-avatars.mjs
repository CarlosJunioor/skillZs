#!/usr/bin/env node
// Drains pending/failed character avatars by repeatedly POSTing to the prod
// cron route. Mirror of scripts/backfill-diptychs.mjs.
//
// Env (read from .env.local, never logged):
//   DIPTYCH_CRON_SECRET     required — bearer token for /api/cron/generate-avatars
//   BACKFILL_TARGET_URL     optional — defaults to https://skillzs.dev
//   BACKFILL_BATCH          optional — per-call limit (1..100), default 25
//   BACKFILL_MAX_BATCHES    optional — hard cap on iterations, default 20
//   BACKFILL_QUALITY        optional — low|medium|high, default low
//   BACKFILL_DELAY_MS       optional — sleep between batches, default 5000
//
// Usage:
//   node scripts/backfill-avatars.mjs

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadDotenv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotenv(resolve(process.cwd(), ".env.local"));
loadDotenv(resolve(process.cwd(), ".env"));

function clampInt(raw, fallback, min, max) {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

const SECRET = process.env.DIPTYCH_CRON_SECRET;
if (!SECRET) {
  console.error("DIPTYCH_CRON_SECRET missing in env. Aborting.");
  process.exit(1);
}

const TARGET = (process.env.BACKFILL_TARGET_URL ?? "https://skillzs.dev").replace(/\/+$/, "");
const BATCH = clampInt(process.env.BACKFILL_BATCH, 25, 1, 100);
const MAX_BATCHES = clampInt(process.env.BACKFILL_MAX_BATCHES, 20, 1, 200);
const QUALITY = ["low", "medium", "high"].includes(process.env.BACKFILL_QUALITY)
  ? process.env.BACKFILL_QUALITY
  : "low";
const DELAY_MS = clampInt(process.env.BACKFILL_DELAY_MS, 5000, 0, 60_000);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchCost() {
  const res = await fetch(`${TARGET}/api/admin/cost`, {
    headers: { Authorization: `Bearer ${SECRET}` },
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

async function runBatch(i) {
  const url = `${TARGET}/api/cron/generate-avatars?limit=${BATCH}&quality=${QUALITY}`;
  const started = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}` },
  });
  const elapsedSec = ((Date.now() - started) / 1000).toFixed(1);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { ok: false, raw: text.slice(0, 300) }; }
  console.log(`[batch ${i}] http=${res.status} elapsed=${elapsedSec}s payload=${JSON.stringify(body)}`);
  return { http: res.status, body };
}

async function main() {
  console.log(`backfill-avatars target=${TARGET} batch=${BATCH} maxBatches=${MAX_BATCHES} quality=${QUALITY} delay=${DELAY_MS}ms`);

  const startCost = await fetchCost();
  if (startCost && startCost.ok) {
    console.log(`[start] characters=${JSON.stringify(startCost.characters ?? {})}`);
  }

  let totalAttempted = 0;
  let totalGenerated = 0;
  let consecutiveZero = 0;

  for (let i = 1; i <= MAX_BATCHES; i++) {
    let result;
    try {
      result = await runBatch(i);
    } catch (e) {
      console.error(`[batch ${i}] fetch failed: ${e?.message ?? e}`);
      consecutiveZero++;
      if (consecutiveZero >= 3) { console.error("3 consecutive failed batches — bailing"); break; }
      await sleep(DELAY_MS * 5);
      continue;
    }

    if (result.http === 401) {
      console.error("401 unauthorized — bad DIPTYCH_CRON_SECRET. Aborting.");
      process.exit(2);
    }
    if (!result.body?.ok) {
      console.error(`[batch ${i}] non-ok payload — bailing`);
      break;
    }
    const stats = result.body.stats ?? {};
    const attempted = Number(stats.attempted ?? 0);
    const generated = Number(stats.generated ?? 0);
    totalAttempted += attempted;
    totalGenerated += generated;

    if (attempted === 0) {
      console.log(`[batch ${i}] no candidates — done`);
      break;
    }
    if (generated === 0) {
      consecutiveZero++;
      if (consecutiveZero >= 3) {
        console.log("3 consecutive zero-generated batches — bailing");
        break;
      }
    } else {
      consecutiveZero = 0;
    }

    if (i < MAX_BATCHES) await sleep(DELAY_MS);
  }

  const endCost = await fetchCost();
  console.log(`\n=== summary ===`);
  console.log(`attempted=${totalAttempted} generated=${totalGenerated}`);
  if (endCost && endCost.ok) {
    console.log(`[end] characters=${JSON.stringify(endCost.characters ?? {})}`);
  }
}

main().catch((e) => {
  console.error("fatal:", e?.message ?? e);
  process.exit(1);
});
