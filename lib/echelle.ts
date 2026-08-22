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

/**
 * L'attribut `sizes` d'une Œuvre SCÉNOGRAPHIÉE — celle d'une planche qui se pose
 * au défilement (docs/adr/0005).
 *
 * Une planche est agrandie jusqu'à couvrir la largeur du VIEWPORT, pas celle de
 * la scène : le plafond de 2200px de `tailles()` ne s'applique donc pas, et
 * annoncer la taille de repos ferait choisir au navigateur une variante calculée
 * pour la moitié de la surface — l'Œuvre arriverait molle à l'instant précis où
 * on la regarde le plus.
 *
 * `120vw` et non `100vw` : l'échelle de la planche est bornée par la HAUTEUR
 * (exactement 100dvh, docs/adr/0005), donc sa largeur rendue vaut
 * `100dvh · L/H` — sur une fenêtre étroite et haute, elle dépasse celle du
 * viewport.
 *
 * La borne à 1280 est indispensable : sous `SEUIL_MOBILE` la pose ne joue pas
 * (CONDITIONS.collage), et un téléphone téléchargerait une variante de 1920px
 * pour rien.
 */
export function taillesPlanche(largeur: number): string {
  const partVw = ((largeur / MAQUETTE) * 100).toFixed(2);
  return `(max-width: ${SEUIL_MOBILE - 0.02}px) ${partVw}vw, 120vw`;
}
