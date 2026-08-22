import { Oeuvre } from "@/components/oeuvre/Oeuvre";
import { AVenir } from "./AVenir";
import { vecteur, image } from "@/lib/chrome";
import { ECRANS } from "@/content/chrome";

type Ecran = keyof typeof ECRANS;

/**
 * Une image de la maquette, posée à sa géométrie extraite.
 * `alt` est le seul paramètre rédigé à la main : il demande un jugement.
 */
export function ImageMaquette({
  ecran,
  nomFigma,
  alt,
  priorite = false,
}: {
  ecran: Ecran;
  nomFigma: string;
  alt: string;
  priorite?: boolean;
}) {
  const i = image(ecran, nomFigma);
  return <Oeuvre oeuvre={{ ...i, alt }} priorite={priorite} />;
}

/**
 * Un élément dessiné à la main (cadre, contour, bulle, lettrage vectorisé).
 * Rend le SVG si l'extraction l'a produit, sinon un emplacement signalé.
 */
export function Dessin({
  ecran,
  nomFigma,
  indice = 0,
  role,
}: {
  ecran: Ecran;
  nomFigma: string;
  indice?: number;
  /** Ce que l'élément représente, pour retrouver quoi brancher. */
  role: string;
}) {
  const v = vecteur(ecran, nomFigma, indice);
  if (!v.fichier) {
    return <AVenir x={v.x} y={v.y} largeur={v.largeur} hauteur={v.hauteur} quoi={`${nomFigma} — ${role}`} />;
  }
  return (
    <img
      src={v.fichier}
      alt=""
      aria-hidden
      className="maquette-pose"
      style={{ "--x": v.x, "--y": v.y, "--l": v.largeur, "--h": v.hauteur } as React.CSSProperties}
    />
  );
}
