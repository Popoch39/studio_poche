"use client";

import { useRef } from "react";
import { gsap, useGSAP, CONDITIONS, ENCRE } from "@/lib/motion/gsap";

/**
 * Le curseur encre : une tache d'encre suit le pointeur avec une traîne douce.
 * Elle ACCOMPAGNE le curseur natif, elle ne le remplace jamais — cacher le vrai
 * curseur coûte plus en repères qu'il ne rapporte en style.
 *
 * UN SEUL CORPS, jamais deux : le POINT noir, plein. Il s'élargit sur un lien,
 * mais reste le même objet. Trois tentatives d'en faire autre chose ont été
 * retirées — l'anneau de survol des Œuvres, la loupe de verre (WebGL) qui l'a
 * remplacé, puis l'étiquette qui nommait le projet survolé. Toutes ajoutaient
 * un second corps entre le point et la page. Voir docs/adr/0006.
 *
 * Trois gestes :
 *
 * — Il S'ÉTIRE en courant. Pas d'après une vélocité mesurée mais d'après son
 *   propre RETARD sur le pointeur : la traîne est déjà une vitesse intégrée et
 *   lissée. L'étirement monte tant que la tache court, se referme seul quand
 *   elle rejoint le pointeur — aucun timer, aucun lissage à écrire.
 *
 * — Il SE DÉPOSE en s'arrêtant. À chaque immobilisation la silhouette se
 *   recompose, dérivée de la position d'arrêt — jamais du hasard, comme le
 *   `sens` de SurvolEncre. La rotation, elle, PERSISTE : chaque dépôt garde
 *   l'orientation du geste qui l'a amené.
 *
 * — Il SE POSE sur ce qu'il désigne : plus large sur un lien, et l'étirement
 *   s'amortit fortement. L'étirement dit « je cours », le survol dit « j'y
 *   suis ».
 *
 * DEUX COUCHES, un seul propriétaire par propriété (même règle que
 * useFremissementVelocite) : l'enveloppe porte la position et le grossissement
 * de survol, la goutte porte rotation et étirement.
 *
 * Réservé aux pointeurs fins (`pointer: fine` : jamais sur tactile), au
 * mouvement accepté et au-dessus du seuil mobile. Née invisible : elle
 * n'apparaît qu'au premier mouvement du pointeur. FRÈRE du lisseur sous
 * <body>, hors du confinement de `.scene` et hors du contenu transformé.
 */
const TAILLE = 25; // px

const TRAINE = 0.35; // s
/**
 * Retard (px) auquel l'étirement plafonne. Mesuré : à cette traîne, `quickTo`
 * installe un retard de ~0,105 × vitesse (px/s), quelle que soit la fréquence
 * d'écran. 160 px place donc le plafond vers 1520 px/s — un vrai balayage — et
 * laisse les vitesses courantes (400-1200 px/s) s'étaler sur ×1.25 à ×1.7.
 */
const ECART_MAX = 160;
const ETIREMENT_MAX = 1.9;
/** Plafond réduit quand la tache s'est posée sur une cible. */
const ETIREMENT_POSE = 1.25;
/** En deçà de ce retard, la tache a rejoint le pointeur. */
const REPOS = 0.3; // px

/**
 * Une silhouette d'encre dérivée d'une position. Quatre coins entre 46 % et
 * 54 % : imperceptible à l'arrêt, franchement lisible dès que ça s'étire.
 */
function silhouette(px: number, py: number) {
  const graine = Math.abs(Math.round(px) * 31 + Math.round(py) * 17);
  const coin = (rang: number) => 46 + (Math.floor(graine / rang) % 9);
  return `${coin(1)}% ${coin(11)}% ${coin(101)}% ${coin(1009)}%`;
}

