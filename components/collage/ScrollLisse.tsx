"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP, ScrollSmoother, ScrollTrigger, CONDITIONS } from "@/lib/motion/gsap";

/**
 * Scroll lissé : monté dans le gabarit RACINE, actif sur la seule page
 * Portfolio (16404px de maquette).
 *
 * Pourquoi la racine : `.scene` porte `container-type: inline-size`, donc un
 * confinement de layout — elle devient le bloc conteneur de ses descendants
 * `position: fixed`. Le cadre de ScrollSmoother est précisément un `fixed` :
 * posé sous `.scene`, il se retrouverait « fixé » à un élément qui défile et
 * le lissage se briserait. Le cadre doit donc ENVELOPPER `.scene`.
 *
 * Pourquoi /portfolio seulement : les pages courtes n'y gagnent rien. Le
 * gabarit racine ne se démonte jamais entre les routes ; c'est le changement
 * de `chemin` (revertOnUpdate) qui tue et recrée le lisseur, pas un remontage.
 *
 * Désactivé sous `prefers-reduced-motion` : un scroll qui continue après
 * l'arrêt du geste est précisément le genre de mouvement que ce réglage
 * refuse.
 */
export function ScrollLisse({ children }: { children: React.ReactNode }) {
  const cadre = useRef<HTMLDivElement>(null);
  const contenu = useRef<HTMLDivElement>(null);
  const chemin = usePathname();

  useGSAP(
    () => {
      if (chemin !== "/portfolio") return;

      const mm = gsap.matchMedia();
      mm.add(`${CONDITIONS.mouvement} and ${CONDITIONS.collage}`, () => {
        const lisseur = ScrollSmoother.create({
          wrapper: cadre.current,
          content: contenu.current,
          smooth: 1.1,
          // La profondeur par couches : le lisseur lit les `data-speed` posés
          // par BlocProjet sur les articles du Collage.
          effects: true,
          normalizeScroll: true,
        });
        // Les ScrollTriggers de la page naissent AVANT le lisseur (les effets
        // React des enfants s'exécutent d'abord) : une re-mesure après coup
        // aligne leurs positions sur la nouvelle structure de défilement.
        ScrollTrigger.refresh();

        /* Le lisseur CASSE le chargement paresseux natif : il fait défiler le
           contenu par transform dans un cadre `position: fixed`, or Chrome
           mesure la distance d'une image paresseuse depuis sa position de
           LAYOUT — qui, dans un cadre fixe, ne change jamais avec le scroll.
           Sans compensation, aucune image sous la ligne de flottaison ne se
           charge, jamais. ScrollTrigger, lui, mesure juste : à une bonne
           longueur d'écran de l'arrivée, on bascule l'image en `eager`, ce qui
           déclenche son chargement — la révélation (gagée sur `decode()`)
           prend le relais. */
        for (const img of gsap.utils.toArray<HTMLImageElement>(
          "img[loading='lazy']",
          contenu.current,
        )) {
          ScrollTrigger.create({
            trigger: img,
            start: "top bottom+=150%",
            once: true,
            onEnter: () => {
              img.loading = "eager";
            },
          });
        }

        return () => lisseur.kill();
      });

      return () => mm.revert();
    },
    // `revertOnUpdate` est indispensable : sans lui, un changement de route ne
    // reverterait pas le contexte et le lisseur de /portfolio survivrait sur
    // les autres pages.
    { dependencies: [chemin], revertOnUpdate: true },
  );

  return (
    <div ref={cadre}>
      <div ref={contenu}>{children}</div>
    </div>
  );
}
