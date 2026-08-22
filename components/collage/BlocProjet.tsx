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
 * `priorite` doit être vrai pour les tout premiers projets visibles sans
 * défilement : leurs images sont alors chargées sans attendre, ce qui évite un
 * premier écran vide.
 */
export function BlocProjet({
  projet,
  indice,
  priorite = false,
}: {
  projet: Projet;
  /** Position du Projet dans le Collage : décide de son plan de profondeur. */
  indice: number;
  priorite?: boolean;
}) {
  const boite = boiteProjet(projet);
  const encre = enveloppe(projet.oeuvres.map(rectOeuvre));
  const sens = sensEncre(encre.x, encre.largeur);
  const legende = projet.legende;
  const banderole = BANDEROLES.find((b) => b.slug === projet.slug);
  return (
    <article
      className="maquette-pose"
      style={{ ...pose(boite.x, boite.y, boite.largeur, boite.hauteur), ...frontProjet(sens) }}
      aria-label={projet.titre}
      data-slug={projet.slug}
      data-speed={PROFONDEURS[indice % 3] ?? undefined}
      data-position-proposee={projet.positionProposee ? "" : undefined}
      // La course du front en px de maquette : useRevelationEncre en déduit la
      // durée. Une mesure du DOM ne la donnerait pas — elle serait à l'échelle.
      data-encre-course={Math.round(courseEncre(encre.largeur, encre.hauteur))}
    >
      {projet.oeuvres.map((o, i) => (
        // Un Projet peut recadrer plusieurs fois la MÊME planche — même
        // `fichier`, découpes différentes : l'indice distingue les clés.
        <Oeuvre
          key={`${o.fichier}#${i}`}
          oeuvre={{ ...o, x: o.x - boite.x, y: o.y - boite.y }}
          masque={masqueOeuvre(o.x - encre.x, o.y - encre.y, encre, sens)}
          priorite={priorite}
          survolPropre={banderole?.ancre === i}
        />
      ))}
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
