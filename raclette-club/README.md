# La Meulerie Raclette Club : site et réservation

Site autonome déployé sur Netlify depuis le dossier `raclette-club/` du repo arkt-website (base directory). Domaine : www.lameulerieracletteclub.com (OVH).

Page publique : `/` · Admin : `/admin/` · Paiement sur lien : `/payer/`

## Netlify (nouveau site)

1. Add new project > Import from GitHub > `arthurarkt123456789/arkt-website`.
2. Base directory : `raclette-club`. Build command : vide. Publish directory : `raclette-club/public`. Functions : détectées via `raclette-club/netlify.toml`.
3. Variables d'environnement (ci-dessous), puis Deploy.
4. Domain management > Add domain > `www.lameulerieracletteclub.com` (primaire) et `lameulerieracletteclub.com` (redirigé vers www).

## OVH (zone DNS de lameulerieracletteclub.com)

| Type | Sous-domaine | Cible |
|---|---|---|
| CNAME | www | `<nom-du-site>.netlify.app.` |
| A | (vide, apex) | `75.2.60.5` |

Supprimer les enregistrements A / CNAME OVH par défaut sur `www` et l'apex (redirection OVH, parking). Propagation 10 min à quelques heures. Netlify émet le certificat HTTPS automatiquement une fois le DNS propagé.

## Mise en service (une fois)

1. **Supabase** : nouveau projet, SQL Editor, coller `supabase/rc_schema.sql`, Run. Récupérer `Project URL` et la clé `service_role` (Settings > API).
2. **Stripe** : Developers > API keys, clé secrète. Puis Developers > Webhooks > Add endpoint :
   - URL : `https://www.lameulerieracletteclub.com/.netlify/functions/rc-webhook`
   - Événements : `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
   - Récupérer le `Signing secret` (whsec_…).
3. **Netlify** : Site configuration > Environment variables :

| Variable | Valeur |
|---|---|
| `SUPABASE_URL` | https://xxxx.supabase.co |
| `SUPABASE_SERVICE_KEY` | clé service_role |
| `STRIPE_SECRET_KEY` | sk_live_… (sk_test_… pour tester) |
| `STRIPE_WEBHOOK_SECRET` | whsec_… |
| `RC_ADMIN_PASSWORD` | mot de passe de l'admin |
| `RC_SITE_URL` | https://www.lameulerieracletteclub.com (URL publique, utilisée dans les emails et retours Stripe) |
| `RC_NOTIFY_EMAIL` | adresse qui reçoit une copie de chaque résa (défaut hello@lameulerie.com) |
| `RC_REPLY_TO` | adresse de réponse des emails clients (défaut hello@lameulerie.com) |
| `RESEND_API_KEY` | déjà en place |

4. Déposer dans `public/assets/` : `logo-raclette-club.png`, `logo-terrasses-du-port.png`, `og.jpg` (1200×630), `favicon.png`.
5. Compléter l'article 1 et le médiateur dans `cgv/index.html`.

## Règles métier

- 5 bulles × 8 places, services 12h, 14h, 19h, 21h, du 27/11 au 24/12, dernier service le 24 à 14h.
- 1 à 7 places : placé dans la bulle ouverte la plus remplie qui peut l'accueillir (8 places vendues par bulle en partagé). 8 à 10 places en une seule réservation : privatisation, bulle vide obligatoire.
- Adulte 36 €, enfant 24 €, au moins un adulte par réservation.
- Places bloquées 30 min pendant le paiement (expiration automatique, pas de cron).
- Réservation en ligne fermée 60 min avant le service.
- Annulation client via le lien de l'email jusqu'à 48 h avant, remboursement Stripe automatique.
- Admin : bloquer une bulle ou un service, réservation manuelle (avec ou sans email), blocage 24 h avec lien de paiement client (`/payer/?id=…&t=…`, prolongeable), annulation avec ou sans remboursement, déplacement de bulle, export CSV, dashboard (capacité, jauge, C.A.).

Constantes modifiables dans `netlify/lib/rc.mjs` (`CONFIG`).

## Dev local sans Supabase ni Stripe

```
node scripts/rc-dev.mjs
```
Sert la page et les fonctions avec une base en mémoire et un faux Stripe (bouton « Payer » qui déclenche le webhook). Admin : mot de passe `raclette`.
