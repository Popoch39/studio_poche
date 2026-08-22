import { PROJETS, HAUTEUR_COLLAGE } from "@/content/projets";
import { CollagePortfolio } from "@/components/collage/CollagePortfolio";

export const metadata = {
  title: "Portfolio — Studio Poche",
  description:
    "Illustrations, animations et conceptions graphiques de Marie Pocheron : " +
    "biodiversité, patrimoine, savoir-faire et projets de territoire.",
};

export default function Portfolio() {
  return <CollagePortfolio projets={PROJETS} hauteur={HAUTEUR_COLLAGE} />;
}
