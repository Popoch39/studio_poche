import type { Projet } from "@/content/types";
import { BlocProjet } from "./BlocProjet";

/**
 * Le Collage : la disposition libre des Projets dans le référentiel 1728px.
 *
 * La hauteur est déclarée explicitement plutôt que déduite du contenu. Les
 * enfants sont tous en position absolue, donc le conteneur n'aurait aucune
 * hauteur propre — et ScrollTrigger mesurerait un document de hauteur nulle.
 *
 * `PREMIERS_CHARGES` : nombre de projets chargés sans attendre. Au-delà, le
 * chargement paresseux prend le relais.
 */
export const PREMIERS_CHARGES = 2;

/**
 * Le papier vide inséré AVANT un Projet scénographié, en px de maquette.
 *
 * Le geste réclame toute sa course de défilement EN AMONT de l'ancre : la
 * montée — exactement un écran, la planche faisant 100dvh de haut — puis le
 * maintien et la pose, soit 1,75 hauteur d'écran en tout. Or
 * `toits-de-paris-2026` n'a que 2002 px de maquette au-dessus d'elle, et il en
 * faut jusqu'à 1050 de plus sur une fenêtre étroite et haute (1280 × 1100).
 * Sans ce souffle, sa plage commence à un défilement NÉGATIF : le geste est
 * déjà à mi-course au chargement, et on découvre la planche plein écran, non
 * ancrée, sur le premier écran.
 *
 * Il sert aussi le regard : le Projet précédent a le temps de sortir du champ
 * avant que la planche ne monte par-dessus lui.
 *
 * Couplé à la course de `ENCRE.planche` : allonger le geste exige plus de
 * souffle.
 */
export const SOUFFLE_AVANT = 1300;

/**
 * Il n'y a PAS de souffle après une planche, et c'est une conséquence directe de
 * la géométrie.
 *
 * Il y en a eu un (800 px) du temps où l'échelle était une couverture : la
 * planche débordait alors de l'écran en hauteur, donc elle recouvrait une bande
 * de document sous sa propre boîte, et un Projet voisin pouvait y passer sans
 * jamais être vu. Depuis qu'elle fait exactement 100dvh, la plus basse ligne de
 * document qu'elle recouvre est `ancre + 0,05 · 100dvh`, soit AU-DESSUS de son
 * propre bord bas dès que la planche dépasse un dixième d'écran. Elle ne cache
 * plus rien en dessous d'elle.
 *
 * Ce souffle ne coûtait donc plus qu'un écran de papier vide juste après la
 * pose — au moment précis où l'on veut retrouver le Collage. Les écarts de la
 * maquette reprennent immédiatement : à l'ancre, le Projet suivant affleure le
 * bas de l'écran.
 */

/**
 * Le décalage vertical cumulé, en px de maquette, à appliquer à chaque Projet.
 *
 * Une planche pousse d'un souffle tout ce qui la suit, elle comprise. Le reste
 * de la maquette garde ses écarts exacts au pixel : on n'insère qu'une
 * respiration au-dessus des trois planches, on ne redispose rien.
 */
export function decalagesPlanches(projets: Projet[]): { decalages: number[]; total: number } {
  let cumul = 0;
  const decalages = projets.map((p) => {
    if (p.planche) cumul += SOUFFLE_AVANT;
    return cumul;
  });
  return { decalages, total: cumul };
}

export function CollageDesktop({
  projets,
  hauteur,
}: {
  projets: Projet[];
  /** Hauteur totale en px de maquette. Celle du cadre PORTEFOLIO de Figma. */
  hauteur: number;
}) {
  const { decalages, total } = decalagesPlanches(projets);
  return (
    <div
      style={{
        position: "relative",
        height: `calc(${hauteur + total} * var(--u))`,
      }}
    >
      {projets.map((p, i) => (
        <BlocProjet
          key={p.slug}
          projet={p}
          indice={i}
          priorite={i < PREMIERS_CHARGES}
          decalage={decalages[i] ?? 0}
        />
      ))}
      {/* Les Œuvres et Légendes naissent masquées en CSS (globals.css, état
          d'avant la révélation). Sans JavaScript, rien ne les révélerait : on
          montre tout. */}
      <noscript>
        <style>{`[data-revelation]{-webkit-mask-image:none !important;mask-image:none !important}article[data-slug] .maquette-texte{visibility:visible !important}`}</style>
      </noscript>
    </div>
  );
}
