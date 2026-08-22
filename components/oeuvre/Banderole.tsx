import type { Banderole as BanderoleModele } from "@/content/banderoles";
import { RAMPE } from "@/content/encre.generated";
import { asset as lireAsset, srcset } from "@/lib/assets";
import { courseEncre, masqueOeuvre } from "@/lib/encre";
import { pose, tailles } from "@/lib/echelle";

/**
 * Une Banderole posée dans le Collage, née invisible.
 *
 * Elle NAÎT invisible en styles inline (`opacity` + `visibility`, l'équivalent
 * du `autoAlpha` de GSAP) : rien ne flashe avant l'hydratation, l'état de
 * repos reste exactement la maquette — sans JavaScript elle n'existe pas à
 * l'écran. Elle ne porte PAS `data-revelation` : le <noscript> de
 * CollageDesktop la révélerait, et SurvolEncre / useRevelationEncre la
 * prendraient pour une pièce du Collage.
 *
 * Toute la géométrie se dérive des cercles de content/banderoles.ts, pour que
 * l'illustration de la banderole se superpose au pixel à celle qu'affiche
 * l'Œuvre ancre.
 *
 * ── Le masque, en deux couches unies ─────────────────────────────────────────
 * Le rond ne doit JAMAIS cesser d'être un rond : c'est l'identité du logo, et
 * le dissoudre en rectangle — même arrondi — donnait un panneau d'interface qui
 * grandit. Le masque est donc l'UNION de deux couches (`mask-composite: add`,
 * qui est d'ailleurs la valeur initiale) :
 *
 *   — `--disque`, un disque plein et fixe, toujours opaque. C'est lui, et lui
 *     seul, qu'on voit au repos : exactement le disque déjà à l'écran.
 *   — `--rampe`, la bande déchirée de lib/encre, celle qui révèle toutes les
 *     Œuvres du Collage. Elle traverse vers la droite quand `--deroule` va de
 *     0 à 1, et dépose le paysage, le titre et les contacts autour du rond.
 *
 * La progression s'appelle `--deroule` et non `--encre` : la Banderole est
 * enfant de l'<article>, dont elle hériterait la variable — elle se
 * découvrirait alors toute seule quand le Projet se révèle au défilement.
 *
 * Le sens est TOUJOURS « gauche » : une banderole se déroule vers la droite,
 * depuis son rond, quel que soit le bord de page dont son Projet est proche.
 */
export function Banderole({
  banderole,
  decalage,
}: {
  banderole: BanderoleModele;
  /** L'origine de la boîte de l'article, pour translater dans son référentiel. */
  decalage: { x: number; y: number };
}) {
  const asset = lireAsset("banderoles", banderole.fichier);
  if (!asset) {
    throw new Error(
      `Asset « banderoles/${banderole.fichier} » absent de content/assets.generated.ts. ` +
        `Déposer le PNG dans sources/banderoles/ puis lancer : bun run assets:optimiser`,
    );
  }

  const { cercle, cercleAffiche, rayonRepos } = banderole;
  // px maquette par px source : les illustrations coïncident à cette échelle.
  const k = cercleAffiche.r / cercle.r;
  const x = cercleAffiche.cx - cercle.cx * k;
  const y = cercleAffiche.cy - cercle.cy * k;
  const largeur = asset.largeur * k;
  const hauteur = asset.hauteur * k;

  /* Le disque toujours visible, en fractions de la boîte. Un `circle` de
     dégradé radial n'accepte pas de rayon en pourcentage ; une `ellipse` si —
     et deux pourcentages qui valent le même nombre de pixels ABSOLUS sur une
     boîte non carrée redonnent un cercle exact. La coupure est franche
     (99,5 % → 100 %) : un dégradé laisserait un halo. */
  const pc = (part: number) => `${Number((part * 100).toFixed(3))}%`;
  const disque =
    `radial-gradient(ellipse ${pc(rayonRepos / asset.largeur)} ${pc(rayonRepos / asset.hauteur)} ` +
    `at ${pc(cercle.cx / asset.largeur)} ${pc(cercle.cy / asset.hauteur)}, ` +
    `#000 99.5%, #0000 100%)`;

  /* Les bornes de la bande, calculées comme pour une Œuvre — sauf que la
     « planche » est ici la banderole elle-même, et la pièce occupe tout : le
     front la traverse d'un bord à l'autre. La course en découle, et le hook en
     déduira la durée : la main garde son allure, la banderole prend le temps
     que sa largeur mérite. */
  const bornes = masqueOeuvre(0, 0, { largeur, hauteur }, "gauche");

  const avif = srcset(asset.variantes, "avif");
  const webp = srcset(asset.variantes, "webp");
  const repli = asset.variantes.at(-1)!.fichier;

  return (
    <div
      className="maquette-pose"
      data-banderole=""
      // En px de maquette, comme `data-encre-course` sur l'article : une mesure
      // du DOM la donnerait à l'échelle de la scène, pas de la maquette.
      data-deroule-course={Math.round(courseEncre(largeur, hauteur))}
      aria-hidden
      style={{
        ...pose(x - decalage.x, y - decalage.y, largeur, hauteur),
        ...bornes,
        "--deroule": 0,
        "--disque": disque,
        "--rampe": `url(${RAMPE.fichier.gauche})`,
        "--rampe-l": RAMPE.largeur,
        "--rampe-h": RAMPE.hauteur,
        opacity: 0,
        visibility: "hidden",
      } as React.CSSProperties}
    >
      <picture>
        {avif && <source type="image/avif" srcSet={avif} sizes={tailles(largeur)} />}
        {webp && <source type="image/webp" srcSet={webp} sizes={tailles(largeur)} />}
        <img
          src={repli}
          alt={banderole.alt}
          width={asset.largeur}
          height={asset.hauteur}
          loading="lazy"
          decoding="async"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            maxWidth: "none",
          }}
        />
      </picture>
    </div>
  );
}
