# Rapport individuel — Hadir Ghallabi

**Projet :** Stayora · **Module :** Réservations, séjours et paiements simulés

**UE :** IA for Software Engineering · **Année :** 2026–2027

**Date de préparation :** 19 octobre 2026

**Base documentaire examinée :** commit `2c9ee004e5cb7ce5505057c905358d5f9866bd7d`.

> Ce rapport a été préparé avec Codex à partir du dépôt et de preuves conservées. Il décrit le périmètre attribué à Hadir Ghallabi ; il ne constitue pas une déclaration signée de travail personnel. Les prompts de développement ci-dessous sont proposés pour de nouvelles interactions : aucune conversation passée, durée gagnée ou réponse Copilot n'est reconstituée. Les champs personnels doivent être complétés par le membre à partir de son utilisation réelle.

## 1. Correspondance avec la grille individuelle

| Critère                                          | Points | Éléments disponibles                                                            | Preuve personnelle restant à apporter                                                   |
| ------------------------------------------------ | -----: | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Maîtrise technique : IA et génie logiciel        |      1 | Architecture, responsabilités, prompt et limites décrits ici                    | Expliquer le fonctionnement et répondre aux questions sans se limiter à lire le rapport |
| Documentation : prompts, interactions et modèles |      2 | Prompt applicatif exact, exemples et journal structuré                          | Sessions réelles, réponses, décisions et justification personnelle du modèle            |
| Présentation et argumentation des choix          |    1,5 | Démonstration et méthode de mesure proposées                                    | Présentation orale, compromis et gain de productivité observé                           |
| Intégration API / modèle dans le projet          |    3,5 | Fonction `reservation-itinerary` reliée au service IA et à une interface métier | Démonstration actuelle ; distinguer `live` et `mock`                                    |

Les six critères collectifs totalisent séparément 12 points. Ce document fournit des éléments utiles aux tests assistés par IA et au rapport final, sans attribuer de note ni transformer une preuve collective en contribution individuelle certifiée.

## 2. Périmètre métier et contribution à expliquer

Proposer un programme de séjour à partir de la destination, des dates et du nombre de voyageurs, sans organiser une activité ni modifier une réservation.

Les séjours utilisent [arrivée, départ), avec départ exclu. Les prix sont recalculés côté serveur et conservés comme instantané. Les opérations concurrentes utilisent un verrou de propriété. Les paiements sont simulés.

Parcours à présenter : Ouvrir un séjour autorisé → demander un itinéraire → lire les conseils et leur statut → vérifier les informations localement. Aucun paiement ni réservation d'activité n'est déclenché.

L'attribution du module est cohérente avec le [tableau de responsabilités](../docs/technical-report.md) et le [handoff individuel](../docs/handoff/Hadir-Ghallabi.md). L'historique Git contient des commits sous le nom du membre ; une attribution de commit ne prouve pas à elle seule sa maîtrise ni l'usage personnel d'un LLM.

## 3. Architecture de l'intégration IA

- Interface métier : [`trip-detail.component.ts`](../frontend/src/app/reservations/trip-detail.component.ts) ; parcours `/trips/:id`.
- Implémentation du skill : [`ReservationAiSkill.java`](../backend/src/main/java/com/stayora/reservations/ReservationAiSkill.java), identifiant `reservation-itinerary`.
- Orchestration commune : [`AiService`](../backend/src/main/java/com/stayora/ai/AiService.java) reçoit le skill, reconstruit le contexte via `AiPrivacy`, appelle le fournisseur et valide la sortie.
- Transport : [`ConfiguredAiProvider`](../backend/src/main/java/com/stayora/ai/ConfiguredAiProvider.java) appelle actuellement l'API native Google Gemini. Les clés restent côté serveur.
- Contrat : `POST /api/ai/assist`, avec `skill` et `context`. La réponse fournit notamment `mode`, `text`, `notice`, `reviewRequired` et `model`.

