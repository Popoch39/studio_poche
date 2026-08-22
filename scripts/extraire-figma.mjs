/**
 * Extrait la maquette Figma via l'API REST : structure, légendes, géométrie,
 * images sources et chrome vectoriel. Écrit un BROUILLON dans
 * content/figma.extrait.json, à partir duquel content/projets.ts est rédigé.
 *
 * ── Pourquoi ce chemin ──────────────────────────────────────────────────────
 * Le serveur MCP Figma est limité à 20 appels par MOIS sur le plan Starter :
 * insuffisant pour 27 projets. L'API REST a un quota distinct, mais son endpoint
 * de rendu `/v1/images` est sévèrement limité en débit — il a répondu 429 dès le
 * premier lot. En revanche `/v1/files/:key/images` renvoie la table de TOUTES
 * les images sources du fichier en UNE requête.
 *
 * On récupère donc les sources, et on reproduit en CSS la façon dont Figma les
 * compose (recadrage, miroir, arrondi). La formule de recadrage a été vérifiée
 * au centième contre le CSS que Figma produit lui-même.
 *
 * `/v1/images` n'est utilisé que pour les groupes vectoriels : il n'existe aucun
 * autre moyen d'obtenir un SVG.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 *   node scripts/extraire-figma.mjs          (jeton dans .env.local)
 *   node scripts/extraire-figma.mjs --sans-svg   pour épargner le quota
 */
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const SANS_SVG = process.argv.includes("--sans-svg");

const CLE = "8jQEZaqX0RZfvYWOXeg1pE";
const PAGE = "3316:2";
const CADRES = {
  attente: "3318:9",
  portfolio: "3318:14",
  contact: "3318:34",
  apropos: "3318:48",
};
/** Les 4 Projets posés hors du cadre PORTEFOLIO : inclus, position à valider. */
const ORPHELINS = {
  "3323:8": "les-tables",
  "3321:49": "saclay",
  "3346:29": "toits-de-paris-2024",
  "3346:34": "soiree-italienne",
};

const DELAI_MS = 90_000;
const LOT_RENDU = 5;

const patiente = (ms) => new Promise((ok) => setTimeout(ok, ms));

