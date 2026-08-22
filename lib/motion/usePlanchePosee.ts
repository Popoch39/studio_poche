"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, ScrollSmoother, ENCRE, CONDITIONS } from "./gsap";
import { signalerEncre } from "./arrivee";

/**
 * La planche qu'on pose : elle monte plein cadre — 100dvw × 100dvh, centrée à
 * l'écran — s'y immobilise, puis va s'ancrer sur sa boîte de maquette.
 *
 * ── Ce n'est PAS une révélation ────────────────────────────────────────────
 *
 * La version précédente ouvrait un `clip-path` : la planche se découvrait sur
 * place. C'était un sixième geste de révélation, et il a été rejeté à l'œil.
 * Ici la planche est ENTIÈRE du premier au dernier pixel du geste : ce qu'on
 * regarde n'est pas son apparition, c'est son DÉPLACEMENT vers son ancre. Elle
 * arrive par le seul défilement, comme n'importe quelle image du Collage —
 * simplement, elle occupe tout l'écran.
 *
 * Trois temps, et un seul scalaire (la progression du déclencheur) les porte :
 *
 *   montée     la planche remonte à 1:1 avec la page, plein cadre, jusqu'à ce
 *              que son centre atteigne le centre de l'écran
 *   maintien   elle y tient, épinglée au pixel : rien ne bouge
 *   pose       elle rétrécit et glisse jusqu'à son ancre
 *
 * ── L'échelle : cent pour cent de la HAUTEUR, quoi qu'il arrive ────────────
 *
 * `k = 100dvh / H`. La planche rendue fait donc exactement un écran de haut —
 * pas « au moins », exactement. Sa largeur est ce qu'elle est : rognée par le
 * viewport si son format est plus large que celui de la fenêtre, bordée de
 * papier sinon.
 *
 * Ce n'est pas une couverture (`max(100dvw/L, 100dvh/H)`), et c'est délibéré :
 * couvrir la largeur ferait dépasser `toits-de-paris-2026` de 28 % en hauteur
 * au format de référence, et c'est ce débord qu'on voyait. Une hauteur exacte
 * est une hauteur qu'on peut SNAPER : il y a un instant précis où la planche
 * est plein écran, et le geste s'y aimante.
 *
 * Le corollaire est que `k` peut valoir moins de 1 : `fresque-ambassade-suisse`
 * est déjà plus haute que l'écran à sa taille de repos, donc elle RÉTRÉCIT pour
 * tenir dans la hauteur, puis regrandit vers son ancre. C'est assumé — la règle
 * est la hauteur, pas l'agrandissement.
 *
 * Rien n'est rogné par nous : ce qui dépasse sort du viewport, et `.scene` (en
 * `overflow-x: clip`) contient le débord latéral. Plus de `clip-path` du tout.
 *
 * ── La verticale : rien ne dérive, jamais ──────────────────────────────────
 *
 * La plage se termine à l'instant où le centre NATUREL de la planche atteint le
 * centre de l'écran. Soit `r` le défilement restant jusque-là ; le centre rendu
 * vaut `dvh/2 + r + y`. On pose donc
 *
 *     y = −min(maintien + pose, r)
 *
 * une seule expression pour les trois temps :
 *
 *   pendant la MONTÉE (`r > maintien + pose`) `y` est constant : la planche est
 *   portée par le seul défilement, à 1:1. Aucune courbe, rien qui puisse
 *   saccader, et surtout aucun parallaxe — un plan qui avance à la vitesse de
 *   la page n'en est pas un.
 *
 *   ensuite `y = −r` : le centre rendu vaut `dvh/2`, constant. La planche est
 *   épinglée au centre de l'écran AU PIXEL, pendant le maintien ET pendant la
 *   pose. Le rétrécissement se fait donc autour du point où la planche doit
 *   finir : verticalement, elle ne se déplace pas, elle se resserre.
 *
 * À la fin `y` vaut 0, `x` vaut 0, l'échelle vaut 1 : la transformation est
 * l'IDENTITÉ. La planche est sur sa boîte de maquette au pixel par construction
 * — pas une soustraction juste, une transformation absente.
 *
 * La MONTÉE ne se règle pas, elle se déduit : la planche faisant exactement un
 * écran de haut, l'amener de « entièrement sous la ligne de flottaison » à
 * « centrée » demande exactement UN écran de défilement. La régler serait la
 * faire commencer visible.
 *
 * ── L'horizontale : c'est ELLE, le geste d'ancrage ─────────────────────────
 *
 * `x` va du centrage à l'écran (`dvw/2 − centre naturel`) à 0, pendant la pose
 * seulement. L'ADR 0005 refusait ce glissement latéral parce qu'il n'était
 * alors qu'un effet de bord d'un recentrage subi. Ici il EST ce qu'on regarde :
 * la planche quitte le centre de l'écran pour aller se ranger à sa place.
 *
 * ── L'aimantation ──────────────────────────────────────────────────────────
 *
 * Le plein écran n'est pas une position parmi d'autres : c'est LE moment du
 * geste. Un arrêt du défilement dans la dernière portion de la montée est donc
 * porté jusqu'à l'arrivée exacte (`ENCRE.planche.attraction`), et seulement
 * vers le bas — remonter ne doit rien rencontrer.
 *
 * Elle est écrite à la main, pas confiée au `snap` de ScrollTrigger : voir le
 * commentaire de `aimanter`, où sont consignées les deux configurations
 * essayées et ce que chacune casse.
 *
 * ── Pas de timeline ────────────────────────────────────────────────────────
 *
 * Tout est recalculé à chaque image depuis la géométrie courante. Une timeline
 * exigerait des durées, or une durée GSAP est un nombre figé à la création : au
 * redimensionnement les proportions des trois temps dériveraient de la course
 * réelle, et l'épingle — qui est une égalité entre une durée et un défilement —
 * serait fausse. Un seul scalaire lu du déclencheur, et aucune valeur figée.
 *
 * Aucun `pin` GSAP non plus : un `pin-spacer` n'aurait rien à pousser dans un
 * Collage en positions absolues, et au dé-pinnage l'article reviendrait à une
 * position qui a défilé pendant tout le pin.
 */