Le contexte utile est limité à : **destination publique, dates du séjour et nombre de voyageurs**. Le filtrage partagé est une défense supplémentaire ; il ne justifie pas d'envoyer des données personnelles inutiles. Un échec réseau, un quota, une sortie invalide ou une configuration absente peut produire un résultat déterministe `mock` clairement signalé. Une réponse HTTP 200 peut donc être un fallback et ne suffit pas à démontrer un appel réel réussi.

## 4. Prompt applicatif exact, en anglais

Chaîne extraite de `systemPrompt()` dans la version examinée, avant les consignes communes ajoutées par le fournisseur :

```text
Suggest a short English travel itinerary from only the supplied destination, stay dates and party size. Do not invent reservations, prices, access codes or personal details. Describe suggestions as advice requiring local verification. Never perform booking or payment actions.
```

Le fournisseur ajoute notamment une limitation aux faits anonymes, une réponse de moins de 200 mots et l'obligation de relecture humaine. Le contexte est une donnée à traiter, pas une autorisation d'exécuter des actions. La limite de longueur et les contrôles de sortie ne garantissent pas la justesse sémantique.

## 5. Choix du modèle et paramètres

La configuration actuelle du dépôt utilise `gemini-3.5-flash-lite` via Google Gemini. Le choix est centralisé pour les cinq modules. Il faut distinguer cet usage applicatif de Codex, utilisé ici pour préparer et analyser la documentation.

Une justification technique défendable pour cette tâche courte est la simplicité d'un fournisseur commun, la sortie bornée et le contrôle humain conservé dans le parcours. L'adéquation réelle en qualité, coût et délai doit être mesurée ; ce rapport ne prétend pas qu'un benchmark a démontré la supériorité de ce modèle ni qu'un tarif gratuit est garanti.

Paramètres vérifiés dans le code : `temperature = 0.2`, `maxOutputTokens = 800` pour Gemini, délai configuré par défaut à 30 secondes et borné entre 1 et 30 secondes. Le chemin compatible utilise une limite distincte de 600 tokens. Une température basse réduit la variation mais ne supprime pas les hallucinations.

Techniques présentes : contexte minimal, consignes métier spécialisées, sortie courte, contrôle des réponses et fallback. Il s'agit de conception de prompts et de paramètres d'inférence ; aucun entraînement des poids, fine-tuning, RAG ni cache de réponses n'est démontré ici. Les hypothèses de coût du rapport collectif ne sont pas une consommation mesurée.

**À personnaliser :** modèle réellement utilisé par le membre, date, alternative envisagée, raison du choix et observations sur des entrées identiques. Ne pas attribuer au membre un choix partagé qu'il ne peut pas expliquer.

## 6. Interactions de développement et décisions personnelles

Ces trois prompts sont des supports prêts à utiliser. Ils ne constituent pas des transcriptions de sessions passées. Utiliser uniquement des faits synthétiques ou du code autorisé, puis conserver les réponses réelles, y compris les erreurs de l'outil.

### Interaction 1 — prompt proposé à exécuter

```text
Review ReservationAiSkill and the trip detail component. Verify that the itinerary uses destination, stay dates and party size only, and cannot change bookings or payments. Identify where human verification is required.
```

Réponse exacte ou lien de session : **à renseigner après utilisation réelle**.
Décision personnelle et justification : **à renseigner**.
Fichier, commit ou test concerné : **à renseigner**.
Résultat de vérification : **à renseigner ; ne pas confondre résultat attendu et résultat observé**.

### Interaction 2 — prompt proposé à exécuter

```text
Review booking overlap logic using half-open intervals [check-in, check-out). Give examples for adjacent stays and real overlap. Trace server-side pricing and concurrent booking protection, then map each behavior to an existing test.
```

Réponse exacte ou lien de session : **à renseigner après utilisation réelle**.
Décision personnelle et justification : **à renseigner**.
Fichier, commit ou test concerné : **à renseigner**.
Résultat de vérification : **à renseigner ; ne pas confondre résultat attendu et résultat observé**.

### Interaction 3 — prompt proposé à exécuter

