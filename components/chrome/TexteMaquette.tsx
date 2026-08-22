/**
 * Un bloc de Texte posé aux métriques exactes de la maquette.
 *
 * Les corps et interlignages sont relevés dans Figma et diffèrent d'un écran à
 * l'autre — 20/32 sur Contact et les Légendes du portfolio, mais 20/22 pour le
 * corps d'À propos et 32/41 pour son chapô. Ils ne doivent donc jamais être
 * supposés : ils sont passés explicitement.
 */
export function TexteMaquette({
  x,
  y,
  largeur,
  fs,
  lh,
  centre = false,
  gras = false,
  children,
}: {
  x: number;
  y: number;
  largeur: number;
  fs: number;
  lh: number;
  centre?: boolean;
  gras?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="maquette-pose maquette-texte"
      style={
        {
          "--x": x,
          "--y": y,
          "--l": largeur,
          "--fs": fs,
          "--lh": lh,
          // La hauteur suit le contenu : un texte ne doit jamais être tronqué
          // s'il occupe plus de place qu'à la composition dans Figma.
          height: "auto",
          textAlign: centre ? "center" : undefined,
          fontWeight: gras ? 500 : undefined,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
