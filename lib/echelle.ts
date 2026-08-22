/** Largeur du référentiel de la maquette Figma, en pixels. */
export const MAQUETTE = 1728;

/**
 * Plafond au-delà duquel la scène cesse de grandir et se centre.
 * Doit rester synchronisé avec `--u` dans app/globals.css.
 */
export const PLAFOND = 2200;

/** Seuil de bascule vers la vue mobile. Voir docs/adr/0001. */
export const SEUIL_MOBILE = 1280;

/** Les variables CSS d'un élément posé dans le référentiel de la maquette. */
export function pose(x: number, y: number, largeur: number, hauteur: number) {
  return {
    "--x": x,
    "--y": y,
    "--l": largeur,
    "--h": hauteur,
  } as React.CSSProperties;
}

/**
 * L'attribut `sizes` exact pour une Œuvre de `largeur` px de maquette.
 *
 * La largeur affichée vaut `largeur * --u`, soit `largeur / 1728` de la largeur
 * de la scène — donc un pourcentage constant du viewport, jusqu'au plafond où
 * elle se fige en pixels.
 */
export function tailles(largeur: number): string {
  const partVw = ((largeur / MAQUETTE) * 100).toFixed(2);
  const figee = Math.round((largeur / MAQUETTE) * PLAFOND);
  return `(min-width: ${PLAFOND}px) ${figee}px, ${partVw}vw`;
}
