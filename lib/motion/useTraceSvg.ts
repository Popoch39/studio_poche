"use client";

import { useRef } from "react";
import { gsap, useGSAP, ENCRE, CONDITIONS } from "./gsap";

/**
 * Le chrome dessiné à la main se trace, comme sous un feutre.
 *
 * S'applique aux tracés d'un SVG inline (les 4 cadres de cartes de services, le
 * contour du formulaire, la bulle de la cigogne, l'ovale de nav, le logo).
 * Un `<img src="…svg">` ne convient PAS : DrawSVG a besoin d'accéder aux nœuds
 * `path`, ce qu'un SVG chargé en image interdit.
 */
export function useTraceSvg<T extends HTMLElement = HTMLDivElement>({
  declencheur = "top 80%",
  duree = ENCRE.duree.trace,
}: { declencheur?: string; duree?: number } = {}) {
  // Générique : le hook doit pouvoir s'attacher à un <ul>, un <section>…
  const conteneur = useRef<T>(null);

  useGSAP(
    () => {
      // `gsap.utils.toArray` n'est PAS limité par le `scope` de `useGSAP` :
      // seules les chaînes passées directement aux méthodes GSAP le sont. Sans
      // ce second argument, le hook animerait les éléments de toute la page.
      const traces = gsap.utils.toArray<SVGPathElement>(
        "path, line, polyline, circle, ellipse, rect",
        conteneur.current,
      );
      if (traces.length === 0) return;

      const mm = gsap.matchMedia();

      mm.add(CONDITIONS.mouvement, () => {
        gsap.from(traces, {
          drawSVG: "0%",
          duration: duree,
          ease: ENCRE.ease,
          stagger: ENCRE.decalage,
          scrollTrigger: {
            trigger: conteneur.current,
            start: declencheur,
            once: true,
          },
        });
      });

      // Mouvement réduit : le trait est simplement là. `gsap.set` et non un
      // `from` de durée nulle, pour qu'aucune image intermédiaire ne s'affiche.
      mm.add(CONDITIONS.reduit, () => {
        gsap.set(traces, { drawSVG: "100%" });
      });

      return () => mm.revert();
    },
    { scope: conteneur },
  );

  return conteneur;
}
