/**
 * Télécharge les rendus référencés par content/figma.extrait.json.
 *
 * Les URLs de rendu de l'API Figma sont valables peu de temps : enchaîner ce
 * script juste après extraire-figma.mjs. Un échec est visible (erreur HTTP),
 * jamais silencieux.
 *
 *   node scripts/telecharger-rendus.mjs
 */
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const extrait = JSON.parse(await readFile(join(racine, "content/figma.extrait.json"), "utf8"));

/** id de nœud Figma -> nom de fichier lisible, depuis les noms de la maquette. */
const nomsParId = new Map();
const assainir = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

for (const p of extrait.projets) {
  for (const [i, o] of p.oeuvres.entries()) {
    nomsParId.set(o.idFigma, `${assainir(p.nomFigma)}-${i + 1}-${assainir(o.nomFigma)}`);
  }
}
for (const [ecran, c] of Object.entries(extrait.chrome)) {
  for (const n of [...c.images, ...c.vecteurs]) {
    nomsParId.set(n.idFigma, `${ecran}-${assainir(n.nomFigma)}-${n.idFigma.replace(":", "_")}`);
  }
}

let recus = 0, ignores = 0;
const echecs = [];

for (const [format, urls] of Object.entries(extrait.rendus)) {
  const dossier = join(racine, "sources", format === "svg" ? "chrome" : "oeuvres");
  await mkdir(dossier, { recursive: true });

  for (const [id, url] of Object.entries(urls)) {
    if (!url) { echecs.push(`${id} — Figma n'a pas produit de rendu (nœud vide ?)`); continue; }
    const nom = nomsParId.get(id) ?? `nœud-${id.replace(":", "_")}`;
    const cible = join(dossier, `${nom}.${format}`);
    if (await stat(cible).then(() => true, () => false)) { ignores++; continue; }
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const octets = Buffer.from(await r.arrayBuffer());
      await writeFile(cible, octets);
      console.log(`  ${nom}.${format}`.padEnd(64), (octets.length / 1024).toFixed(0).padStart(6), "Ko");
      recus++;
    } catch (e) {
      echecs.push(`${nom} (${id}) — ${e.message}`);
    }
  }
}

console.log(`\n${recus} téléchargés, ${ignores} déjà présents, ${echecs.length} en échec`);
if (echecs.length) {
  console.error("\nÉCHECS :");
  for (const e of echecs) console.error("  " + e);
  process.exit(1);
}
console.log("Enchaîner : node scripts/optimiser-assets.mjs"); svg
