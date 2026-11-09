# La Meulerie Raclette Club : réservation

Page publique : `/LAMEULERIERACLETTECLUB/` · Admin : `/LAMEULERIERACLETTECLUB/admin/`

## Mise en service (une fois)

1. **Supabase** : nouveau projet, SQL Editor, coller `supabase/rc_schema.sql`, Run. Récupérer `Project URL` et la clé `service_role` (Settings > API).
2. **Stripe** : Developers > API keys, clé secrète. Puis Developers > Webhooks > Add endpoint :
   - URL : `https://arkt-conseil.com/.netlify/functions/rc-webhook`
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
| `RC_NOTIFY_EMAIL` | adresse qui reçoit une copie de chaque résa (défaut hello@lameulerie.com) |
| `RC_REPLY_TO` | adresse de réponse des emails clients (défaut hello@lameulerie.com) |
| `RESEND_API_KEY` | déjà en place |

4. Déposer dans `public/LAMEULERIERACLETTECLUB/assets/` : `logo-raclette-club.png`, `logo-terrasses-du-port.png`, `og.jpg` (1200×630), `favicon.png`.
5. Compléter l'article 1 et le médiateur dans `cgv/index.html`.

## Règles métier

- 5 bulles × 8 places, services 12h, 14h, 19h, 21h, du 27/11 au 30/12. Fermé le 24 au soir et le 25.
- 1 à 7 places : placé dans la bulle ouverte la plus remplie qui peut l'accueillir (8 places vendues par bulle en partagé). 8 à 10 places en une seule réservation : privatisation, bulle vide obligatoire.
- Adulte 36 €, enfant 24 €, au moins un adulte par réservation.
- Places bloquées 30 min pendant le paiement (expiration automatique, pas de cron).
- Réservation en ligne fermée 60 min avant le service.
- Annulation client via le lien de l'email jusqu'à 48 h avant, remboursement Stripe automatique.
- Admin : bloquer une bulle ou un service, réservation manuelle (avec ou sans email), annulation avec ou sans remboursement, déplacement de bulle, export CSV.

Constantes modifiables dans `netlify/lib/rc.mjs` (`CONFIG`).

## Dev local sans Supabase ni Stripe

```
node scripts/rc-dev.mjs
```
Sert la page et les fonctions avec une base en mémoire et un faux Stripe (bouton « Payer » qui déclenche le webhook). Admin : mot de passe `raclette`.
