import type { Oeuvre as OeuvreModele } from "@/content/types";
import { asset as lireAsset, srcset } from "@/lib/assets";
import { pose, tailles, taillesPlanche } from "@/lib/echelle";

/**
 * Une Œuvre posée dans le Collage.
 *
 * `width` et `height` sont TOUJOURS écrits explicitement : sans eux, une image
 * qui se charge modifie la hauteur du document et invalide toutes les positions
 * mesurées par ScrollTrigger — les animations se déclenchent alors au mauvais
 * endroit, sans aucune erreur pour le signaler.
 */
export function Oeuvre({
  oeuvre,
  categorie = "oeuvres",
  priorite = false,
  masque,
  survolPropre = false,
  pleinCadre = false,
}: {
  oeuvre: OeuvreModele;
  categorie?: string;
  priorite?: boolean;
  /**
   * Les bornes du front d'encre pour cette Œuvre, dans le référentiel de son
   * Projet (Collage seulement). Dérivées au rendu par BlocProjet — voir
   * lib/encre. Absentes, l'Œuvre n'est pas masquée du tout.
   */
  masque?: React.CSSProperties;
  /**
   * L'Œuvre possède son propre survol (ancre d'une Banderole) : SurvolEncre
   * lui cède la place — `soulever` désaxerait le raccord des cercles.
   */
  survolPropre?: boolean;
  /**
   * L'Œuvre appartient à une planche SCÉNOGRAPHIÉE : elle sera agrandie jusqu'à
   * la largeur de l'écran, donc elle annonce cette largeur — pas celle de son
   * repos. Voir `taillesPlanche` et docs/adr/0005.
   */
  pleinCadre?: boolean;
}) {
  const asset = lireAsset(categorie, oeuvre.fichier);
  if (!asset) {
    throw new Error(
      `Asset « ${categorie}/${oeuvre.fichier} » absent de content/assets.generated.ts. ` +
        `Lancer : node scripts/telecharger-assets.mjs && node scripts/optimiser-assets.mjs`,
    );
  }

  const avif = srcset(asset.variantes, "avif");
  const webp = srcset(asset.variantes, "webp");
  const repli = asset.variantes.at(-1)!.fichier;

  /* La largeur RÉELLEMENT rendue, qui n'est pas celle du cadre : une Œuvre
     recadrée pose son image à `crop.w` % de son cadre — souvent bien plus de
     100 %. Annoncer la largeur du cadre faisait choisir au navigateur une
     variante calculée pour un dixième de la surface : le logo de
     l'Anne-Maraîchère, rendu sur 1061px, était servi en 640px et arrivait
     mou. */
  const largeurRendue =
    oeuvre.ajustement === "recadre" && oeuvre.crop
      ? (oeuvre.largeur * oeuvre.crop.w) / 100
      : oeuvre.largeur;
  const sizes = pleinCadre ? taillesPlanche(largeurRendue) : tailles(largeurRendue);

  const image = (
    <picture>
      {avif && <source type="image/avif" srcSet={avif} sizes={sizes} />}
      {webp && <source type="image/webp" srcSet={webp} sizes={sizes} />}
      <img
        src={repli}
        alt={oeuvre.alt}
        width={asset.largeur}
        height={asset.hauteur}
        loading={priorite ? "eager" : "lazy"}
        decoding={priorite ? "sync" : "async"}
        fetchPriority={priorite ? "high" : "auto"}
        /* Le miroir vit sur l'IMAGE, jamais sur son cadre. Sur le cadre il
           retournerait aussi le masque d'encre — le front y remonterait à
           contresens de celui de ses voisines — et il entrerait en collision
           avec les transforms que SurvolEncre écrit sur ce même élément. */
        style={
          oeuvre.ajustement === "recadre" && oeuvre.crop
            ? {
                transform: oeuvre.miroir ? "scaleX(-1)" : undefined,
                position: "absolute",
                left: `${oeuvre.crop.l}%`,
                top: `${oeuvre.crop.t}%`,
                width: `${oeuvre.crop.w}%`,
                height: `${oeuvre.crop.h}%`,
                maxWidth: "none",
              }
            : {
                transform: oeuvre.miroir ? "scaleX(-1)" : undefined,
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                maxWidth: "none",
                objectFit: oeuvre.ajustement === "contenir" ? "contain" : "cover",
              }
        }
      />
    </picture>
  );

  return (
    <div
      className="maquette-pose"
      data-revelation={masque ? "" : undefined}
      data-survol-propre={survolPropre ? "" : undefined}
      style={{
        ...pose(oeuvre.x, oeuvre.y, oeuvre.largeur, oeuvre.hauteur),
        ...masque,
        // `overflow: hidden` est indispensable au recadrage : l'image est
        // volontairement plus grande que son cadre.
        overflow: "hidden",
        borderRadius: oeuvre.radius ? `calc(${oeuvre.radius} * var(--u))` : undefined,
      }}
    >
      {image}
    </div>
  );
}
