# Rapport individuel — Rania Regai

**Projet :** Stayora · **Module :** Disponibilités, tarifs et opérations hôte

**UE :** IA for Software Engineering · **Année :** 2026–2027

**Date de préparation :** 19 octobre 2026

**Base documentaire examinée :** commit `2c9ee004e5cb7ce5505057c905358d5f9866bd7d`.

> Ce rapport a été préparé avec Codex à partir du dépôt et de preuves conservées. Il décrit le périmètre attribué à Rania Regai ; il ne constitue pas une déclaration signée de travail personnel. Les prompts de développement ci-dessous sont proposés pour de nouvelles interactions : aucune conversation passée, durée gagnée ou réponse Copilot n'est reconstituée. Les champs personnels doivent être complétés par le membre à partir de son utilisation réelle.

## 1. Correspondance avec la grille individuelle

| Critère                                          | Points | Éléments disponibles                                                   | Preuve personnelle restant à apporter                                                   |
| ------------------------------------------------ | -----: | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Maîtrise technique : IA et génie logiciel        |      1 | Architecture, responsabilités, prompt et limites décrits ici           | Expliquer le fonctionnement et répondre aux questions sans se limiter à lire le rapport |
| Documentation : prompts, interactions et modèles |      2 | Prompt applicatif exact, exemples et journal structuré                 | Sessions réelles, réponses, décisions et justification personnelle du modèle            |
| Présentation et argumentation des choix          |    1,5 | Démonstration et méthode de mesure proposées                           | Présentation orale, compromis et gain de productivité observé                           |
| Intégration API / modèle dans le projet          |    3,5 | Fonction `host-summary` reliée au service IA et à une interface métier | Démonstration actuelle ; distinguer `live` et `mock`                                    |

Les six critères collectifs totalisent séparément 12 points. Ce document fournit des éléments utiles aux tests assistés par IA et au rapport final, sans attribuer de note ni transformer une preuve collective en contribution individuelle certifiée.

## 2. Périmètre métier et contribution à expliquer

Expliquer les statistiques agrégées et suggérer des actions de calendrier à un hôte, sans modifier automatiquement prix, blocages ou réservations.

Les nuits bloquées par le propriétaire sont exclues des nuits commercialisables. L'occupation repose sur les nuits confirmées, pas sur le nombre de réservations. Les modifications de prix ou blocages doivent respecter les séjours actifs et la propriété du logement.

Parcours à présenter : Choisir le logement et le mois → afficher les statistiques → demander une synthèse → vérifier les chiffres et suggestions → effectuer séparément toute modification du calendrier.

L'attribution du module est cohérente avec le [tableau de responsabilités](../docs/technical-report.md) et le [handoff individuel](../docs/handoff/Rania-Regai.md). L'historique Git contient des commits sous le nom du membre ; une attribution de commit ne prouve pas à elle seule sa maîtrise ni l'usage personnel d'un LLM.

## 3. Architecture de l'intégration IA

- Interface métier : [`calendar-insights.component.ts`](../frontend/src/app/availability/calendar-insights.component.ts) ; parcours `/host/calendar et /host/today`.
- Implémentation du skill : [`HostSummaryAiSkill.java`](../backend/src/main/java/com/stayora/availability/HostSummaryAiSkill.java), identifiant `host-summary`.
- Orchestration commune : [`AiService`](../backend/src/main/java/com/stayora/ai/AiService.java) reçoit le skill, reconstruit le contexte via `AiPrivacy`, appelle le fournisseur et valide la sortie.
- Transport : [`ConfiguredAiProvider`](../backend/src/main/java/com/stayora/ai/ConfiguredAiProvider.java) appelle actuellement l'API native Google Gemini. Les clés restent côté serveur.
- Contrat : `POST /api/ai/assist`, avec `skill` et `context`. La réponse fournit notamment `mode`, `text`, `notice`, `reviewRequired` et `model`.

Le contexte utile est limité à : **nuits confirmées, nuits commercialisables, nuits bloquées, occupation, demandes en attente et montants simulés**. Le filtrage partagé est une défense supplémentaire ; il ne justifie pas d'envoyer des données personnelles inutiles. Un échec réseau, un quota, une sortie invalide ou une configuration absente peut produire un résultat déterministe `mock` clairement signalé. Une réponse HTTP 200 peut donc être un fallback et ne suffit pas à démontrer un appel réel réussi.

## 4. Prompt applicatif exact, en anglais

Chaîne extraite de `systemPrompt()` dans la version examinée, avant les consignes communes ajoutées par le fournisseur :

```text
Summarize the supplied aggregate host performance metrics in English. Explain occupancy using booked and sellable nights, mention owner blocks and pending requests, and suggest at most three practical calendar actions. Never invent revenue, bookings, guest identities, demand forecasts, or payments. Financial amounts are simulated. Recommendations require human review. Do not change availability, pricing, or reservations.
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
Review HostSummaryAiSkill, calendar insights and dashboard metrics. Trace confirmed nights, sellable nights, owner blocks and pending requests. Explain the occupancy denominator and verify that the AI cannot modify prices or availability.
```

Réponse exacte ou lien de session : **à renseigner après utilisation réelle**.
Décision personnelle et justification : **à renseigner**.
Fichier, commit ou test concerné : **à renseigner**.
Résultat de vérification : **à renseigner ; ne pas confondre résultat attendu et résultat observé**.