export function usePlanchePosee<T extends HTMLElement = HTMLDivElement>() {
  const conteneur = useRef<T>(null);

  useGSAP(
    () => {
      // `gsap.utils.toArray` n'est PAS limité par le `scope` de `useGSAP` :
      // seules les chaînes passées directement aux méthodes GSAP le sont.
      const planches = gsap.utils.toArray<HTMLElement>("[data-planche]", conteneur.current);
      if (planches.length === 0) return;

      const mm = gsap.matchMedia();

      mm.add(`${CONDITIONS.mouvement} and ${CONDITIONS.collage}`, () => {
        /* Une sonde en `position: fixed` posée sur <body>, dimensionnée en
           100dvw / 100dvh : c'est le CSS qui donne la mesure. Sur <body> et non
           dans la scène — `.scene` porte `container-type: inline-size`, donc un
           confinement de mise en page : elle devient le bloc conteneur de ses
           descendants `fixed`, et la sonde y mesurerait la scène. */
        const sonde = document.createElement("div");
        sonde.style.cssText =
          "position:fixed;top:0;left:0;width:100dvw;height:100dvh;" +
          "visibility:hidden;pointer-events:none";
        document.body.appendChild(sonde);
        const dvw = () => sonde.offsetWidth;
        const dvh = () => sonde.offsetHeight;

        /* La courbe du dépôt d'encre, en fonction : la pose n'est pas un tween,
           c'est une lecture. Un seul vocabulaire, aucune nouvelle CustomEase. */
        const courbe = gsap.parseEase(ENCRE.ease);

        /* Le JEU laissé de part et d'autre de la plage du déclencheur, en
           hauteurs d'écran. Ce n'est pas un réglage : les bornes ne portent
           aucune précision — elles disent « le geste peut être en cours » — et
           ce jeu garantit seulement qu'on est encore appelé de l'autre côté de
           l'ancre. Toute la justesse est dans `poser`. */
        const JEU = 0.5;

        /* Les compte-à-rebours d'aimantation en cours, à éteindre au démontage :
           un `setTimeout` qui survit à sa scène irait chercher une planche
           détachée. */
        const minuteurs: Array<() => void> = [];

        for (const planche of planches) {
          const article = planche.closest<HTMLElement>("article[data-slug]");
          if (!article) continue;

          /* `offsetWidth` / `offsetHeight` et non `getBoundingClientRect` : les
             premiers donnent la boîte de MISE EN PAGE, insensible aux
             transformations. Une fois la planche à l'échelle, le rect serait
             celui de la planche agrandie et tout le calage serait faux. Lus à
             chaque appel : ils sont en `--u`, donc ils suivent la fenêtre. */
          const largeur = () => planche.offsetWidth;
          const hauteur = () => planche.offsetHeight;

          /** L'abscisse du centre naturel de la planche. Insensible au défilement. */
          const centreX = () =>
            article.getBoundingClientRect().x + planche.offsetLeft + largeur() / 2;

          /**
           * L'ordonnée du haut de la planche dans le DOCUMENT, par la chaîne des
           * `offsetTop` — jamais par `getBoundingClientRect`.
           *
           * C'est LA leçon de ce hook. Un rect traverse toutes les
           * transformations des ancêtres, et le Collage en porte deux :
           * `useEntreePortfolio` met la feuille entière à `scale(1.04)` DANS
           * l'effet de layout, donc avant la première peinture — et c'est
           * précisément là que ScrollTrigger calcule ses `start` / `end` —, et
           * `useFremissementVelocite` la gauchit d'un `skewY` à chaque coup de
           * molette. Mesurée au rect, une planche à 2800 px du haut de la
           * feuille arrive 112 px trop bas : 4 % de 2800. C'est l'écart qu'on
           * voyait, la planche ne se collant ni au haut ni au bas de l'écran.
           *
           * La chaîne des offsets, elle, est de la MISE EN PAGE pure : aucune
           * transformation n'y entre.
           */
          const hautDoc = () => {
            let y = 0;
            for (let n: HTMLElement | null = planche; n; n = n.offsetParent as HTMLElement | null) {
              y += n.offsetTop;
            }
            return y;
          };

          /**
           * Le défilement auquel la transformation doit être l'IDENTITÉ : le
           * centre naturel de la planche est alors au centre de l'écran.
           * Toute la géométrie du geste se lit par rapport à ce point.
           */
          const ancre = () => hautDoc() + hauteur() / 2 - dvh() / 2;

          /**
           * La géométrie du geste, entièrement dérivée de la fenêtre et de la
           * boîte de mise en page. Aucune de ces valeurs n'est stockée : elles
           * sont relues à chaque image, donc un redimensionnement en cours de
           * geste reste juste.
           */
          const geometrie = () => {
            const V = dvh();
            /* CENT POUR CENT DE LA HAUTEUR, quoi qu'il arrive. La planche rendue
               fait donc exactement 100dvh — sa largeur, elle, est ce qu'elle
               est : rognée par le viewport si son format est plus large que
               celui de la fenêtre, bordée de papier sinon. */
            const k = V / hauteur();
            /* La montée se déduit : de « entièrement sous la ligne de
               flottaison » à « centrée à l'écran ». La planche faisant
               exactement un écran de haut, c'est exactement un écran. */
            const montee = V;
            const maintien = V * ENCRE.planche.maintien;
            const pose = V * ENCRE.planche.pose;
            return { k, montee, maintien, pose, course: montee + maintien + pose };
          };

          /**
           * Ce qu'il reste à défiler quand la planche vient d'atteindre le plein
           * écran : le maintien puis la pose. C'est le repère du snap.
           */
          const plateau = () => {
            const { maintien, pose } = geometrie();
            return maintien + pose;
          };

          /**
           * L'état de la planche au défilement `s`.
           *
           * Un seul scalaire gouverne tout : `restant`, la distance qui sépare
           * encore la planche de son ancre. Il est MESURÉ — `ancre() − s` — et
           * non déduit de la progression du déclencheur. La différence n'est pas
           * théorique : elle vaut les 112 px décrits plus haut, et elle rend le
           * calage insensible à tout décalage de `start` / `end`.
           *
           * Borné à zéro : passé l'ancre, `restant` vaut 0, donc `y` vaut 0,
           * l'échelle vaut 1 et le centrage est retombé — l'identité, et elle y
           * reste quoi qu'il arrive ensuite.
           */
          const poser = (s: number) => {
            const { k, maintien, pose } = geometrie();
            const restant = Math.max(0, ancre() - s);
            /* La part de pose accomplie : 0 pendant la montée et le maintien. */
            const t = courbe(gsap.utils.clamp(0, 1, 1 - restant / pose));
            gsap.set(planche, {
              x: (dvw() / 2 - centreX()) * (1 - t),
              y: -Math.min(maintien + pose, restant),
              scale: k + (1 - k) * t,
              transformOrigin: "50% 50%",
            });
            return t;
          };

          let signale = false;

          /* ── L'AIMANTATION ────────────────────────────────────────────────
             Le plein écran n'est pas une position parmi d'autres : c'est LE
             moment du geste, et on ne veut pas qu'il se traverse à moitié. Dès
             que le défilement s'ARRÊTE dans la dernière portion de la montée,
             il est porté jusqu'à l'arrivée exacte.

             Écrite à la main, et non avec le `snap` de ScrollTrigger. Celui-ci
             a été essayé dans les deux configurations possibles — porté par le
             déclencheur du geste, puis par un déclencheur dédié à la seule zone
             — et il se bat avec ScrollSmoother dans les deux cas : il tween la
             position de défilement pendant que le lisseur la tient encore, donc
             il la ramène à une valeur périmée. Mesuré : un défilement
             programmatique sur deux annulé, et surtout, en remontant, un blocage
             DUR au plein écran que ni `directional` ni un filtre sur
             `self.direction` ne lèvent — le second geste vers le haut ne passait
             pas. Un visiteur ne pouvait plus remonter le Collage.

             Le remède tient en une phrase : on ne dispute pas la position au
             lisseur, on la lui DEMANDE. `smoother.scrollTo(cible, true)` pose
             une nouvelle destination et laisse ScrollSmoother l'atteindre avec
             sa propre courbe ; le moindre coup de molette reprend la main
             aussitôt, puisque c'est le même mécanisme qui porte les deux. */
          let minuteur = 0;
          let precedent = 0;
          minuteurs.push(() => window.clearTimeout(minuteur));

          const aimanter = (s: number, versLeBas: boolean) => {
            window.clearTimeout(minuteur);
            /* Pas de délai fixe : `onUpdate` bat tant que le lisseur bouge, donc
               ce compte à rebours n'arrive au bout que lorsque la page est
               VRAIMENT au repos. C'est plus juste qu'un `delay` deviné. */
            minuteur = window.setTimeout(() => {
              if (!versLeBas) return;
              const cible = ancre() - plateau();
              if (s < cible - ENCRE.planche.attraction * dvh() || s >= cible) return;
              ScrollSmoother.get()?.scrollTo(cible, true);
            }, 140);
          };

          ScrollTrigger.create({
            trigger: article,
            /* Des BORNES NUMÉRIQUES, et non « top bottom-=… ». Une borne en
               mots demande à ScrollTrigger de mesurer le déclencheur, donc de
               prendre un rect — et un rect traverse le `scale(1.04)` de
               l'entrée, posé avant la première peinture, au moment même où
               ScrollTrigger se rafraîchit. Ici tout se lit depuis `ancre()`,
               calculée par la chaîne des offsets : de la mise en page pure.

               Du JEU de part et d'autre, parce que ces bornes ne portent plus
               aucune précision : elles disent seulement « le geste peut être en
               cours ». La justesse est ailleurs, dans `poser`. Le jeu garantit
               qu'on est appelé au-delà de l'ancre — sans quoi un déclencheur qui
               finirait trop tôt figerait la planche à côté de sa boîte. */
            start: () => ancre() - geometrie().course - JEU * dvh(),
            end: () => ancre() + JEU * dvh(),
            // `true` et non un nombre : ScrollSmoother lisse déjà à 1,1 s, un
            // second retard rendrait le geste pâteux.
            scrub: true,
            invalidateOnRefresh: true,
            // `onRefresh` autant que `onUpdate` : au chargement comme après un
            // redimensionnement, personne n'a encore défilé et la planche doit
            // déjà porter son état — sinon elle entre dans le champ à sa taille
            // de repos et saute au plein écran au premier pixel de défilement.
            onRefresh: (self) => poser(self.scroll()),
            onUpdate: (self) => {
              const s = self.scroll();
              const t = poser(s);
              aimanter(s, s > precedent);
              precedent = s;
              if (signale || t < ENCRE.planche.posee) return;
              signale = true;
              signalerEncre(article);
            },
          });
        }

        return () => {
          for (const arreter of minuteurs) arreter();
          sonde.remove();
          /* Les `gsap.set` de `poser` sont émis depuis un rappel, donc APRÈS la
             fenêtre de collecte du contexte : `mm.revert()` ne les connaît pas
             et les styles en ligne survivraient au démontage. On les retire à la
             main — le repos d'une planche est l'absence de transformation. */
          gsap.set(planches, { clearProps: "transform" });
        };
      });

      return () => mm.revert();
    },
    { scope: conteneur },
  );

  return conteneur;
}
