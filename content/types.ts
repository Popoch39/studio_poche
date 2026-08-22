/**
 * Le vocabulaire du domaine. Voir CONTEXT.md pour les définitions.
 */

/**
 * Une image unique, dans le référentiel 1728px de la maquette.
 *
 * `fichier` désigne l'image SOURCE telle que Marie l'a déposée dans Figma. La
 * façon dont Figma la compose dans son cadre — recadrage, miroir, arrondi — est
 * reproduite ici en CSS. On a préféré cette voie aux rendus de nœuds parce que
 * l'endpoint de rendu de l'API Figma est sévèrement limité en débit, alors que
 * la table des images sources s'obtient en une seule requête.
 */
export type Oeuvre = {
  /** Nom de base sans extension, dans sources/oeuvres/. */
  fichier: string;
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  /** Décrit l'image, pas le projet. */
  alt: string;
  /**
   * Comment l'image remplit son cadre.
   * - `couvrir` : Figma « Fill » — équivaut à `object-fit: cover`.
   * - `contenir` : Figma « Fit » — équivaut à `object-fit: contain`.
   * - `recadre` : Figma « Crop » — l'image est positionnée par `crop`.
   */
  ajustement: "couvrir" | "contenir" | "recadre";
  /**
   * Position de l'image dans son cadre, en pourcentages, quand
   * `ajustement === "recadre"`.
   *
   * Dérivé de l'`imageTransform` de Figma : pour une matrice
   * `[[a,0,tx],[0,d,ty]]`, on a `w = 100/a`, `h = 100/d`, `l = -tx*w`,
   * `t = -ty*h`. Formule vérifiée au centième contre le CSS que Figma produit
   * lui-même.
   */
  crop?: { l: number; t: number; w: number; h: number };
  /** Rayon d'arrondi en px de maquette. Ex. `sterne 1` est arrondie à 35px. */
  radius?: number;
  /** L'image est retournée horizontalement dans la maquette. */
  miroir?: true;
};

/**
 * Une réalisation légendée, composée d'une à six Œuvres.
 *
 * Identifié par `slug`, jamais par `titre` : « Les toits de Paris » existe deux
 * fois dans la maquette (2024 en peinture acrylique, 2026 en acrylique et
 * crayons de couleurs).
 */
export type Projet = {
  slug: string;
  titre: string;
  /**
   * `null` quand la maquette ne donne pas d'année — « Les Tables » a un titre
   * mais pas de millésime. Ne jamais en inventer un : ce serait publier une
   * fausse information sur le parcours de Marie.
   */
  annee: number | null;
  /** Qui a commandé. Ex. « SNCF Réseau », « Ambassade de France en Suisse ». */
  commanditaire?: string;
  /** L'intermédiaire de la commande. Ex. « agence CREADS », « Canal Architecture ». */
  agence?: string;
  /** Le médium. Ex. « Craies grasses », « Vidéo animée », « Illustration numérique ». */
  technique?: string;
  /** Texte libre quand la légende ne se réduit pas aux champs ci-dessus. */
  contexte?: string;
  oeuvres: Oeuvre[];
  /** Position de la Légende. `null` pour les blocs sans légende dans la maquette. */
  legende: {
    x: number;
    y: number;
    largeur: number;
    /** Corps et interlignage relevés dans Figma. Défaut : 20/32. */
    fs?: number;
    lh?: number;
  } | null;
  /**
   * Bloc sans légende dans la maquette (Dream 9, POISSON, IMG_5876) : l'année et
   * le contexte sont inconnus et ne doivent pas être inventés — publier une
   * fausse date sur le parcours de Marie serait pire qu'un champ vide.
   * À faire compléter par elle.
   */
  legendeIncomplete?: true;
  /**
   * Projet SCÉNOGRAPHIÉ : sa planche — l'enveloppe de ses Œuvres — entre grande
   * et se pose à sa boîte de maquette au défilement, au lieu d'être révélée par
   * le front d'encre. Un Projet n'a jamais les deux gestes (docs/adr/0005).
   *
   * Décidé dans la table CURATION de scripts/generer-projets.mjs, et contraint
   * par la résolution des sources : une planche est agrandie jusqu'à la largeur
   * de l'écran.
   */
  planche?: true;
  /**
   * Projet posé hors du cadre PORTEFOLIO dans Figma (Les Tables, Plateau de
   * Saclay, Les toits de Paris 2024, Affiche soirée italienne) : sa position
   * d'origine est inutilisable, celle du manifeste est une proposition à valider.
   */
  positionProposee?: true;
};
