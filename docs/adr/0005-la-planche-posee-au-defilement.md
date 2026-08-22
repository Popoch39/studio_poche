# La planche d'un Projet scénographié se pose au défilement, par la géométrie plutôt que par un verrou

Trois Projets du Collage — `toits-de-paris-2026`, `fresque-ambassade-suisse`,
`oiseaux-de-camargue` — sont **scénographiés** : l'enveloppe de leurs Œuvres, la **Planche**,
monte **plein écran** (exactement 100dvh de haut, centrée à l'écran), s'y **aimante**, s'y
immobilise au pixel, puis va s'ancrer sur sa boîte de maquette.

Ce n'est pas une révélation. La planche est **entière** du premier au dernier pixel du geste :
ce qu'on regarde n'est pas son apparition, c'est son **déplacement** vers son ancre. Elle
arrive par le seul défilement, comme n'importe quelle image du Collage — simplement, elle
occupe tout l'écran.

C'est le geste de `useEntreePortfolio` (le calage de la feuille, échelle 1,04 → 1) à pleine
amplitude. Un seul vocabulaire de mouvement, deux amplitudes : c'est ce qui distingue une
ambition d'une accumulation d'effets.

## Un Projet, un geste

Un Projet scénographié n'a **pas** de front d'encre : la pose est sa révélation. Ni
`data-revelation`, ni `--encre`, ni `data-encre-course`. C'est la règle posée par l'ADR 0004
quand six gestes de révélation ont été abandonnés pour un seul : sur une même planche, deux
gestes indépendants décousent ce qu'ils prétendent montrer. `useRevelationEncre` filtre donc
explicitement les articles porteurs d'une planche, et c'est `usePlanchePosee` qui donne le
départ à la Légende via le protocole de `arrivee.ts`. Un signal, un propriétaire.

## Ce qui a été essayé et rejeté

**Un cadre qui s'ouvre.** Une version intermédiaire découvrait la planche sur place : un
`clip-path: inset()` d'aire nulle s'ouvrait jusqu'à exactement l'écran, tenait, puis se
refermait sur l'ancre. Rien ne se déplaçait — c'était sa qualité et c'était son défaut. Ça
faisait un **sixième geste de révélation** là où l'ADR 0004 venait d'en imposer un seul, et à
l'œil ça se lit comme un rideau, pas comme une planche qu'on pose. Rejeté.

**Un verrou de défilement.** Une première version arrêtait le défilement pour de vrai :
`ScrollSmoother.paused(true)` et un `Observer` en `preventDefault` qui convertissait la
molette en progression de pose. Essayée à la main, elle était cassée et saccadée, pour deux
raisons structurelles :

- `ScrollLisse` crée le lisseur avec `normalizeScroll: true`, donc **GSAP intercepte déjà**
  molette et doigt pour piloter le défilement lui-même. Un second intercepteur par-dessus le
  premier se bat avec lui.
- la pose, pilotée par des deltas de molette bruts, avançait par crans de cent pixels. Un
  verrou doit répliquer à la main le lissage que ScrollSmoother fournit déjà — et le calage
  de position à l'entrée du verrou est un saut sec.

**Un `pin` GSAP.** Le Collage est fait d'`<article>` en `position: absolute` : le
`pin-spacer` de ScrollTrigger n'y a rien à pousser. Un `pin` n'allonge donc pas la page, mais
au dé-pinnage l'article revient à une position de document qui a défilé pendant toute la
durée du pin — et ça saute d'autant.

## Les trois temps

| temps        | ce qui bouge                                       | longueur                 |
| ------------ | -------------------------------------------------- | ------------------------ |
| **montée**   | rien (la page porte la planche à 1:1)              | déduite : **un écran**   |
| **maintien** | rien du tout                                       | `ENCRE.planche.maintien` |
| **pose**     | l'échelle revient à 1, la planche glisse à l'ancre | `ENCRE.planche.pose`     |

Deux cadrans seulement, en hauteurs d'écran. La montée ne se règle pas : elle **se déduit**.
La planche faisant exactement un écran de haut, l'amener de « entièrement sous la ligne de
flottaison » à « centrée à l'écran » demande exactement un écran de défilement. La régler
serait la faire commencer visible.

## L'échelle : cent pour cent de la hauteur, quoi qu'il arrive

```
k = 100dvh / H
```

La planche rendue fait exactement un écran de haut — pas « au moins », **exactement**. Sa
largeur est ce qu'elle est : rognée par le viewport si son format est plus large que celui de
la fenêtre, bordée de papier sinon.

Une **couverture** (`max(100dvw/L, 100dvh/H)`) a été essayée d'abord, et rejetée à l'œil :
elle fait dépasser `toits-de-paris-2026` de 28 % en hauteur au format de référence, et c'est
ce débord qu'on voit. Une hauteur exacte est aussi une hauteur qu'on peut **snaper** : il
existe un instant précis où la planche est plein écran, ce qui n'est pas le cas d'un
agrandissement qui ne fait que « couvrir au moins ».

Le corollaire est que `k` peut valoir **moins de 1** : `fresque-ambassade-suisse` (1146 px de
maquette de haut) est déjà plus haute que l'écran à sa taille de repos, donc elle rétrécit
pour tenir dans la hauteur, puis regrandit vers son ancre. C'est assumé — la règle est la
hauteur, pas l'agrandissement.

Rien n'est rogné par nous : ce qui dépasse sort du viewport, et `.scene` (en
`overflow-x: clip`) contient le débord latéral. Plus de `clip-path` du tout.

