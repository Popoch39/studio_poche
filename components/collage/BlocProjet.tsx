import type { Projet, Oeuvre as OeuvreModele } from "@/content/types";
import { BANDEROLES } from "@/content/banderoles";
import { Oeuvre } from "@/components/oeuvre/Oeuvre";
import { Banderole } from "@/components/oeuvre/Banderole";
import { pose } from "@/lib/echelle";
import { courseEncre, frontProjet, masqueOeuvre, sensEncre } from "@/lib/encre";
import { Legende } from "./Legende";

type Boite = { x: number; y: number; largeur: number; hauteur: number };
type Rect = { x: number; y: number; droite: number; bas: number };

/**
 * Trois plans de profondeur pour le Collage, attribués en alternance
 * déterministe : ScrollSmoother (`effects`) fait défiler chaque plan à sa
 * vitesse. `clamp()` cale les articles visibles sans défilement sur leur
 * position naturelle au chargement — l'état de repos reste exactement la
 * maquette. `null` est le plan neutre : aucun attribut, aucun effet à créer.
 *
 * Défini ici — un composant serveur — et non dans lib/motion/gsap.ts, qui est
 * `"use client"` et enregistre les plugins au chargement.
 */
const PROFONDEURS = ["clamp(0.92)", null, "clamp(1.08)"] as const;

/** L'enveloppe d'une liste de rectangles, en px de maquette. */
function enveloppe(rects: Rect[]): Boite {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return {
    x,
    y,
    largeur: Math.max(...rects.map((r) => r.droite)) - x,
    hauteur: Math.max(...rects.map((r) => r.bas)) - y,
  };
}

const rectOeuvre = (o: OeuvreModele): Rect => ({
  x: o.x,
  y: o.y,
  droite: o.x + o.largeur,
  bas: o.y + o.hauteur,
});

/**
 * L'enveloppe d'un Projet : le min/max de ses Œuvres et de sa Légende, en px
 * de maquette. Sans elle, l'<article> n'a aucune boîte (tous ses enfants sont
 * en position absolue) : ScrollTrigger mesurerait 26 déclencheurs de hauteur
 * nulle empilés en haut de page, et toute animation au scroll serait un no-op.
 *
 * La hauteur de la Légende est ESTIMÉE (1 ou 2 lignes × interlignage) : elle
 * ne sert qu'à la géométrie de déclenchement. Rien n'est rogné — l'article n'a
 * pas d'overflow — et la hauteur du Collage reste déclarée par CollageDesktop.
 */
function boiteProjet(projet: Projet): Boite {
  const rects = projet.oeuvres.map(rectOeuvre);
  const l = projet.legende;
  if (l) {
    // La Légende peut déborder de la boîte des Œuvres sur les DEUX axes
    // (veja : légende x=263, première œuvre x=266).
    const lignes = projet.annee !== null ? 2 : 1;
    rects.push({ x: l.x, y: l.y, droite: l.x + l.largeur, bas: l.y + lignes * (l.lh ?? 32) });
  }
  return enveloppe(rects);
}

/**
 * Un Projet dans le Collage : ses Œuvres à leurs positions de maquette, et sa
 * Légende.
 *
 * L'article porte sa boîte englobante et ses enfants sont TRANSLATÉS dans son
 * référentiel : `calc((o.x − b.x) * --u)` dans un article posé à
 * `calc(b.x * --u)` redonne exactement `calc(o.x * --u)` — même arithmétique,
 * zéro dérive au pixel. C'est ce qui donne à ScrollTrigger de vraies mesures
 * et à ScrollSmoother une hauteur sur laquelle travailler.
 *
 * Il porte aussi le FRONT D'ENCRE du Projet — `--encre`, que useRevelationEncre
 * anime de 0 à 1, et dont chaque Œuvre hérite pour glisser son masque. La
 * géométrie du front est dérivée ici, au rendu, exactement comme la boîte
 * (docs/adr/0003) : c'est ce qui permet à l'état masqué d'exister en CSS dès la
 * première peinture, sans attendre l'hydratation.
 *
 * Le front se mesure sur la boîte des seules ŒUVRES, jamais sur celle qui
 * inclut la Légende : celle-ci s'écrit, elle n'est pas mouillée, et la faire
 * entrer dans la course allongerait le geste d'un vide.
 *
 * Un Projet SCÉNOGRAPHIÉ (`projet.planche`) rompt avec tout ça sur un point :
 * ses Œuvres sont enveloppées dans une PLANCHE — un calque posé sur la boîte de
 * leur seule enveloppe — que `usePlanchePosee` agrandit puis pose au défilement.
 * Il n'a alors AUCUN front d'encre : un Projet n'a jamais deux gestes
 * (docs/adr/0005). Trois conséquences ici, toutes nécessaires :
 *   — pas de `frontProjet`, pas de `masqueOeuvre`, pas de `data-encre-course` :
 *     sans `masque`, `Oeuvre` n'émet pas `data-revelation` et le masque de
 *     globals.css ne s'applique pas ;
 *   — pas de `data-speed` : la géométrie de la pose suppose que le centre de la
 *     planche suit le défilement à 1:1, or un plan de profondeur le ferait
 *     avancer à 0,92× et fausserait tout le calage ;
 *   — la translation reste exacte au pixel : la planche est posée à
 *     `encre − boite` et ses Œuvres à `o − encre`, dont la somme redonne
 *     `o − boite`. Même arithmétique qu'ADR 0003, un niveau de plus.
 *
 * La Légende reste HORS de la planche : elle ne se pose pas, elle s'écrit.
 *
 * `priorite` doit être vrai pour les tout premiers projets visibles sans
 * défilement : leurs images sont alors chargées sans attendre, ce qui évite un
 * premier écran vide.
 */