export function CurseurEncre() {
  const enveloppe = useRef<HTMLDivElement>(null);
  const goutte = useRef<HTMLDivElement>(null);

  useGSAP(
    (_, contextSafe) => {
      if (!contextSafe) return;
      const cadre = enveloppe.current;
      const tache = goutte.current;
      if (!cadre || !tache) return;

      const mm = gsap.matchMedia();

      mm.add(
        `${CONDITIONS.mouvement} and ${CONDITIONS.collage} and ${CONDITIONS.pointeurFin}`,
        () => {
          const x = gsap.quickTo(cadre, "x", { duration: TRAINE, ease: "power2.out" });
          const y = gsap.quickTo(cadre, "y", { duration: TRAINE, ease: "power2.out" });

          const poserRotation = gsap.quickSetter(tache, "rotation", "deg");
          const poserX = gsap.quickSetter(tache, "scaleX");
          const poserY = gsap.quickSetter(tache, "scaleY");

          const pointeur = { x: 0, y: 0 };
          /** L'état partagé : `plafond` et `presse` sont relus par le ticker. */
          const etat = { plafond: ETIREMENT_MAX, presse: 1 };

          let visible = false;
          let actif = false;
          let bougeait = false;

          /** Redevenir un simple point : la sortie de fenêtre n'amène aucune
              nouvelle cible, elle n'a donc aucune autre branche pour régler
              l'échelle et le plafond. */
          const reposer = contextSafe(() => {
            gsap.to(cadre, { scale: 1, duration: 0.25, ease: "power2.out", overwrite: "auto" });
            gsap.to(etat, {
              plafond: ETIREMENT_MAX,
              duration: 0.25,
              ease: "power2.out",
              overwrite: "auto",
            });
          });

          const deposer = contextSafe(() => {
            gsap.to(tache, {
              borderRadius: silhouette(pointeur.x, pointeur.y),
              duration: 0.6,
              ease: ENCRE.ease,
              overwrite: "auto",
            });
          });

          /**
           * Le ticker ne tourne QUE tant que la tache court ou qu'un clic est
           * en cours. Son endormissement sert aussi de détection d'arrêt : un
           * seul mécanisme pour deux besoins, pas de timer séparé.
           */
          const battre = () => {
            const dx = pointeur.x - Number(gsap.getProperty(cadre, "x"));
            const dy = pointeur.y - Number(gsap.getProperty(cadre, "y"));
            const ecart = Math.hypot(dx, dy);

            if (ecart > REPOS) {
              bougeait = true;
              const tire = 1 + (etat.plafond - 1) * Math.min(ecart / ECART_MAX, 1);
              poserRotation((Math.atan2(dy, dx) * 180) / Math.PI);
              // Volume adouci (1/√) plutôt que strict (1/x) : la tache garde du
              // corps au lieu de finir en trait.
              poserX(tire * etat.presse);
              poserY((1 / Math.sqrt(tire)) * etat.presse);
              return;
            }

            if (etat.presse !== 1) {
              poserX(etat.presse);
              poserY(etat.presse);
              return;
            }

            poserX(1);
            poserY(1);
            // La rotation n'est PAS remise à zéro : le dépôt reste orienté.
            if (bougeait) {
              bougeait = false;
              deposer();
            }
            dormir();
          };

          const reveiller = () => {
            if (actif) return;
            actif = true;
            gsap.ticker.add(battre);
          };
          function dormir() {
            if (!actif) return;
            actif = false;
            gsap.ticker.remove(battre);
          }

          const suivre = contextSafe((e: PointerEvent) => {
            pointeur.x = e.clientX;
            pointeur.y = e.clientY;
            if (!visible) {
              visible = true;
              // Posée d'emblée sous le pointeur : sans ça, le premier retard
              // se mesurerait depuis le coin de l'écran et l'étirement
              // partirait au plafond.
              gsap.set(cadre, { x: pointeur.x, y: pointeur.y, autoAlpha: 1 });
              gsap.set(tache, { borderRadius: silhouette(pointeur.x, pointeur.y) });
            } else {
              x(pointeur.x);
              y(pointeur.y);
            }
            reveiller();
          });

          // En capture : un lien qui arrête la propagation ne doit pas rendre
          // la tache aveugle. Quitter un lien revient à l'état de repos
          // (nouvelle cible sans lien) sans écouteur de sortie dédié.
          const poser = contextSafe((e: Event) => {
            const t = e.target as Element | null;
            const lien = t?.closest?.("a, button, [data-curseur]");

            gsap.to(cadre, {
              scale: lien ? 2 : 1,
              duration: 0.25,
              ease: "power2.out",
              overwrite: "auto",
            });
            gsap.to(etat, {
              plafond: lien ? ETIREMENT_POSE : ETIREMENT_MAX,
              duration: 0.25,
              ease: "power2.out",
              overwrite: "auto",
            });
          });

          // La sortie de la fenêtre n'amène aucune nouvelle cible : sans elle,
          // une tache quittant l'écran depuis un lien resterait figée grossie.
          const quitter = contextSafe((e: PointerEvent) => {
            if (e.relatedTarget === null) reposer();
          });

          const presser = contextSafe(() => {
            gsap.to(etat, {
              presse: 0.7,
              duration: 0.12,
              ease: "power2.out",
              overwrite: "auto",
            });
            reveiller();
          });
          const relacher = contextSafe(() => {
            gsap.to(etat, {
              presse: 1,
              duration: 0.5,
              ease: "elastic.out(1, 0.5)",
              overwrite: "auto",
            });
            reveiller();
          });

          window.addEventListener("pointermove", suivre, { passive: true });
          window.addEventListener("pointerover", poser, true);
          window.addEventListener("pointerout", quitter, { passive: true });
          window.addEventListener("pointerdown", presser, { passive: true });
          window.addEventListener("pointerup", relacher, { passive: true });
          window.addEventListener("pointercancel", relacher, { passive: true });

          return () => {
            window.removeEventListener("pointermove", suivre);
            window.removeEventListener("pointerover", poser, true);
            window.removeEventListener("pointerout", quitter);
            window.removeEventListener("pointerdown", presser);
            window.removeEventListener("pointerup", relacher);
            window.removeEventListener("pointercancel", relacher);
            dormir();
            gsap.set(cadre, { autoAlpha: 0, scale: 1 });
            gsap.set(tache, {
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              borderRadius: "50%",
            });
            visible = false;
            bougeait = false;
          };
        },
      );

      return () => mm.revert();
    },
    { scope: enveloppe },
  );

  return (
    <div
      ref={enveloppe}
      aria-hidden
      style={{
        position: "fixed",
        left: -TAILLE / 2,
        top: -TAILLE / 2,
        width: TAILLE,
        height: TAILLE,
        zIndex: 60,
        pointerEvents: "none",
        // Née invisible dans le HTML même : rien ne flashe avant l'hydratation.
        opacity: 0,
        visibility: "hidden",
      }}
    >
      {/* Le point : un disque PLEIN, toujours — l'ancien anneau de survol
          était un troisième état qui brouillait le geste. Le `border-radius`
          découpe le fond à la silhouette. */}
      <div
        ref={goutte}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: "var(--color-encre)",
        }}
      />
    </div>
  );
}
