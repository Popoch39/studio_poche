"use client";

import { useState } from "react";
import { envoyer, valider, type Message } from "./envoyer";

/**
 * Le formulaire de contact.
 *
 * La maquette est incomplète ici : elle ne contient que le contour dessiné à la
 * main, le titre, et les deux libellés « Nom : » et « Email : ». Ni zone de
 * message, ni bouton d'envoi — les deux tiers du cadre sont vides. Le champ
 * Message et le bouton sont donc conçus, pas transcrits, dans le même
 * vocabulaire graphique (soulignement dessiné, libellés au même gabarit).
 *
 * Positions relevées dans Figma (référentiel 1728px) :
 *   contour dessiné   176,5 / 632   1389,75 × 410,38   (Vector 2), donc y 632→1042
 *   « Formulaire… »     199 / 662   1333 de large
 *   « Nom : »           238 / 744    463 de large
 *   « Email : »         238 / 794    463 de large
 *
 * Tout ce qui est ajouté (zone Message, bouton) doit tenir DANS le contour
 * dessiné : un champ qui dépasse de la boîte tracée à la main se voit
 * immédiatement.
 */
const BOITE = { haut: 632, bas: 1042 };

const CHAMPS = [
  { cle: "nom", libelle: "Nom", y: 744, hauteur: 40, type: "text", auto: "name" },
  { cle: "email", libelle: "Email", y: 794, hauteur: 40, type: "email", auto: "email" },
  // Ajouté : absent de la maquette, indispensable à un formulaire de contact.
  { cle: "message", libelle: "Message", y: 844, hauteur: 110, type: "textarea", auto: "off" },
] as const;

const X_LIBELLE = 238;
const LARGEUR_LIBELLE = 463;
const X_CHAMP = 420;
/** 420 + 1080 = 1500, à l'intérieur du bord droit du contour (1566). */
const LARGEUR_CHAMP = 1080;
const BOUTON = { x: 700, y: 972, largeur: 320, hauteur: 50 };

type Etat = "repos" | "envoi" | "succes";

export function Formulaire({ succes }: { succes: React.ReactNode }) {
  const [message, setMessage] = useState<Message>({ nom: "", email: "", message: "" });
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Message, string>>>({});
  const [etat, setEtat] = useState<Etat>("repos");

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    const trouvees = valider(message);
    setErreurs(trouvees);
    if (Object.keys(trouvees).length > 0) return;

    setEtat("envoi");
    const r = await envoyer(message);
    if (r.ok) setEtat("succes");
    else {
      setEtat("repos");
      setErreurs({ message: r.erreur });
    }
  }

  if (etat === "succes") {
    /* L'état de succès de la maquette : la cigogne et sa bulle « Le message a
       été envoyé ». Les visuels sont fournis par l'écran, qui seul connaît leurs
       positions de maquette — le formulaire ne fait que décider du moment. */
    return <div role="status">{succes}</div>;
  }

  return (
    <form onSubmit={soumettre} noValidate>
      {CHAMPS.map((c) => {
        const erreur = erreurs[c.cle];
        const idErreur = `${c.cle}-erreur`;
        return (
          <div key={c.cle}>
            <label
              htmlFor={c.cle}
              className="maquette-pose maquette-texte"
              style={
                {
                  "--x": X_LIBELLE,
                  "--y": c.y,
                  "--l": LARGEUR_LIBELLE,
                  "--h": "auto",
                  height: "auto",
                } as React.CSSProperties
              }
            >
              {c.libelle} :
            </label>

            {c.type === "textarea" ? (
              <textarea
                id={c.cle}
                name={c.cle}
                rows={4}
                value={message[c.cle]}
                onChange={(e) => setMessage({ ...message, [c.cle]: e.target.value })}
                aria-invalid={erreur ? true : undefined}
                aria-describedby={erreur ? idErreur : undefined}
                className="maquette-pose maquette-texte champ"
                style={{ "--x": X_CHAMP, "--y": c.y, "--l": LARGEUR_CHAMP, "--h": c.hauteur } as React.CSSProperties}
              />
            ) : (
              <input
                id={c.cle}
                name={c.cle}
                type={c.type}
                autoComplete={c.auto}
                value={message[c.cle]}
                onChange={(e) => setMessage({ ...message, [c.cle]: e.target.value })}
                aria-invalid={erreur ? true : undefined}
                aria-describedby={erreur ? idErreur : undefined}
                className="maquette-pose maquette-texte champ"
                style={{ "--x": X_CHAMP, "--y": c.y, "--l": LARGEUR_CHAMP, "--h": c.hauteur } as React.CSSProperties}
              />
            )}

            {erreur && (
              <p
                id={idErreur}
                className="maquette-pose maquette-texte"
                style={
                  {
                    "--x": X_CHAMP,
                    "--y": c.y + c.hauteur,
                    "--l": LARGEUR_CHAMP,
                    "--h": "auto",
                    "--fs": 16,
                    "--lh": 24,
                    height: "auto",
                    fontStyle: "italic",
                  } as React.CSSProperties
                }
              >
                {erreur}
              </p>
            )}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={etat === "envoi"}
        className="maquette-pose maquette-texte bouton-encre"
        style={
          {
            "--x": BOUTON.x,
            "--y": BOUTON.y,
            "--l": BOUTON.largeur,
            "--h": BOUTON.hauteur,
          } as React.CSSProperties
        }
      >
        {etat === "envoi" ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );
}

/* Garde-fou de composition : tout ce qui est ajouté doit tenir dans le contour
   dessiné à la main. Vérifié au chargement du module, donc au build. */
{
  const bas = Math.max(
    ...CHAMPS.map((c) => c.y + c.hauteur),
    BOUTON.y + BOUTON.hauteur,
  );
  if (bas > BOITE.bas) {
    throw new Error(
      `Le formulaire déborde du contour dessiné : ${bas} > ${BOITE.bas} (px de maquette).`,
    );
  }
}
