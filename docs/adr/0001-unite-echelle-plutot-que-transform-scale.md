# Le Collage est mis à l'échelle par une unité CSS, pas par `transform: scale()`

La maquette du Collage est dessinée dans un référentiel fixe de 1728px de large, avec des
positions absolues arbitraires. Pour la rendre fidèle à n'importe quelle largeur de
fenêtre, nous définissons une unité `--u` valant 1px de maquette
(`calc(min(100cqw, 2200px) / 1728)`) et exprimons chaque coordonnée en `calc(78 * var(--u))`,
plutôt que de poser un conteneur de 1728px et de le réduire par `transform: scale()`.

## Pourquoi pas `transform: scale()`

C'est la solution qui vient d'abord à l'esprit, et elle est plus courte à écrire. Elle est
pourtant inutilisable ici : une transformation ne modifie pas la boîte de mise en page, si
bien que la hauteur du document reste celle de la maquette non réduite, et surtout que
toutes les positions mesurées par ScrollTrigger sont fausses. Or la page portfolio fait
16404px de haut et **toute** la couche d'animation dépend de ces mesures. Le symptôme est
pernicieux : les animations se déclenchent au mauvais endroit, sans erreur.

L'unité CSS, elle, produit un DOM parfaitement ordinaire : ScrollTrigger n'a rien de
spécial à savoir.

## Conséquences

- Chaque coordonnée du manifeste doit passer par `calc(… * var(--u))`. Les classes
  utilitaires `.maquette-pose` et `.maquette-texte` de `app/globals.css` encapsulent ce
  calcul — il ne devrait pas être réécrit à la main.
- L'unité est en `cqw` et non en `vw` : `vw` inclut la largeur de la barre de défilement,
  ce qui provoquerait un débordement horizontal permanent (sur une page de 16404px, la
  barre est toujours là). D'où les deux niveaux `.scene` / `.scene-contenu` : une requête
  de conteneur ne peut pas s'interroger elle-même.
- Le corps de texte suit l'échelle. C'est ce qui fixe le seuil de bascule vers la vue
  mobile à 1280px : en dessous, le texte de 20px de la maquette descend sous 15px.
