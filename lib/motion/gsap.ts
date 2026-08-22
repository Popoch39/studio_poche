"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { SEUIL_MOBILE } from "@/lib/echelle";

/**
 * Enregistrement unique des plugins. Tous sont inclus dans le paquet public
 * depuis GSAP 3.13 — aucun n'exige de licence Club.
 *
 * `useGSAP` est enregistré comme plugin pour que GSAP connaisse le contexte
 * React et nettoie ses animations au démontage.
 */
gsap.registerPlugin(
  useGSAP,
  ScrollTrigger,
  ScrollSmoother,
  DrawSVGPlugin,
  SplitText,
  CustomEase,
);

/**
 * Le vocabulaire de mouvement du parti pris « l'encre qui se dépose ».
 * Un seul endroit pour ces valeurs : c'est ce qui fait qu'un site paraît d'une
 * seule main plutôt que d'une accumulation d'effets.
 */
export const ENCRE = {
  /** Le trait qui se pose : démarre franc, s'arrête net, comme un feutre. */
  ease: CustomEase.create("encre", "M0,0 C0.17,0.55 0.2,1 1,1"),
  /**
   * Le coup de pinceau : une CHARGE d'attaque — l'encre afflue au point de
   * pose — puis une course quasi régulière jusqu'à l'autre bord. C'est ce qui
   * sépare un coup de pinceau d'un balayage : un balayage n'a pas de début.
   */
  trait: CustomEase.create("trait", "M0,0 C0.012,0.1 0.05,0.14 0.16,0.24 C0.45,0.5 0.72,0.84 1,1"),
  /** La dérive lente d'un plan de collage. */
  easeDerive: "none",
  /**
   * L'allure de la main, en px de maquette par seconde. La durée d'un front
   * n'est pas réglée : elle se DÉDUIT de la course du Projet (voir lib/encre).
   * Une grande planche prend donc plus de temps qu'une vignette — parce que la
   * main y a plus de chemin à faire, pas parce qu'on l'a décidé.
   */
  vitesse: 1600,
  /**
   * Bornes de cette durée. Sans elles on subirait la maquette : la plus large
   * planche traînerait pendant que le visiteur défile déjà, et une vignette
   * clignoterait.
   */
  bornes: { min: 0.55, max: 1.6 },
  duree: {
    /** Un tracé de chrome dessiné à la main. */
    trace: 1.1,
    /** Le balayage qui révèle une Œuvre. */
    revele: 0.85,
    /** Une Légende qui s'écrit. */
    ecrit: 0.6,
    /** Une transition entre routes. */
    page: 0.5,
    /** Le calage de la feuille à l'arrivée sur le Collage. */
    calage: 1.25,
  },
  /** Décalage entre éléments d'un même groupe. */
  decalage: 0.08,
  /**
   * Le facteur d'accélération d'une arrivée que le visiteur presse. Il pousse
   * le geste au lieu de l'annuler : celui qui défile aussitôt reprend la main
   * tout de suite, mais il aura quand même VU un coup de pinceau.
   */
  hate: 3,
  /** L'échelle d'où la feuille se cale : on recule d'un rien, puis on pose. */
  recul: 1.04,
  /**
   * La POSE d'une planche scénographiée — la planche monte PLEIN CADRE, tient
   * au centre de l'écran, puis va s'ancrer sur sa boîte de maquette
   * (docs/adr/0005).
   *
   * Les longueurs sont en HAUTEURS D'ÉCRAN, pas en secondes : le geste est
   * scrubé, il n'a pas de durée propre.
   *
   * La MONTÉE ne se règle pas : elle se déduit. La planche est mise à l'échelle
   * pour faire exactement 100dvh de haut, donc l'amener de « entièrement sous la
   * ligne de flottaison » à « centrée à l'écran » demande exactement UN écran de
   * défilement. La régler serait la faire commencer visible.
   */
  planche: {
    /**
     * Le MAINTIEN, en hauteurs d'écran : la planche est plein cadre, épinglée
     * au centre de l'écran, et TOUT est immobile. C'est le cadran de l'arrêt.
     *
     * ATTENTION, la course totale est COUPLÉE à `SOUFFLE_AVANT`
     * (components/collage/CollageDesktop.tsx) : plus le geste est long, plus sa
     * plage s'ouvre tôt, et plus il faut de papier vide au-dessus de la planche
     * pour que la plage entière tienne dans le document.
     */
    maintien: 0.3,
    /**
     * La POSE, en hauteurs d'écran : la planche rétrécit et glisse jusqu'à son
     * ancre. C'est le seul temps où quelque chose bouge autrement qu'à la
     * vitesse de la page.
     */
    pose: 0.45,
    /**
     * La zone d'ATTRACTION du plein écran, en hauteurs d'écran : la portion
     * finale de la montée où un arrêt du défilement est aimanté jusqu'à
     * l'arrivée exacte. Le plein écran n'est pas une position parmi d'autres,
     * c'est le moment du geste : on ne veut pas qu'il se traverse à moitié.
     *
     * La montée valant un écran, `0.35` veut dire « le dernier tiers ».
     * L'aimantation ne joue que par le BAS : au-delà, c'est le défilement qui
     * vient ancrer la planche, et rien ne doit le ramener en arrière.
     */
    attraction: 0.35,
    /**
     * Le seuil où la planche est jugée posée, et où sa Légende reçoit le départ
     * — exprimé en part de la POSE accomplie, pas de la course totale : c'est la
     * seule grandeur que le hook mesure, et la seule qui garde le même sens
     * quelles que soient les bornes du déclencheur.
     */
    posee: 0.7,
  },
} as const;

/**
 * Les conditions partagées. `gsap.matchMedia()` est indispensable : la règle CSS
 * `prefers-reduced-motion` d'app/globals.css neutralise les animations CSS mais
 * n'a aucun effet sur GSAP, qui écrit des styles en ligne depuis JavaScript.
 * Sans cette bascule, un visiteur ayant demandé moins d'animation les subirait
 * toutes.
 */
export const CONDITIONS = {
  /** Le visiteur accepte le mouvement. */
  mouvement: "(prefers-reduced-motion: no-preference)",
  /** Le visiteur demande moins de mouvement : on saute à l'état de repos. */
  reduit: "(prefers-reduced-motion: reduce)",
  /** Le Collage est affiché (au-dessus du seuil). Voir docs/adr/0001. */
  collage: `(min-width: ${SEUIL_MOBILE}px)`,
  /** Un pointeur précis (souris, pavé tactile) : jamais vrai au doigt. */
  pointeurFin: "(pointer: fine)",
} as const;

/** Vrai si le visiteur a demandé moins d'animation. Utilisable hors matchMedia. */
export function mouvementReduit() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(CONDITIONS.reduit).matches
  );
}

export { gsap, useGSAP, ScrollTrigger, ScrollSmoother, DrawSVGPlugin, SplitText };
