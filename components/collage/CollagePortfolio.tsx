"use client";

import type { Projet } from "@/content/types";
import { CollageDesktop } from "./CollageDesktop";
import { useRevelationEncre } from "@/lib/motion/useRevelationEncre";
import { useLegendesEcrites } from "@/lib/motion/useLegendesEcrites";
import { useEntreePortfolio } from "@/lib/motion/useEntreePortfolio";
import { useFremissementVelocite } from "@/lib/motion/useFremissementVelocite";
import { useDeroulementBanderole } from "@/lib/motion/useDeroulementBanderole";
import { usePlanchePosee } from "@/lib/motion/usePlanchePosee";

/**
 * Le Collage animé.
 *
 * Chaque hook GSAP garde son propre conteneur : son `scope` limite ses
 * sélecteurs, et `gsap.utils.toArray` n'est limité que par le conteneur qu'on
 * lui passe. Les imbriquer garde chaque animation chez elle.
 *
 * L'ancienne parallaxe (`useParallaxeCollage`) a été retirée : avec de vraies
 * boîtes d'article elle aurait déplacé l'état de repos à mi-course de scrub.
 * La profondeur au scroll est portée par ScrollSmoother et les `data-speed`
 * des articles — voir ScrollLisse.
 *
 * `usePlanchePosee` est la seule exception au partage : elle anime `scale` sur
 * l'enveloppe des Œuvres de trois Projets scénographiés, qui n'ont alors ni
 * front d'encre ni `data-speed` (docs/adr/0005). Aucun chevauchement de
 * propriétaire : le frémissement tient son `skewY` sur le conteneur le plus
 * externe, l'entrée son `scale` sur la feuille entière, la pose le sien sur une
 * planche.
 */
export function CollagePortfolio({
  projets,
  hauteur,
}: {
  projets: Projet[];
  hauteur: number;
}) {
  const fremissement = useFremissementVelocite();
  const entree = useEntreePortfolio();
  const revelation = useRevelationEncre();
  const legendes = useLegendesEcrites();
  const deroulement = useDeroulementBanderole();
  const planches = usePlanchePosee();

  return (
    <div ref={fremissement}>
      <div ref={entree}>
        <div ref={legendes}>
          <div ref={revelation}>
            <div ref={deroulement}>
              <div ref={planches}>
                <CollageDesktop projets={projets} hauteur={hauteur} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
