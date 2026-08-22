"use client";

import { gsap, ENCRE } from "./gsap";

/**
 * Le protocole d'arrivée du Collage. Deux acteurs sans lien de parenté ont
 * besoin de se parler, et un troisième doit pouvoir presser tout le monde :
 *
 *   — useRevelationEncre fait passer le front sur un Projet ;
 *   — useLegendesEcrites doit attendre ce passage pour écrire la Légende ;
 *   — useEntreePortfolio, au premier geste de défilement, hâte l'arrivée.
 *
 * État de module, pas contexte React — exactement pour la même raison que
 * voile.ts : il n'y a qu'un Collage par document, et ces hooks vivent dans des
 * conteneurs imbriqués sans rien à se transmettre par les props. Chaque
 * animation reste chez elle ; seul ce protocole les relie.
 */

/* ─── L'encre est passée sur un Projet ────────────────────────────────────── */

/**
 * Une attente par <article>. Les clés sont les éléments eux-mêmes : au
 * changement de route les articles sont remplacés, et une WeakMap laisse
 * partir les anciens sans qu'on ait à faire le ménage.
 */
const passages = new WeakMap<HTMLElement, { promesse: Promise<void>; finir: () => void }>();

function passage(article: HTMLElement) {
  let p = passages.get(article);
  if (!p) {
    let finir = () => {};
    const promesse = new Promise<void>((f) => (finir = f));
    p = { promesse, finir };
    passages.set(article, p);
  }
  return p;
}

/** Résout quand le front a fini de traverser ce Projet. */
export function attendreEncre(article: HTMLElement): Promise<void> {
  return passage(article).promesse;
}

/** Appelé par useRevelationEncre à la fin du front. */
export function signalerEncre(article: HTMLElement): void {
  passage(article).finir();
}

/* ─── La hâte du visiteur ─────────────────────────────────────────────────── */

/**
 * Les timelines d'arrivée en cours. Un Set et non un tableau : une timeline
 * qui se termine se retire elle-même, et rien ne s'accumule sur 16 404 px de
 * défilement.
 */
const arrivees = new Set<gsap.core.Timeline>();
let hate = 1;

/**
 * Enregistre une timeline d'arrivée. Elle adopte la hâte en cours — un Projet
 * dont le front démarre APRÈS le premier geste de défilement ne doit pas
 * repartir au ralenti.
 */
export function enregistrerArrivee(tl: gsap.core.Timeline): void {
  arrivees.add(tl);
  if (hate !== 1) tl.timeScale(hate);
  tl.eventCallback("onComplete", () => arrivees.delete(tl));
}

/**
 * Le visiteur a défilé : on POUSSE les gestes en cours au lieu de les couper.
 * La montée du timeScale est elle-même adoucie — un saut sec se verrait autant
 * qu'une coupure.
 */
export function haterArrivee(): void {
  if (hate !== 1) return;
  hate = ENCRE.hate;
  for (const tl of arrivees) gsap.to(tl, { timeScale: hate, duration: 0.3, ease: "power2.out" });
}

/** Remet le protocole à zéro. Appelé au démontage du Collage. */
export function reinitialiserArrivee(): void {
  arrivees.clear();
  hate = 1;
}
