/**
 * L'envoi du formulaire, isolé derrière cette fonction et rien d'autre.
 *
 * Le back-end est volontairement mocké : le site est livré en export statique,
 * sans serveur. Brancher un vrai service (Formspree, Resend, une fonction
 * serverless…) consiste à remplacer le corps de cette fonction — aucun composant
 * n'a besoin de changer.
 */
export type Message = { nom: string; email: string; message: string };

export type Resultat = { ok: true } | { ok: false; erreur: string };

/** Délai simulé, pour que l'état « envoi en cours » soit réellement traversé. */
const LATENCE_SIMULEE_MS = 900;

export async function envoyer(message: Message): Promise<Resultat> {
  await new Promise((ok) => setTimeout(ok, LATENCE_SIMULEE_MS));

  if (process.env.NODE_ENV !== "production") {
    console.info("[mock] message qui serait envoyé :", message);
  }
  return { ok: true };
}

/**
 * Validation côté client. Les messages sont rédigés pour être lus par un
 * visiteur, pas par un développeur.
 */
export function valider(m: Message): Partial<Record<keyof Message, string>> {
  const erreurs: Partial<Record<keyof Message, string>> = {};

  if (!m.nom.trim()) erreurs.nom = "Indiquez votre nom.";

  const email = m.email.trim();
  if (!email) erreurs.email = "Indiquez votre adresse email.";
  // Volontairement permissif : une expression rationnelle stricte rejette des
  // adresses valides, et le seul vrai test est l'envoi.
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    erreurs.email = "Cette adresse email semble incomplète.";

  if (!m.message.trim()) erreurs.message = "Écrivez votre message.";

  return erreurs;
}
