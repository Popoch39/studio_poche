/**
 * Captures de vérification : chaque route aux largeurs de contrôle, à comparer
 * aux exports Figma. À 1728px l'écart doit être nul au pixel.
 *
 * Lancer avec node : `bun run build && node scripts/capturer.mjs`
 * Suppose un serveur statique sur `out/`. Le script le démarre lui-même.
 *
 *   node scripts/capturer.mjs                  toutes les routes, toutes largeurs
 *   node scripts/capturer.mjs /portfolio 1728  une seule
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(racine, "out");
const CAPTURES = join(racine, ".captures");

/** 1728 = la maquette. 1440 et 1280 = les paliers de contrôle de l'échelle. */
const LARGEURS = [1728, 1440, 1280];
const ROUTES = ["/", "/portfolio", "/contact", "/a-propos"];

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const serveur = createServer(async (req, res) => {
  const chemin = decodeURIComponent(req.url.split("?")[0]);

  /* `output: 'export'` produit `a-propos.html` ET `a-propos/index.html`. Un
     navigateur demande `/a-propos` sans extension : il faut essayer les deux,
     sinon la capture immortalise une page 404 sans que rien ne le signale. */
  const candidats = extname(chemin)
    ? [chemin]
    : [
        chemin.endsWith("/") ? chemin + "index.html" : null,
        chemin === "/" ? null : chemin + ".html",
        chemin === "/" ? null : chemin + "/index.html",
      ].filter(Boolean);

  for (const c of candidats) {
    try {
      const octets = await readFile(join(OUT, c));
      res.writeHead(200, { "content-type": TYPES[extname(c)] ?? "application/octet-stream" });
      res.end(octets);
      return;
    } catch {
      /* candidat suivant */
    }
  }
  res.writeHead(404).end("absent : " + chemin);
});

const port = await new Promise((ok) =>
  serveur.listen(0, "127.0.0.1", () => ok(serveur.address().port)),
);

const routes = process.argv[2] ? [process.argv[2]] : ROUTES;
const largeurs = process.argv[3] ? [Number(process.argv[3])] : LARGEURS;

await mkdir(CAPTURES, { recursive: true });
const navigateur = await chromium.launch();
const erreurs = [];

/** Les écouteurs de problèmes, posés sur chaque page ouverte. */
function ecouter(page, largeur) {
  page.on("console", (m) => {
    // Les 404 sont déjà rapportés par l'écouteur `response`, avec leur URL.
    if (m.type() === "error" && !m.text().includes("Failed to load resource")) {
      erreurs.push(`${largeur}px — console : ${m.text()}`);
    }
  });
  page.on("requestfailed", (r) => {
    /* Next précharge les routes voisines puis annule ces requêtes en quittant la
       page : `net::ERR_ABORTED` est le fonctionnement normal, pas une panne. */
    const raison = r.failure()?.errorText ?? "";
    if (raison.includes("ERR_ABORTED")) return;
    erreurs.push(`${largeur}px — requête échouée (${raison}) : ${new URL(r.url()).pathname}`);
  });
  // Un 404 ne déclenche pas `requestfailed` : la réponse arrive, elle est juste
  // mauvaise. Sans ce écouteur, une image manquante passe inaperçue.
  page.on("response", (r) => {
    if (r.status() >= 400) {
      erreurs.push(`${largeur}px — HTTP ${r.status()} sur ${new URL(r.url()).pathname}`);
    }
  });
  page.on("pageerror", (e) => erreurs.push(`${largeur}px — erreur JS : ${e.message}`));
}

