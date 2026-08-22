/**
 * Génère la rampe d'encre : le masque qui révèle les Œuvres du Collage.
 *
 * Le principe. Une rampe est une longue bande en niveaux d'alpha — opaque d'un
 * côté, transparente de l'autre, avec entre les deux une BANDE DÉCHIRÉE. On la
 * fait glisser en `mask-position` au-dessus des Œuvres : la bande traverse, et
 * l'Œuvre apparaît derrière un bord d'encre plutôt que derrière un bord de
 * cutter. Tout le vocabulaire de révélation du site tient dans cette image.
 *
 * Pourquoi une image et non un filtre. Le déchirement demande un SEUILLAGE du
 * bruit (« ce pixel a-t-il déjà bu ? »), et aucune composition CSS ne sait
 * seuiller : `mask-composite` multiplie ou additionne des alphas, il ne les
 * tranche pas. Le seuillage est donc cuit ici, une fois, hors ligne — ce qui
 * laisse au navigateur un simple glissement d'image, composité.
 *
 * Deux fichiers : le front attaque par la gauche ou par la droite (la marge de
 * page la plus proche du Projet, voir BlocProjet). Ce n'est PAS un miroir : la
 * pente est absolue — l'angle du poignet ne change pas parce qu'on balaie dans
 * l'autre sens.
 *
 * Cette image est faite pour être REMPLACÉE par un lavis scanné de Marie : même
 * chemin, mêmes dimensions, mêmes bornes de bande. Le jour où le scan arrive,
 * il se substitue au bruit sans qu'une ligne de code bouge.
 *
 * LANCER AVEC node, PAS bun (voir optimiser-assets.mjs) :
 *   node scripts/generer-rampe-encre.mjs
 */
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = join(racine, "public/img/encre");
const MANIFESTE = join(racine, "content/encre.generated.ts");

/* ─── Les réglages du geste ───────────────────────────────────────────────── */

/** L'angle du poignet, en degrés depuis la verticale. Constant pour tout le site. */
const ANGLE = 11;
/** Largeur de la bande déchirée, en px de maquette. */
const BANDE = 36;
/** Échelle de rendu : px d'image par px de maquette. */
const RESOLUTION = 1;
/** Marge ajoutée aux dimensions déduites des Projets. */
const MARGE = 24;

/** Grain du buvard, en px de maquette. Étiré selon x : les fibres suivent le geste. */
const GRAIN = { x: 90, y: 110 };
/** Octaves du bruit fractal. Au-delà de 4, le gain est invisible à cette échelle. */
const OCTAVES = 5;
/** Contraste du bruit : creuse les lobes du bord, pour que la déchirure occupe
 *  vraiment la bande au lieu de mourir en son milieu. */
const CONTRASTE = 1.8;
/** Dureté du seuil. Plus c'est grand, plus le bord est net et déchiré. */
const DURETE = 12;

/* ─── Bruit de valeur, déterministe ───────────────────────────────────────── */

