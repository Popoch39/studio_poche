# Le curseur reste un seul corps

Le curseur du site perd sa loupe — un monocle de verre (WebGL, `lib/loupe/`) qui magnifiait
réellement l'illustration survolée. Il redevient, et reste, **un seul objet** : le point
d'encre. Il s'élargit sur un lien ; il ne se transforme en rien d'autre.

## Pourquoi la loupe part

Elle avait deux défauts, dont un seul aurait suffi.

Le premier est un défaut de geste : elle **dédoublait le curseur**. Le point s'effaçait, un
second objet naissait, et le visiteur suivait tour à tour deux choses différentes selon ce
qu'il survolait. C'est exactement le reproche qui avait déjà fait retirer l'anneau de survol
des Œuvres, quelques semaines plus tôt : « un troisième corps entre les deux, qui brouille
le geste ». La loupe l'avait réintroduit sous une forme plus séduisante.

Le second est un défaut de fond : elle **ne disait rien**. Sur un Collage qui est encore une
impasse — pas de page Projet, rien à cliquer, aucune façon d'en savoir plus —, ce que le
visiteur cherche en s'arrêtant sur une illustration n'est pas de la voir plus grande : c'est
de savoir de quel projet il s'agit. La loupe répondait avec brio à une question que personne
ne posait.

## Pourquoi une étiquette ne la remplace pas non plus

La suite logique était de faire dire au curseur ce que la loupe taisait : une étiquette qui
suit le point et nomme le projet — nom, année, technique. Elle a été construite, essayée,
et retirée.

Le raisonnement était juste, le résultat non. Une étiquette qui suit le pointeur est une
**surface de lecture en mouvement** : elle demande de lire pendant que ça bouge, elle
recouvre l'illustration qu'elle prétend qualifier, et elle redevient — quel que soit son
habillage, papier clair ou encre en négatif — ce second corps qu'on venait de retirer deux
fois. Le geste du Collage est un balayage : on parcourt, on s'arrête sur ce qui accroche.
Rien de tout cela ne réclame une légende volante, puisque **la Légende est déjà là**, posée
sous la planche, immobile, et qu'elle s'écrit au passage du front d'encre.

La leçon est la même que pour les deux tentatives précédentes : le point n'a pas besoin
d'être augmenté. Ce qui manque au Collage n'est pas dans le curseur — c'est une page Projet.

## Conséquences

- **Le curseur natif redevient visible partout.** La seule règle `cursor: none` du projet
  disparaît avec la loupe, ce que la doctrine du fichier préférait déjà : « cacher le vrai
  curseur coûte plus en repères qu'il ne rapporte en style ».
- **`quitter` devient inconditionnel.** Il était gardé par `loupeOuverte`, ce qui masquait un
  bug : quitter la fenêtre depuis un lien laissait la tache figée à `scale: 2`. La sortie de
  fenêtre repose désormais le point dans tous les cas.
- **Le garde `LISIERE` disparaît avec elle.** Il n'existait que parce que le défilement
  déplace une Œuvre sous un pointeur immobile sans émettre de `pointerover`. Plus rien ne
  s'accroche à une Œuvre : plus rien à surveiller. À noter pour la prochaine idée de curseur
  contextuel — le problème reviendra avec elle.
- **Le modèle `Projet` ne gagne pas de `nomCourt`.** Il n'avait de sens que pour l'étiquette,
  et un champ éditorial que rien n'affiche est une dette. Les titres longs restent longs : la
  Légende a la place de les porter.
- **475 lignes de WebGL sont mises de côté** — cadrage optique, shader de courbure, cache de
  textures. Elles ne sont pas perdues : si une page Projet finit par exister, l'agrandissement
  y aura un sens qu'il n'avait pas au bout d'un curseur.
