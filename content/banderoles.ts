/**
 * Les Banderoles : visuels complets déroulés au survol d'une Œuvre ancre.
 *
 * Ce fichier est MANUSCRIT — la troisième exception assumée au pipeline
 * (voir la note de CONTEXT.md). La banderole n'existe pas dans la maquette
 * portfolio Figma : le pipeline ne peut ni la placer ni la mesurer. Sa source
 * vit dans `sources/banderoles/` (hors de l'élagage d'extraire-figma.mjs) et
 * ses dérivés passent par `assets:optimiser` comme les Œuvres.
 *
 * Le calage est fait sur le CONTENU, pas sur les bords : le disque de la
 * planche a un bord de craie duveteux et la banderole porte un liseré blanc
 * par-dessus son illustration — aucun des deux bords n'est le même trait. Les
 * deux dessins, eux, sont rigoureusement la même image. Le repère vient donc
 * d'une corrélation croisée normalisée entre les deux sources (0,9979) :
 * `cercle` est le disque de la planche transposé dans la banderole, et
 * `cercleAffiche` le même disque une fois passé par le recadrage de l'Œuvre
 * ancre. Toute la géométrie s'en DÉRIVE — voir components/oeuvre/Banderole.tsx :
 *   k = cercleAffiche.r / cercle.r          (px maquette par px source)
 *   boîte = cercleAffiche.centre − cercle.centre × k, dimensions source × k
 *
 * Se tromper de bord se voit : caler le clip sur l'extérieur du liseré rendait
 * l'illustration 17 % trop grande, et le cercle sautait à la prise.
 */

export type Banderole = {
  /** Projet porteur — toujours le slug, jamais le titre. */
  slug: string;
  /** Clé dans ASSETS.banderoles (sources/banderoles/<fichier>.png). */
  fichier: string;
  alt: string;
  /** Le disque de l'illustration DANS la banderole, en px de l'image source. */
  cercle: { cx: number; cy: number; r: number };
  /** Le même disque tel que l'Œuvre ancre l'affiche, en px de maquette. */
  cercleAffiche: { cx: number; cy: number; r: number };
  /**
   * Le rayon (px source) où le clip coupe au repos : le bord INTÉRIEUR du
   * liseré blanc. Couper là, c'est ne montrer que l'illustration — celle-là
   * même qui est déjà à l'écran, au même endroit et à la même taille : la
   * banderole apparaît sans que rien ne bouge, et le disque de la planche
   * continue de dépasser tout autour avec son bord de craie. Le liseré, lui,
   * se découvre pendant le déroulement.
   */
  rayonRepos: number;
  /** Indice de l'Œuvre ancre dans projet.oeuvres. */
  ancre: number;
};

export const BANDEROLES: readonly Banderole[] = [
  {
    slug: "logo-anne-maraichere",
    fichier: "anne-maraichere",
    // Décorative : la Légende dit déjà « banderole de marché ».
    alt: "",
    cercle: { cx: 709.1, cy: 740.7, r: 589.2 },
    cercleAffiche: { cx: 632.2, cy: 1586.4, r: 190.5 },
    // Crête du liseré à r 568, épais de 35 px : il court de 550 à 585. On
    // coupe à 535, une quinzaine de pixels en deçà — le liseré n'est pas
    // parfaitement concentrique et son bord intérieur est fondu : l'effleurer
    // laissait un arc clair en bas du disque.
    rayonRepos: 535,
    ancre: 0,
  },
];
