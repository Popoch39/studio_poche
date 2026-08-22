import { Oeuvre } from "@/components/oeuvre/Oeuvre";
import { TexteMaquette } from "@/components/chrome/TexteMaquette";
import { AVenir } from "@/components/chrome/AVenir";
import { Formulaire } from "@/components/contact/Formulaire";

export const metadata = {
  title: "Contact — Studio Poche",
  description:
    "Contacter Marie Pocheron, illustratrice, pour un projet d'illustration, " +
    "d'animation ou de conception graphique.",
};

/** Hauteur du cadre CONTACT dans Figma. */
const HAUTEUR = 1701;

/**
 * Positions relevées dans Figma via l'API REST (référentiel 1728px).
 * Corps et interlignage relevés eux aussi : 20/32 sur cet écran, à la différence
 * d'À propos qui est en 20/22.
 */
export default function Contact() {
  return (
    <div style={{ position: "relative", height: `calc(${HAUTEUR} * var(--u))` }}>
      {/* « ON TRAVAILLE ENSEMBLE ? » — du texte vectorisé (141 tracés), donc un
          SVG à tracer au DrawSVG. En attente du quota de rendu Figma. */}
      <AVenir x={515} y={249} largeur={688} hauteur={55} quoi="Calque_5 — titre « On travaille ensemble ? »" />

      <TexteMaquette x={630} y={393} largeur={457} fs={20} lh={32} centre>
        N’hésitez pas à me contacter pour collaborer sur un projet ensemble !
      </TexteMaquette>

      <TexteMaquette x={658} y={495} largeur={421} fs={20} lh={32} centre gras>
        {/* Rendu cliquable : l'apparence est identique à la maquette, mais une
            adresse qu'on peut ouvrir d'un clic vaut mieux qu'une à recopier. */}
        <a href="mailto:mariepocheron@gmail.com">mariepocheron@gmail.com</a>
        <br />
        <a href="tel:+33603288236">06 03 28 82 36</a>
      </TexteMaquette>

      <Oeuvre
        oeuvre={{
          fichier: "contact-flash-mouette-1",
          x: 451, y: 434, largeur: 225, hauteur: 157,
          alt: "Mouette dessinée à l’encre, ailes déployées",
          ajustement: "recadre",
          crop: { l: -133.22, t: -111.05, w: 243.19, h: 493.06 },
        }}
        priorite
      />
      <Oeuvre
        oeuvre={{
          // Les deux mouettes sont deux découpes de la MÊME planche scannée,
          // dont l'une retournée : un seul fichier, deux recadrages.
          fichier: "contact-flash-mouette-1",
          x: 1067, y: 434, largeur: 220, hauteur: 187,
          alt: "Mouette dessinée à l’encre, en vol",
          ajustement: "recadre",
          crop: { l: -164.26, t: -323.49, w: 264.26, h: 440.61 },
          miroir: true,
        }}
        priorite
      />

      {/* Le contour du formulaire, dessiné à la main : 1390×410 d'un seul tracé. */}
      <AVenir x={176} y={632} largeur={1390} hauteur={410} quoi="Vector 2 — contour du formulaire" />

      <TexteMaquette x={199} y={662} largeur={1333} fs={20} lh={32} centre>
        Formulaire de contact
      </TexteMaquette>

      <Formulaire
        succes={
          <>
            <Oeuvre
              oeuvre={{
                fichier: "contact-image-1",
                x: 535, y: 1083, largeur: 279.1, hauteur: 266,
                alt: "Cigogne dessinée à l’encre",
                ajustement: "recadre",
                crop: { l: -144.6, t: -145.62, w: 366.67, h: 544.21 },
              }}
            />
            <AVenir x={797} y={1241} largeur={406} hauteur={76} quoi="Vector 8 — bulle de dialogue" />
            <TexteMaquette x={891} y={1260} largeur={312} fs={20} lh={32}>
              Le message a été envoyé
            </TexteMaquette>
          </>
        }
      />
    </div>
  );
}
