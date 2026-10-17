# Reproduire le test statique

## Prérequis

Utiliser une copie du projet avec ses dépendances Angular déjà installées et Node 22. Le rapport initial a utilisé Node 22.23.3 et ESLint 8.57.1. Une base de données, un serveur, un navigateur et une clé d'IA ne sont pas nécessaires.

Préparer les dépendances selon le README du projet **avant** de commencer la phase de préservation et d'analyse. Pendant cette phase, ne pas lancer l'application, les tests dynamiques, `npm run format`, `--fix` ou une mise à niveau des dépendances. Fermer les outils susceptibles de modifier les sources.

## Exécution locale sur cette machine

Depuis `C:\Users\everp\Documents\GitHub\web-ai` dans PowerShell :

```powershell
& 'C:\custom\bins\node\node-v22.23.3-win-x64\node.exe' 'docs/static-testing-2026-10-11/analyse.mjs' '--output' 'tmp/statique-reprise-01'
$LASTEXITCODE
```

Choisir un nouveau nom de dossier pour chaque reprise. Le collecteur refuse d'écraser un dossier contenant déjà `execution.json`. Il utilise la configuration archivée, résout les chemins depuis le projet et appelle l'ESLint installé dans `frontend/node_modules`. Il ne lance aucune fonctionnalité Stayora et n'accède pas aux secrets.

Sur une autre machine où Node 22 est disponible dans le chemin d'exécution :

```sh
node docs/static-testing-2026-10-11/analyse.mjs --output tmp/statique-reprise-02
```

Les fichiers de la nouvelle exécution seront placés dans le nouveau dossier, sans écraser les preuves du 11 octobre 2026. L'arbre de travail, les chemins absolus, les horaires et les résultats peuvent différer si le projet a changé.

## Commande directe équivalente

Depuis le dossier `frontend`, avec Node 22 sélectionné :

```sh
node node_modules/eslint/bin/eslint.js --config ../docs/static-testing-2026-10-11/eslint-rapport.cjs --resolve-plugins-relative-to . --ext .ts,.html --format json --report-unused-disable-directives src
```

Cette commande montre le même périmètre et les mêmes options, mais le collecteur est préférable pour archiver automatiquement les horaires, la durée, les sorties et le code réel d'ESLint. La commande absolue exacte de l'exécution initiale est conservée dans `execution.json` et dans le rapport.

## Vérification des résultats

1. Lire `execution.json` : version, commande de l'analyse, dossier, date, fuseau, durée, `codeSortie` et compteurs.
2. Vérifier que `analyse-stdout.json` contient les mêmes nombres d'erreurs et d'avertissements. Les messages, chemins, lignes et colonnes constituent les constats originaux.
3. Vérifier `analyse-stderr.txt` : vide pendant l'exécution initiale. Une erreur de configuration éventuelle ne doit pas être présentée comme un défaut du code.
4. Comparer `fichiers-cibles.json` aux chemins retournés par ESLint. L'exécution initiale cible et analyse exactement 53 fichiers physiques.
5. Comparer `integrite-avant.json` et `integrite-apres.json`. Initialement, les 196 fichiers non ignorés hors livrables possèdent les mêmes empreintes SHA-256. Lire également les deux états Git.

Codes ESLint usuels : 0 signifie qu'aucune erreur bloquante n'est signalée selon les options retenues ; 1 correspond à des erreurs ou au dépassement d'un seuil d'avertissements ; 2 indique un problème de configuration ou un échec interne. L'analyse initiale obtient **0 erreur, 1 avertissement et le code 0**. Le code 0 ne signifie pas que le projet est dépourvu de bogues.

Ne pas corriger le constat pour modifier rétrospectivement le rapport : conserver cette exécution, puis effectuer toute correction dans une tâche de développement distincte et produire une nouvelle analyse dans un nouveau dossier.
