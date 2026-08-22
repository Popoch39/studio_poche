/**
 * Écrit content/projets.ts à partir de content/figma.extrait.json.
 *
 * Séparation des responsabilités :
 *   - la GÉOMÉTRIE vient de la machine (exacte, jamais retouchée à la main)
 *   - la SÉMANTIQUE vient de la table CURATION ci-dessous (slugs, répartition
 *     commanditaire / agence / technique), parce qu'elle demande un jugement
 *
 * Le script VÉRIFIE que la recomposition des champs reproduit la légende
 * d'origine au caractère près, et échoue sinon. C'est le garde-fou : sans lui,
 * une répartition maladroite altérerait silencieusement le texte de Marie.
 *
 *   node scripts/generer-projets.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const extrait = JSON.parse(await readFile(join(racine, "content/figma.extrait.json"), "utf8"));

/**
 * Nœuds du cadre PORTEFOLIO qui portent une image mais ne sont PAS des Projets.
 * « présentation 2 » est le Lettrage « PRÉSENTATION » en tête de page (y=183).
 *
 * Comparaison en forme normalisée : Figma renvoie les accents en NFD, les
 * littérales de ce fichier sont en NFC — sans normalisation, « présentation »
 * ne s'égale pas à lui-même.
 */
const norm = (s) => s.normalize("NFC");
const CHROME = new Set(["présentation 2"].map(norm));

/**
 * `planche: true` désigne un Projet SCÉNOGRAPHIÉ : sa planche se pose au
 * défilement (voir docs/adr/0005) au lieu d'être révélée par le front d'encre.
 * Choix éditorial, donc ici et pas dans une dérivation — mais contraint par la
 * résolution : une planche est agrandie jusqu'à la largeur de l'écran, elle
 * demande donc une source assez grande. Voir content/planches.json.
 *
 * Répartition des légendes, décidée à la main.
 *
 * `contexte` reçoit la chaîne verbatim quand la légende ne se décompose pas en
 * champs sans altérer le texte : « Vidéo animée pour Canal Architecture » ne se
 * réduit pas à une agence plus une technique sans perdre le « pour ».
 */
const CURATION = {
  "Group 30":       { slug: "veja-x-milk", contexte: true },
  "Group 31":       { slug: "logo-anne-maraichere", contexte: true },
  "Group 29":       { slug: "toits-de-paris-2026", technique: true, planche: true },
  "Group 16":       { slug: "flyer-sncf-reseau", decoupe: ["agence", "technique"] },
  "secours pop":    { slug: "secours-populaire", contexte: true },
  "huttopia":       { slug: "tiny-house-huttopia", contexte: true },
  "Group 17":       { slug: "affiche-ride-musicale", technique: true },
  "Group 21":       { slug: "pic-epeiche" },
  "Group 2":        { slug: "collages-ambiances", agence: true },
  "Group 11":       { slug: "morangis-canal-architecture", contexte: true },
  "Group 34":       { slug: "fresque-ambassade-suisse", commanditaire: true, planche: true },
  "Group 8":        { slug: "vol-d-une-sterne", technique: true },
  "bretagne":       { slug: "plage-bretonne", technique: true },
  "Group 35":       { slug: "panneau-orgue-arbois", technique: true },
  "Group 36":       { slug: "axonometrie-urban-water", agence: true },
  "Group 19":       { slug: "etiquettes-savon-chevrerie", commanditaire: true },
  "Group 37":       { slug: "paysages-fenetre-du-train" },
  "camargue":       { slug: "oiseaux-de-camargue", technique: true, planche: true },
  "paysage":        { slug: "paysages-acrylique", technique: true },
  // Sans légende dans la maquette : à compléter par Marie.
  "IMG_5876 1":     { slug: "img-5876", titre: "Sans titre" },
  "Dream 9 1":      { slug: "dream-9", titre: "Sans titre" },
  "POISSON":        { slug: "poissons", titre: "Sans titre" },
  // Les 4 projets posés hors du cadre.
  "les tables":     { slug: "les-tables" },
  "SACLAY":         { slug: "plateau-de-saclay", agence: true },
  "Paris":          { slug: "toits-de-paris-2024", technique: true },
  "italy":          { slug: "soiree-italienne", technique: true },
};

/**
 * Où reposer les 4 Projets que Figma laisse hors du cadre.
 *
 * Le cadre fait 16404px de haut alors que le dernier Projet s'arrête à 14362 :
 * il reste 2042px libres en fin de page, exactement ce qu'il faut. Rien
 * d'existant n'est déplacé.
 *
 * POSITIONS PROPOSÉES, à faire valider par Marie — d'où `positionProposee`.
 */
const REPOSITIONNEMENTS = {
  "les tables": { x: 140, y: 14560 },
  Paris: { x: 720, y: 14560 },
  italy: { x: 200, y: 15310 },
  SACLAY: { x: 920, y: 15310 },
};

