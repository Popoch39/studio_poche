"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Oeuvre } from "@/components/oeuvre/Oeuvre";
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
export function PageAttente() {
  const scene = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
      <a
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
      </a>
    </div>
  );
}
