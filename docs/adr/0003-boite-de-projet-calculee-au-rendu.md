# La boîte d'un Projet est calculée au rendu, pas par le générateur

Chaque `<article>` du Collage porte désormais une boîte englobante réelle : le min/max des
Œuvres et de la Légende de son Projet, posé en `maquette-pose`, avec ses enfants translatés
dans son référentiel (`BlocProjet.boiteProjet`). Cette boîte est **dérivée au rendu** des
données du manifeste, et non inscrite dans `content/projets.ts` par le générateur.

## Pourquoi une boîte

Sans elle, l'article n'a aucune géométrie : ses enfants sont en position absolue et
s'ancrent au conteneur du Collage, l'article lui-même a une hauteur nulle, empilé en haut
de page. Tous les déclencheurs ScrollTrigger (`trigger: article`) mesuraient alors le même
point, tout se déclenchait au chargement, et un `yPercent` — pourcentage d'une hauteur
nulle — était un no-op silencieux. Toute la couche d'animation au scroll (révélations,
profondeur ScrollSmoother, écriture des Légendes) repose sur cette boîte.

## Pourquoi pas le générateur

La boîte est une dérivation pure de données déjà présentes dans le manifeste — l'y écrire
serait de la dénormalisation sans gain. Surtout, la hauteur de la Légende est une inconnue
de RENDU (`--h: auto`, le texte se réenroule) : le générateur ne pourrait produire qu'une
estimation, et une estimation n'a rien à faire dans un fichier présenté comme « la
géométrie exacte extraite de Figma ». L'estimation (1 ou 2 lignes × interlignage) vit donc
dans `BlocProjet`, où son rôle est explicite : la géométrie de déclenchement, jamais le
rognage — l'article n'a pas d'overflow.

## Conséquences

- La translation est pixel-exacte par construction dans le référentiel 1728px :
  `calc((o.x − b.x) * --u)` dans une boîte à `calc(b.x * --u)` redonne `calc(o.x * --u)`.
  Aux largeurs fractionnaires, l'accrochage sous-pixel peut déplacer la phase de
  ré-échantillonnage d'une image (invisible ; vérifié par `scripts/comparer-captures.mjs`).
- Les articles étant positionnés, chacun devient un ordre de peinture : les Œuvres de deux
  Projets ne peuvent plus s'entrelacer en z (l'ordre DOM — tri par y — les départage).
- Tout élément positionné venant APRÈS dans le DOM gagne le hit-test sur la zone qu'il
  recouvre : c'est pourquoi l'en-tête porte `z-index: 1`, sans quoi le conteneur `relative`
  des pages rendait la navigation incliquable.
- ScrollSmoother a une hauteur sur laquelle appliquer `data-speed` ; son cadre `fixed` doit
  ENVELOPPER `.scene`, dont le `container-type` confine les `position: fixed` descendants
  (voir `ScrollLisse`).
