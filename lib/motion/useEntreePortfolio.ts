"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, ENCRE, CONDITIONS } from "./gsap";
import { attendreDecouverte } from "./voile";
import { enregistrerArrivee, haterArrivee, reinitialiserArrivee } from "./arrivee";

/**
 * Le calage de la feuille : à l'arrivée sur le Collage, toute la planche est
 * posée un rien en avant et se cale à sa taille exacte, pendant que les fronts
 * d'encre du premier écran s'écoulent à l'intérieur. On recule d'un pas pour
 * voir la table de travail, puis on pose.
 *
 * Pourquoi la feuille ENTIÈRE et non les pièces. L'entrée précédente faisait
 * dériver chaque Œuvre séparément (36 px, 0,8°) : sur une planche jointive —
 * VEJA × MILK, cinq découpes bord à bord — les joints s'ouvraient et se
 * refermaient pendant tout le geste, ce qui ne se lit pas comme une pose mais
 * comme un défaut d'alignement. Une échelle sur le conteneur est le seul
 * mouvement qui ne PEUT PAS découdre une planche : elle est solidaire par
 * construction.
 *
 * Le recul est posé dans l'effet de layout, AVANT la première peinture : pas
 * d'éclair de l'état de repos. Rejoué à chaque arrivée — la page se remonte à
 * chaque navigation, comme la Page d'attente se rejoue. Attend la découverte
 * du Voile d'encre.
 *
 * Ce hook possède aussi la HÂTE : le premier geste de défilement pousse toutes
 * les arrivées en cours au lieu de les couper (voir arrivee.ts). Le visiteur
 * pressé reprend la main tout de suite, mais il aura vu le geste.
 *
 * `transform` sur ce conteneur lui appartient en propre : le frémissement tient
 * son `skewY` sur le conteneur PARENT, la révélation ne touche que des masques,
 * les `data-speed` vivent sur les articles. Aucun chevauchement de propriétaire.
 */
export function useEntreePortfolio<T extends HTMLElement = HTMLDivElement>() {
  const conteneur = useRef<T>(null);

  useGSAP(
    (_, contextSafe) => {
      if (!contextSafe) return;
      const feuille = conteneur.current;
      if (!feuille) return;

      const mm = gsap.matchMedia();

      mm.add(`${CONDITIONS.mouvement} and ${CONDITIONS.collage}`, () => {
        // Depuis le haut : c'est le bord que le visiteur regarde, et le seul
        // par lequel un recul ne fait pas glisser le premier écran hors champ.
        gsap.set(feuille, { scale: ENCRE.recul, transformOrigin: "50% 0%" });

        const caler = contextSafe(() => {
          const tl = gsap.timeline();
          tl.to(feuille, { scale: 1, duration: ENCRE.duree.calage, ease: ENCRE.ease })
            // Le repos est exactement la maquette : pas de `transform: scale(1)`
            // résiduel, qui laisserait un contexte d'empilement derrière lui.
            .call(() => {
              gsap.set(feuille, { clearProps: "transform,transformOrigin" });
              /* ET ON REMESURE TOUT. Le recul est posé dans l'effet de layout,
                 donc AVANT la première peinture — or c'est là que ScrollTrigger
                 calcule ses `start` / `end`, en prenant le rect de chaque
                 déclencheur. Un rect traverse le `scale(1.04)` : un article à
                 2800 px du haut de la feuille est mesuré 4 % trop loin, soit
                 112 px, et son geste se déclenche d'autant trop tôt pour le
                 reste de la visite. Personne n'a encore défilé quand ce calage
                 se termine : la remesure ne coûte rien et ne se voit pas. */
              ScrollTrigger.refresh();
            });
          enregistrerArrivee(tl);
        });

        const hater = contextSafe(() => haterArrivee());
        window.addEventListener("wheel", hater, { passive: true, once: true });
        window.addEventListener("touchmove", hater, { passive: true, once: true });

        void attendreDecouverte().then(caler);

        return () => {
          window.removeEventListener("wheel", hater);
          window.removeEventListener("touchmove", hater);
          gsap.set(feuille, { clearProps: "transform,transformOrigin" });
          reinitialiserArrivee();
        };
      });

      return () => mm.revert();
    },
    { scope: conteneur },
  );

  return conteneur;
}