/** Hachage entier — même graine, même image, à chaque exécution. */
function hacher(x, y, graine) {
  let h = (x * 374761393 + y * 668265263 + graine * 1274126177) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const lisser = (t) => t * t * (3 - 2 * t);

function bruit(x, y, graine) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = lisser(x - x0);
  const fy = lisser(y - y0);
  const a = hacher(x0, y0, graine);
  const b = hacher(x0 + 1, y0, graine);
  const c = hacher(x0, y0 + 1, graine);
  const d = hacher(x0 + 1, y0 + 1, graine);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

/** Bruit fractal normalisé dans [0,1]. */
function fractal(x, y, graine) {
  let somme = 0;
  let amplitude = 1;
  let total = 0;
  for (let o = 0; o < OCTAVES; o++) {
    const e = 2 ** o;
    somme += bruit((x / GRAIN.x) * e, (y / GRAIN.y) * e, graine + o * 101) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
  }
  return somme / total;
}

/* ─── Les dimensions, déduites des Projets ────────────────────────────────── */

/**
 * La rampe doit couvrir le plus grand Projet du Collage. Ces bornes sont donc
 * LUES dans content/projets.ts plutôt que devinées : si un Projet plus large
 * arrive un jour, la rampe grandit avec lui au prochain passage du script.
 */
async function bornesDesProjets() {
  const source = await readFile(join(racine, "content/projets.ts"), "utf8");
  const debut = source.indexOf("= [", source.indexOf("export const PROJETS")) + 2;
  const projets = JSON.parse(source.slice(debut, source.lastIndexOf("];") + 1));
  let largeur = 0;
  let hauteur = 0;
  for (const p of projets) {
    const xs = p.oeuvres.map((o) => o.x);
    const ys = p.oeuvres.map((o) => o.y);
    largeur = Math.max(largeur, Math.max(...p.oeuvres.map((o) => o.x + o.largeur)) - Math.min(...xs));
    hauteur = Math.max(hauteur, Math.max(...p.oeuvres.map((o) => o.y + o.hauteur)) - Math.min(...ys));
  }
  return { largeur, hauteur, nombre: projets.length };
}

/* ─── Le rendu ────────────────────────────────────────────────────────────── */

/**
 * Une rampe. `sens` vaut 1 (l'encre est à gauche, elle avance vers la droite)
 * ou -1 (l'encre est à droite).
 *
 * `r` mesure l'avancement de l'encre au pixel : 1 au bord déjà bu, 0 au papier
 * encore sec. Le déchirement vient de la comparaison `r > bruit` — chaque
 * fibre boit à son tour, pas toutes en même temps.
 */
function rendre({ largeur, hauteur, blanc, pente, sens }) {
  const px = Math.round(largeur * RESOLUTION);
  const py = Math.round(hauteur * RESOLUTION);
  const donnees = Buffer.alloc(px * py * 4);
  for (let j = 0; j < py; j++) {
    const y = j / RESOLUTION;
    // Le bord franc de la bande, incliné de l'angle du poignet.
    const bord = sens === 1 ? blanc + y * pente : BANDE + y * pente;
    for (let i = 0; i < px; i++) {
      const x = i / RESOLUTION;
      const r = sens === 1 ? (bord + BANDE - x) / BANDE : (x - bord + BANDE) / BANDE;
      let alpha;
      if (r >= 1) alpha = 1;
      else if (r <= 0) alpha = 0;
      else {
        const n = Math.min(1, Math.max(0, (fractal(x, y, 7) - 0.5) * CONTRASTE + 0.5));
        alpha = Math.min(1, Math.max(0, (r - n) * DURETE + 0.5));
      }
      const k = (j * px + i) * 4;
      donnees[k] = 255;
      donnees[k + 1] = 255;
      donnees[k + 2] = 255;
      donnees[k + 3] = Math.round(alpha * 255);
    }
  }
  return sharp(donnees, { raw: { width: px, height: py, channels: 4 } })
    .webp({ quality: 82, alphaQuality: 95, effort: 6 });
}

/* ─── Exécution ───────────────────────────────────────────────────────────── */

const bornes = await bornesDesProjets();
const pente = Math.tan((ANGLE * Math.PI) / 180);

/** Longueur du plat opaque : il doit pouvoir couvrir le plus large des Projets. */
const blanc = Math.ceil(bornes.largeur) + MARGE;
const hauteur = Math.ceil(bornes.hauteur) + MARGE;
/** La bande est inclinée : sa course horizontale grandit avec la hauteur. */
const largeur = blanc + BANDE + Math.ceil(hauteur * pente) + MARGE;

await mkdir(SORTIE, { recursive: true });
for (const [nom, sens] of [
  ["gauche", 1],
  ["droite", -1],
]) {
  const chemin = join(SORTIE, `rampe-${nom}.webp`);
  const info = await rendre({ largeur, hauteur, blanc, pente, sens }).toFile(chemin);
  console.log(
    `rampe-${nom}.webp  ${info.width}×${info.height}px  ${(info.size / 1024).toFixed(1)} Ko`,
  );
}

await writeFile(
  MANIFESTE,
  `/* GÉNÉRÉ par scripts/generer-rampe-encre.mjs — ne pas modifier à la main.
 *
 * La géométrie de la rampe d'encre, en px de MAQUETTE (jamais en px d'image :
 * la rampe est rendue à une autre résolution, et le Collage s'échelonne par
 * --u). BlocProjet en dérive les bornes de masque de chaque Œuvre, et
 * globals.css la taille du masque. Voir le script pour le raisonnement.
 */

export const RAMPE = {
  /** Chemins des deux sens d'attaque, servis depuis public/. */
  fichier: { gauche: "/img/encre/rampe-gauche.webp", droite: "/img/encre/rampe-droite.webp" },
  /** Dimensions de l'image, en px de maquette. */
  largeur: ${largeur},
  hauteur: ${hauteur},
  /** Longueur du plat opaque, depuis le bord d'attaque. */
  blanc: ${blanc},
  /** Largeur de la bande déchirée. */
  bande: ${BANDE},
  /** Pente du bord — tangente de l'angle du poignet (${ANGLE}°). */
  pente: ${pente.toFixed(6)},
} as const;
`,
  "utf8",
);
console.log(
  `content/encre.generated.ts  (déduit de ${bornes.nombre} Projets : ` +
    `largeur max ${Math.ceil(bornes.largeur)}, hauteur max ${Math.ceil(bornes.hauteur)})`,
);
