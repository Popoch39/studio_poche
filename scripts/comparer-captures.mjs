/**
 * Compare les captures de `.captures/` à la référence `.captures-reference/`,
 * pixel à pixel. Le chantier d'animation exige la fidélité au repos : les
 * captures tournent en `reducedMotion: reduce`, donc tout écart est une
 * régression de mise en page, jamais un artefact d'animation.
 *
 *   node scripts/comparer-captures.mjs         tolérance zéro
 *   node scripts/comparer-captures.mjs 100     tolère 100 pixels par capture
 *
 * Poser la référence : bun run captures && cp -r .captures .captures-reference
 */
import sharp from "sharp";
import { readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const REFERENCE = join(racine, ".captures-reference");
const ACTUEL = join(racine, ".captures");
const tolerance = Number(process.argv[2] ?? 0);

const brut = (fichier) =>
  sharp(fichier).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

let referencees;
try {
  referencees = (await readdir(REFERENCE)).filter((f) => f.endsWith(".png")).sort();
} catch {
  console.error(
    `Référence absente : ${REFERENCE}\n` +
      "La poser : bun run captures && cp -r .captures .captures-reference",
  );
  process.exit(2);
}

const actuelles = (await readdir(ACTUEL)).filter((f) => f.endsWith(".png"));
const problemes = [];

for (const nom of referencees) {
  if (!actuelles.includes(nom)) {
    problemes.push(`${nom} : absente de .captures/`);
    continue;
  }
  // Séquentiel et non Promise.all : deux pleines pages de 16404px en RGBA brut
  // pèsent déjà ~230 Mo — inutile d'empiler les douze.
  const ref = await brut(join(REFERENCE, nom));
  const act = await brut(join(ACTUEL, nom));
  if (ref.info.width !== act.info.width || ref.info.height !== act.info.height) {
    problemes.push(
      `${nom} : ${act.info.width}x${act.info.height}, référence ${ref.info.width}x${ref.info.height}`,
    );
    continue;
  }
  let ecarts = 0;
  const a = ref.data;
  const b = act.data;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) {
      ecarts++;
    }
  }
  console.log(`  ${nom.padEnd(28)} ${ecarts === 0 ? "identique" : `${ecarts} pixel(s) d'écart`}`);
  if (ecarts > tolerance) problemes.push(`${nom} : ${ecarts} pixel(s) d'écart`);
}

for (const nom of actuelles) {
  if (!referencees.includes(nom)) problemes.push(`${nom} : absente de la référence`);
}

if (problemes.length) {
  console.error(`\n${problemes.length} écart(s) :`);
  for (const p of problemes) console.error("  " + p);
  process.exit(1);
}
console.log(`\n${referencees.length} capture(s) identiques à la référence`);