### Interaction 2 — prompt proposé à exécuter

```text
Review the calendar for exclusive end dates, zero sellable nights, conflicting owner blocks and concurrent reservation creation. Map existing tests to those risks and propose missing cases without claiming they have been executed.
```

Réponse exacte ou lien de session : **à renseigner après utilisation réelle**.
Décision personnelle et justification : **à renseigner**.
Fichier, commit ou test concerné : **à renseigner**.
Résultat de vérification : **à renseigner ; ne pas confondre résultat attendu et résultat observé**.

### Interaction 3 — prompt proposé à exécuter

```text
Compare two host-summary prompts on identical synthetic metrics. Require explicit units and at most three actions. Measure numerical consistency, unsupported forecasts, latency and token usage when available. Separate simulated payouts from real revenue.
```

Réponse exacte ou lien de session : **à renseigner après utilisation réelle**.
Décision personnelle et justification : **à renseigner**.
Fichier, commit ou test concerné : **à renseigner**.
Résultat de vérification : **à renseigner ; ne pas confondre résultat attendu et résultat observé**.

## 7. Revue documentaire IA et tests après intégration

**Analyse préparée dans cette session avec Codex :** Contrôler l'unité de chaque indicateur et le dénominateur de l'occupation avant de juger la qualité rédactionnelle du résumé.

Les sources suivantes existent dans le dépôt ; leur lecture établit les scénarios écrits, pas un nouveau résultat d'exécution :

- [Test : `AvailabilityManagementIntegrationTest.java` — `dashboardUsesSellableNightsAndDeterministicAggregateAi`](../backend/src/test/java/com/stayora/AvailabilityManagementIntegrationTest.java).
- [Test : `AvailabilityManagementIntegrationTest.java` — `nightlyOverrideFeedsAuthoritativeQuoteAndCrud`](../backend/src/test/java/com/stayora/AvailabilityManagementIntegrationTest.java).
- [Test : `AvailabilityManagementIntegrationTest.java` — `concurrentBlockAndReservationCannotBothWin`](../backend/src/test/java/com/stayora/AvailabilityManagementIntegrationTest.java).
- [Tests frontend du module](../frontend/src/app/availability/calendar.component.spec.ts).
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

Le [résultat conservé du 16 octobre 2026](../output/playwright/ai-failover-2026-10-16/test-results.json) contient une exécution de `host-summary` : mode `live`, modèle `cohere/north-mini-code:free`, statut HTTP 200, temps enregistré `7081 ms`.

Cette mesure correspond à une exécution d'interface de l'ancien fournisseur ; ce n'est ni une moyenne statistique, ni le délai du seul modèle, ni un benchmark Gemini. Le payload complet et le prompt exact de cette requête ne sont pas conservés dans ce fichier. Ne pas présenter le prompt actuel et cette réponse historique comme une paire requête/réponse de la même version.

Observation propre au module : La réponse historique emploie « 3 confirmed bookings » puis « 3 confirmed nights ». Cette variation illustre pourquoi les unités et libellés des agrégats doivent être vérifiés, indépendamment du succès HTTP.

Les fichiers `output/` sont des preuves locales généralement ignorées par Git. Le lien ci-dessus peut donc être absent d'un clone ou de GitHub ; le membre doit fournir les captures ou une exportation anonymisée correspondante dans son dossier de remise, sans publier de clés ni de données privées.

## 9. Évaluation, adaptation et productivité

Limite principale : Le modèle peut confondre nuits et réservations, interpréter un versement simulé comme un revenu réel, ou produire une prévision de demande sans données suffisantes.

Comparer le temps d'analyse manuelle d'un tableau mensuel à la lecture de la synthèse, en incluant la vérification des chiffres. Conserver les mêmes données, répéter plusieurs cas et compter le temps de relecture ; une estimation ne doit pas être présentée comme un gain mesuré.

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

Lien de PR : [PR de démonstration #1](https://github.com/Stayora-5SAE/web-ai/pull/1), créée en brouillon le 19 octobre 2026 ; revue Copilot non encore constatée.

Lien du commentaire réellement produit par Copilot : **en attente de revue**.

Analyse personnelle du commentaire et test de la correction : **à renseigner après réalisation**.

La création de la PR et ses défauts intentionnels ne remplacent pas une réponse réelle du reviewer. Pour la soutenance, montrer l'auteur, la date, le commentaire, la vérification humaine et les tests de la correction réellement appliquée.

## 11. Sources et finalisation personnelle

- [Handoff de Rania Regai](../docs/handoff/Rania-Regai.md).
- [Architecture et rapport technique](../docs/technical-report.md).
- [Prompts et contrats IA partagés](../docs/ai-prompts.md).
- [État actuel du fournisseur et historique daté](../docs/handoff/README.md).
- [Rapport de tests SonarQube du 11 octobre](../docs/testing-report/rapport.md), qui n'est pas à lui seul une preuve de revue par un LLM.

Avant remise, le membre doit compléter ses interactions, justifier ses décisions, ajouter ses sorties réelles, vérifier la cohérence de version et relire le texte. Les sections en attente restent explicitement en attente ; elles ne doivent pas être présentées comme du travail déjà exécuté.
