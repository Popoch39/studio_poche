import type { Metadata } from "next";
import { Source_Code_Pro } from "next/font/google";
import { ScrollLisse } from "@/components/collage/ScrollLisse";
import { VoileEncre } from "@/components/chrome/VoileEncre";
import { CurseurEncre } from "@/components/chrome/CurseurEncre";
import { SurvolEncre } from "@/components/chrome/SurvolEncre";
import "./globals.css";

/* Source Code Pro : relevée dans la maquette Figma comme la police de tout le
   texte courant. Medium (500) pour les titres de légende, Light Italic (300)
   pour la ligne « année - contexte ». Le lettrage manuscrit, lui, n'est pas une
   police mais des images scannées — voir docs/adr/0002. */
const policeTexte = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--police-texte",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Studio Poche — Marie Pocheron, illustratrice",
  description:
    "Le Studio Poche crée des illustrations et animations dessinées à la main " +
    "pour raconter le vivant, les savoir-faire et les projets qui ont du sens.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /* La classe de next/font est posée sur <html>, PAS sur <body>.
       `--font-texte` est déclarée sur :root (par @theme) et référence
       `--police-texte`. La valeur calculée d'une propriété personnalisée
       substitue ses var() imbriquées là où elle est DÉCLARÉE : si
       `--police-texte` n'existe pas sur :root, `--font-texte` devient invalide
       et font-family retombe silencieusement sur la pile par défaut. */
    <html lang="fr" className={policeTexte.variable}>
      <body>
        {/* Le lisseur ENVELOPPE .scene : son cadre est un `position: fixed`,
            et le confinement de `.scene` (container-type) en ferait sinon le
            bloc conteneur — un « fixe » accroché à un élément qui défile.
            Voir ScrollLisse. */}
        <ScrollLisse>
          {/* .scene porte le conteneur de requête, .scene-contenu porte --u :
              une requête de conteneur ne peut pas s'interroger elle-même. */}
          <div className="scene">
            <div className="scene-contenu">{children}</div>
          </div>
        </ScrollLisse>
        {/* Fixes à l'écran : FRÈRES du lisseur, hors du confinement de .scene
            et hors du contenu transformé. */}
        <VoileEncre />
        <CurseurEncre />
        <SurvolEncre />
      </body>
    </html>
  );
}
