"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, ENCRE, CONDITIONS } from "./gsap";
import { enregistrerArrivee, signalerEncre } from "./arrivee";

/**
 * Le coup de pinceau : un front d'encre traverse le Projet et le révèle.
 *
 * Un seul geste pour tout le Collage. Ce qui varie d'une planche à l'autre,
 * c'est le bord par lequel l'encre attaque (la marge de page la plus proche) et
 * le temps qu'elle met à traverser — jamais la nature du geste. L'angle du
 * poignet, lui, ne change pas : il est cuit dans la rampe.
 *
 * Le front appartient au PROJET. Ce hook n'anime donc qu'une variable par
 * <article> — `--encre`, de 0 à 1 — et l'héritage CSS la distribue aux Œuvres,
 * dont les bornes de masque ont été dérivées au rendu par BlocProjet. Vingt-six
 * tweens pour cinquante-huit Œuvres, et surtout : sur une planche jointive, la
 * même bande déchirée traverse toutes les découpes d'un trait, si bien que les
 * joints ne s'ouvrent pas — ils disparaissent.
 *
 * La durée n'est pas réglée, elle se déduit : `course / ENCRE.vitesse`, bornée.
 * La main va toujours à la même allure.
 *
 * La révélation passe par un masque, et non par l'opacité : une Œuvre de Marie
 * ne doit jamais apparaître délavée, même une demi-seconde — c'est la matière
 * du dessin qui est le sujet. Seule la bande d'avancée est en alpha partiel,
 * et elle est déchirée : le dessin n'est pas pâle, il est mouillé sur son bord.
 *
 * Le front attend `img.decode()` : révéler un cadre dont les pixels n'existent
 * pas encore transformerait le geste en apparition brutale, à retardement — le
 * défilement lissé amplifie les grandes vitesses et rend ce cas fréquent.
 *
 * Les positions ne sont PAS animées ici : l'état de repos est exactement la
 * maquette. La profondeur au scroll appartient à ScrollSmoother (data-speed),
 * le calage de la feuille à useEntreePortfolio.
 */
export function useRevelationEncre<T extends HTMLElement = HTMLDivElement>({
  cible = "article",
  declencheur = "top 85%",
}: { cible?: string; declencheur?: string } = {}) {
  // Générique : le hook doit pouvoir s'attacher à un <ul>, un <section>…
  const conteneur = useRef<T>(null);

  useGSAP(
    (_, contextSafe) => {
      if (!contextSafe) return;
      // `gsap.utils.toArray` n'est PAS limité par le `scope` de `useGSAP` :
      // seules les chaînes passées directement aux méthodes GSAP le sont. Sans
      // ce second argument, le hook animerait les éléments de toute la page.
      const blocs = gsap.utils.toArray<HTMLElement>(cible, conteneur.current);
      if (blocs.length === 0) return;

      const mm = gsap.matchMedia();

      mm.add(`${CONDITIONS.mouvement} and ${CONDITIONS.collage}`, () => {
        for (const bloc of blocs) {
          /* Un Projet SCÉNOGRAPHIÉ n'a pas de front : sa planche se pose, et la
             pose EST sa révélation (docs/adr/0005). Le filtre est nécessaire, pas
             cosmétique : sans lui le hook y trouverait zéro Œuvre à mouiller,
             appellerait `signalerEncre` dès `top 85%`, et la Légende s'écrirait
             avant que la planche ne soit posée. Un signal, un propriétaire —
             c'est usePlanchePosee qui le donne. */
          if (bloc.querySelector("[data-planche]")) continue;

          const pieces = gsap.utils.toArray<HTMLElement>("[data-revelation]", bloc);
          // Sans Œuvre à mouiller, on libère quand même la Légende : personne
          // ne doit attendre un front qui ne partira jamais.
          if (pieces.length === 0) {
            signalerEncre(bloc);
            continue;
          }

          // La course vient du rendu (lib/encre) : elle est en px de maquette,
          // une mesure du DOM ne la donnerait pas.
          const course = Number(bloc.dataset.encreCourse ?? 0);
          const duree = gsap.utils.clamp(
            ENCRE.bornes.min,
            ENCRE.bornes.max,
            course / ENCRE.vitesse,
          );

          // Seule la CRÉATION du tween a besoin de `contextSafe` — surtout pas
          // la fonction async entière : sa Promise entrerait dans le contexte
          // GSAP et le corromprait.
          const passer = contextSafe(() => {
            const tl = gsap.timeline({
              // Le glissement du masque repeint ; on le déclare le temps du
              // geste seulement — un `will-change` permanent sur 58 Œuvres
              // réserverait des calques pour rien.
              onStart: () => gsap.set(pieces, { willChange: "mask-position" }),
            });
            tl.to(bloc, { "--encre": 1, duration: duree, ease: ENCRE.trait })
              // Une étape de timeline, et non `onComplete` : la hâte s'accroche
              // à `onComplete` pour se désenregistrer, et deux propriétaires du
              // même rappel, c'est l'un qui écrase l'autre en silence.
              .call(() => {
                gsap.set(pieces, { clearProps: "willChange" });
                signalerEncre(bloc);
              });
            enregistrerArrivee(tl);
          });

          ScrollTrigger.create({
            trigger: bloc,
            start: declencheur,
            once: true,
            onEnter: () => {
              void Promise.all(
                gsap.utils
                  .toArray<HTMLImageElement>("img", bloc)
                  .map((img) => img.decode().catch(() => undefined)),
              ).then(passer);
            },
          });
        }
      });

      return () => mm.revert();
    },
    { scope: conteneur },
  );

  return conteneur;
}
