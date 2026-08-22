import { ASSETS } from "@/content/assets.generated";

type Variante = { format: string; largeur: number; fichier: string };
const registre = ASSETS as unknown as Record<
  string,
  Record<string, { largeur: number; hauteur: number; variantes: readonly Variante[] }>
>;

/**
 * Un Lettrage : l'écriture manuscrite de Marie, affichée en image scannée et
 * TOUJOURS doublée de son Texte équivalent pour les lecteurs d'écran et le
 * référencement. Voir docs/adr/0002 — il n'existe pas de chemin qui affiche un
 * Lettrage nu.
 *
 * Les libellés de navigation sont des découpes dans une même planche scannée de
 * 1920×1080 : d'où `crop`, dont les pourcentages viennent directement de Figma.
 */
export function Lettrage({
  planche,
  texte,
  x,
  y,
  largeur,
  hauteur,
  crop,
  decoratif = false,
}: {
  /** Clé dans public/assets/lettrage/. */
  planche: string;
  /** Le Texte équivalent. Vide uniquement si `decoratif`. */
  texte: string;
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  /** Position de l'image dans son cadre, en % — repris tel quel de Figma. */
  crop: { l: number; t: number; w: number; h: number };
  /** Vrai pour un ornement sans valeur sémantique (les points de séparation). */
  decoratif?: boolean;
}) {
  const asset = registre.lettrage?.[planche];
  if (!asset) {
    throw new Error(
      `Lettrage « ${planche} » absent de content/assets.generated.ts. ` +
        `Lancer : node scripts/optimiser-assets.mjs`,
    );
  }

  // La découpe affiche l'image bien plus large que son cadre (jusqu'à 2461 %) :
  // on sert donc systématiquement la plus grande variante disponible.
  const par = (f: string) =>
    asset.variantes.filter((v) => v.format === f).sort((a, b) => b.largeur - a.largeur)[0];
  const avif = par("avif");
  const webp = par("webp");

  return (
    <span
      className="maquette-pose"
      style={{ "--x": x, "--y": y, "--l": largeur, "--h": hauteur } as React.CSSProperties}
    >
      <span style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <picture>
          {avif && <source type="image/avif" srcSet={avif.fichier} />}
          {webp && <source type="image/webp" srcSet={webp.fichier} />}
          <img
            src={(avif ?? webp).fichier}
            alt=""
            aria-hidden
            width={asset.largeur}
            height={asset.hauteur}
            style={{
              position: "absolute",
              left: `${crop.l}%`,
              top: `${crop.t}%`,
              width: `${crop.w}%`,
              height: `${crop.h}%`,
              maxWidth: "none",
            }}
          />
        </picture>
      </span>
      {!decoratif && <span className="sr-only">{texte}</span>}
    </span>
  );
}
