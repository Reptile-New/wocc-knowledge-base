#!/usr/bin/env node
// -----------------------------------------------------------------------------
// World of ClaudeCraft — extraction pipeline
// -----------------------------------------------------------------------------
// Ce script :
//   1. Télécharge le code source du repo à un tag donné (via codeload.github.com,
//      qui contourne les limites de débit de l'API GitHub classique).
//   2. Bundle les modules de données du jeu (src/sim/data.ts, src/sim/world_boss.ts)
//      en CommonJS avec esbuild — le code "sim" du jeu n'a aucune dépendance DOM
//      (voir CLAUDE.md du repo), donc aucun stub n'est nécessaire.
//   3. Exécute ce bundle dans Node pour obtenir les vraies structures de données
//      du jeu (mobs, items, quêtes, donjons, etc.) — pas une recopie manuelle
//      potentiellement fausse, mais les données réelles telles qu'utilisées en jeu.
//   4. Écrit un JSON par catégorie dans le dossier de sortie.
//
// Usage :
//   node scripts/extract.mjs <tag> <outputDir>
//   node scripts/extract.mjs v0.21.0 ./data
//   node scripts/extract.mjs latest ./data   (résout automatiquement le dernier tag)
//
// Prérequis : Node 18+, et esbuild installé (npm install esbuild).
// -----------------------------------------------------------------------------

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const require = createRequire(import.meta.url);

const REPO = 'levy-street/world-of-claudecraft';

const [, , tagArg = 'latest', outDirArg = './data'] = process.argv;
const outDir = path.resolve(outDirArg);

// ---------------------------------------------------------------------------
// Étape 0 — résoudre "latest" en un vrai nom de tag si besoin
// ---------------------------------------------------------------------------
async function resolveTag(tag) {
  if (tag !== 'latest') return tag;
  const res = await fetch(`https://api.github.com/repos/${REPO}/tags?per_page=1`, {
    headers: { 'User-Agent': 'wocc-knowledge-pipeline' },
  });
  if (!res.ok) throw new Error(`Impossible de lister les tags : HTTP ${res.status}`);
  const tags = await res.json();
  if (!tags.length) throw new Error('Aucun tag trouvé sur le repo.');
  return tags[0].name;
}

// ---------------------------------------------------------------------------
// Étape 1 — télécharger et extraire l'archive du tag
// ---------------------------------------------------------------------------
function downloadAndExtract(tag, workDir) {
  const url = `https://codeload.github.com/${REPO}/tar.gz/refs/tags/${tag}`;
  const archivePath = path.join(workDir, 'repo.tar.gz');
  console.log(`[1/4] Téléchargement de ${url}`);
  execSync(`curl -sL -o "${archivePath}" "${url}"`, { stdio: 'inherit' });

  const stat = fs.statSync(archivePath);
  if (stat.size < 10_000) {
    throw new Error(
      `Archive suspicieusement petite (${stat.size} octets) — le tag "${tag}" existe-t-il ?`,
    );
  }

  console.log(`[1/4] Extraction (${(stat.size / 1024 / 1024).toFixed(1)} Mo)`);
  execSync(`tar -xzf "${archivePath}" -C "${workDir}"`, { stdio: 'inherit' });

  const extracted = fs.readdirSync(workDir).find((f) => f.startsWith('world-of-claudecraft-'));
  if (!extracted) throw new Error("Dossier extrait introuvable — le format de l'archive a changé ?");
  return path.join(workDir, extracted);
}

// ---------------------------------------------------------------------------
// Étape 2 — bundler les modules de données avec esbuild
// ---------------------------------------------------------------------------
async function bundleModule(repoPath, entryRelPath, outFile) {
  await esbuild.build({
    entryPoints: [path.join(repoPath, entryRelPath)],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    outfile: outFile,
    logLevel: 'warning',
  });
}

