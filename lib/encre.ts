import { RAMPE } from "@/content/encre.generated";
import { MAQUETTE } from "@/lib/echelle";

/**
 * La géométrie du front d'encre — le seul geste de révélation du Collage.
 *
 * Le front appartient au PROJET, pas à l'Œuvre : une seule bande déchirée
 * traverse toute la planche, et chaque Œuvre n'y découpe que sa part. C'est ce
 * qui fait qu'une planche jointive (VEJA × MILK : cinq découpes bord à bord)
 * se révèle comme une feuille unique qu'on mouille, au lieu de se découdre à
 * ses joints.
 *
 * Le mécanisme. La rampe (content/encre.generated.ts) est une longue bande
 * opaque d'un côté, transparente de l'autre, déchirée entre les deux. On la
 * pose en `mask-image` sur chaque Œuvre et on la fait GLISSER : `--encre` va de
 * 0 à 1, et `mask-position` interpole de `--m0` à `--m1`. Comme les bornes de
 * chaque Œuvre tiennent compte de sa position dans le Projet, toutes les
 * Œuvres voient passer la MÊME bande, au même instant, à la même place. Le
 * front partagé n'est donc pas une synchronisation à écrire : c'est de
 * l'arithmétique posée au rendu.
 *
 * Le décalage entre Œuvres n'est plus un `stagger` par indice : une pièce plus
 * loin sur l'axe est mouillée plus tard PARCE QU'ELLE EST PLUS LOIN.
 *
 * Toutes les valeurs sont en px de maquette — jamais en px d'image ni en
 * pourcentages : `--u` fait la conversion à l'affichage, et les pourcentages
 * d'un `mask-position` se résoudraient contre la boîte de chaque Œuvre, ce qui
 * briserait précisément la continuité qu'on cherche.
 */

/** Par quel bord l'encre attaque. */
export type SensEncre = "gauche" | "droite";

/**
 * Le bord d'attaque d'un Projet : la marge de page dont il est le plus proche.
 * La planche se remplit depuis les bords du papier vers son centre — et deux
 * Projets voisins calés de part et d'autre se répondent en miroir sans qu'on
 * ait rien à écrire.
 */
export function sensEncre(x: number, largeur: number): SensEncre {
  return x + largeur / 2 <= MAQUETTE / 2 ? "gauche" : "droite";
}

/**
 * La course du front, en px de maquette. Elle vaut la largeur du Projet, plus
 * la bande (qui doit entrer et sortir entièrement), plus le débattement de la
 * pente sur la hauteur — un bord incliné arrive en bas plus tard qu'en haut.
 *
 * C'est cette course, divisée par `ENCRE.vitesse`, qui donne la durée : la main
 * va toujours à la même allure, ce sont les grandes planches qui prennent le
 * temps qu'elles méritent.
 */
export function courseEncre(largeur: number, hauteur: number): number {
  return largeur + RAMPE.bande + hauteur * RAMPE.pente;
}

/**
 * Les variables du front, posées sur l'<article> du Projet. `--encre` est la
 * progression, de 0 à 1 : c'est la SEULE valeur que GSAP anime, et l'héritage
 * CSS la distribue à toutes les Œuvres de la planche — un tween par Projet,
 * pas un par Œuvre.
 */
export function frontProjet(sens: SensEncre) {
  return {
    "--encre": 0,
    "--rampe": `url(${RAMPE.fichier[sens]})`,
    "--rampe-l": RAMPE.largeur,
    "--rampe-h": RAMPE.hauteur,
  } as React.CSSProperties;
}

/**
 * Les bornes de masque d'une Œuvre, dans le référentiel de son Projet.
 *
 * `--m0` place la rampe de sorte que l'Œuvre soit ENTIÈREMENT en deçà de la
 * bande (rien n'est mouillé) ; `--m1`, entièrement au-delà (tout l'est). Entre
 * les deux, `mask-position` interpole et la bande traverse. Les deux sens
 * n'échangent pas leurs bornes : la rampe « droite » est une image distincte,
 * dont la pente reste orientée dans le même sens absolu.
 */
export function masqueOeuvre(
  ox: number,
  oy: number,
  projet: { largeur: number; hauteur: number },
  sens: SensEncre,
) {
  const { blanc, bande, pente } = RAMPE;
  const debattement = projet.hauteur * pente;
  const [m0, m1] =
    sens === "gauche"
      ? [-(ox + blanc + bande + debattement), projet.largeur - ox - blanc]
      : [projet.largeur - ox, -(ox + bande + debattement)];
  return {
    "--m0": Number(m0.toFixed(2)),
    "--m1": Number(m1.toFixed(2)),
    "--my": Number((-oy).toFixed(2)),
  } as React.CSSProperties;
}
