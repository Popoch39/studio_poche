"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, CONDITIONS } from "./gsap";

/**
 * Le frémissement : au défilement rapide, la feuille du Collage gîte à peine
 * (micro-skew proportionnel à la vélocité) puis revient élastiquement au repos
 * — des papiers posés qu'un courant d'air effleure.
 *
 * Appliqué au CONTENEUR global du Collage, jamais aux Œuvres une à une : c'est
 * la feuille qui bouge, pas les dessins de Marie. Ce conteneur possède son
 * transform à lui seul — l'entrée anime les pièces, les effects les articles,
 * la révélation les clip-path : aucun chevauchement de propriétaire.
 *
 * L'amplitude est infime : le Collage frémit, il ne tangue pas.
 */
const AMPLITUDE = 0.4; // degrés
const DIVISEUR = -4000; // vélocité (px/s) → degrés

export function useFremissementVelocite<T extends HTMLElement = HTMLDivElement>() {
  const conteneur = useRef<T>(null);

  useGSAP(
    () => {
      const feuille = conteneur.current;
      if (!feuille) return;

      const mm = gsap.matchMedia();

      mm.add(`${CONDITIONS.mouvement} and ${CONDITIONS.collage}`, () => {
        const borner = gsap.utils.clamp(-AMPLITUDE, AMPLITUDE);
        const etat = { skew: 0 };
        const poserSkew = gsap.quickSetter(feuille, "skewY", "deg");

        const declencheur = ScrollTrigger.create({
          onUpdate: (self) => {
            const skew = borner(self.getVelocity() / DIVISEUR);
            // Une rafale plus forte reprend la main ; sinon on laisse le
            // retour élastique en cours finir son geste.
            if (Math.abs(skew) > Math.abs(etat.skew)) {
              etat.skew = skew;
              poserSkew(skew);
              gsap.to(etat, {
                skew: 0,
                duration: 0.9,
                ease: "elastic.out(1, 0.4)",
                overwrite: true,
                onUpdate: () => poserSkew(etat.skew),
              });
            }
          },
        });

        return () => {
          declencheur.kill();
          gsap.set(feuille, { skewY: 0 });
        };
      });

      return () => mm.revert();
    },
    { scope: conteneur },
  );

  return conteneur;
}
