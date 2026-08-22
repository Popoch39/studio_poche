# Le Lettrage reste en image scannée, doublé d'un Texte pour l'accessibilité

Dans la maquette, les titres, les libellés de navigation et le logo ne sont pas du texte :
ce sont des images scannées de l'écriture de Marie. Nous les affichons telles quelles, en
ajoutant systématiquement le texte équivalent dans le DOM, masqué visuellement.

## Pourquoi ne pas chercher une police manuscrite

C'est l'option qui rendrait tout plus simple : du vrai texte, accessible, léger,
animable caractère par caractère, et Marie pourrait écrire de nouveaux titres sans
scanner. Mais aucune police libre n'est sa main, et son écriture *est* l'identité du
studio — c'est le produit, pas l'habillage. Une police approchante rendrait le site
génériquement « fait main » au lieu d'être fait par elle.

## Pourquoi ne pas se contenter des images

Une image de texte n'est lisible ni par un lecteur d'écran ni par un moteur de recherche,
et un libellé de navigation invisible pour l'un et l'autre est un défaut, pas un choix
esthétique. Le doublage par un texte masqué coûte une ligne par libellé et supprime
entièrement le problème.

## Conséquences

- Tout composant affichant un Lettrage doit porter son Texte équivalent. C'est le rôle du
  composant `Lettrage` : il n'existe pas de chemin qui affiche un Lettrage nu.
- Les Lettrages destinés à être animés au tracé (`DrawSVG`) doivent d'abord être
  vectorisés. Ils sont peu nombreux — navigation, titres de section, logo — et cette
  vectorisation est un travail d'assets, pas de code.
- Marie ne peut pas ajouter un titre sans produire l'asset correspondant. C'est une
  contrainte réelle du choix, à lui signaler.