// ── Recomposition et vérification ───────────────────────────────────────────
function champs(reste, regle) {
  if (!reste) return {};
  if (regle.contexte) return { contexte: reste };
  if (regle.technique) return { technique: reste };
  if (regle.agence) return { agence: reste };
  if (regle.commanditaire) return { commanditaire: reste };
  if (regle.decoupe) {
    const morceaux = reste.split(" - ").map((m) => m.trim());
    if (morceaux.length !== regle.decoupe.length) {
      throw new Error(`« ${reste} » ne se découpe pas en ${regle.decoupe.length} morceaux`);
    }
    return Object.fromEntries(regle.decoupe.map((cle, i) => [cle, morceaux[i]]));
  }
  return { contexte: reste };
}

/** Doit être l'image exacte de ce que compose components/collage/Legende.tsx. */
function recomposer(p) {
  const parts = [p.commanditaire, p.agence, p.technique].filter(Boolean);
  return parts.length > 0 ? parts.join(" - ") : (p.contexte ?? "");
}

// ── Génération ──────────────────────────────────────────────────────────────
const projets = [];
const avertissements = [];

for (const brut of extrait.projets) {
  if (CHROME.has(norm(brut.nomFigma))) continue;
  const regle = CURATION[brut.nomFigma] ?? CURATION[norm(brut.nomFigma)];
  if (!regle) {
    avertissements.push(`« ${brut.nomFigma} » absent de CURATION — ignoré`);
    continue;
  }

  const repos = REPOSITIONNEMENTS[brut.nomFigma];
  let dx = 0, dy = 0;
  if (repos) {
    dx = repos.x - Math.min(...brut.oeuvres.map((o) => o.x));
    dy = repos.y - Math.min(...brut.oeuvres.map((o) => o.y));
  }
  const r2 = (v) => Math.round(v * 100) / 100;

  const p = {
    slug: regle.slug,
    titre: regle.titre ?? brut.titre,
    annee: brut.annee,
    ...champs(brut.resteLegende, regle),
    oeuvres: brut.oeuvres.map((o, i) => ({
      fichier: o.fichier,
      x: r2(o.x + dx),
      y: r2(o.y + dy),
      largeur: r2(o.largeur),
      hauteur: r2(o.hauteur),
      // Alt volontairement factuel et positionnel : décrire à sa place le
      // contenu de ses illustrations risquerait de le décrire faux.
      // À faire relire par Marie, qui sait ce qu'il y a dans ses images.
      alt:
        brut.oeuvres.length > 1
          ? `${regle.titre ?? brut.titre} — image ${i + 1} sur ${brut.oeuvres.length}`
          : (regle.titre ?? brut.titre),
      ajustement: o.ajustement,
      ...(o.crop ? { crop: o.crop } : {}),
      ...(o.radius ? { radius: o.radius } : {}),
      ...(o.miroir ? { miroir: true } : {}),
    })),
    legende: brut.legende
      ? {
          x: r2(brut.legende.x + dx),
          y: r2(brut.legende.y + dy),
          largeur: r2(brut.legende.largeur),
          fs: brut.legende.fs,
          lh: brut.legende.lh,
        }
      : null,
    ...(brut.legendeIncomplete ? { legendeIncomplete: true } : {}),
    ...(repos ? { positionProposee: true } : {}),
    ...(regle.planche ? { planche: true } : {}),
  };

  // Garde-fou : la légende recomposée doit être identique à l'originale.
  const attendu = brut.resteLegende ?? "";
  const obtenu = recomposer(p);
  if (attendu !== obtenu) {
    throw new Error(
      `Légende altérée pour « ${brut.nomFigma} » :\n` +
        `  original   : ${JSON.stringify(attendu)}\n` +
        `  recomposé  : ${JSON.stringify(obtenu)}`,
    );
  }

  projets.push(p);
}

// Un slug en double casserait les clés React et rendrait deux projets
// indiscernables — exactement ce que le slug doit empêcher.
const vus = new Set();
for (const p of projets) {
  if (vus.has(p.slug)) throw new Error(`slug en double : ${p.slug}`);
  vus.add(p.slug);
}

const manquants = Object.keys(CURATION).filter((n) => !extrait.projets.some((p) => p.nomFigma === n));
if (manquants.length) avertissements.push(`CURATION contient des noms absents de l'extrait : ${manquants.join(", ")}`);

projets.sort((a, b) => Math.min(...a.oeuvres.map((o) => o.y)) - Math.min(...b.oeuvres.map((o) => o.y)));

const entete = `/* GÉNÉRÉ par scripts/generer-projets.mjs — ne pas modifier à la main.
 *
 * La géométrie vient de Figma via content/figma.extrait.json.
 * La sémantique (slugs, répartition des champs) vient de la table CURATION du
 * script. Pour changer un slug ou une répartition, éditer le script.
 *
 * Les textes alternatifs sont factuels et positionnels : décrire à la place de
 * Marie le contenu de ses illustrations risquerait de le décrire faux. À faire
 * relire par elle.
 */
import type { Projet } from "./types";

/** Hauteur du Collage, en px de maquette (cadre PORTEFOLIO de Figma). */
export const HAUTEUR_COLLAGE = ${extrait.hauteurPortfolio};

export const PROJETS: Projet[] = `;

