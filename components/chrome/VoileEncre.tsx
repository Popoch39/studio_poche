"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { enregistrer, decouvrir } from "@/lib/motion/voile";

/**
 * Le Voile d'encre : le rideau des transitions de route. Monté une seule fois
 * dans le gabarit racine, FRÈRE du lisseur — hors de `.scene`, dont le
 * confinement (container-type) capturerait ce `position: fixed`, et hors du
 * contenu transformé par ScrollSmoother.
 *
 * Il ne décide rien : LienVoile couvre, et ce composant découvre quand le
 * chemin change. Un chemin qui change sans couverture (retour navigateur,
 * navigation sans LienVoile) ne fait rien — `decouvrir` ne joue que couvert,
 * le voile ne peut pas rester coincé.
 */
export function VoileEncre() {
  const voile = useRef<HTMLDivElement>(null);
  const chemin = usePathname();

  useEffect(() => {
    enregistrer(voile.current);
    return () => enregistrer(null);
  }, []);

  useEffect(() => {
    decouvrir();
  }, [chemin]);

  return (
    <div
      ref={voile}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        pointerEvents: "none",
        background: "var(--color-encre)",
        // Replié en haut (REPLIE de lib/motion/voile) : écrit dans le HTML même
        // pour qu'aucun rideau ne flashe avant l'hydratation.
        clipPath: "inset(0% 0% 100% 0%)",
      }}
    />
  );
}
