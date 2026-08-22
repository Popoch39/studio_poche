"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, ENCRE, CONDITIONS } from "./gsap";

/**
 * Le déroulement de la Banderole : au survol de son Œuvre ancre, la banderole
 * complète se déroule depuis le cercle vers la droite, par-dessus les voisins,
 * et se ré-enroule à la sortie — une banderole de marché qu'on déplie.
 *
 * Le geste : le rond reste un rond, et le paysage vient à lui. La banderole
 * est masquée par l'UNION d'un disque fixe et de la bande d'encre déchirée du
 * Collage (voir Banderole.tsx et globals.css) ; le survol ne fait glisser que
 * cette bande, `--deroule` de 0 à 1. Au repos on ne voit donc que le disque —
 * exactement celui qui est déjà à l'écran — puis le front traverse vers la
 * droite et dépose le reste autour de lui.
 *
 * Pourquoi ce geste et pas un déroulement de clip : un clip qui grandit, même
 * arrondi, dissout le rond en rectangle dès le premier tiers — un panneau
 * d'interface qui s'ouvre, avec des bords géométriques qu'on ne trouve nulle
 * part ailleurs sur le site. Ici la Banderole se révèle comme une Œuvre : même
 * rampe, même ease, même allure de main.
 *
 * La durée n'est pas réglée, elle se DÉDUIT : `course / ENCRE.vitesse`, bornée
 * — la course est posée au rendu, en px de maquette. Une banderole plus large
 * prendrait plus de temps, parce que la main y aurait plus de chemin.
 *
 * AUCUNE transformation (ni `scale`, ni `rotation`) : à l'instant de la prise,
 * la banderole est superposée à un disque immobile — le moindre frémissement
 * le dédouble et se voit immédiatement.
 *
 * L'ancre porte `data-survol-propre` : SurvolEncre lui cède le survol, sinon
 * `soulever` (y, scale, rotation) désaxerait le raccord des cercles. Ce hook
 * possède tout ce qui touche la banderole, plus le zIndex de l'ARTICLE —
 * jamais celui des pièces, qui appartient à `soulever`.
 *
 * Le déroulement attend `img.decode()` (même raison que useRevelationEncre) ;
 * un ScrollTrigger préchauffe le décodage à l'approche pour que le premier
 * survol soit chaud. Sous `prefers-reduced-motion` : rien — c'est un
 * enrichissement de survol pur, le repos (la maquette) suffit.
 */
export function useDeroulementBanderole<T extends HTMLElement = HTMLDivElement>() {
  const conteneur = useRef<T>(null);

  useGSAP(
    () => {
      // Voir useRevelationEncre : `toArray` n'est pas limité par le `scope`.
      const banderoles = gsap.utils.toArray<HTMLElement>("[data-banderole]", conteneur.current);
      if (banderoles.length === 0) return;

      const mm = gsap.matchMedia();

      mm.add(
        `${CONDITIONS.mouvement} and ${CONDITIONS.collage} and ${CONDITIONS.pointeurFin}`,
        () => {
          const nettoyages: Array<() => void> = [];

          for (const banderole of banderoles) {
            const article = banderole.closest<HTMLElement>("article[data-slug]");
            const ancre = article?.querySelector<HTMLElement>("[data-survol-propre]");
            if (!article || !ancre) continue;

            // La course vient du rendu (lib/encre), en px de maquette.
            const course = Number(banderole.dataset.derouleCourse ?? 0);
            const duree = gsap.utils.clamp(
              ENCRE.bornes.min,
              ENCRE.bornes.max,
              course / ENCRE.vitesse,
            );

            const tl = gsap.timeline({
              paused: true,
              // Le repos est exactement la maquette : pas d'ordre
              // d'empilement résiduel sur l'article.
              onReverseComplete: () => gsap.set(article, { clearProps: "zIndex" }),
            });
            tl.set(article, { zIndex: 4 }, 0) // au-dessus du 3 de `soulever`
              /* La prise est un ÉCHANGE invisible : au repos le masque de la
                 banderole ne laisse voir que son disque, qui recouvre au pixel
                 celui de l'Œuvre. On ne fond donc rien — on substitue. */
              .fromTo(banderole, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1, ease: "none" }, 0)
              // Le front traverse. `trait` et non `ease` : un coup de pinceau a
              // une charge d'attaque, un balayage n'a pas de début.
              .to(banderole, { "--deroule": 1, duration: duree, ease: ENCRE.trait }, 0);

            // Décodage mémorisé : lancé une seule fois, à l'approche ou au
            // premier survol. `loading = "eager"` force le chargement d'une
            // image que le lisseur n'aurait pas encore basculée (ScrollLisse).
            let chargement: Promise<unknown> | null = null;
            const charger = () =>
              (chargement ??= Promise.all(
                gsap.utils.toArray<HTMLImageElement>("img", banderole).map((img) => {
                  img.loading = "eager";
                  return img.decode().catch(() => undefined);
                }),
              ));

            ScrollTrigger.create({
              trigger: article,
              start: "top bottom+=50%",
              once: true,
              onEnter: () => void charger(),
            });

            // La zone de survol est COMPOSITE : l'ancre déclenche, mais une
            // fois déroulée la banderole la recouvre et capte le pointeur —
            // on doit pouvoir la parcourir pour la lire sans ré-enroulement.
            // Même logique de frontière que SurvolEncre : `pointerover`/
            // `pointerout` tirent à chaque frontière interne, on ignore les
            // transitions dont l'autre bord reste dans l'ensemble.
            const dansEnsemble = (n: EventTarget | null) =>
              n instanceof Node && (ancre.contains(n) || banderole.contains(n));

            // Les gestes ne CRÉENT aucun tween (ils pilotent la timeline née
            // dans le contexte) : pas besoin de `contextSafe`.
            let dedans = false;
            const entrer = (e: PointerEvent) => {
              if (dansEnsemble(e.relatedTarget)) return;
              dedans = true;
              void charger().then(() => {
                // Le pointeur peut être reparti pendant le décodage : ne
                // jamais dérouler sous un curseur absent.
                if (dedans) tl.timeScale(1).play();
              });
            };
            const sortir = (e: PointerEvent) => {
              if (dansEnsemble(e.relatedTarget)) return;
              dedans = false;
              // Le ré-enroulement : même trajet, un peu plus vif.
              tl.timeScale(1.35).reverse();
            };

            for (const el of [ancre, banderole]) {
              el.addEventListener("pointerover", entrer);
              el.addEventListener("pointerout", sortir);
              nettoyages.push(() => {
                el.removeEventListener("pointerover", entrer);
                el.removeEventListener("pointerout", sortir);
              });
            }
          }

          return () => {
            for (const nettoyer of nettoyages) nettoyer();
          };
        },
      );

      return () => mm.revert();
    },
    { scope: conteneur },
  );

  return conteneur;
}