await writeFile(
  join(racine, "content/projets.ts"),
  entete + JSON.stringify(projets, null, 2) + ";\n",
);

// ── content/planches.json ───────────────────────────────────────────────────
/* Les noms de fichier des Œuvres scénographiées, pour scripts/optimiser-assets.
 *
 * Pourquoi un JSON à part et non une lecture de content/projets.ts :
 * l'optimiseur est un module `.mjs`, il ne peut pas importer du TypeScript. Et
 * pourquoi il en a besoin : une Œuvre scénographiée est agrandie jusqu'à la
 * largeur de l'écran, elle réclame donc une variante que l'échelle ordinaire
 * des paliers ne produit pas (voir ECHELONS dans l'optimiseur). */
const fichiersPlanches = projets
  .filter((p) => p.planche)
  .flatMap((p) => p.oeuvres.map((o) => o.fichier));

await writeFile(
  join(racine, "content/planches.json"),
  JSON.stringify(fichiersPlanches, null, 2) + "\n",
);

// ── content/chrome.ts ───────────────────────────────────────────────────────
/* Les écrans Attente, Contact et À propos sont eux aussi de la géométrie
   absolue. On la génère plutôt que de la retaper : une valeur de recadrage
   saisie à la main est une valeur fausse (constaté — un recadrage deviné à
   -0,02 % valait en réalité -133 %). */
const HAUTEURS = { attente: 1117, contact: 1701, apropos: 2996 };

/** Libellés de navigation et icônes : rendus par le composant Entete, pas ici. */
const DU_HEADER = new Set([
  "point 1", "point 2", "portfolio", "contact 2", "à propos 1",
  "in insta mail 1", "in insta mail 2", "in insta mail 3",
].map(norm));

const ecrans = {};
for (const [nom, c] of Object.entries(extrait.chrome)) {
  ecrans[nom] = {
    hauteur: HAUTEURS[nom] ?? null,
    images: c.images
      .filter((im) => !DU_HEADER.has(norm(im.nomFigma)))
      .map((im) => ({
        fichier: im.fichier,
        nomFigma: im.nomFigma,
        x: im.x, y: im.y, largeur: im.largeur, hauteur: im.hauteur,
        ajustement: im.ajustement,
        ...(im.crop ? { crop: im.crop } : {}),
        ...(im.radius ? { radius: im.radius } : {}),
        ...(im.miroir ? { miroir: true } : {}),
      })),
    textes: c.textes.map((t) => ({
      texte: t.texte,
      x: t.x, y: t.y, largeur: t.largeur, fs: t.fs, lh: t.lh,
      ...(t.italique ? { italique: true } : {}),
      ...(t.graisse ? { graisse: t.graisse } : {}),
    })),
    // Groupes vectoriels dessinés à la main. `fichier` est null tant que le
    // quota de rendu de l'API Figma n'est pas rétabli.
    vecteurs: c.vecteurs.map((v) => ({
      nomFigma: v.nomFigma,
      x: v.x, y: v.y, largeur: v.largeur, hauteur: v.hauteur,
      fichier: (extrait.svg ?? {})[v.idFigma] ? `/img/chrome/${v.nomFigma}.svg` : null,
    })),
  };
}

await writeFile(
  join(racine, "content/chrome.ts"),
  `/* GÉNÉRÉ par scripts/generer-projets.mjs — ne pas modifier à la main.\n` +
    ` * Géométrie des écrans Attente, Contact et À propos, extraite de Figma.\n` +
    ` * Les libellés de navigation sont exclus : ils sont rendus par Entete.\n */\n` +
    `export const ECRANS = ${JSON.stringify(ecrans, null, 2)} as const;\n`,
);
const nImg = Object.values(ecrans).reduce((n, e) => n + e.images.length, 0);
const nVec = Object.values(ecrans).reduce((n, e) => n + e.vecteurs.length, 0);
const nVecPrets = Object.values(ecrans).reduce((n, e) => n + e.vecteurs.filter((v) => v.fichier).length, 0);
console.log(`content/chrome.ts écrit — ${nImg} images, ${nVec} groupes vectoriels (${nVecPrets} avec SVG)`);

console.log(`content/projets.ts écrit — ${projets.length} projets, ${projets.reduce((n, p) => n + p.oeuvres.length, 0)} œuvres`);
console.log(`content/planches.json écrit — ${fichiersPlanches.length} œuvres scénographiées`);
console.log(`  ${projets.filter((p) => p.legendeIncomplete).length} sans légende, ${projets.filter((p) => p.positionProposee).length} à position proposée`);
console.log(`  légendes recomposées à l'identique : vérifié pour les ${projets.length}`);
for (const a of avertissements) console.warn("  ! " + a);