```text
Design an evaluation of itinerary quality on five synthetic trips. Score date consistency, unsupported travel claims, usefulness and latency. Compare a baseline prompt with one requiring explicit uncertainty. Do not report unmeasured gains.
```

Réponse exacte ou lien de session : **à renseigner après utilisation réelle**.
Décision personnelle et justification : **à renseigner**.
Fichier, commit ou test concerné : **à renseigner**.
Résultat de vérification : **à renseigner ; ne pas confondre résultat attendu et résultat observé**.

## 7. Revue documentaire IA et tests après intégration

**Analyse préparée dans cette session avec Codex :** Vérifier le cas frontière de deux séjours adjacents et distinguer une recommandation touristique d'un fait de réservation.

Les sources suivantes existent dans le dépôt ; leur lecture établit les scénarios écrits, pas un nouveau résultat d'exécution :

- [Test : `BookingIntegrationTest.java` — `pendingHoldsDatesAndAdjacentStaysRemainAvailable`](../backend/src/test/java/com/stayora/BookingIntegrationTest.java).
- [Test : `BookingIntegrationTest.java` — `quotesUseDecimalArithmeticAndIgnoreClientPrice`](../backend/src/test/java/com/stayora/BookingIntegrationTest.java).
- [Test : `BookingIntegrationTest.java` — `serializesConcurrentReservations`](../backend/src/test/java/com/stayora/BookingIntegrationTest.java).
- [Tests frontend du module](../frontend/src/app/reservations/trip-detail.component.spec.ts).
- [Tests partagés du transport Gemini](../backend/src/test/java/com/stayora/ai/GeminiProviderTest.java) et [tests de confidentialité / fallback](../backend/src/test/java/com/stayora/ai/AiSafetyTest.java).

La présence d'un test sur une fonctionnalité IA ne prouve pas que l'IA a aidé à écrire ce test. Pour documenter des tests assistés par IA, conserver la chaîne complète : prompt réel → diagnostic ou test proposé → décision humaine → changement éventuel → résultat exécuté. Un diagnostic rejeté peut aussi être documenté avec sa raison.

| Élément de traçabilité         | À compléter avec une observation réelle                        |
| ------------------------------ | -------------------------------------------------------------- |
| Date, outil et modèle de revue | Date de la session et modèle réellement affiché                |
| Problème ou risque analysé     | Fichier, lignes et comportement reproductible                  |
| Réponse IA                     | Extrait exact ou lien accessible, sans secret                  |
| Décision humaine               | Acceptation, modification ou rejet motivé                      |
| Test / correction              | Lien du commit ou de la PR, ou explication si aucun changement |
| Vérification après intégration | Commande, sortie, date et résultat exact                       |

Les vérifications fonctionnelles du projet utilisent une base de test PostgreSQL isolée nommée `stayora_test`. La commande collective est `npm run check`, selon les prérequis du README. **Aucun test métier n'est relancé lors de la rédaction de ce document.** Les chiffres historiques restent associés à leur date et version.

## 8. Preuve historique de génération et limites observées

Le [résultat conservé du 16 octobre 2026](../output/playwright/ai-failover-2026-10-16/test-results.json) contient une exécution de `reservation-itinerary` : mode `live`, modèle `cohere/north-mini-code:free`, statut HTTP 200, temps enregistré `7579 ms`.

Cette mesure correspond à une exécution d'interface de l'ancien fournisseur ; ce n'est ni une moyenne statistique, ni le délai du seul modèle, ni un benchmark Gemini. Le payload complet et le prompt exact de cette requête ne sont pas conservés dans ce fichier. Ne pas présenter le prompt actuel et cette réponse historique comme une paire requête/réponse de la même version.

Observation propre au module : Le bilan historique signale des trajets et temps de transport non vérifiés dans l'itinéraire. La réponse conservée propose plusieurs déplacements : ce sont des suggestions, pas des prestations réservées.

Les fichiers `output/` sont des preuves locales généralement ignorées par Git. Le lien ci-dessus peut donc être absent d'un clone ou de GitHub ; le membre doit fournir les captures ou une exportation anonymisée correspondante dans son dossier de remise, sans publier de clés ni de données privées.