const TOKEN = await (async () => {
  let brut;
  try {
    brut = await readFile(join(racine, ".env.local"), "utf8");
  } catch {
    throw new Error(
      "`.env.local` absent. figma.com > Settings > Security > Personal access " +
        "tokens (portée file_content:read), puis :\n" +
        "  echo 'FIGMA_TOKEN=figd_...' >> .env.local",
    );
  }
  const m = brut.match(/^\s*FIGMA_TOKEN\s*=\s*(.+?)\s*$/m);
  if (!m) throw new Error("`FIGMA_TOKEN` introuvable dans .env.local");
  return m[1].replace(/^["']|["']$/g, "");
})();

/**
 * `fetch` n'a AUCUN délai d'attente par défaut : sans `AbortSignal.timeout`, une
 * requête bloquée reste silencieuse indéfiniment (constaté).
 * L'attente de reprise est plafonnée : Figma peut annoncer un `retry-after`
 * d'une heure, qu'on ne veut pas subir sans le savoir.
 */
async function api(chemin, essais = 6) {
  for (let n = 0; ; n++) {
    let r;
    try {
      r = await fetch(`https://api.figma.com/v1${chemin}`, {
        headers: { "X-Figma-Token": TOKEN },
        signal: AbortSignal.timeout(DELAI_MS),
      });
    } catch (e) {
      if (n >= essais) throw new Error(`GET ${chemin.slice(0, 80)}… — ${e.message}`);
      console.log(`    ${e.name} — reprise ${n + 1}/${essais}`);
      await patiente(Math.min(2000 * 2 ** n, 60_000));
      continue;
    }
    if (r.ok) return r.json();
    if ((r.status !== 429 && r.status < 500) || n >= essais) {
      throw new Error(`GET ${chemin.slice(0, 80)}… — HTTP ${r.status}\n${(await r.text().catch(() => "")).slice(0, 240)}`);
    }
    const attente = Math.min(Number(r.headers.get("retry-after")) * 1000 || 2000 * 2 ** n, 60_000);
    console.log(`    HTTP ${r.status} — reprise dans ${attente / 1000}s (${n + 1}/${essais})`);
    await patiente(attente);
  }
}

// ── 1. L'arbre ──────────────────────────────────────────────────────────────
/* On lit `/files/:key` et NON `/files/:key/nodes` : ce sont deux endpoints aux
   budgets de débit distincts, et `/nodes` s'est retrouvé bloqué avec un
   `retry-after` de 4,6 jours. Le fichier entier fait 1,2 Mo, ce qui est sans
   importance pour un script.
   `geometry=paths` est nécessaire : sans lui, `relativeTransform` est absent et
   un retournement d'image passerait inaperçu. */
console.log("1/4  Lecture du fichier (geometry=paths)…");
/* Mis en cache : le quota par endpoint est précieux, et itérer sur la logique
   d'appariement des légendes ne doit pas coûter une requête à chaque essai.
   `--rafraichir` force la relecture. */
const cache = join(racine, "sources/figma-fichier.json");
let fichier;
if (!process.argv.includes("--rafraichir") && (await stat(cache).then(() => true, () => false))) {
  fichier = JSON.parse(await readFile(cache, "utf8"));
  console.log("     depuis le cache (sources/figma-fichier.json)");
} else {
  fichier = await api(`/files/${CLE}?geometry=paths`);
  await mkdir(join(racine, "sources"), { recursive: true });
  await writeFile(cache, JSON.stringify(fichier));
  console.log("     téléchargé et mis en cache");
}
const document = fichier.document;
if (!document) throw new Error("Document absent de la réponse");

const index = new Map();
const parents = new Map();
(function indexer(n, parent) {
  index.set(n.id, n);
  if (parent) parents.set(n.id, parent.id);
  for (const e of n.children ?? []) indexer(e, n);
})(document, null);
console.log(`     ${index.size} nœuds`);

const page = index.get(PAGE);
if (!page) throw new Error(`Page ${PAGE} absente`);

/**
 * Vrai si le nœud est retourné horizontalement, en cumulant les transformations
 * de tous ses ancêtres : le retournement peut être porté par un groupe parent,
 * pas forcément par l'image elle-même.
 */
function estRetourne(id) {
  let inversions = 0;
  for (let n = id; n; n = parents.get(n)) {
    const t = index.get(n)?.relativeTransform;
    if (t && t[0][0] < 0) inversions++;
    if (n === PAGE) break;
  }
  return inversions % 2 === 1 ? true : undefined;
}

const boite = (id) => index.get(id)?.absoluteBoundingBox ?? null;

function relatif(n, origine) {
  const b = n.absoluteBoundingBox;
  if (!b || !origine) return null;
  const r2 = (v) => Math.round(v * 100) / 100;
  return { x: r2(b.x - origine.x), y: r2(b.y - origine.y), largeur: r2(b.width), hauteur: r2(b.height) };
}

const remplissageImage = (n) =>
  (n.fills ?? []).find((f) => f.type === "IMAGE" && f.visible !== false) ?? null;
const estVectoriel = (n) =>
  ["VECTOR", "BOOLEAN_OPERATION", "LINE", "ELLIPSE", "STAR", "REGULAR_POLYGON"].includes(n.type);

function purementVectoriel(n) {
  if (n.visible === false) return false;
  if (n.type === "TEXT" || remplissageImage(n)) return false;
  if (estVectoriel(n)) return true;
  const enfants = (n.children ?? []).filter((e) => e.visible !== false);
  return enfants.length > 0 && enfants.every(purementVectoriel);
}

/**
 * Les vecteurs sont récoltés au niveau du GROUPE MAXIMAL, pas du tracé isolé :
 * le titre « ON TRAVAILLE ENSEMBLE ? » est du texte vectorisé en 141 tracés, et
 * les exporter un par un donnerait 141 fichiers au lieu d'un SVG animable.
 */
function recolter(racineNoeud) {
  const images = [], textes = [], vecteurs = [];
  (function parcourir(n) {
    if (n.visible === false) return;
    if (n.type === "TEXT") return void textes.push(n);
    if (remplissageImage(n)) return void images.push(n);
    if (purementVectoriel(n)) return void vecteurs.push(n);
    for (const e of n.children ?? []) parcourir(e);
  })(racineNoeud);
  return { images, textes, vecteurs };
}

/**
 * Comment Figma compose l'image dans son cadre, traduit en CSS.
 * Pour `imageTransform = [[a,0,tx],[0,d,ty]]` : w = 100/a, h = 100/d,
 * l = -tx*w, t = -ty*h. Vérifié au centième contre le CSS de Figma.
 */
function ajustementDe(n) {
  const f = remplissageImage(n);
  if (!f) return null;
  const commun = {
    imageRef: f.imageRef,
    radius: typeof n.cornerRadius === "number" && n.cornerRadius > 0 ? n.cornerRadius : undefined,
    miroir: estRetourne(n.id),
  };
  if (f.scaleMode === "FIT") return { ...commun, ajustement: "contenir" };
  if (f.scaleMode !== "STRETCH" || !f.imageTransform) return { ...commun, ajustement: "couvrir" };

  const [[a, , tx], [, d, ty]] = f.imageTransform;
  const r2 = (v) => Math.round(v * 100) / 100;
  const w = 100 / a, h = 100 / d;
  const crop = { l: r2(-tx * w), t: r2(-ty * h), w: r2(w), h: r2(h) };
  // Une transformation quasi identitaire ne recadre rien : `couvrir` est plus
  // simple et plus robuste qu'un recadrage à 100,04 %.
  const identitaire =
    Math.abs(crop.w - 100) < 0.5 && Math.abs(crop.h - 100) < 0.5 &&
    Math.abs(crop.l) < 0.5 && Math.abs(crop.t) < 0.5;
  return identitaire ? { ...commun, ajustement: "couvrir" } : { ...commun, ajustement: "recadre", crop };
}

/**
 * Découpe une Légende en titre / année / reste.
 *
 * La maquette écrit le plus souvent « Titre » puis « AAAA - contexte », mais
 * trois projets écrivent « Titre » puis « AAAA » tout court (Pic épeiche, Les
 * paysages vues de la fenêtre du train). Le motif doit accepter les deux, sinon
 * l'année reste collée au titre.
 *
 * La répartition du « reste » entre commanditaire, agence et technique demande
 * un jugement et se fait à la main dans content/projets.ts.
 */
function decouperLegende(texte) {
  const lignes = texte.split("\n").map((l) => l.trim()).filter(Boolean);
  const ligneAnnee = lignes.find((l) => /^\d{4}\s*(-|$)/.test(l));
  const titre = lignes.filter((l) => l !== ligneAnnee).join(" ").trim();
  if (!ligneAnnee) return { titre: texte.trim(), annee: null, reste: null };
  const m = ligneAnnee.match(/^(\d{4})\s*(?:-\s*(.*))?$/);
  return { titre, annee: Number(m[1]), reste: (m[2] ?? "").trim() || null };
}

// ── 2. Projets et chrome ────────────────────────────────────────────────────
const origine = boite(CADRES.portfolio);
if (!origine) throw new Error("Cadre PORTEFOLIO introuvable");

const projets = [];
const idsImages = new Set();

function ajouterProjet(n, orphelin = false) {
  const { images, textes } = recolter(n);
  if (images.length === 0) return;
  const legendeNoeud = textes.find((t) => (t.characters ?? "").trim());
  const d = legendeNoeud ? decouperLegende(legendeNoeud.characters) : null;
  for (const im of images) idsImages.add(im.id);

  projets.push({
    idFigma: n.id,
    nomFigma: n.name,
    orphelin: orphelin || undefined,
    slugPropose: orphelin ? ORPHELINS[n.id] : undefined,
    titre: d?.titre ?? null,
    annee: d?.annee ?? null,
    resteLegende: d?.reste ?? null,
    legendeIncomplete: legendeNoeud ? undefined : true,
    legende: legendeNoeud
      ? {
          ...relatif(legendeNoeud, origine),
          fs: Math.round(legendeNoeud.style?.fontSize ?? 20),
          lh: Math.round(legendeNoeud.style?.lineHeightPx ?? 32),
        }
      : null,
    oeuvres: images.map((im) => ({
      idFigma: im.id,
      nomFigma: im.name,
      ...relatif(im, origine),
      ...ajustementDe(im),
    })),
  });
}

for (const e of index.get(CADRES.portfolio).children ?? []) {
  if (e.visible === false || e.name === "Couleur fond" || e.name === "header") continue;
  ajouterProjet(e);
}
for (const id of Object.keys(ORPHELINS)) {
  const n = index.get(id);
  if (n) ajouterProjet(n, true);
  else console.warn(`     orphelin ${id} (${ORPHELINS[id]}) introuvable`);
}
/* Certaines Légendes ne vivent pas DANS le groupe de leur projet mais dans un
   nœud frère du cadre PORTEFOLIO — c'est le cas de VEJA × MILK. Sans ce
   rattrapage, ces projets passent pour « sans légende », ce qui est faux et
   masquerait de vrais manques.
   Appariement : la Légende revient au projet dont les Œuvres se terminent juste
   au-dessus d'elle, avec recouvrement horizontal. */
{
  const dejaPrises = new Set(projets.map((p) => p.legende && p.idFigma).filter(Boolean));
  const orphelines = [];
  for (const e of index.get(CADRES.portfolio).children ?? []) {
    if (e.visible === false) continue;
    const { images, textes } = recolter(e);
    if (images.length > 0) continue; // c'est un projet, pas une légende isolée
    for (const t of textes) if ((t.characters ?? "").trim()) orphelines.push(t);
  }

  for (const t of orphelines) {
    const b = relatif(t, origine);
    if (!b) continue;
    let meilleur = null;
    let ecart = Infinity;
    for (const p of projets) {
      if (p.legende) continue;
      const bas = Math.max(...p.oeuvres.map((o) => o.y + o.hauteur));
      const gauche = Math.min(...p.oeuvres.map((o) => o.x));
      const droite = Math.max(...p.oeuvres.map((o) => o.x + o.largeur));
      const recouvre = b.x < droite && b.x + b.largeur > gauche;
      const dessous = b.y - bas;
      // La Légende suit toujours ses Œuvres, à moins de 250px de maquette.
      if (!recouvre || dessous < -20 || dessous > 250) continue;
      if (dessous < ecart) { ecart = dessous; meilleur = p; }
    }
    if (!meilleur) continue;
    const d = decouperLegende(t.characters);
    meilleur.titre = d.titre;
    meilleur.annee = d.annee;
    meilleur.resteLegende = d.reste;
    meilleur.legendeIncomplete = undefined;
    meilleur.legende = {
      ...b,
      fs: Math.round(t.style?.fontSize ?? 20),
      lh: Math.round(t.style?.lineHeightPx ?? 32),
    };
    console.log(`     légende rattachée : « ${d.titre.slice(0, 44)} »`);
  }
}

console.log(
  `     ${projets.length} projets, ${idsImages.size} œuvres, ` +
    `${projets.filter((p) => p.legendeIncomplete).length} sans légende`,
);

const chrome = {};
for (const [nom, id] of Object.entries(CADRES)) {
  if (nom === "portfolio") continue;
  const n = index.get(id);
  if (!n) continue;
  const o = boite(id);
  const { images, textes, vecteurs } = recolter(n);
  for (const im of images) idsImages.add(im.id);
  chrome[nom] = {
    images: images.map((im) => ({ idFigma: im.id, nomFigma: im.name, ...relatif(im, o), ...ajustementDe(im) })),
    vecteurs: vecteurs.map((v) => ({ idFigma: v.id, nomFigma: v.name, ...relatif(v, o) })),
    textes: textes
      .filter((t) => (t.characters ?? "").trim())
      .map((t) => ({
        idFigma: t.id,
        texte: t.characters,
        ...relatif(t, o),
        fs: Math.round(t.style?.fontSize ?? 20),
        lh: Math.round(t.style?.lineHeightPx ?? 32),
        graisse: t.style?.fontWeight,
        italique: /italic/i.test(t.style?.fontPostScriptName ?? "") || undefined,
      })),
  };
  console.log(
    `     ${nom.padEnd(10)} ${chrome[nom].images.length} img, ` +
      `${chrome[nom].vecteurs.length} groupes vectoriels, ${chrome[nom].textes.length} textes`,
  );
}

// ── 2. Images sources ───────────────────────────────────────────────────────
const miroirs =
  projets.flatMap((p) => p.oeuvres).filter((o) => o.miroir).length +
  Object.values(chrome).flatMap((c) => c.images).filter((im) => im.miroir).length;
console.log(`     ${miroirs} image(s) retournée(s)`);

console.log("2/4  Table des images sources (1 requête pour tout le fichier)…");
const table = (await api(`/files/${CLE}/images`)).meta?.images ?? {};
console.log(`     ${Object.keys(table).length} images dans le fichier`);

const assainir = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

/** imageRef -> nom de fichier. Une même source peut servir plusieurs cadres. */
const nomParRef = new Map();
for (const p of projets) {
  for (const [i, o] of p.oeuvres.entries()) {
    if (o.imageRef && !nomParRef.has(o.imageRef)) {
      nomParRef.set(o.imageRef, `${assainir(p.nomFigma)}-${i + 1}-${assainir(o.nomFigma)}`);
    }
    o.fichier = nomParRef.get(o.imageRef);
  }
}
for (const [ecran, c] of Object.entries(chrome)) {
  for (const im of c.images) {
    if (im.imageRef && !nomParRef.has(im.imageRef)) {
      nomParRef.set(im.imageRef, `${ecran}-${assainir(im.nomFigma)}`);
    }
    im.fichier = nomParRef.get(im.imageRef);
  }
}

console.log("3/4  Téléchargement des sources…");
const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg" };
const dossierOeuvres = join(racine, "sources/oeuvres");
await mkdir(dossierOeuvres, { recursive: true });
let recus = 0, ignores = 0;
const echecs = [];

for (const [ref, nom] of nomParRef) {
  const url = table[ref];
  if (!url) { echecs.push(`${nom} — imageRef ${ref.slice(0, 10)} absent de la table`); continue; }
  const dejaLa = await Promise.all(
    Object.values(EXT).map((e) => stat(join(dossierOeuvres, `${nom}.${e}`)).then(() => true, () => false)),
  );
  if (dejaLa.some(Boolean)) { ignores++; continue; }
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(DELAI_MS) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const type = (r.headers.get("content-type") ?? "").split(";")[0].trim();
    const octets = Buffer.from(await r.arrayBuffer());
    await writeFile(join(dossierOeuvres, `${nom}.${EXT[type] ?? "png"}`), octets);
    recus++;
    if (recus % 10 === 0) console.log(`     ${recus} reçues…`);
  } catch (e) {
    echecs.push(`${nom} — ${e.message}`);
  }
}
console.log(`     ${recus} reçues, ${ignores} déjà présentes, ${echecs.length} en échec`);

/* Élagage : supprime de sources/oeuvres ce que l'extrait ne référence PLUS.
   Ce script est la seule autorité sur ce dossier — un ménage improvisé depuis
   content/projets.ts a déjà supprimé par erreur les 16 images de chrome, que ce
   fichier ne référence pas. Passer --sans-elagage pour l'éviter. */
if (!process.argv.includes("--sans-elagage")) {
  const attendus = new Set(nomParRef.values());
  const { readdir, unlink } = await import("node:fs/promises");
  const { parse } = await import("node:path");
  let supprimes = 0;
  for (const f of await readdir(dossierOeuvres)) {
    if (attendus.has(parse(f).name)) continue;
    await unlink(join(dossierOeuvres, f));
    supprimes++;
  }
  if (supprimes) console.log(`     ${supprimes} fichier(s) obsolète(s) élagué(s)`);
}

// ── 5. Brouillon, puis SVG ──────────────────────────────────────────────────
await mkdir(join(racine, "content"), { recursive: true });
const chemin = join(racine, "content/figma.extrait.json");
const ecrire = (svg) =>
  writeFile(
    chemin,
    JSON.stringify(
      {
        _lisezmoi:
          "BROUILLON généré par scripts/extraire-figma.mjs. Les slugs, textes " +
          "alternatifs et la répartition commanditaire/agence/technique demandent " +
          "un jugement : ils sont rédigés à la main dans content/projets.ts.",
        extraitLe: new Date().toISOString().slice(0, 10),
        hauteurPortfolio: Math.round(boite(CADRES.portfolio).height),
        projets,
        chrome,
        svg,
        echecsTelechargement: echecs,
      },
      null,
      2,
    ),
  );

// Écrit AVANT de demander les SVG : l'endpoint de rendu est le plus fragile, et
// un échec là ne doit pas faire perdre tout ce qui précède.
await ecrire({});
console.log("     brouillon écrit (tout est sécurisé)");

if (SANS_SVG) {
  console.log("4/4  SVG ignorés (--sans-svg)");
} else {
  const groupes = Object.values(chrome).flatMap((c) => c.vecteurs.map((v) => v.idFigma));
  console.log(`4/4  Rendus SVG (${groupes.length} groupes vectoriels)…`);
  const svg = {};
  const dossierChrome = join(racine, "sources/chrome");
  await mkdir(dossierChrome, { recursive: true });
  for (let i = 0; i < groupes.length; i += LOT_RENDU) {
    const lot = groupes.slice(i, i + LOT_RENDU);
    console.log(`     lot ${1 + i / LOT_RENDU}/${Math.ceil(groupes.length / LOT_RENDU)}…`);
    try {
      const r = await api(`/images/${CLE}?ids=${lot.join(",")}&format=svg`);
      Object.assign(svg, r.images);
    } catch (e) {
      console.error(`     lot abandonné : ${e.message.split("\n")[0]}`);
      continue;
    }
    if (i + LOT_RENDU < groupes.length) await patiente(2000);
  }
  for (const [id, url] of Object.entries(svg)) {
    if (!url) continue;
    const nomFigma =
      Object.values(chrome).flatMap((c) => c.vecteurs).find((v) => v.idFigma === id)?.nomFigma ?? id;
    const nom = `${assainir(nomFigma)}-${id.replace(":", "_")}.svg`;
    try {
      const rr = await fetch(url, { signal: AbortSignal.timeout(DELAI_MS) });
      if (rr.ok) await writeFile(join(dossierChrome, nom), Buffer.from(await rr.arrayBuffer()));
    } catch { /* signalé par l'absence du fichier */ }
  }
  await ecrire(svg);
  console.log(`     ${Object.keys(svg).length} SVG`);
}

console.log(`\ncontent/figma.extrait.json écrit`);
if (echecs.length) {
  console.error("\nÉCHECS de téléchargement :");
  for (const e of echecs) console.error("  " + e);
}