// ---------------------------------------------------------------------------
// Étape 3 — charger le bundle et dumper chaque registre en JSON
// ---------------------------------------------------------------------------
function dumpRegistries(bundlePath, registryNames, outDir) {
  const mod = require(bundlePath);

  for (const name of registryNames) {
    if (!(name in mod)) {
      console.warn(`  ⚠ Registre "${name}" introuvable dans le bundle — ignoré.`);
      continue;
    }
    const file = path.join(outDir, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(mod[name], null, 2));
    const count = Array.isArray(mod[name]) ? mod[name].length : Object.keys(mod[name]).length;
    console.log(`  ✓ ${name} → ${file} (${count} entrées)`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const tag = await resolveTag(tagArg);
  console.log(`=== World of ClaudeCraft knowledge extraction — tag ${tag} ===`);

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wocc-'));
  fs.mkdirSync(outDir, { recursive: true });

  try {
    const repoPath = downloadAndExtract(tag, workDir);

    console.log('[2/4] Bundling des modules de données (esbuild)');
    const dataBundlePath = path.join(workDir, 'data.bundle.cjs');
    const worldBossBundlePath = path.join(workDir, 'worldboss.bundle.cjs');
    await bundleModule(repoPath, 'src/sim/data.ts', dataBundlePath);
    await bundleModule(repoPath, 'src/sim/world_boss.ts', worldBossBundlePath);

    console.log('[3/4] Extraction des registres en JSON');
    dumpRegistries(dataBundlePath, [
      'MOBS',
      'ITEMS',
      'ITEM_SETS',
      'NPCS',
      'QUESTS',
      'ZONES',
      'DUNGEONS',
      'DELVES',
      'GATHER_NODES',
      'FISHING_TABLES',
    ], outDir);
    dumpRegistries(worldBossBundlePath, ['WORLD_BOSSES'], outDir);

    // Butins des boss finaux en difficulté Héroïque : ils vivent dans un module
    // dédié (non ré-exporté par data.ts), introduit avec la v0.23.0 — toléré
    // absent pour les tags plus anciens.
    try {
      const heroicBundlePath = path.join(workDir, 'heroic.bundle.cjs');
      await bundleModule(repoPath, 'src/sim/content/heroic_loot.ts', heroicBundlePath);
      dumpRegistries(heroicBundlePath, ['HEROIC_BOSS_LOOT'], outDir);
    } catch (err) {
      console.warn(`  ⚠ Butin héroïque non extrait (tag antérieur à v0.23.0 ?) : ${err.message}`);
    }

    // Recettes de fabrication (ré-exportées par data.ts, donc déjà bundlées).
    dumpRegistries(dataBundlePath, ['ALL_RECIPES'], outDir);

    // Sorts de classes : registre ABILITIES de classes.ts.
    try {
      const classesBundlePath = path.join(workDir, 'classes.bundle.cjs');
      await bundleModule(repoPath, 'src/sim/content/classes.ts', classesBundlePath);
      dumpRegistries(classesBundlePath, ['ABILITIES'], outDir);
    } catch (err) {
      console.warn(`  ⚠ Sorts non extraits : ${err.message}`);
    }

    // Talents : un registre par classe (talents_classic.ts + talents_warrior.ts),
    // fusionnés en un seul TALENTS.json { classe: [nœuds...] }.
    try {
      const classicPath = path.join(workDir, 'talents_classic.bundle.cjs');
      const warriorPath = path.join(workDir, 'talents_warrior.bundle.cjs');
      await bundleModule(repoPath, 'src/sim/content/talents_classic.ts', classicPath);
      await bundleModule(repoPath, 'src/sim/content/talents_warrior.ts', warriorPath);
      const classic = require(classicPath);
      const warrior = require(warriorPath);
      const TALENTS = {};
      for (const [cls, key] of [
        ['druid','DRUID_TALENTS'], ['hunter','HUNTER_TALENTS'], ['mage','MAGE_TALENTS'],
        ['paladin','PALADIN_TALENTS'], ['priest','PRIEST_TALENTS'], ['rogue','ROGUE_TALENTS'],
        ['shaman','SHAMAN_TALENTS'], ['warlock','WARLOCK_TALENTS'],
      ]) {
        if (key in classic) TALENTS[cls] = classic[key];
        else console.warn(`  ⚠ Registre "${key}" introuvable dans talents_classic.`);
      }
      if ('WARRIOR_TALENTS' in warrior) TALENTS.warrior = warrior.WARRIOR_TALENTS;
      fs.writeFileSync(path.join(outDir, 'TALENTS.json'), JSON.stringify(TALENTS, null, 2));
      console.log(`  ✓ TALENTS → TALENTS.json (${Object.keys(TALENTS).length} classes)`);
    } catch (err) {
      console.warn(`  ⚠ Talents non extraits : ${err.message}`);
    }

    // Un petit fichier de métadonnées pour tracer d'où vient l'extraction.
    fs.writeFileSync(
      path.join(outDir, '_meta.json'),
      JSON.stringify(
        { tag, extractedAt: new Date().toISOString(), repo: REPO },
        null,
        2,
      ),
    );

    console.log(`[4/4] Terminé. Données écrites dans ${outDir}`);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('Échec de l\'extraction :', err.message);
  process.exit(1);
});