## 9. Évaluation, adaptation et productivité

Limite principale : Une suggestion peut comporter un trajet, une durée ou un horaire non vérifié. La présence d'une réponse live ne valide pas ces informations touristiques.

Comparer le temps de préparation manuelle d'un court programme au temps génération + vérification, en comptant les corrections nécessaires. Conserver les mêmes données, répéter plusieurs cas et compter le temps de relecture ; une estimation ne doit pas être présentée comme un gain mesuré.

| Mesure                | Méthode proposée                                                  | Résultat actuel                                                             |
| --------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Utilité et exactitude | Vérifier les réponses contre les faits fournis                    | Observation historique disponible, pas de score systématique                |
| Robustesse            | Comparer sortie valide, quota, timeout et fallback                | Scénarios présents dans les tests partagés ; exécution nouvelle à consigner |
| Délai                 | Chronométrer plusieurs requêtes et rapporter médiane / dispersion | Une mesure historique ci-dessus, pas de benchmark courant                   |
| Coût / tokens         | Relever les usages réellement retournés ou expliquer leur absence | Pas de relevé individuel exhaustif                                          |
| Gain de productivité  | Comparer travail manuel et travail assisté avec correction        | Non mesuré individuellement                                                 |
| Adaptation du prompt  | Comparer deux versions sur les mêmes cas                          | Protocole proposé, comparaison à réaliser                                   |

Les optimisations attendues par la grille peuvent être abordées par la précision du prompt, les paramètres, le choix comparé de modèles et la réduction du contexte. Ne pas annoncer RAG, agents, fine-tuning ou optimisation mesurée sans implémentation et preuve correspondantes.

## 10. Démonstration orale et revue GitHub Copilot

1. Présenter le périmètre métier et un contrôle côté serveur avec son test.
2. Montrer l'entrée envoyée au skill et expliquer chaque champ utile.
3. Générer une réponse, lire le mode et le modèle réellement retournés, puis expliquer les limites et l'action humaine requise.
4. Montrer une interaction personnelle authentique et la décision prise sur la proposition de l'IA.
5. Présenter un test exécuté après intégration avec sa sortie et sa date.
6. Expliquer les résultats mesurés et distinguer ce qui reste une hypothèse.

Une PR d'exercice est préparée séparément dans `docs/copilot-review-demo/`. Elle contient volontairement des défauts isolés du produit pour permettre une vraie revue. Elle ne démontre ni une vulnérabilité de production ni la contribution des cinq membres à une même revue.

Pour demander une revue sur GitHub, utiliser **Reviewers → Copilot → Request**, si cette option est disponible pour le compte et le dépôt. Une simple mention n'est pas une preuve de revue. La [documentation GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/copilot-code-review) décrit cette procédure.

Lien de PR : **à renseigner après création**.

Lien du commentaire réellement produit par Copilot : **en attente de revue**.

Analyse personnelle du commentaire et test de la correction : **à renseigner après réalisation**.

La création de la PR et ses défauts intentionnels ne remplacent pas une réponse réelle du reviewer. Pour la soutenance, montrer l'auteur, la date, le commentaire, la vérification humaine et les tests de la correction réellement appliquée.

## 11. Sources et finalisation personnelle

- [Handoff de Hadir Ghallabi](../docs/handoff/Hadir-Ghallabi.md).
- [Architecture et rapport technique](../docs/technical-report.md).
- [Prompts et contrats IA partagés](../docs/ai-prompts.md).
- [État actuel du fournisseur et historique daté](../docs/handoff/README.md).
- [Rapport de tests SonarQube du 11 octobre](../docs/testing-report/rapport.md), qui n'est pas à lui seul une preuve de revue par un LLM.

Avant remise, le membre doit compléter ses interactions, justifier ses décisions, ajouter ses sorties réelles, vérifier la cohérence de version et relire le texte. Les sections en attente restent explicitement en attente ; elles ne doivent pas être présentées comme du travail déjà exécuté.
