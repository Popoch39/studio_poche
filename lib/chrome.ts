import { ECRANS } from "@/content/chrome";

type Ecran = keyof typeof ECRANS;

/**
 * Accès à la géométrie extraite de Figma.
 *
 * Chaque accesseur ÉCHOUE si l'élément a disparu de la maquette, plutôt que de
 * renvoyer undefined et de laisser un trou silencieux dans la page. Une maquette
 * qui change doit se signaler à la compilation, pas passer inaperçue.
 */

/** Le bloc de texte qui commence par `debut`. */
export function texte(ecran: Ecran, debut: string) {
  const t = ECRANS[ecran].textes.find((t) => t.texte.startsWith(debut));
  if (!t) {
    const dispo = ECRANS[ecran].textes.map((t) => `« ${t.texte.slice(0, 40)}… »`).join("\n    ");
    throw new Error(
      `Aucun texte commençant par « ${debut} » sur l'écran ${ecran}.\n  Disponibles :\n    ${dispo}\n` +
        `  Relancer : node scripts/extraire-figma.mjs && node scripts/generer-projets.mjs`,
    );
  }
  return t;
}

/** L'image dont le nom de nœud Figma est `nomFigma`. */
export function image(ecran: Ecran, nomFigma: string) {
  const i = ECRANS[ecran].images.find((i) => i.nomFigma.normalize("NFC") === nomFigma.normalize("NFC"));
  if (!i) {
    const dispo = ECRANS[ecran].images.map((i) => i.nomFigma).join(", ");
    throw new Error(`Image « ${nomFigma} » absente de l'écran ${ecran}.\n  Disponibles : ${dispo}`);
  }
  return i;
}

/** Le groupe vectoriel dessiné à la main dont le nom de nœud est `nomFigma`. */
export function vecteur(ecran: Ecran, nomFigma: string, indice = 0) {
  const tous = ECRANS[ecran].vecteurs.filter((v) => v.nomFigma === nomFigma);
  const v = tous[indice];
  if (!v) {
    const dispo = ECRANS[ecran].vecteurs.map((v) => v.nomFigma).join(", ");
    throw new Error(
      `Groupe vectoriel « ${nomFigma} »[${indice}] absent de l'écran ${ecran}.\n  Disponibles : ${dispo}`,
    );
  }
  return v;
}

export function hauteur(ecran: Ecran) {
  const h = ECRANS[ecran].hauteur;
  if (h === null) throw new Error(`Hauteur inconnue pour l'écran ${ecran}`);
  return h;
}
