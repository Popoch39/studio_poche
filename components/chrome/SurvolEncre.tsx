"use client";

import { gsap, useGSAP, CONDITIONS } from "@/lib/motion/gsap";
import { MAQUETTE } from "@/lib/echelle";

type Cible = { genre: "piece" | "lien"; racine: HTMLElement; el: HTMLElement };

/**
 * Les survols du site — un seul délégué global, deux gestes :
 *
 * — Une Œuvre survolée SE SOULÈVE : la découpe monte à peine, penche d'un
 *   demi-degré (toujours du même côté : le sens est déterministe) et projette
 *   une ombre de papier — on la prend entre les doigts. Transforms et ombre
 *   seulement : jamais d'opacité (une Œuvre n'apparaît pas délavée), et la
 *   Légende reste intouchée — toujours visible, jamais révélée au survol.
 *
 * — Un lien FRÉTILLE : rotation élastique et légère prise d'échelle, comme un
 *   trait d'encre qui se réveille. Pour les Lettrages, le geste s'applique à
 *   l'enfant posé (le <a> n'a pas de boîte).
 *
 * Délégation `pointerover`/`pointerout` sur window, en capture : un seul
 * couple d'écouteurs pour tout le site, qui survit aux changements de route.
 * Réservé aux pointeurs fins, au mouvement accepté et à la vue Collage.
 */
export function SurvolEncre() {
  useGSAP((_, contextSafe) => {
    if (!contextSafe) return;

    const mm = gsap.matchMedia();

    mm.add(
      `${CONDITIONS.mouvement} and ${CONDITIONS.collage} and ${CONDITIONS.pointeurFin}`,
      () => {
        /** 1px de maquette à l'échelle de la scène courante. */
        const u = () =>
          (document.querySelector<HTMLElement>(".scene-contenu")?.clientWidth ?? MAQUETTE) /
          MAQUETTE;

        /** Penche toujours du même côté : dérivé de la position, pas du hasard. */
        const sens = (el: HTMLElement) =>
          Math.round(el.getBoundingClientRect().left) % 2 ? 1 : -1;

        const soulever = contextSafe((piece: HTMLElement, prise: boolean) => {
          const e = u();
          gsap.to(
            piece,
            prise
              ? {
                  y: -8 * e,
                  scale: 1.025,
                  rotation: 0.6 * sens(piece),
                  boxShadow: `0px ${18 * e}px ${36 * e}px ${-14 * e}px rgba(0, 0, 0, 0.45)`,
                  zIndex: 3,
                  duration: 0.45,
                  ease: "back.out(1.6)",
                  overwrite: "auto",
                }
              : {
                  y: 0,
                  scale: 1,
                  rotation: 0,
                  boxShadow: "0px 0px 0px 0px rgba(0, 0, 0, 0)",
                  duration: 0.5,
                  ease: "power3.out",
                  overwrite: "auto",
                  // L'état de repos est exactement la maquette : on ne laisse
                  // ni ombre ni ordre d'empilement résiduels.
                  onComplete: () => gsap.set(piece, { clearProps: "zIndex,boxShadow" }),
                },
          );
        });

        const fretiller = contextSafe((visuel: HTMLElement, prise: boolean) => {
          if (prise && getComputedStyle(visuel).display === "inline") {
            // Un transform est sans effet sur une boîte inline (liens de
            // texte : mailto, téléphone).
            gsap.set(visuel, { display: "inline-block" });
          }
          gsap.to(
            visuel,
            prise
              ? {
                  rotation: 3 * sens(visuel),
                  scale: 1.08,
                  duration: 0.6,
                  ease: "elastic.out(1, 0.45)",
                  overwrite: "auto",
                }
              : { rotation: 0, scale: 1, duration: 0.4, ease: "power3.out", overwrite: "auto" },
          );
        });

        const analyser = (e: Event): Cible | null => {
          const t = e.target as Element | null;
          if (!t?.closest) return null;
          const piece = t.closest<HTMLElement>("[data-revelation]");
          // Une pièce qui possède son propre survol (l'ancre d'une Banderole,
          // voir useDeroulementBanderole) : on lui cède entièrement — sans
          // retomber sur la branche lien.
          if (piece?.hasAttribute("data-survol-propre")) return null;
          if (piece) return { genre: "piece", racine: piece, el: piece };
          const lien = t.closest<HTMLElement>("a, button");
          if (!lien) return null;
          return {
            genre: "lien",
            racine: lien,
            el: lien.querySelector<HTMLElement>(".maquette-pose") ?? lien,
          };
        };

        // `pointerover`/`pointerout` tirent à chaque frontière INTERNE de la
        // cible : on ignore les transitions dont l'autre bord reste dedans.
        const appliquer = (e: Event, prise: boolean) => {
          const c = analyser(e);
          if (!c) return;
          const autre = (e as PointerEvent).relatedTarget as Node | null;
          if (autre && c.racine.contains(autre)) return;
          if (c.genre === "piece") soulever(c.el, prise);
          else fretiller(c.el, prise);
        };
        const entrer = (e: Event) => appliquer(e, true);
        const sortir = (e: Event) => appliquer(e, false);

        window.addEventListener("pointerover", entrer, true);
        window.addEventListener("pointerout", sortir, true);
        return () => {
          window.removeEventListener("pointerover", entrer, true);
          window.removeEventListener("pointerout", sortir, true);
        };
      },
    );

    return () => mm.revert();
  });

  return null;
}
