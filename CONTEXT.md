# Studio Poche

Le site portfolio de Marie Pocheron, illustratrice indépendante et fondatrice du Studio
Poche. Le domaine est celui d'une œuvre graphique donnée à voir : des réalisations
d'illustration présentées en collage, sans commerce ni compte utilisateur.

## Language

### Le travail montré

**Œuvre** :
Une image unique, telle qu'elle apparaît sur la page. Porte ses dimensions et son texte
alternatif.
_Avoid_: image, visuel, media, asset

**Projet** :
Une réalisation légendée, composée d'une à six Œuvres. Toujours désigné par son **slug**,
jamais par son titre : « Les toits de Paris » existe deux fois dans le portfolio, en 2024
et en 2026.
_Avoid_: réalisation, travail, item, entrée, post

**Commanditaire** :
Qui a commandé le Projet. Par exemple SNCF Réseau, ou l'Ambassade de France en Suisse.
_Avoid_: client, partenaire

**Agence** :
L'intermédiaire par lequel la commande est passée, distinct du Commanditaire. Par exemple
l'agence CREADS pour SNCF Réseau, ou Canal Architecture.
_Avoid_: studio (réservé au Studio Poche lui-même), employeur

**Technique** :
Le médium employé. Par exemple craies grasses, illustration numérique, vidéo animée.
_Avoid_: médium, support, catégorie, tag

### La mise en page

**Collage** :
La disposition libre des Projets, en positions absolues dans un référentiel de 1728px de
large. Ses ordonnées suivent la maquette au pixel, à une exception près : deux respirations de
papier vide encadrent chaque **Planche** et décalent tout ce qui suit (voir docs/adr/0005). C'est une propriété du Projet **dans la vue desktop** uniquement : la vue mobile
l'ignore entièrement.
_Avoid_: grille, layout, canvas, mosaïque

**Lettrage** :
L'écriture manuscrite de Marie, telle qu'elle apparaît dans les titres, la navigation et
le logo. Ce ne sont pas des caractères mais des images scannées de sa main — un Lettrage
n'est jamais du **Texte** et ne peut pas être composé.
_Avoid_: police manuscrite, titre, typographie manuscrite

**Texte** :
Tout ce qui est réellement composé en caractères, dans l'unique police du site. Par
opposition au Lettrage.
_Avoid_: copie, contenu, label

**Légende** :
Le bloc de deux lignes accompagnant un Projet : son titre, puis son année suivie de son
contexte. Toujours visible, jamais révélée au survol.
_Avoid_: caption, description, crédit

**Banderole** :
Un visuel complet d'un Projet (le même cercle qu'une Œuvre ancre, prolongé de son
paysage et de ses textes) qui se **dépose** au survol de cette Œuvre, par-dessus les
voisins, et se retire à la sortie. Elle se révèle au **front d'encre**, comme toutes
les Œuvres du Collage : son rond ne cesse jamais d'être un rond — c'est le paysage qui
vient à lui, déposé vers la droite par la bande déchirée. Elle n'existe qu'à ce
moment-là : au repos — et sous `prefers-reduced-motion`, au tactile, sous 1280px — le
rendu est exactement la maquette. Une seule aujourd'hui : celle de
« logo-anne-maraichere ».
_Avoid_: bannière, bandeau, cover

**Planche** :
L'enveloppe des Œuvres d'un Projet **scénographié** — trois aujourd'hui. Elle entre grande
au défilement, prend l'écran entier, et le défilement s'arrête jusqu'à ce qu'elle soit
**arrivée à son ancre** : sa boîte de maquette. Un Projet scénographié n'a alors pas de front
d'encre — la pose EST sa révélation (voir docs/adr/0005). Sa Légende n'entre jamais dans la
Planche : elle ne se pose pas, elle s'écrit.
_Avoid_: hero, plein écran, zoom, slide

