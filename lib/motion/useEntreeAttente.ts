"use client";

import { useCallback, useRef, type RefObject } from "react";
import { gsap, useGSAP, ENCRE, CONDITIONS } from "./gsap";
import { traceLettrage, poserLettrage } from "./traceLettrage";

/**
 * L'entrée dans le site : ce qui se joue sur la Page d'attente, et ce qui
 * décide du moment où l'on cède la place au portfolio.
 *
 * Tout le mouvement de l'écran vit ici — `PageAttente` ne fait plus que rendre.
 *
 * ── C'est le tracé qui commande ─────────────────────────────────────────────
 * L'ancienne version attendait une constante de 3200 ms, et son commentaire
 * l'assumait comme une entorse : « faute d'animation, la durée ne peut pas être
 * dérivée ». Depuis que le Lettrage s'écrit vraiment, la fin de l'écriture est
 * un événement réel. La durée totale de l'attente est donc une CONSÉQUENCE du
 * dessin, et non plus un chiffre choisi.
 *
 * ── L'attente se rejoue à CHAQUE visite de « / » ────────────────────────────
 * Décision assumée (et demandée) : pas de drapeau de session. La page est une
 * signature, pas un écran de chargement — la revoir n'est pas une punition, et
 * le clic ou une touche l'écourtent toujours.
 */

/**
 * De combien le Lettrage mord sur la fin de la révélation de l'illustration.
 * Décision d'ORCHESTRATION, pas de plume : c'est pourquoi elle vit ici et non
 * dans `traceLettrage`.
 */
const CHEVAUCHEMENT_ILLUSTRATION = 0.5;

/** Le temps qu'on laisse à la signature une fois posée, avant de partir.
 *  Une vraie seconde de contemplation : la demande explicite est de ne pas
 *  arracher le visiteur au logo sitôt le dernier trait posé. */
const RESPIRATION = 1.0;

/**
 * En mouvement réduit, le temps de LIRE « Studio Poche ».
 *
 * C'est bien une constante en dur, mais pas de la même nature que les 3200 ms
 * qu'elle remplace : ce n'est pas la durée d'une animation qu'on ne peut pas
 * mesurer, c'est un temps de lecture. Faire attendre un visiteur qui a demandé
 * moins de mouvement la durée d'une animation qu'il ne verra pas serait le
 * punir ; le renvoyer instantanément lui cacherait le logo.
 */
const LECTURE_MS = 800;

/** Les touches qui font passer l'attente. */
const TOUCHES_PASSER = ["Enter", " ", "Escape"];

export function useEntreeAttente({
  scene,
  onEntrer,
}: {
  /** La racine de l'écran : porte l'illustration et le Lettrage. */
  scene: RefObject<HTMLDivElement | null>;
  /** Ce qu'il faut faire pour entrer. Appelé une fois au plus. */
  onEntrer: () => void;
}) {
  const dejaEntre = useRef(false);
  // Le rappel passe par une ref pour que `entrer` soit stable à vie : sans cela
  // un appelant qui ne mémoïse pas `onEntrer` relancerait l'animation à chaque
  // rendu, et l'attente ne finirait jamais.
  const rappel = useRef(onEntrer);
  rappel.current = onEntrer;

  const entrer = useCallback(() => {
    // L'entrée peut être demandée par la fin de la timeline, par un clic, par
    // une touche ou par le lien lui-même. Une seule doit aboutir.
    if (dejaEntre.current) return;
    dejaEntre.current = true;
    rappel.current();
  }, []);

  useGSAP(
    () => {
      const racine = scene.current;
      if (!racine) return;

      // Le Lettrage est un lien de 222×132 sur un écran de 1728 de large : il ne
      // suffit pas comme échappatoire. N'importe où, n'importe quelle touche.
      const passer = (e: Event) => {
        if (e instanceof KeyboardEvent && !TOUCHES_PASSER.includes(e.key)) return;
        entrer();
      };
      window.addEventListener("click", passer);
      window.addEventListener("keydown", passer);

      const lettrage = racine.querySelector<SVGSVGElement>("[data-lettrage]");
      // Le voile de l'illustration — né avec `opacity: 0` dans le HTML même,
      // pour qu'aucune image ne flashe entre la peinture statique et
      // l'hydratation (voir PageAttente).
      const entree = racine.querySelectorAll("[data-entree]");
      const mm = gsap.matchMedia();

      mm.add(CONDITIONS.mouvement, () => {
        const tl = gsap.timeline();

        // L'illustration se dépose : un fondu doublé d'un très léger recul
        // d'échelle, qui se pose sur la courbe « encre ». Le `fromTo` est
        // explicite pour que l'état de départ (déjà écrit dans le HTML côté
        // opacité) soit aussi posé côté échelle avant la première frame.
        tl.fromTo(
          entree,
          { autoAlpha: 0, scale: 1.04, transformOrigin: "50% 50%" },
          { autoAlpha: 1, scale: 1, duration: ENCRE.duree.revele * 1.6, ease: ENCRE.ease },
        );

        if (lettrage) {
          const ecriture = traceLettrage(lettrage);
          // Un enfant en pause n'avance pas, même porté par un parent : la
          // plume rend sa timeline inerte, c'est ici qu'on la relance.
          ecriture.paused(false);
          tl.add(ecriture, `-=${CHEVAUCHEMENT_ILLUSTRATION}`);
        }

        tl.to({}, { duration: RESPIRATION });
        tl.to(racine, {
          autoAlpha: 0,
          duration: ENCRE.duree.page,
          onComplete: entrer,
        });

        return () => tl.kill();
      });

      // Mouvement réduit : tout est posé à son état de repos, puis on entre
      // après le temps de lecture. Une redirection n'est pas une animation —
      // c'est le mouvement qui est retiré, pas la navigation.
      mm.add(CONDITIONS.reduit, () => {
        if (lettrage) poserLettrage(lettrage);
        gsap.set(entree, { autoAlpha: 1 });
        const t = window.setTimeout(entrer, LECTURE_MS);
        return () => window.clearTimeout(t);
      });

      return () => {
        window.removeEventListener("click", passer);
        window.removeEventListener("keydown", passer);
        mm.revert();
      };
    },
    { scope: scene, dependencies: [entrer] },
  );

  return entrer;
}
