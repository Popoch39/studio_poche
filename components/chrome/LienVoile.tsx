"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { couvrir } from "@/lib/motion/voile";

/**
 * Un Link dont la navigation passe sous le Voile d'encre : couvre, puis pousse
 * la route — VoileEncre découvrira à l'arrivée.
 *
 * `onNavigate` ne se déclenche que pour les navigations SPA : cmd-clic,
 * clic-molette et « ouvrir dans un nouvel onglet » restent natifs, sans rideau
 * fantôme. Même route → pas de couverture : le chemin ne changerait pas et la
 * découverte ne viendrait jamais.
 */
export function LienVoile({
  href,
  onNavigate,
  ...reste
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const routeur = useRouter();
  const chemin = usePathname();

  return (
    <Link
      {...reste}
      href={href}
      onNavigate={(e) => {
        onNavigate?.(e);
        if (href === chemin) return;
        e.preventDefault();
        void couvrir().then(() => routeur.push(href));
      }}
    />
  );
}
