"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, SplitText, ENCRE, CONDITIONS } from "./gsap";
import { attendreEncre } from "./arrivee";

/**
 * Les Légendes s'écrivent quand le front d'encre a fini de traverser leur
 * Projet : on décrit ce qu'on vient de poser, dans cet ordre-là. Comme la durée
 * du front se déduit de la taille de la planche, une grande planche fait
 * naturellement attendre sa Légende — le rythme du Collage respire tout seul,
 * sans qu'aucun délai soit réglé à la main.
 *
 * Le rendez-vous passe par le protocole d'arrivée (arrivee.ts) plutôt que par
 * une fusion des deux hooks : chaque animation reste chez elle.
 *
 * Le titre est découpé par SplitText — `words,chars` : les mots (inline-block)
 * préservent le réenroulement naturel, les caractères portent l'effet — et
 * chaque caractère apparaît FRANCHEMENT (durée quasi nulle, décalage en
 * cascade) : une plume dépose des traits nets, elle ne fond pas au blanc. La
 * seconde ligne (année et contexte) suit d'un bloc. Une fois écrite, la
 * Légende reste : c'est l'entrée qui s'anime, jamais la présence.
 *
 * Accessibilité : SplitText pose l'aria tout seul (`aria-label` sur le <p>,
 * `aria-hidden` sur les spans) — comportement par défaut depuis la 3.13.
 *
 * `autoSplit` : la police est en `display: swap` — si elle bascule après le
 * découpage, SplitText redécoupe et `onSplit` reconstruit l'écriture sur les
 * nouveaux caractères, déjà écrite si elle avait joué.
 */
export function useLegendesEcrites<T extends HTMLElement = HTMLDivElement>({
  cible = "article",
}: { cible?: string } = {}) {
  // Générique : le hook doit pouvoir s'attacher à un <ul>, un <section>…
  const conteneur = useRef<T>(null);

  useGSAP(
    (_, contextSafe) => {
      if (!contextSafe) return;
      // `gsap.utils.toArray` n'est PAS limité par le `scope` de `useGSAP` :
      // seules les chaînes passées directement aux méthodes GSAP le sont.
      const blocs = gsap.utils.toArray<HTMLElement>(cible, conteneur.current);
      if (blocs.length === 0) return;

      const mm = gsap.matchMedia();

      mm.add(`${CONDITIONS.mouvement} and ${CONDITIONS.collage}`, () => {
        const splits: SplitText[] = [];

        for (const bloc of blocs) {
          const titre = bloc.querySelector<HTMLElement>(".maquette-texte p:first-child");
          if (!titre) continue;
          const suite = titre.nextElementSibling;

          // Avant l'hydratation, c'est la CSS qui cache la Légende entière
          // (globals.css, état d'avant la révélation). Dès que l'écriture
          // caractère par caractère prend le relais — dans ce même tick, sans
          // peinture entre les deux — on rend sa visibilité au conteneur :
          // l'aria-label du titre reste exposé, seuls les caractères attendent.
          gsap.set(titre.parentElement, { visibility: "inherit" });

          let ecriture: gsap.core.Tween | undefined;
          let joue = false;

          splits.push(
            SplitText.create(titre, {
              type: "words,chars",
              autoSplit: true,
              onSplit(self) {
                // Re-découpage après bascule de police : si l'écriture a déjà
                // joué, les caractères restent simplement posés.
                if (joue) return gsap.set(self.chars, { autoAlpha: 1 });
                gsap.set(self.chars, { autoAlpha: 0 });
                ecriture = gsap.to(self.chars, {
                  autoAlpha: 1,
                  duration: 0.01,
                  stagger: { amount: ENCRE.duree.ecrit },
                  paused: true,
                });
                return ecriture;
              },
            }),
          );
          if (suite) gsap.set(suite, { autoAlpha: 0 });

          // Seule la CRÉATION du tween a besoin de `contextSafe` — surtout pas
          // la fonction async : sa Promise entrerait dans le contexte GSAP et
          // le corromprait.
          const ecrire = contextSafe(() => {
            joue = true;
            ecriture?.play();
            if (suite) {
              gsap.to(suite, {
                autoAlpha: 1,
                duration: 0.01,
                delay: ENCRE.duree.ecrit + ENCRE.decalage,
              });
            }
          });

          ScrollTrigger.create({
            trigger: bloc,
            start: "top 80%",
            once: true,
            // Le déclencheur ouvre l'attente ; c'est l'encre qui donne le
            // départ. Elle finit toujours par passer : useRevelationEncre
            // signale même un Projet sans Œuvre à mouiller.
            onEnter: () => void attendreEncre(bloc).then(ecrire),
          });
        }

        // Les tweens et ScrollTriggers appartiennent au contexte ; les splits,
        // eux, doivent être défaits à la main.
        return () => splits.forEach((s) => s.revert());
      });

      return () => mm.revert();
    },
    { scope: conteneur },
  );

  return conteneur;
}
