/**
 * Vérifie que les gestes de SURVOL du Collage sont réellement animés — qu'ils
 * ont des images intermédiaires, et pas seulement un début et une fin.
 *
 * Pourquoi ce script existe. Un tween GSAP qui échoue à interpoler ne lève
 * aucune erreur : il pose simplement sa valeur d'arrivée à la fin de sa durée.
 * À l'écran, ça se lit « un bout, puis la totalité, sans animation », et aucun
 * test de rendu ne l'attrape — l'état de repos ET l'état final sont justes, il
 * n'y a rien entre les deux. C'est exactement ce qui est arrivé au déroulement
 * de la Banderole : un `toFixed(2)` écrivait les composantes variables du
 * clip-path « 0.00% », forme dans laquelle GSAP ne reconnaît pas un nombre qui
 * bouge (voir components/oeuvre/Banderole.tsx).
 *
 * Les captures ne peuvent pas couvrir ça : elles tournent en mouvement réduit,
 * où aucun survol ne joue.
 *
 *   bun run build && node scripts/verifier-survol.mjs
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(racine, "out");
const TYPES = { ".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",
  ".svg":"image/svg+xml",".avif":"image/avif",".webp":"image/webp",".png":"image/png",
  ".jpg":"image/jpeg",".woff2":"font/woff2",".ico":"image/x-icon",".txt":"text/plain" };
const srv = createServer(async (rq, rs) => {
  const c = decodeURIComponent(rq.url.split("?")[0]);
  for (const p of [c, c + ".html", join(c, "index.html")]) {
    try {
      const b = await readFile(join(OUT, p));
      rs.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" });
      return rs.end(b);
    } catch {}
  }
  rs.writeHead(404).end("404");
});
const port = await new Promise((r) => srv.listen(0, "127.0.0.1", () => r(srv.address().port)));

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1728, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push("JS: " + e.message));
page.on("console", (m) => { if (m.type() === "error") erreurs.push("console: " + m.text()); });
await page.goto(`http://127.0.0.1:${port}/portfolio`, { waitUntil: "networkidle" });
if (process.env.SANS_MASQUE) {
  await page.addStyleTag({ content: "[data-revelation]{-webkit-mask-image:none !important;mask-image:none !important}" });
  console.log("(masque d'encre neutralisé)");
}
await page.waitForTimeout(2600); // l'arrivée se termine

const ART = "article[data-slug='logo-anne-maraichere']";

/** Amène un article dans le champ par de vrais gestes de molette (ScrollSmoother). */
async function amener(sel, hautVoulu) {
  await page.mouse.move(864, 500);
  for (let i = 0; i < 200; i++) {
    const y = await page.$eval(sel, (a) => a.getBoundingClientRect().y);
    if (Math.abs(y - hautVoulu) < 40) break;
    await page.mouse.wheel(0, y > hautVoulu ? 90 : -90);
    await page.waitForTimeout(22);
  }
  await page.waitForTimeout(1400); // le front d'encre du Projet a fini de passer
  // Le curseur QUITTE la scène : sans ça il reste posé là où le défilement l'a
  // laissé, le geste a déjà joué, et on échantillonne un état de fin en croyant
  // mesurer une animation.
  await page.mouse.move(4, 4);
  await page.waitForTimeout(900);
}

/** Échantillonne des propriétés calculées pendant `ms`, à chaque image. */
async function echantillonner(sel, props, ms) {
  return page.evaluate(
    ([sel, props, ms]) =>
      new Promise((fin) => {
        const el = document.querySelector(sel);
        if (!el) return fin(null);
        const t0 = performance.now();
        const vues = [];
        const tick = () => {
          const cs = getComputedStyle(el);
          vues.push({ ms: Math.round(performance.now() - t0),
                      ...Object.fromEntries(props.map((p) => [p, cs[p]])) });
          if (performance.now() - t0 > ms) return fin(vues);
          requestAnimationFrame(tick);
        };
        tick();
      }),
    [sel, props, ms],
  );
}

const rapport = [];

/* ── 1. la Banderole : déroulement au survol de son ancre ────────────────── */
await amener(ART, 300);
const ancre = await page.$(`${ART} [data-survol-propre]`);
const boite = await ancre.boundingBox();
/* Ce qu'on surveille : `--deroule`, la progression que GSAP écrit en inline,
   ET `mask-position`, sa conséquence visible. Les deux, parce qu'une variable
   qui bouge sans que le masque ne suive (une faute de calc, une couche
   oubliée) ne se verrait pas plus qu'un tween qui n'interpole pas. */
const suivi = page.evaluate((sel) => new Promise((fin) => {
  const el = document.querySelector(sel);
  const t0 = performance.now(); const vues = [];
  const tick = () => {
    const cs = getComputedStyle(el);
    vues.push({ ms: Math.round(performance.now() - t0),
                inline: el.style.getPropertyValue("--deroule"),
                calcule: cs.maskPosition || cs.webkitMaskPosition,
                opacity: el.style.opacity });
    if (performance.now() - t0 > 1500) return fin(vues);
    requestAnimationFrame(tick);
  };
  tick();
}), `${ART} [data-banderole]`);
await page.waitForTimeout(60);
await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
const vues = await suivi;

const distincts = (l, cle) => [...new Set(l.map((v) => v[cle]))];
rapport.push({
  geste: "banderole/front-d-encre",
  images: vues.length,
  inlineDistincts: distincts(vues, "inline").length,
  calculeDistincts: distincts(vues, "calcule").length,
  opaciteDistincts: distincts(vues, "opacity").length,
});
console.log("— suite des valeurs INLINE écrites par GSAP (une ligne par changement) —");
let prec = null;
for (const v of vues) {
  if (v.inline === prec) continue; prec = v.inline;
  console.log(`  ${String(v.ms).padStart(4)}ms  op=${(v.opacity || "-").padEnd(20)} ${v.inline || "(vide)"}`);
}

/* ── 2. une Œuvre ordinaire : le soulèvement ─────────────────────────────── */
const PIECE = "article[data-slug='toits-de-paris-2026']";
await amener(PIECE, 300);
const p = await page.$(`${PIECE} [data-revelation]`);
const bp = await p.boundingBox();
const suivi2 = echantillonner(`${PIECE} [data-revelation]`, ["transform", "boxShadow"], 900);
await page.waitForTimeout(60);
await page.mouse.move(bp.x + bp.width / 2, bp.y + bp.height / 2);
const vues2 = await suivi2;
const trs = distincts(vues2, "transform");
rapport.push({
  geste: "oeuvre/soulever",
  images: vues2.length,
  valeursDistinctes: trs.length,
  depart: vues2[0]?.transform,
  suite: trs.slice(0, 4),
});

for (const r of rapport) console.log(JSON.stringify(r));
console.log(erreurs.length ? "ERREURS:\n" + erreurs.join("\n") : "aucune erreur console/JS");

/* Le masque calculé compte autant que la variable inline : une progression qui
   bouge sans déplacer la bande n'anime rien à l'écran. */
const casse = rapport.filter(
  (r) =>
    (r.inlineDistincts ?? r.valeursDistinctes) < 5 ||
    (r.calculeDistincts !== undefined && r.calculeDistincts < 5),
);
console.log(
  casse.length
    ? `\nROUGE — sans animation : ${casse.map((c) => c.geste).join(", ")}`
    : "\nVERT — les deux gestes ont des images intermédiaires",
);
await nav.close();
srv.close();
process.exit(casse.length ? 1 : 0);
