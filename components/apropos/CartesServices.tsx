"use client";

import { TexteMaquette } from "@/components/chrome/TexteMaquette";
import { Dessin, ImageMaquette } from "@/components/chrome/Dessin";
import { texte } from "@/lib/chrome";
import { useTraceSvg } from "@/lib/motion/useTraceSvg";

/**
 * Les quatre cartes de services.
 *
 * Chacune associe un cadre dessiné à la main (un `Vector` distinct par carte —
 * quatre tracés différents, c'est le propre du dessin à la main), un titre en
 * lettrage scanné, et un texte.
 *
 * L'appariement carte / cadre / lettrage / texte a été établi en comparant les
 * coordonnées Figma : chaque cadre contient son lettrage et son texte.
 */
const CARTES = [
  { cadre: "Vector 3", lettrage: "image 3", debutTexte: "Étiquettes, affiches", titre: "Univers illustrés" },
  { cadre: "Vector 4", lettrage: "image 4", debutTexte: "Livrets, panneaux", titre: "Support pédagogique" },
  { cadre: "Vector 6", lettrage: "image 5", debutTexte: "Pour accompagner un article", titre: "Illustrations éditoriales" },
  { cadre: "Vector 5", lettrage: "image 2", debutTexte: "Des animations image par image", titre: "Animation dessinée à la main" },
] as const;

export function CartesServices() {
  // Les cadres se tracent au scroll, comme sous un feutre.
  const conteneur = useTraceSvg<HTMLUListElement>();

  return (
    <ul ref={conteneur} aria-label="Ce que fait le Studio Poche">
      {CARTES.map((c) => {
        const t = texte("apropos", c.debutTexte);
        return (
          <li key={c.cadre}>
            <Dessin ecran="apropos" nomFigma={c.cadre} role={`cadre de « ${c.titre} »`} />
            <ImageMaquette ecran="apropos" nomFigma={c.lettrage} alt={c.titre} />
            <TexteMaquette {...t}>{t.texte}</TexteMaquette>
          </li>
        );
      })}
    </ul>
  );
}
