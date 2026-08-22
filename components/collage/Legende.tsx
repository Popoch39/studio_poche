import type { Projet } from "@/content/types";

/**
 * Reconstruit la seconde ligne de la Légende.
 *
 * La maquette écrit toujours « AAAA - … », où le reste mélange commanditaire,
 * agence et technique selon le projet :
 *   « 2025 - agence CREADS - Illustration et conception graphique »
 *   « 2024 - Acrylique, craies grasses, crayons de couleurs »
 *   « 2022 - Concours Huttopia, projet Finaliste : «L'oasis à soif» »
 *
 * Quand la légende se décompose proprement, le manifeste renseigne les champs
 * structurés et on les rejoint. Quand elle ne s'y prête pas, il renseigne
 * `contexte` avec la chaîne exacte : la fidélité au texte de Marie primant sur
 * l'élégance du modèle.
 */
function detail(p: Projet): string {
  const parts = [p.commanditaire, p.agence, p.technique].filter(Boolean);
  return parts.length > 0 ? parts.join(" - ") : (p.contexte ?? "");
}

export function Legende({ projet }: { projet: Projet }) {
  const l = projet.legende;
  if (!l) return null;

  const suite = detail(projet);

  return (
    <div
      className="maquette-pose maquette-texte"
      style={
        {
          "--x": l.x,
          "--y": l.y,
          "--l": l.largeur,
          // La hauteur suit le contenu : une Légende ne doit pas être tronquée
          // si le texte occupe plus de place que dans Figma.
          "--h": "auto",
          "--fs": l.fs ?? 20,
          "--lh": l.lh ?? 32,
          height: "auto",
        } as React.CSSProperties
      }
    >
      <p style={{ fontWeight: 500 }}>{projet.titre}</p>
      {/* Sans année connue, la seconde ligne n'est pas affichée : ni l'année ni
          le contexte ne doivent être inventés. Le manifeste en garde la trace
          via `legendeIncomplete`. */}
      {projet.annee !== null && (
        <p style={{ fontWeight: 300, fontStyle: "italic" }}>
          {projet.annee}
          {suite ? ` - ${suite}` : ""}
        </p>
      )}
    </div>
  );
}
