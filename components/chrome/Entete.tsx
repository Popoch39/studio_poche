"use client";

import { usePathname } from "next/navigation";
import { Lettrage } from "./Lettrage";
import { LienVoile } from "./LienVoile";

/**
 * Coordonnées relevées dans Figma (référentiel 1728px), et pourcentages de
 * découpe dans la planche scannée `nav-*`.
 *
 * Les trois écrans de la maquette placent la navigation à 3px près les uns des
 * autres (à propos à 569, 572, 569). Un en-tête partagé ne peut pas être
 * différent d'une page à l'autre : on retient le jeu 569 / 818 / 1059, celui de
 * CONTACT et A PROPOS, qui sont d'accord entre eux.
 */
const LIENS = [
  {
    href: "/a-propos",
    texte: "À propos",
    planche: "nav-a-propos",
    pose: { x: 569, y: 65, largeur: 181, hauteur: 58 },
    crop: { l: -260.14, t: -121.84, w: 709.48, h: 1241.38 },
  },
  {
    href: "/portfolio",
    texte: "Portfolio",
    planche: "nav-portfolio",
    pose: { x: 818, y: 63, largeur: 191, hauteur: 82 },
    crop: { l: -385.02, t: -83.06, w: 668.99, h: 870.97 },
  },
  {
    href: "/contact",
    texte: "Contact",
    planche: "nav-contact",
    pose: { x: 1059, y: 66, largeur: 181, hauteur: 57 },
    crop: { l: -540.56, t: -124.14, w: 709.27, h: 1241.38 },
  },
] as const;

/** Les deux points de séparation, découpés dans la même planche. */
const POINTS = [
  { x: 731, y: 76, largeur: 78, hauteur: 54 },
  { x: 982, y: 76, largeur: 77, hauteur: 55 },
] as const;
const CROP_POINT = { l: -1022.9, t: -127.17, w: 1465.65, h: 1173.91 };

/**
 * Les trois icônes de réseaux sont trois découpes dans UN SEUL fichier scanné —
 * d'où les pourcentages extrêmes (jusqu'à 2461 %).
 *
 * TODO Marie : les URLs Instagram et LinkedIn ne figurent pas dans la maquette.
 */
const RESEAUX = [
  {
    texte: "Instagram",
    href: "https://www.instagram.com/",
    pose: { x: 1463, y: 52, largeur: 78, hauteur: 85 },
    crop: { l: -1561.76, t: -36.04, w: 1882.35, h: 972.97 },
    aVerifier: true,
  },
  {
    texte: "LinkedIn",
    href: "https://www.linkedin.com/",
    pose: { x: 1552, y: 52, largeur: 59, hauteur: 77 },
    crop: { l: -2173.08, t: -45.54, w: 2461.54, h: 1069.31 },
    aVerifier: true,
  },
  {
    texte: "Envoyer un courriel à Marie Pocheron",
    href: "mailto:mariepocheron@gmail.com",
    pose: { x: 1611, y: 62, largeur: 72, hauteur: 60 },
    crop: { l: -1850.53, t: -73.08, w: 2021.05, h: 1384.62 },
    aVerifier: false,
  },
] as const;

/**
 * L'ovale dessiné à la main qui entoure l'onglet actif. La maquette en contient
 * TROIS, un par onglet, chacun tracé différemment — c'est le propre du dessin à
 * la main. Seul celui d'« À propos » a pu être extrait avant l'épuisement du
 * quota MCP Figma.
 *
 * TODO : extraire les ovales de Portfolio (Vector 9) et Contact (Vector 10)
 * via scripts/extraire-figma.mjs, puis compléter cette table.
 */
const OVALES: Record<string, { fichier: string; x: number; y: number; largeur: number; hauteur: number }> = {
  "/a-propos": { fichier: "/img/svg/nav-ovale-a-propos.svg", x: 592, y: 69, largeur: 156, hauteur: 71 },
};

export function Entete() {
  const chemin = usePathname();
  const ovale = OVALES[chemin];

  return (
    <header
      className="maquette-pose"
      // `zIndex: 1` : les pages posent leur contenu dans un conteneur
      // `position: relative` qui vient APRÈS l'en-tête dans le DOM — à
      // `z-index: auto`, ce conteneur gagnerait le hit-test et les liens de
      // navigation seraient incliquables.
      style={{ "--x": 0, "--y": 0, "--l": 1728, "--h": 197, zIndex: 1 } as React.CSSProperties}
    >
      {/* TODO : le logo STUDIO POCHE (Figma « Calque_1 », 233×138 en x=45 y=44)
          est un groupe de vecteurs non encore extrait — quota MCP épuisé. */}

      <nav aria-label="Navigation principale">
        {ovale && (
          <img
            src={ovale.fichier}
            alt=""
            aria-hidden
            className="maquette-pose"
            style={
              {
                "--x": ovale.x,
                "--y": ovale.y,
                "--l": ovale.largeur,
                "--h": ovale.hauteur,
              } as React.CSSProperties
            }
          />
        )}

        {LIENS.map((l) => (
          // La navigation interne passe sous le Voile d'encre.
          <LienVoile key={l.href} href={l.href} aria-current={chemin === l.href ? "page" : undefined}>
            <Lettrage planche={l.planche} texte={l.texte} {...l.pose} crop={l.crop} />
          </LienVoile>
        ))}

        {POINTS.map((p, i) => (
          <Lettrage key={i} planche="nav-point" texte="" {...p} crop={CROP_POINT} decoratif />
        ))}
      </nav>

      <ul aria-label="Réseaux">
        {RESEAUX.map((r) => (
          <li key={r.texte}>
            <a
              href={r.href}
              {...(r.href.startsWith("http")
                ? { target: "_blank", rel: "noreferrer noopener" }
                : {})}
            >
              <Lettrage planche="nav-reseaux" texte={r.texte} {...r.pose} crop={r.crop} />
            </a>
          </li>
        ))}
      </ul>
    </header>
  );
}