for (const largeur of largeurs) {
  const contexte = await navigateur.newContext({
    viewport: { width: largeur, height: 1000 },
    deviceScaleFactor: 1,
    // Un site sans mode sombre : on fixe la préférence pour que la capture ne
    // dépende pas de l'environnement.
    colorScheme: "light",
    /* Mouvement réduit : les animations se résolvent immédiatement à leur état
       de repos, qui est EXACTEMENT la maquette. C'est donc le mode dans lequel
       vérifier la fidélité — et cela teste la branche `prefers-reduced-motion`
       par la même occasion. */
    reducedMotion: "reduce",
  });
  const page = await contexte.newPage();
  ecouter(page, largeur);

  for (const route of routes) {
    /* La Page d'attente REDIRIGE vers /portfolio — après 800 ms en mouvement
       réduit (LECTURE_MS de useEntreeAttente). Sans précaution, la capture de
       « / » est une COURSE contre cette minuterie : elle immortalisait tantôt
       l'attente, tantôt le portfolio, et le comparateur voyait des écarts
       fantômes. On lui dédie une page à l'horloge gelée : les minuteries ne
       tirent jamais, l'état capturé est le repos de l'attente. La page est
       dédiée parce que `clock.install()` ne se désinstalle pas. */
    const gelee = route === "/";
    const cible = gelee ? await contexte.newPage() : page;
    if (gelee) {
      ecouter(cible, largeur);
      await cible.clock.install();
    }

    await cible.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "networkidle" });
    await cible.evaluate(() => document.fonts.ready);

    if (gelee) {
      // Un seul écran, images prioritaires : pas de chargement paresseux à
      // provoquer — et le parcours par rAF ne tournerait pas, horloge gelée.
      await cible.evaluate(() =>
        Promise.all(
          [...document.images].map((i) =>
            i.complete ? null : new Promise((ok) => { i.onload = i.onerror = ok; }),
          ),
        ),
      );
    } else {
      /* Une capture pleine page ne déclenche PAS le chargement paresseux : sans
         ce parcours, 46 des 58 Œuvres du portfolio sortaient blanches et la
         capture n'aurait rien prouvé. On descend par écrans, puis on attend que
         chaque image soit réellement décodée. */
      await cible.evaluate(async () => {
        const pas = window.innerHeight;
        for (let y = 0; y < document.documentElement.scrollHeight; y += pas) {
          window.scrollTo(0, y);
          await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
        }
        window.scrollTo(0, 0);
        await Promise.all(
          [...document.images].map((i) =>
            i.complete ? null : new Promise((ok) => { i.onload = i.onerror = ok; }),
          ),
        );
      });
    }

    /* `complete` garantit le CHARGEMENT, pas le DÉCODAGE : avec
       `decoding: async`, une image chargée mais pas encore décodée sort
       BLANCHE de la capture pleine page — jusqu'à six Œuvres manquaient selon
       le timing du parcours. `decode()` garantit les pixels avant la capture. */
    await cible.evaluate(() =>
      Promise.all([...document.images].map((i) => i.decode().catch(() => {}))),
    );

    // Une police non appliquée ne se voit pas sur une capture : on l'assure.
    const police = await cible.evaluate(() => {
      const cible = document.querySelector(".maquette-texte") ?? document.body;
      return getComputedStyle(cible).fontFamily;
    });
    if (!police.includes("Source Code Pro")) {
      erreurs.push(`${route} à ${largeur}px : police attendue Source Code Pro, obtenue « ${police.slice(0, 60)}… »`);
    }

    const nonChargees = await cible.evaluate(
      () => [...document.images].filter((i) => i.naturalWidth === 0).map((i) => i.currentSrc.split("/").pop()),
    );
    if (nonChargees.length) {
      erreurs.push(`${route} à ${largeur}px : ${nonChargees.length} image(s) non chargée(s) — ${nonChargees.slice(0, 3).join(", ")}`);
    }
    const nom = (route === "/" ? "attente" : route.slice(1)) + `-${largeur}.png`;
    await cible.screenshot({ path: join(CAPTURES, nom), fullPage: true });
    const { l, h } = await cible.evaluate(() => ({
      l: document.documentElement.scrollWidth,
      h: document.documentElement.scrollHeight,
    }));
    const debordement = l > largeur ? `  ⚠ DÉBORDEMENT HORIZONTAL (${l} > ${largeur})` : "";
    console.log(`  ${nom.padEnd(28)} document ${l}x${h}${debordement}`);
    if (debordement) erreurs.push(`${route} à ${largeur}px : débordement horizontal ${l}px`);

    if (gelee) await cible.close();
  }
  await contexte.close();
}

await navigateur.close();
serveur.close();

if (erreurs.length) {
  console.error(`\n${erreurs.length} problème(s) :`);
  for (const e of erreurs) console.error("  " + e);
  process.exit(1);
}
console.log(`\nCaptures dans .captures/ — aucun problème détecté`);
