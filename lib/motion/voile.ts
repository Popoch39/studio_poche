"use client";

import { gsap, ENCRE, mouvementReduit } from "./gsap";

/**
 * L'état du Voile d'encre — un rideau plein écran qui couvre au départ d'une
 * navigation et découvre à l'arrivée, du même geste que les balayages de
 * révélation : l'encre passe sur la page, du haut vers le bas.
 *
 * État de module, pas contexte React : il n'existe qu'un voile par document,
 * et trois acteurs sans lien de parenté s'y adressent — LienVoile (couvrir),
 * VoileEncre (peindre et découvrir au changement de route), et les entrées de
 * page (attendre la découverte avant de jouer).
 */

/** Replié en haut : rien n'est couvert. L'état de repos. */
const REPLIE = "inset(0% 0% 100% 0%)";
/** Déployé : tout l'écran est couvert. */
const DEPLOYE = "inset(0% 0% 0% 0%)";
/** Échappé par le bas : la découverte prolonge le geste de la couverture. */
const ECHAPPE = "inset(100% 0% 0% 0%)";

let voile: HTMLElement | null = null;
let couvert = false;
let attentes: (() => void)[] = [];

function liberer(): void {
  const resolveurs = attentes;
  attentes = [];
  for (const r of resolveurs) r();
}

/** Enregistré par VoileEncre au montage ; null au démontage. */
export function enregistrer(el: HTMLElement | null): void {
  voile = el;
  if (!el) {
    // Sans voile, personne ne découvrira : ne jamais laisser une attente pendre.
    couvert = false;
    liberer();
  }
}

/**
 * Couvre l'écran, résout une fois couvert. Résout immédiatement si le voile
 * n'est pas monté ou si le visiteur demande moins de mouvement : la
 * navigation part alors sans rideau.
 */
export function couvrir(): Promise<void> {
  if (!voile || couvert || mouvementReduit()) return Promise.resolve();
  couvert = true;
  const el = voile;
  return new Promise((fin) => {
    gsap.fromTo(
      el,
      { clipPath: REPLIE },
      {
        clipPath: DEPLOYE,
        duration: ENCRE.duree.page,
        ease: ENCRE.ease,
        overwrite: "auto",
        onComplete: fin,
      },
    );
  });
}

/** Découvre l'écran s'il est couvert. Appelé par VoileEncre à l'arrivée. */
export function decouvrir(): void {
  if (!voile || !couvert) return;
  const el = voile;
  if (mouvementReduit()) {
    gsap.set(el, { clipPath: REPLIE });
    couvert = false;
    liberer();
    return;
  }
  gsap.to(el, {
    clipPath: ECHAPPE,
    duration: ENCRE.duree.page,
    ease: ENCRE.ease,
    overwrite: "auto",
    onComplete: () => {
      gsap.set(el, { clipPath: REPLIE });
      couvert = false;
      liberer();
    },
  });
}

/** Résout à la fin de la découverte — immédiatement si rien ne couvre. */
export function attendreDecouverte(): Promise<void> {
  if (!couvert) return Promise.resolve();
  return new Promise((fin) => attentes.push(fin));
}
