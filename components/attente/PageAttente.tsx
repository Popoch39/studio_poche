"use client";

import { useCallback, useRef } from "react";
import { preload } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Oeuvre } from "@/components/oeuvre/Oeuvre";
import { PREMIERS_CHARGES } from "@/components/collage/CollageDesktop";
import { PROJETS } from "@/content/projets";
import { asset, srcset } from "@/lib/assets";
import { tailles } from "@/lib/echelle";
import { LettrageStudioPoche } from "@/components/chrome/LettrageStudioPoche";
import { image, vecteur, hauteur } from "@/lib/chrome";
import { pose } from "@/lib/echelle";
import { useEntreeAttente } from "@/lib/motion/useEntreeAttente";

/**
 * La Page d'attente : l'écran d'entrée du site.
 *
 * Ce composant ne fait que rendre. Le mouvement et la décision d'entrer vivent
 * dans `useEntreeAttente` — une animation, un fichier.
 *
 * ── Un écart à la maquette, à signaler ──────────────────────────────────────
 * Le nœud Figma « Gif_Page_Principal » ne contient pas de GIF : c'est un PNG
 * STATIQUE de 1920×1080 (vérifié — sharp ne rapporte ni images ni délais).
 * L'illustration animée de Marie n'est pas dans le fichier. Ce qui s'anime ici,
 * c'est la révélation de l'image et l'écriture du Lettrage ; si Marie fournit
 * son fichier source (GIF, vidéo ou calques), c'est `useEntreeAttente` qu'il
 * faudra reprendre.
 */
/**
 * Précharge les Œuvres du premier écran de /portfolio — celles que le Collage
 * charge en `eager`, d'où le partage de `PREMIERS_CHARGES` : la règle de
 * préchargement doit rester celle du chargement.
 *
 * L'attente dure plusieurs secondes et débouche TOUJOURS sur /portfolio (clic,
 * touche, ou fin de la timeline) : c'est du temps mort garanti, pendant lequel
 * ces images se chargent en priorité basse pour ne pas concurrencer
 * l'illustration de l'attente elle-même.
 *
 * AVIF seulement : un navigateur sans AVIF ignore le preload (attribut `type`)
 * et chargera le WebP à l'arrivée, comme avant — mais aucun ne télécharge deux
 * formats.
 */
function prechargerPremierEcran() {
  for (const projet of PROJETS.slice(0, PREMIERS_CHARGES)) {
    for (const o of projet.oeuvres) {
      const entree = asset("oeuvres", o.fichier);
      const avif = entree && srcset(entree.variantes, "avif");
      if (!entree || !avif) continue;
      preload(entree.variantes.find((v) => v.format === "avif")!.fichier, {
        as: "image",
        type: "image/avif",
        imageSrcSet: avif,
        imageSizes: tailles(o.largeur),
        fetchPriority: "low",
      });
    }
  }
}

export function PageAttente() {
  const scene = useRef<HTMLDivElement>(null);
  const router = useRouter();
  prechargerPremierEcran();

  // `replace` et non `push` : sinon le retour arrière depuis /portfolio ramène
  // ici, qui rejoue l'attente puis redirige, et le visiteur est piégé.
  const onEntrer = useCallback(() => router.replace("/portfolio"), [router]);
  const entrer = useEntreeAttente({ scene, onEntrer });

  const illu = image("attente", "Gif_Page_Principal 2 1");
  const logo = vecteur("attente", "Calque_1");

  return (
    <div
      ref={scene}
      style={{ position: "relative", height: `calc(${hauteur("attente")} * var(--u))` }}
    >
      {/* L'illustration naît MASQUÉE dans le HTML même (opacity: 0 en ligne) :
          entre la peinture du HTML statique et l'hydratation, GSAP n'existe pas
          encore — un `from` posé à l'hydratation laissait l'image flasher
          plein cadre avant de disparaître puis de se révéler. C'est
          `useEntreeAttente` qui la fait entrer. */}
      <div data-entree style={{ position: "absolute", inset: 0, opacity: 0 }}>
        <Oeuvre
          oeuvre={{
            ...illu,
            alt:
              "Illustration du Studio Poche : une route serpente entre des montagnes, " +
              "un campement, un café et des panneaux de chantier",
          }}
          priorite
        />
      </div>
      {/* Sans JavaScript, rien ne révélera l'image : on la rend d'emblée. */}
      <noscript>
        <style>{`[data-entree]{opacity:1 !important}`}</style>
      </noscript>

      {/* Le Lettrage EST la porte d'entrée : un vrai lien, focusable, au centre
          de l'écran. Il remplace le lien `sr-only` que la version précédente
          admettait comme « la version minimale » d'une affordance manquante.
          `href` reste renseigné pour que le lien vive sans JavaScript ; le clic
          est intercepté pour passer par le routeur plutôt que par un
          rechargement complet. */}
      {/* `Link` et non `<a>` : son prefetch charge la route /portfolio pendant
          l'attente — avec un `<a>` brut, tout partait au moment du clic. */}
      <Link
        href="/portfolio"
        aria-label="Entrer dans le portfolio"
        className="maquette-pose"
        style={pose(logo.x, logo.y, logo.largeur, logo.hauteur)}
        onClick={(e) => {
          e.preventDefault();
          entrer();
        }}
      >
        <LettrageStudioPoche />
      </Link>
    </div>
  );
}
