# Un seul front d'encre par Projet, et non un geste par Œuvre

La révélation du Collage passe d'un catalogue de six `clip-path` attribués Œuvre par Œuvre
(`gauche / droite / haut / rideau / tache / diagonale`) à **un seul geste** : une bande
d'encre déchirée traverse la planche entière. Le front est une propriété du **Projet** ;
chaque Œuvre n'y découpe que sa part, via des bornes de `mask-position` dérivées de sa
position dans la boîte des Œuvres (`lib/encre.ts`, `BlocProjet`).

## Pourquoi abandonner les six gestes

Le défaut est visible au premier écran. `veja-x-milk` est une planche **jointive** : cinq
découpes bord à bord, sans gouttière. Avec un geste par Œuvre, les cinq masques
progressaient indépendamment — et pendant toute la révélation, les joints s'ouvraient puis
se refermaient. Ce n'est pas lu comme une pose, c'est lu comme un défaut d'alignement.
L'ancienne entrée aggravait la chose en translatant chaque découpe de ±36 px avec des
rotations opposées : assez pour se voir, trop peu pour être une intention.

Au-delà du défaut, six gestes forment un catalogue et non une signature : de la variété
sans hiérarchie, dont le visiteur ne retient aucun geste.

## Pourquoi le Projet et non l'Œuvre

Un front partagé règle le problème **par construction** plutôt que par réglage :

- Les joints ne s'ouvrent pas — la même bande traverse les cinq découpes d'un trait, si
  bien qu'ils disparaissent au lieu de se voir.
- Le décalage entre Œuvres n'est plus un `stagger` par indice mais une conséquence de la
  géométrie : une pièce plus loin sur l'axe est mouillée plus tard parce qu'elle est plus
  loin.
- Un Projet se lit comme UNE unité, y compris quand ses Œuvres sont dispersées.

Le front se mesure sur la boîte des seules **Œuvres**, jamais sur celle qui inclut la
Légende : celle-ci s'écrit, elle n'est pas mouillée, et la faire entrer dans la course
allongerait le geste d'un vide.

## Ce qui varie, ce qui ne varie jamais

L'inclinaison du bord — l'angle du poignet — est **constante pour tout le site**, cuite dans
la rampe. Ce qui varie est le bord d'**attaque** (la marge de page la plus proche du Projet,
`sensEncre`) et la **durée**, qui n'est pas réglée : `course / ENCRE.vitesse`, bornée. La
main va toujours à la même allure ; les grandes planches prennent le temps qu'elles
méritent — et une planche large fait donc naturellement attendre sa Légende, qui s'écrit
quand le front est passé (protocole de `lib/motion/arrivee.ts`).

## Pourquoi une image et non un filtre

Le déchirement exige un **seuillage** du bruit (« cette fibre a-t-elle déjà bu ? »), et
aucune composition CSS ne sait seuiller : `mask-composite` multiplie ou additionne des
alphas, il ne les tranche pas. Un filtre SVG (`feTurbulence` + `feDisplacementMap`) le
saurait, mais repasse par le CPU à chaque image sur 58 Œuvres. Le seuil est donc cuit
hors ligne dans une rampe (`scripts/generer-rampe-encre.mjs`, ~9 Ko par sens), et il ne
reste au navigateur qu'un glissement d'image. Mesuré : au CPU non bridé, indiscernable de
l'absence de masque (médiane 16,7 ms, p90 et p99 identiques).

## Conséquences

- La révélation n'est plus strictement binaire : une bande de 36 px de maquette (~2 % de la
  largeur de page) est en alpha partiel. La lettre de la règle « jamais d'opacité sur une
  Œuvre » est donc levée, son esprit tenu : l'Œuvre n'est jamais globalement sous 100 %,
  et rien ne passe PAR-DESSUS le dessin — il apparaît, il n'est pas traversé.
- L'état masqué reste exprimé en CSS pure dès la première peinture (`globals.css`), parce
  que toute la géométrie est dérivée au rendu — même raison qu'à l'ADR 0003.
- GSAP n'anime qu'une variable par article (`--encre`) : 26 tweens pour 58 Œuvres, et le
  front partagé est de l'héritage CSS plutôt qu'une synchronisation à écrire.
- `data-revelation` perd sa valeur mais reste posée : `SurvolEncre` s'en sert pour
  identifier une pièce du Collage (`closest("[data-revelation]")`).
- Le miroir d'une Œuvre (`miroir: true`) descend du cadre vers l'`<img>` : sur le cadre il
  retournerait aussi le masque — le front y remonterait à contresens de celui de ses
  voisines — et il entrerait en collision avec les transforms de `SurvolEncre`.
- La rampe est faite pour être **remplacée par un lavis scanné de Marie** : même chemin,
  mêmes dimensions, mêmes bornes de bande. Le bord de l'encre du site deviendrait alors
  littéralement le bord de la sienne, sans qu'une ligne de code bouge.
