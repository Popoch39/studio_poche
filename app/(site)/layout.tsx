import { Entete } from "@/components/chrome/Entete";

/**
 * Le gabarit des trois écrans navigables. La Page d'attente (`/`) est
 * volontairement hors de ce groupe : la maquette ne lui donne ni en-tête ni
 * navigation.
 */
export default function GabaritSite({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Entete />
      <main>{children}</main>
    </>
  );
}
