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

export function CollageDesktop({
  projets,
  hauteur,
}: {
  projets: Projet[];
  /** Hauteur totale en px de maquette. Celle du cadre PORTEFOLIO de Figma. */
  hauteur: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        height: `calc(${hauteur} * var(--u))`,
      }}
    >
      {projets.map((p, i) => (
        <BlocProjet key={p.slug} projet={p} indice={i} priorite={i < PREMIERS_CHARGES} />
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