## L'aimantation, écrite à la main, à deux pôles

Le plein écran n'est pas une position parmi d'autres : c'est **le** moment du geste, et on ne
veut pas qu'il se traverse à moitié. Quand le défilement s'**arrête** dans la dernière portion
de la montée (`ENCRE.planche.attraction`, un tiers d'écran), il est porté jusqu'à l'arrivée
exacte — et seulement vers le bas : remonter ne doit rien rencontrer.

Mais le plein écran n'est pas la **fin** du geste, et un aimant qui n'aurait connu que lui
lâchait le visiteur au pire endroit. Les trois quarts d'écran qui restent — maintien puis pose
— sont justement ceux où l'écran bouge le moins : pendant le maintien, rien ne bouge du tout,
par construction. Un coup de molette y retombant laissait la planche à moitié rétrécie, en
suspension, et le défilement **paraissait bloqué**. Il ne l'était pas : il ne produisait
simplement plus rien à voir.

D'où un **second pôle**, l'ancre, et la **vitesse d'arrivée** pour arbitrer :

| ce qu'on fait                                        | où l'on est déposé      |
| ---------------------------------------------------- | ----------------------- |
| lancer franc dans la zone d'attraction               | l'**ancre** (tout joué) |
| défilement posé dans la zone d'attraction            | le **plein écran**      |
| s'arrêter n'importe où entre le plein écran et l'ancre | l'**ancre**             |
| être au-delà de l'ancre, ou remonter                 | rien                    |

Le seuil du lancer, `ENCRE.planche.lancer`, est en **hauteurs d'écran par seconde** et non en
pixels : le même coup de molette doit vouloir dire la même chose sur un portable et sur un
vingt-sept pouces. L'élan est **retenu à la mise à jour**, jamais lu dans le compte à rebours
— quand celui-ci arrive au bout, la page est par définition au repos et la vitesse y vaut
zéro.

Le maintien n'est pas sauté pour autant : le lisseur le traverse à sa propre allure, et la
planche y tient bel et bien plein cadre. Il n'est simplement plus un tunnel à franchir au
poignet. C'est pourquoi la correction porte sur l'**aimant** et non sur `maintien`, dont la
valeur reste `0.3` — et `SOUFFLE_AVANT`, qui lui est couplé, n'a donc pas bougé.

Un trajet aimanté est notre propre mouvement : tant qu'il dure, on n'en tire ni élan — ce
serait mesurer notre propre bras — ni compte à rebours, qui se réarmerait sans fin sur son
propre effet. C'est aussi ce qui rend lisible l'état « garé au plein écran » : à l'arrivée
l'élan vaut zéro, donc rien ne pousse plus, et la planche attend le prochain cran de molette.
Un trajet se termine de deux façons, et l'écart à la cible dit laquelle : il décroît tant que
c'est nous qui portons, il remonte dès qu'une main s'en mêle.

Le `snap` de ScrollTrigger a été essayé dans ses deux configurations — porté par le
déclencheur du geste, puis par un déclencheur dédié à la seule zone — et il se bat avec
ScrollSmoother dans les deux cas. Il *tween* la position de défilement pendant que le lisseur
la tient encore, donc il la ramène à une valeur périmée. Mesuré : un défilement programmatique
sur deux annulé, et surtout, en remontant, un **blocage dur** au plein écran que ni
`directional` ni un filtre sur `self.direction` ne lèvent — le second geste vers le haut ne
passait pas, un visiteur ne pouvait plus remonter le Collage.

Le remède tient en une phrase : **on ne dispute pas la position au lisseur, on la lui
demande.** `smoother.scrollTo(cible, true)` pose une nouvelle destination et laisse
ScrollSmoother l'atteindre avec sa propre courbe ; le moindre coup de molette reprend la main
aussitôt, puisque c'est le même mécanisme qui porte les deux.

Le déclenchement n'a pas de délai deviné : `onUpdate` bat tant que le lisseur bouge, donc un
compte à rebours réarmé à chaque battement n'arrive au bout que lorsque la page est vraiment
au repos.

## La verticale : rien ne dérive, jamais

La plage se termine à l'instant où le centre **naturel** de la planche atteint le centre de
l'écran. Soit `r` le défilement restant jusque-là ; le centre rendu vaut `100dvh/2 + r + y`.
Une seule expression porte les trois temps :

```
y = − min( maintien + pose , r )
```

- pendant la **montée** (`r > maintien + pose`), `y` est **constant** : la planche est portée
  par le seul défilement, à 1:1. Aucune courbe, rien qui puisse saccader, et surtout aucun
  parallaxe — un plan qui avance à la vitesse de la page n'en est pas un.
- ensuite `y = −r`, donc le centre rendu vaut `100dvh/2`, **constant**. La planche est
  épinglée au centre de l'écran au pixel, pendant le maintien **et** pendant la pose. Le
  rétrécissement se fait donc autour du point où la planche doit finir : verticalement, elle
  ne se déplace pas, elle se resserre.

Et comme elle couvre l'écran entier pendant le maintien, rien d'autre n'est visible : il n'y
a rien à voir bouger. Le défilement continue derrière elle, la barre de défilement avance —
mais la perception est celle d'un arrêt, obtenue sans rien intercepter, et lissée par
ScrollSmoother.

## L'horizontale : c'est elle, le geste d'ancrage

`x` va du centrage à l'écran (`100dvw/2 − centre naturel`) à 0, **pendant la pose
seulement**, à la courbe du dépôt d'encre. Une version antérieure refusait ce glissement
latéral : il n'y était qu'un effet de bord d'un recentrage subi, et il se lisait comme une
dérive. Ici il **est** ce qu'on regarde — la planche quitte le centre de l'écran pour aller
se ranger à sa place.

## L'ancre

À la fin de la plage, `x` et `y` valent 0 et l'échelle vaut 1 : la transformation est
l'**identité**. La planche est donc sur sa boîte de maquette au pixel par construction — pas
une soustraction juste, une transformation absente — et elle y arrive en même temps que son
centre naturel atteint le centre de l'écran. Aucun pixel n'est ajouté au document.

Les deux mesures d'écran viennent d'une sonde CSS en `100dvw` / `100dvh` posée sur `<body>` :
pas sur `.scene`, dont le `container-type: inline-size` confine les descendants
`position: fixed` et lui ferait mesurer la scène au lieu de l'écran.

## Pas de timeline

Tout est recalculé **à chaque image** depuis la géométrie courante : un seul scalaire, la
progression du déclencheur, et une fonction qui en déduit `x`, `y` et l'échelle.

Une timeline exigerait des durées, or une durée GSAP est un nombre figé à la création. Au
redimensionnement, les proportions des trois temps dériveraient de la course réelle, et
l'épingle — qui est une **égalité entre une durée et un défilement** — serait fausse. Le
corollaire heureux : plus de `immediateRender: false`, plus d'ordre de création à surveiller,
plus de `fromTo` qui estampe son état de départ. `onRefresh` pose l'état initial, `onUpdate`
le suit.

## Le souffle : la seule retouche à la mise en page

Une respiration de papier vide est insérée AU-DESSUS de chaque planche, et tout ce qui suit
est décalé d'autant (`decalagesPlanches`, dans `CollageDesktop`). Le reste de la maquette
garde ses écarts exacts au pixel : on n'insère qu'une respiration, on ne redispose rien.

- **`SOUFFLE_AVANT` (1300 px de maquette)** — la plage s'ouvre bien avant que la planche
  n'entre dans le champ : il lui faut toute sa course en amont, soit `1 + maintien + pose`
  = 1,75 hauteur d'écran. Or `toits-de-paris-2026` n'a que 2002 px au-dessus d'elle, et il en
  faut jusqu'à 1050 de plus sur une fenêtre étroite et haute (1280 × 1100).
  Sans ce souffle, sa plage commence à un défilement **négatif** : la planche est déjà à
  mi-course au chargement, et on la découvre plein cadre et non ancrée sur le premier écran.
- **Pas de souffle après**, et c'est une conséquence de la géométrie, pas un oubli. Il y en a
  eu un (800 px) du temps où l'échelle était une couverture : la planche débordait alors en
  hauteur, donc elle recouvrait une bande de document sous sa propre boîte. À exactement
  100dvh, la plus basse ligne qu'elle recouvre est `ancre + 0,05 · 100dvh` — au-dessus de son
  propre bord bas dès qu'elle dépasse un dixième d'écran. Elle ne cache plus rien en dessous
  d'elle, et ce souffle ne coûtait plus qu'un écran de papier vide au moment précis où l'on
  veut retrouver le Collage. Les écarts de la maquette reprennent immédiatement : 79 px après
  `toits-de-paris-2026`, 191 après l'Ambassade, 130 après la Camargue — à l'ancre, le Projet
  suivant affleure le bas de l'écran.

Le Collage passe donc de 16 404 à **20 304 px** de maquette. C'est la conséquence assumée :
la hauteur du document n'est plus celle du cadre PORTEFOLIO de Figma, et les captures de
référence de `scripts/capturer.mjs` sont à reposer.

## Conséquences

- **Le repos d'une planche est `scale(1)`, et non l'absence de transformation.** Le geste
  étant réversible, on ne peut pas nettoyer la transformation comme le fait
  `useEntreePortfolio`. Une planche porte donc un contexte d'empilement en permanence —
  vérifié sans conséquence, aucune des trois n'a de Banderole — et le hook retire ses styles
  en ligne à la main au démontage : ses `gsap.set` sont émis depuis un rappel, donc hors de
  la fenêtre de collecte du contexte, et `mm.revert()` ne les connaît pas.
- **Le geste se défait.** C'est un écart assumé vis-à-vis de l'ADR 0004 (« une encre qui se
  dépose ne se retire pas ») : une encre, non — une planche, si. Le scrub vit dans les deux
  sens, remonter la relève.
- **Un article scénographié n'a pas de `data-speed`.** La géométrie suppose que le centre de
  la planche suit le défilement à 1:1 ; un plan de profondeur le ferait avancer à 0,92× et
  fausserait le calage du plein cadre.
- **Le fond de papier de la planche est le mécanisme, pas un ornement.** Agrandie, la planche
  recouvre ses voisins, et `oiseaux-de-camargue` est un détourage à canal alpha : sans fond,
  le Collage se verrait à travers les oiseaux. Il est posé en CSS, en permanence — au repos
  la planche ne recouvre aucun voisin, donc il y est invisible.
- **Les Œuvres scénographiées annoncent leur largeur plein cadre** (`taillesPlanche`), pas
  celle de leur repos, et l'optimiseur d'assets leur ajoute un palier à la largeur exacte de
  la source. Sans ça, `camargue-1-oiseau-camargue-1` plafonnait à 1280 px et arrivait
  agrandi de 35 % à l'instant précis où on le regarde le plus. L'échelle étant bornée par la
  HAUTEUR, la largeur rendue vaut `100dvh · L/H` : elle dépasse celle du viewport sur une
  fenêtre étroite et haute, d'où `120vw` et non `100vw`.
- **Le choix des trois planches est éditorial**, donc il vit dans la table `CURATION` de
  `scripts/generer-projets.mjs` (`planche: true`) — jamais dérivé d'une formule : la plus
  grande planche n'est pas la plus belle image. Le générateur en dérive
  `content/planches.json`, que l'optimiseur d'assets lit parce qu'un module `.mjs` ne peut
  pas importer du TypeScript.
- Sous `prefers-reduced-motion` ou sous 1280 px, aucune pose : les Œuvres sont à leur place
  de maquette.

## Ce qui reste à l'œil

La durée de l'arrêt, celle de la pose et le moment où la Légende s'écrit se jugent en
défilant, pas en lisant. Trois valeurs les portent, toutes dans `ENCRE.planche` de
`lib/motion/gsap.ts` : `maintien`, `pose`, `posee`.
