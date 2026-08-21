"use client";

import { gsap } from "./gsap";

/**
 * Un Lettrage s'écrit sous la plume, lettre par lettre.
 *
 * ── Pourquoi pas `useTraceSvg` ──────────────────────────────────────────────
 * `useTraceSvg` reste juste pour le chrome (cadres, contours, bulle, ovale de
 * nav) : un décalage uniforme sur des traits de longueurs comparables. Il ne
 * convient pas à une écriture. Il donnerait la même durée au « S » (le plus
 * long tracé du logo) qu'au point du « i », et poserait `ENCRE.ease` sur chaque
 * trait — soit onze décélérations d'affilée là où une main garde sa vitesse.
 *
 * ── Vitesse de plume constante ──────────────────────────────────────────────
 * La durée de chaque trait est proportionnelle à sa longueur réelle
 * (`getTotalLength()`), et l'ease est `none`. La vitesse est donc identique d'un
 * bout à l'autre du mot : c'est la définition d'une plume qui ne ralentit pas.
 * Une seule constante à régler, `DUREE_TRACE`, et le partage entre les traits
 * s'ajuste tout seul si Marie redessine le logo.
 *
 * ── Pourquoi PAS `ENCRE.ease` sur l'enveloppe ───────────────────────────────
 * Le plan prévoyait de poser la courbe « encre » sur l'enveloppe du mot. À
 * l'examen c'est un contresens ici : `ENCRE.ease` est
 * `M0,0 C0.17,0.55 0.2,1 1,1`, dont la vitesse atteint son maximum très tôt et
 * retombe longuement. Étalée sur tout le mot, elle ferait ramper les dernières
 * lettres — « che » se traînerait sur le dernier tiers de la durée. La courbe
 * garde son sens sur un trait unique de chrome, pas sur une phrase de onze
 * lettres. Le tracé est donc linéaire, ce qui est aussi ce que « vitesse de
 * plume constante » veut dire. À rediscuter avec Marie sur écran, pas ici.
 */

/** Durée totale de l'écriture, avant chevauchements, en secondes.
 *  Du même ordre que `ENCRE.duree.trace` (1,1 s pour un trait unique de
 *  chrome), à dessein : onze lettres, pas onze fois la durée d'un trait. */
const DUREE_TRACE = 1.7;

/** La plume se lève entre deux traits d'une même lettre. */
const LEVEE = 0.02;

/** Deux lettres voisines se chevauchent légèrement : la main ne s'arrête pas. */
const CHEVAUCHEMENT = -0.06;

/** Le point du « i » se pose : il n'a pas de longueur à révéler. */
const POSE = 0.14;

/** Les nœuds animés, dans l'ordre du DOM — qui EST l'ordre d'écriture. */
const NOEUDS = "[data-trace], [data-pose]";

/**
 * Construit la timeline d'écriture d'un Lettrage inline.
 *
 * La timeline est rendue **en pause** : c'est l'orchestrateur qui décide quand
 * elle part et à quel moment elle s'imbrique (voir `useEntreeAttente`). La plume
 * connaît sa durée, elle ne connaît pas la page.
 *
 * NB : imbriquée dans une timeline parente, elle doit être relancée par
 * `.paused(false)` — un enfant en pause n'avance pas, même porté par un parent.
 */
export function traceLettrage(racine: SVGSVGElement): gsap.core.Timeline {
  const noeuds = gsap.utils.toArray<SVGGeometryElement>(NOEUDS, racine);
  const tl = gsap.timeline({ paused: true });
  if (noeuds.length === 0) return tl;

  const traces = noeuds.filter((n) => n.hasAttribute("data-trace"));
  const longueurTotale = traces.reduce((somme, t) => somme + t.getTotalLength(), 0);
  if (longueurTotale === 0) return tl;

  // Un trait de longueur nulle n'est PAS invisible : avec `strokeLinecap="round"`
  // et un trait de 10, les navigateurs dessinent quand même la calotte — quinze
  // points noirs sur la première image, avant que la plume ne parte. Chaque
  // nœud (traits ET point du « i ») reste donc masqué (`autoAlpha`) jusqu'à
  // l'instant où son propre geste commence.
  gsap.set(noeuds, { autoAlpha: 0 });

  let position = 0;
  // Le GROUPE, pas son libellé : « o » apparaît deux fois dans « Studio Poche »,
  // et comparer les chaînes confondrait deux lettres distinctes.
  let groupePrecedent: Element | null = null;

  for (const noeud of noeuds) {
    const groupe = noeud.closest("[data-lettre]");
    if (groupePrecedent !== null) {
      position += groupe === groupePrecedent ? LEVEE : CHEVAUCHEMENT;
    }
    groupePrecedent = groupe;

    if (noeud.hasAttribute("data-pose")) {
      tl.fromTo(
        noeud,
        { scale: 0, autoAlpha: 0 },
        {
          scale: 1,
          autoAlpha: 1,
          duration: POSE,
          ease: "back.out(2)",
          transformOrigin: "50% 50%",
        },
        position,
      );
      position += POSE;
      continue;
    }

    const duree = (DUREE_TRACE * noeud.getTotalLength()) / longueurTotale;
    // `data-inverse` : le tracé est écrit de droite à gauche dans l'export
    // Figma. Révéler depuis sa FIN vers son DÉBUT le remet dans le sens de
    // l'écriture. L'état de repos est le même dans les deux cas — seul le point
    // de départ change.
    const depart = noeud.hasAttribute("data-inverse") ? "100% 100%" : "0% 0%";
    tl.set(noeud, { autoAlpha: 1 }, position);
    tl.fromTo(
      noeud,
      { drawSVG: depart },
      { drawSVG: "0% 100%", duration: duree, ease: "none" },
      position,
    );
    position += duree;
  }

  return tl;
}

/**
 * L'état de repos du Lettrage, posé d'un coup.
 *
 * `gsap.set` et non un `fromTo` de durée nulle : aucune image intermédiaire ne
 * doit s'afficher pour un visiteur qui a demandé moins de mouvement.
 */
export function poserLettrage(racine: SVGSVGElement) {
  gsap.set(gsap.utils.toArray("[data-trace]", racine), { drawSVG: "100%", autoAlpha: 1 });
  gsap.set(gsap.utils.toArray("[data-pose]", racine), { scale: 1, autoAlpha: 1 });
}
