import { TexteMaquette } from "@/components/chrome/TexteMaquette";
import { Dessin, ImageMaquette } from "@/components/chrome/Dessin";
import { CartesServices } from "@/components/apropos/CartesServices";
import { texte, hauteur } from "@/lib/chrome";

export const metadata = {
  title: "À propos — Studio Poche",
  description:
    "Marie Pocheron, illustratrice indépendante et fondatrice du Studio Poche : " +
    "illustration, graphisme et animation dessinés à la main.",
};

/**
 * L'écran À propos.
 *
 * Toute la géométrie vient de content/chrome.ts, généré depuis Figma. Les
 * métriques de texte de cet écran diffèrent du reste du site — corps 20 sur
 * interlignage 22, et 32/41 pour le chapô, là où Contact et les Légendes du
 * portfolio sont en 20/32. Les supposer aurait été faux.
 */
export default function APropos() {
  const chapo = texte("apropos", "Le Studio Poche crée");
  const presentation = texte("apropos", "Je suis Marie Pocheron");
  const parcours = texte("apropos", "Formée au design");

  return (
    <div style={{ position: "relative", height: `calc(${hauteur("apropos")} * var(--u))` }}>
      <TexteMaquette {...chapo} centre>
        Le <strong>Studio Poche</strong> crée des illustrations et animations
        dessinées à la main pour raconter le vivant, les savoirs-faire et les
        projets qui ont du sens.
      </TexteMaquette>

      {/* Séparateur dessiné, répété deux fois sur l'écran. */}
      <ImageMaquette ecran="apropos" nomFigma="présentation 2" alt="" />

      {/* Le cartouche « Le Studio » : un dessin encadré, son titre en lettrage
          vectorisé, et la flèche courbe qui pointe vers les cartes. */}
      <ImageMaquette ecran="apropos" nomFigma="Layer 0" alt="Paysage dessiné à l’encre : une ferme au pied d’un coteau" priorite />
      <Dessin ecran="apropos" nomFigma="Calque_4" role="cadre autour du dessin" />
      <Dessin ecran="apropos" nomFigma="Calque_2" indice={1} role="lettrage « Le Studio »" />
      <Dessin ecran="apropos" nomFigma="Calque_2" indice={0} role="flèche courbe vers les cartes" />

      <CartesServices />

      <ImageMaquette ecran="apropos" nomFigma="présentation 3" alt="" />

      <h2 className="sr-only">Présentation</h2>
      <ImageMaquette ecran="apropos" nomFigma="présentation 1" alt="Présentation" />
      <ImageMaquette
        ecran="apropos"
        nomFigma="phto profil 1"
        alt="Portrait de Marie Pocheron"
      />
      <TexteMaquette {...presentation}>
        Je suis <strong>Marie Pocheron</strong>, illustratrice indépendante et
        fondatrice du Studio Poche. À travers le dessin et l’animation, j’aide
        associations, structures culturelles, artisants et projets engagés à
        raconter leurs histoires et à transmettre leurs idées.
        <br />
        <br />
        Mon travail est entièrement dessiné à la main. J’aime créer des images
        sensibles qui rendent accessibles des sujets parfois complexes, qu’il
        s’agisse de biodiversité, de patrimoine, de savoir-faire ou de projets de
        territoire.
      </TexteMaquette>

      <h2 className="sr-only">Mon parcours</h2>
      <ImageMaquette ecran="apropos" nomFigma="Mon parcours 1" alt="Mon parcours" />
      <TexteMaquette {...parcours}>
        Formée au design d’espace et à l’illustration, j’ai développé au fil des
        années un regard attentif aux paysages, aux lieux et à ceux qui les
        habitent. Après plusieurs expériences dans les domaines du paysage et de
        l’architecture, j’ai choisi de me consacrer pleinement à l’illustration.
        <br />
        <br />
        Aujourd’hui, je mets cette sensibilité au service de projets qui ont du
        sens pour moi : la transmission, le vivant, la culture et les
        savoir-faire. J’aime particulièrement travailler avec des structures à
        taille humaine et construire avec elles des images uniques, adaptées à
        leur univers.
      </TexteMaquette>
    </div>
  );
}
