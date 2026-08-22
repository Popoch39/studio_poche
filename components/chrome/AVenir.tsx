/**
 * Emplacement d'un élément dessiné à la main dont le SVG n'est pas encore
 * extrait : l'endpoint de rendu de l'API Figma est limité en débit et a répondu
 * un `retry-after` de 4,6 jours.
 *
 * Volontairement VISIBLE en développement et invisible en production : un
 * emplacement vide qu'on oublie est pire qu'un emplacement qui se signale, mais
 * un cadre pointillé ne doit pas partir chez le visiteur.
 *
 * À supprimer avec `node scripts/extraire-figma.mjs` une fois le quota rétabli.
 */
export function AVenir({
  x,
  y,
  largeur,
  hauteur,
  quoi,
}: {
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  /** Le nom du nœud Figma, pour retrouver quoi brancher. */
  quoi: string;
}) {
  const enDev = process.env.NODE_ENV === "development";
  return (
    <div
      className="maquette-pose"
      data-a-venir={quoi}
      aria-hidden
      style={
        {
          "--x": x,
          "--y": y,
          "--l": largeur,
          "--h": hauteur,
          border: enDev ? "1px dashed color-mix(in srgb, var(--color-encre) 30%, transparent)" : undefined,
          fontSize: enDev ? "calc(13 * var(--u))" : undefined,
          opacity: enDev ? 0.5 : 0,
        } as React.CSSProperties
      }
    >
      {enDev ? quoi : null}
    </div>
  );
}
