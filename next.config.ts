import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export statique : le livrable est un dossier `out/` déposable n'importe où.
  // Conséquence assumée — l'optimiseur d'images de Next est désactivé, les
  // variantes AVIF/WebP sont pré-générées par scripts/optimiser-assets.mjs.
  output: "export",
  images: { unoptimized: true },
  reactCompiler: true,
};

export default nextConfig;
