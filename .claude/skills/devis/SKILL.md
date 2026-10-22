---
name: devis
description: Rédige une proposition commerciale ARKT à partir d'un brief, crée content/devis/{slug}.json et publie la page arkt-conseil.com/devis/{slug}/. À utiliser quand Arthur tape /devis suivi d'un brief client.
---

# Devis ARKT

## Entrée

Brief libre d'Arthur : société, secteur, contact, besoin, contexte, budget pressenti, délai.
Une information manquante et bloquante fait l'objet d'une seule question courte. Les autres restent vides.

## Fichiers

- `content/tarifs.json` : grille 2027, prix HT planchers.
- `content/grille-tarifaire.md` : historique 2026 par client, pour caler les montants.
- `content/devis/_exemple.json` : structure exacte d'un devis.
- `arkt/data.js` : projets du site (`featured` et `grid`), équipe (`team`).

## Étapes

1. Lire `content/tarifs.json` et `content/devis/_exemple.json`.
2. Choisir les lignes de la grille qui répondent au besoin. Chaque lot ou option porte son `tarif_id`.
3. Prix : partir du `prix` de la grille. Ne jamais descendre en dessous. Monter si le périmètre dépasse la description (volume, délais courts, multi-langue). Arrondir à 50.
4. Prestation absente de la grille : la chiffrer par analogie avec la ligne la plus proche et le signaler à Arthur.
5. Récurrent : `unite: "mois"`, `quantite` = nombre de mois engagés.
6. Licences, achats média, matériel, déplacements : `refacturations`, au réel, avec `estimation` si connue. Jamais dans les lots.
7. Paiement : 50 % à la commande et 50 % à la livraison sous 10 000 € HT. Au-dessus : 30 % à la commande, solde selon le planning.
8. `options` : 1 à 3 prestations complémentaires pertinentes. `preselection: true` seulement si Arthur le demande.
9. `projets_refs` : 3 identifiants de `arkt/data.js` proches du secteur ou du besoin (voir la table plus bas). Vérifier qu'ils existent.
10. `equipe` : noms exacts de `ARKT.team`. Par défaut `["Arthur Barret"]`.
11. Rédiger `accroche`, `contexte`, `enjeux`, puis `description` et `livrables` de chaque lot.
12. Slug : nom de la société en kebab-case sans accents + `-` + 5 caractères aléatoires [a-z0-9]. Fichier : `content/devis/{slug}.json`. Le champ `slug` reprend le nom du fichier.
13. Numéro : `D-{année}-{n}`, n = plus grand numéro existant dans `content/devis/` + 1, sur 3 chiffres.
14. `date` : aujourd'hui. `validite_jours` : 30.
15. Afficher à Arthur : lots, options, prix, total HT, total TTC. Attendre sa validation.
16. Après validation : `npm run build`, vérifier `dist/devis/{slug}/index.html`, commit `devis: {société} {numéro}`, push sur `master`.
17. Donner l'URL : `https://arkt-conseil.com/devis/{slug}/`.

## Projets disponibles (`projets_refs`)

| id | Projet | Pertinent pour |
|---|---|---|
| meulerie | La Meulerie | food, retail, création de concept, franchise |
| horsdoeuvre | Hors d'Œuvre | food, événementiel, identité premium |
| ciaomisu | CiaoMisu! | food, retail, lancement, naming, communauté |
| airbnb | Airbnb | vidéo, contenu, grands comptes |
| nb1 | NB1 | Meta Ads, vidéo publicitaire, performance |
| palauma | Palauma | immobilier, corporate, LinkedIn dirigeants, ligne éditoriale |
| racine | Racine² | santé, clinique, accompagnement mensuel |
| chezcharlot | Chez Charlot | restaurant, bar, plateforme de marque |
| crousty | Crousty Crew (Taster) | street food, marque digitale |
| vitamine | Vitamine | naming, logo, charte, B2B |
| pernodricard | Pernod Ricard | événementiel, terrasse, grands comptes |
| adriensusini | Adrien Susini | artiste, site web, univers |
| estelletorossian | Estelle Torossian | santé, esthétique, marque personnelle |
| egoz | Egoz | stratégie et identité |
| caparle | Ça Parle | agence, stratégie éditoriale |
| capsule | Capsule | sport, pilates, fitness |
| kube | Kube | sport, fitness, lancement |
| pattaxnike | Patta × Nike | pop-up, scénographie, retail |
| nike | Nike | événement, set design |
| placedesfinances | Place des Finances | finance, assurance, rebranding |
| spilow | Spilow | sport, naming, branding |
| lademeure | La Demeure | boutique, rebranding, reprise |
| puma | Puma | set design retail |
| ve | Vé | glacier, food, identité |
| nailledit | Nailed It | événementiel, naming |
| apt20 | APT 20 | café, design d'espace |
| richelieu | Richelieu | retail haut de gamme, design d'espace |
| twicy | Twicy | tech, B2B, media |
| adsdesign | ADS Design | B2B, industrie, marketing |
| linstantcryo | L'Instant Cryo | bien-être, franchise |
| accesud | Accesud | intérim, développement commercial |
| marymadeleine | Mary Madeleine | food, naming, chaîne |
| bartpucci | Bart & Pucci | design d'espace, architecture intérieure |
| selency | Selency | marketplace, B2B |
| vestiairecollective | Vestiaire Collective | e-commerce, acquisition, CRM |

## Règles d'écriture

- Vouvoiement.
- Phrases courtes. Une idée par phrase.
- Aucun tiret cadratin.
- Aucune tournure "ce n'est pas X, c'est Y", ni variante.
- Aucun superlatif creux ("unique", "exceptionnel", "sur-mesure de A à Z").
- Les enjeux reprennent les mots du brief. Rien d'inventé sur le client.
- Livrables concrets et dénombrables.
- Accroche : une phrase, orientée résultat pour le client.