export function BlocProjet({
  projet,
  indice,
  priorite = false,
  decalage = 0,
}: {
  projet: Projet;
  /** Position du Projet dans le Collage : décide de son plan de profondeur. */
  indice: number;
  priorite?: boolean;
  /**
   * Décalage vertical en px de maquette, cumulé par les souffles des planches
   * situées au-dessus. Voir `decalagesPlanches` dans CollageDesktop : seule
   * l'ordonnée de l'article bouge, ses enfants restent dans son référentiel.
   */
  decalage?: number;
}) {
  const boite = boiteProjet(projet);
  const encre = enveloppe(projet.oeuvres.map(rectOeuvre));
  const sens = sensEncre(encre.x, encre.largeur);
  const legende = projet.legende;
  const banderole = BANDEROLES.find((b) => b.slug === projet.slug);
  const scenographie = projet.planche === true;

  const oeuvres = projet.oeuvres.map((o, i) => (
    // Un Projet peut recadrer plusieurs fois la MÊME image — même `fichier`,
    // découpes différentes : l'indice distingue les clés.
    <Oeuvre
      key={`${o.fichier}#${i}`}
      // Dans une planche, les Œuvres sont translatées dans le référentiel de
      // la PLANCHE, elle-même posée dans celui de l'article.
      oeuvre={
        scenographie
          ? { ...o, x: o.x - encre.x, y: o.y - encre.y }
          : { ...o, x: o.x - boite.x, y: o.y - boite.y }
      }
      masque={scenographie ? undefined : masqueOeuvre(o.x - encre.x, o.y - encre.y, encre, sens)}
      priorite={priorite}
      survolPropre={banderole?.ancre === i}
      pleinCadre={scenographie}
    />
  ));

  return (
    <article
      className="maquette-pose"
      style={{
        ...pose(boite.x, boite.y + decalage, boite.largeur, boite.hauteur),
        ...(scenographie ? {} : frontProjet(sens)),
      }}
      aria-label={projet.titre}
      data-slug={projet.slug}
      // Un Projet scénographié est sur le plan neutre : la pose et ScrollSmoother
      // ne peuvent pas se partager le déplacement de la même boîte.
      data-speed={scenographie ? undefined : (PROFONDEURS[indice % 3] ?? undefined)}
      data-position-proposee={projet.positionProposee ? "" : undefined}
      // La course du front en px de maquette : useRevelationEncre en déduit la
      // durée. Une mesure du DOM ne la donnerait pas — elle serait à l'échelle.
      data-encre-course={
        scenographie ? undefined : Math.round(courseEncre(encre.largeur, encre.hauteur))
      }
    >
      {scenographie ? (
        <div
          className="maquette-pose planche"
          data-planche=""
          style={pose(encre.x - boite.x, encre.y - boite.y, encre.largeur, encre.hauteur)}
        >
          {oeuvres}
        </div>
      ) : (
        oeuvres
      )}
      {/* Après les Œuvres — qu'elle recouvre en se déroulant — mais AVANT la
          Légende, qui doit rester lisible par-dessus : déroulée, la banderole
          descend d'une douzaine de pixels sous le bas des Œuvres et tronquait
          le haut de la première ligne. Une Légende est toujours visible.
          (Frères en position absolue : c'est l'ordre du document qui empile.)
          Elle déborde largement de la boîte — l'article n'a pas d'overflow — et,
          née invisible, elle ne change ni le repos ni les mesures. */}
      {banderole && <Banderole banderole={banderole} decalage={boite} />}
      <Legende
        projet={
          legende
            ? { ...projet, legende: { ...legende, x: legende.x - boite.x, y: legende.y - boite.y } }
            : projet
        }
      />
    </article>
  );
}