**Page d'attente** :
L'écran d'entrée du site : l'illustration animée de Marie, sans navigation, qui cède la
place au portfolio quand l'animation s'achève.
_Avoid_: splash, loader, accueil, home, intro

---

## Note sur le pipeline

La géométrie de tous les écrans est **extraite** de Figma, jamais saisie à la main :
`scripts/extraire-figma.mjs` → `scripts/generer-projets.mjs` → `content/projets.ts` et
`content/chrome.ts`. Ces deux fichiers sont générés ; les modifier à la main est un
contresens. Ce qui demande un jugement — les slugs, la répartition Commanditaire /
Agence / Technique, les textes alternatifs — vit dans la table `CURATION` du générateur.

Le **Lettrage de la Page d'attente** est une exception assumée, et de nature durable :
son SVG est écrit inline à la main dans
`components/chrome/LettrageStudioPoche.tsx`. Deux raisons qui ne se résoudront pas d'elles-
mêmes. D'abord `Dessin` rend les vecteurs en `<img src="…svg">`, ce qui interdit
d'atteindre les nœuds `path` — donc de les tracer. Ensuite le rendu SVG de Figma livre les
tracés dans l'ordre z, sans marquage de lettres : l'ordre d'ÉCRITURE (S-t-u-d-i-o P-o-c-h-e,
le point du « i » après son fût) demande un jugement que le pipeline ne peut pas produire.
La **géométrie** de ce Lettrage, elle, reste extraite : `vecteur("attente", "Calque_1")`.
Seul le tracé est à la main. L'export manuel est conservé en
`public/img/chrome/Calque_1.svg`, à l'emplacement exact que le pipeline produira quand le
quota Figma reviendra — il n'est référencé par aucun composant.

La **Banderole** est la troisième exception, durable elle aussi : elle n'existe pas
dans la maquette PORTEFOLIO — c'est un livrable du Projet, pas un élément du Collage —
donc le pipeline ne peut ni la placer ni la mesurer. Sa source vit dans
`sources/banderoles/`, un dossier qu'`extraire-figma.mjs` n'élague pas ; ses dérivés
passent par `assets:optimiser` comme les Œuvres ; et sa géométrie (les deux cercles à
faire coïncider) est mesurée sur les PNG sources puis consignée à la main dans
`content/banderoles.ts`.

La **rampe d'encre** est le seul asset généré qui ne vienne pas de Figma :
`scripts/generer-rampe-encre.mjs` → `public/img/encre/rampe-{gauche,droite}.webp` et
`content/encre.generated.ts`. C'est le masque à bord déchiré qui révèle toutes les Œuvres du
Collage (voir docs/adr/0004) ; ses dimensions sont DÉDUITES du plus grand Projet de
`content/projets.ts`, donc à régénérer après tout changement de maquette — c'est pourquoi
`assets:rampe` clôt la chaîne `assets`. Cette image est faite pour être **remplacée par un
lavis scanné de Marie** : même chemin, mêmes dimensions, mêmes bornes de bande, aucun code à
toucher.

`content/planches.json` est le seul fichier généré qui n'existe que pour un autre script :
`generer-projets.mjs` y écrit les noms de fichier des Œuvres **scénographiées**, et
`optimiser-assets.mjs` les lit pour leur ajouter un palier de variante à la largeur exacte de
leur source. Sans ce détour, une planche agrandie jusqu'à la largeur de l'écran serait servie
dans la variante calculée pour sa taille de REPOS, et arriverait molle à l'instant précis où
on la regarde le plus. Le détour existe parce qu'un module `.mjs` ne peut pas importer du
TypeScript ; le choix des planches, lui, est éditorial et vit dans la table `CURATION` du
générateur, comme les slugs.

Le composant `Entete` est l'autre exception, celle-là provisoire : ses coordonnées et recadrages y sont
encore écrits en dur (relevés avant que le pipeline n'existe, et vérifiés identiques aux
valeurs extraites). Il devrait consommer `content/chrome.ts` comme les autres écrans.
