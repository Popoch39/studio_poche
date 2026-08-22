import { ASSETS } from "@/content/assets.generated";

export type Variante = { format: string; largeur: number; fichier: string };
export type EntreeAsset = {
  largeur: number;
  hauteur: number;
  variantes: readonly Variante[];
  anime?: boolean;
  dureeMs?: number;
};

const registre = ASSETS as unknown as Record<string, Record<string, EntreeAsset>>;

/** L'entrée du registre pour une Œuvre, ou undefined si elle n'y est pas. */
export function asset(categorie: string, fichier: string): EntreeAsset | undefined {
  return registre[categorie]?.[fichier];
}

/**
 * Le `srcset` d'un format donné. Partagé entre le rendu (`Oeuvre`) et le
 * préchargement (`PageAttente`) : les deux doivent produire des chaînes
 * STRICTEMENT identiques, sinon le navigateur ne retrouve pas l'image
 * préchargée dans son cache et la télécharge deux fois.
 */
export function srcset(variantes: readonly Variante[], format: string): string | null {
  const v = variantes.filter((x) => x.format === format);
  if (v.length === 0) return null;
  return v.map((x) => `${x.fichier} ${x.largeur}w`).join(", ");
}
