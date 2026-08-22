/**
 * Pré-génère les variantes AVIF/WebP des assets, et le fichier de métadonnées
 * que consomme le composant Oeuvre.
 *
 * Pourquoi ce script existe : le site est en `output: 'export'`, donc
 * l'optimiseur d'images de Next est désactivé. Voir le plan.
 *
 * LANCER AVEC node, PAS bun : les opérations asynchrones natives de sharp ne
 * rendent jamais la main sous bun 1.4 (vérifié — AVIF comme WebP bloquent
 * indéfiniment). bun reste le gestionnaire de paquets.
 *
 *   node scripts/optimiser-assets.mjs
 */
import sharp from "sharp";
import { readdir, mkdir, writeFile, stat, copyFile, rm } from "node:fs/promises";
import { join, parse, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
/* Les originaux vivent HORS de public/ : tout ce qui est dans public/ part
   dans l'export statique, et les sources pèsent 80 Mo pour 23 œuvres. */
const SOURCE = join(racine, "sources");
const SORTIE = join(racine, "public/img");

/** Échelons de largeur. Aucun échelon ne dépasse la largeur de la source :
 *  agrandir une image ne fait qu'alourdir le fichier sans rien gagner. */
const ECHELONS = [420, 640, 960, 1280, 1920, 2560];

/** effort 4 (et non le défaut 4/9) : compromis retenu parce qu'un scan A4 en
 *  AVIF à effort 9 prend plusieurs minutes pour ~5 % de gain. */
const AVIF = { quality: 52, effort: 4 };
const WEBP = { quality: 80, effort: 4 };
/** Une seule passe pour les animations : l'AVIF animé est mal pris en charge
 *  par les navigateurs, le WebP animé l'est partout. */
const WEBP_ANIME = { quality: 70, effort: 4, loop: 0 };

const CONCURRENCE = 4;

async function traiter(categorie, fichier) {
  const { name, ext } = parse(fichier);
  const chemin = join(SOURCE, categorie, fichier);
  const dossierSortie = join(SORTIE, categorie);
  await mkdir(dossierSortie, { recursive: true });

  // Un SVG est déjà à la bonne place : le rastériser l'alourdit (mesuré : +7 %)
  // et lui fait perdre son intérêt — il doit rester animable au tracé.
  if (ext.toLowerCase() === ".svg") {
    const { width, height } = await sharp(chemin).metadata();
    await copyFile(chemin, join(dossierSortie, fichier));
    const octets = (await stat(chemin)).size;
    return [name, {
      largeur: width, hauteur: height, octetsSource: octets, vectoriel: true,
      variantes: [{ format: "svg", largeur: width, octets, fichier: `/img/${categorie}/${fichier}` }],
    }];
  }

  const meta = await sharp(chemin, { animated: true }).metadata();
  const largeur = meta.width;
  const hauteur = meta.pageHeight ?? meta.height;
  const images = meta.pages ?? 1;
  const anime = images > 1;
  const octetsSource = (await stat(chemin)).size;

  const entree = {
    largeur,
    hauteur,
    octetsSource,
    variantes: [],
  };

  if (anime) {
    // Durée réelle, lue dans l'asset : c'est ce qui permet à la page d'attente
    // de se synchroniser sans valeur codée en dur.
    entree.anime = true;
    entree.images = images;
    entree.dureeMs = (meta.delay ?? []).reduce((a, b) => a + b, 0);

    const cible = join(dossierSortie, `${name}.webp`);
    await sharp(chemin, { animated: true }).webp(WEBP_ANIME).toFile(cible);
    entree.variantes.push({
      format: "webp",
      largeur,
      octets: (await stat(cible)).size,
      fichier: `/img/${categorie}/${name}.webp`,
    });
    return [name, entree];
  }

  const largeurs = ECHELONS.filter((l) => l <= largeur);
  if (largeurs.length === 0) largeurs.push(largeur);
  else if (largeurs.at(-1) !== largeur && largeur < ECHELONS[0]) largeurs.push(largeur);

  /* Ne pas réencoder ce qui existe déjà : un scan A4 en AVIF coûte plusieurs
     secondes, et régénérer 69 sources pour 16 nouvelles est du gaspillage pur.
     On relit seulement les tailles pour reconstituer le registre. */
  const attendues = largeurs.flatMap((l) =>
    ["avif", "webp"].map((format) => ({
      format,
      largeur: l,
      cible: join(dossierSortie, `${name}-${l}.${format}`),
      fichier: `/img/${categorie}/${name}-${l}.${format}`,
    })),
  );
  const tailles = await Promise.all(
    attendues.map((v) => stat(v.cible).then((s) => s.size, () => null)),
  );
  const toutesLa = tailles.every((t) => t !== null);

  for (const [i, v] of attendues.entries()) {
    if (!toutesLa) {
      await sharp(chemin)
        .resize({ width: v.largeur, withoutEnlargement: true })
        .toFormat(v.format, v.format === "avif" ? AVIF : WEBP)
        .toFile(v.cible);
    }
    entree.variantes.push({
      format: v.format,
      largeur: v.largeur,
      octets: toutesLa ? tailles[i] : (await stat(v.cible)).size,
      fichier: v.fichier,
    });
  }
  entree.reutilise = toutesLa || undefined;
  return [name, entree];
}

const registre = {};
let sourceTotale = 0;
let sortieTotale = 0;

/* Ne parcourir que les DOSSIERS : `sources/` contient aussi le cache du fichier
   Figma, qu'un readdir naïf prend pour une catégorie (ENOTDIR). */
const categories = (await readdir(SOURCE, { withFileTypes: true }))
  .filter((e) => e.isDirectory() && !e.name.startsWith("."))
  .map((e) => e.name);

for (const categorie of categories) {
  const fichiers = (await readdir(join(SOURCE, categorie))).filter((f) => !f.startsWith("."));
  registre[categorie] = {};

  for (let i = 0; i < fichiers.length; i += CONCURRENCE) {
    const lot = fichiers.slice(i, i + CONCURRENCE);
    const resultats = await Promise.all(
      lot.map((f) =>
        traiter(categorie, f).catch((e) => {
          console.error(`  ECHEC ${categorie}/${f} : ${e.message}`);
          return null;
        }),
      ),
    );
    for (const r of resultats) {
      if (!r) continue;
      const [nom, entree] = r;
      registre[categorie][nom] = entree;
      sourceTotale += entree.octetsSource;
      // Le poids réellement servi = la plus petite variante utile, mais pour le
      // bilan on compare la source au meilleur AVIF de même largeur.
      const meilleur = entree.variantes
        .filter((v) => v.format === "avif" || entree.anime)
        .reduce((a, v) => (v.largeur > (a?.largeur ?? 0) ? v : a), null);
      sortieTotale += meilleur?.octets ?? 0;
      const gain = meilleur ? (100 - (100 * meilleur.octets) / entree.octetsSource).toFixed(0) : "?";
      console.log(
        `  ${categorie}/${nom}`.padEnd(38),
        `${entree.largeur}x${entree.hauteur}`.padEnd(12),
        `${(entree.octetsSource / 1048576).toFixed(1)} Mo -> ${((meilleur?.octets ?? 0) / 1048576).toFixed(2)} Mo`.padEnd(24),
        `-${gain} %`,
        entree.anime ? `(animé ${entree.images} img, ${entree.dureeMs} ms)` : "",
        entree.reutilise ? "(déjà là)" : "",
      );
    }
  }
}

await mkdir(join(racine, "content"), { recursive: true });
await writeFile(
  join(racine, "content/assets.generated.ts"),
  `/* GENERE par scripts/optimiser-assets.mjs — ne pas modifier à la main. */\n` +
    `export const ASSETS = ${JSON.stringify(registre, null, 2)} as const;\n\n` +
    `export type CategorieAsset = keyof typeof ASSETS;\n`,
);

console.log(
  `\nBilan : ${(sourceTotale / 1048576).toFixed(0)} Mo de sources -> ` +
    `${(sortieTotale / 1048576).toFixed(1)} Mo en pleine largeur AVIF ` +
    `(-${(100 - (100 * sortieTotale) / sourceTotale).toFixed(0)} %)`,
);
console.log("content/assets.generated.ts écrit");
