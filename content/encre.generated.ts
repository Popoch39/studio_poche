/* GÉNÉRÉ par scripts/generer-rampe-encre.mjs — ne pas modifier à la main.
 *
 * La géométrie de la rampe d'encre, en px de MAQUETTE (jamais en px d'image :
 * la rampe est rendue à une autre résolution, et le Collage s'échelonne par
 * --u). BlocProjet en dérive les bornes de masque de chaque Œuvre, et
 * globals.css la taille du masque. Voir le script pour le raisonnement.
 */

export const RAMPE = {
  /** Chemins des deux sens d'attaque, servis depuis public/. */
  fichier: { gauche: "/img/encre/rampe-gauche.webp", droite: "/img/encre/rampe-droite.webp" },
  /** Dimensions de l'image, en px de maquette. */
  largeur: 2098,
  hauteur: 1170,
  /** Longueur du plat opaque, depuis le bord d'attaque. */
  blanc: 1810,
  /** Largeur de la bande déchirée. */
  bande: 36,
  /** Pente du bord — tangente de l'angle du poignet (11°). */
  pente: 0.194380,
} as const;
