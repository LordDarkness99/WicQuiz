#!/usr/bin/env node
// Architectural boundary checker (no external deps).
//
// Rules:
//  1. shared/**         may not import @/features/* or @/integrations/*
//  2. integrations/**   may not import @/features/*
//  3. app/**            may import a feature only via its public API (@/features/<x>),
//                       never its internals (@/features/<x>/<anything>)
//  4. features/A/**     may import another feature B only via @/features/B (public API);
//                       importing B's internals is forbidden. Intra-feature absolute
//                       imports (@/features/A/...) are allowed.
//  5. nobody may import the removed legacy buckets (@/lib/*, @/types/*, @/components/*)
//
// Run: node scripts/check-boundaries.mjs

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "features", "shared", "integrations"];
const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g;

/** @type {string[]} */
const files = [];
for (const dir of SCAN_DIRS) walk(join(ROOT, dir));

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e)) files.push(p);
  }
}

function featureOf(relPath) {
  const m = relPath.match(/^features\/([^/]+)\//);
  return m ? m[1] : null;
}
function areaOf(relPath) {
  if (relPath.startsWith("app/")) return "app";
  if (relPath.startsWith("features/")) return "features";
  if (relPath.startsWith("shared/")) return "shared";
  if (relPath.startsWith("integrations/")) return "integrations";
  return "other";
}

const violations = [];

for (const file of files) {
  const rel = relative(ROOT, file);
  const area = areaOf(rel);
  const ownFeature = featureOf(rel);
  const src = readFileSync(file, "utf8");

  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src))) {
    const spec = m[1] || m[2];
    if (!spec || !spec.startsWith("@/")) continue;

    // Rule 5: legacy buckets must stay gone.
    if (/^@\/(lib|types|components)(\/|$)/.test(spec)) {
      violations.push(`${rel}: imports removed legacy bucket "${spec}"`);
      continue;
    }

    const featureMatch = spec.match(/^@\/features\/([^/]+)(\/.*)?$/);
    if (featureMatch) {
      const targetFeature = featureMatch[1];
      const isDeep = !!featureMatch[2]; // anything after @/features/<name>

      if (area === "shared") {
        violations.push(`${rel}: shared/ must not import a feature ("${spec}")`);
      } else if (area === "integrations") {
        violations.push(`${rel}: integrations/ must not import a feature ("${spec}")`);
      } else if (area === "app") {
        if (isDeep) violations.push(`${rel}: app/ must import features via the public API "@/features/${targetFeature}", not internals ("${spec}")`);
      } else if (area === "features") {
        if (targetFeature !== ownFeature && isDeep) {
          violations.push(`${rel}: cross-feature import must use the public API "@/features/${targetFeature}", not internals ("${spec}")`);
        }
      }
      continue;
    }

    // Rule 1 (second half): shared must not depend on integrations.
    if (area === "shared" && spec.startsWith("@/integrations/")) {
      violations.push(`${rel}: shared/ must not import integrations ("${spec}")`);
    }
  }
}

if (violations.length) {
  console.error(`✗ ${violations.length} architecture boundary violation(s):\n`);
  for (const v of violations) console.error("  - " + v);
  console.error("\nSee docs/architecture/boundaries.md for the rules.");
  process.exit(1);
}
console.log(`✓ No architecture boundary violations (${files.length} files checked).`);
