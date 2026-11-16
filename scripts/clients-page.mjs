/* Page /clients/ : tous les clients, leurs devis (content/devis/*.json) et leurs recommandations (content/recos.json).
   L'accès est protégé côté serveur par netlify/edge-functions/clients-auth.js. */

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const eur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const key = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function totalHT(d) {
  const lots = (d.lots || []).reduce((s, l) => s + (l.prix_unitaire || 0) * (l.quantite || 1), 0);
  const remise = d.remise?.type === 'absolu' ? (d.remise.valeur || 0) : d.remise?.type === 'pct' ? (lots * (d.remise.valeur || 0)) / 100 : 0;
  return lots - remise;
}

function isExpired(d) {
  if (!d.date || !d.validite_jours) return false;
  const exp = new Date(d.date);
  exp.setDate(exp.getDate() + d.validite_jours);
  return exp < new Date();
}

export function clientsIndexHtml(allDevis, recos) {
  const clients = new Map();
  const get = (name) => {
    const k = key(name) || 'sans nom';
    if (!clients.has(k)) clients.set(k, { nom: name || 'Sans nom', secteur: '', contact: '', devis: [], recos: [], last: '' });
    return clients.get(k);
  };

  for (const d of Object.values(allDevis)) {
    if (d.slug?.startsWith('_')) continue;
    const c = get(d.client?.societe);
    c.secteur = c.secteur || d.client?.secteur || '';
    c.contact = c.contact || [d.client?.contact, d.client?.fonction].filter(Boolean).join(' · ');
    c.devis.push(d);
    if ((d.date || '') > c.last) c.last = d.date;
  }
  for (const r of recos || []) {
    const c = get(r.client);
    c.recos.push(r);
    if ((r.date || '') > c.last) c.last = r.date;
  }

  const list = [...clients.values()].sort((a, b) => (b.last || '').localeCompare(a.last || ''));
  const nbDevis = list.reduce((s, c) => s + c.devis.length, 0);
  const nbRecos = list.reduce((s, c) => s + c.recos.length, 0);

  const cards = list.map((c) => {
    const devis = c.devis
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .map((d) => {
        const expired = isExpired(d);
        return `
        <a class="row" href="/devis/${esc(d.slug)}/">
          <span class="kind">Devis</span>
          <span class="ttl">${esc(d.numero || d.slug)}</span>
          <span class="date">${esc(fmtDate(d.date))}</span>
          <span class="amount">${eur(totalHT(d))} HT</span>
          <span class="badge ${expired ? 'off' : 'on'}">${expired ? 'Expiré' : 'Actif'}</span>
        </a>`;
      }).join('');
    const recosHtml = c.recos
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .map((r) => `
        <a class="row" href="${esc(r.url)}">
          <span class="kind reco">Reco</span>
          <span class="ttl">${esc(r.titre)}</span>
          <span class="date">${esc(fmtDate(r.date))}</span>
          <span class="amount"></span>
          <span class="badge none"></span>
        </a>`).join('');
    return `
    <section class="client" data-q="${esc(key([c.nom, c.secteur, c.contact].join(' ')))}">
      <header>
        <h2>${esc(c.nom)}</h2>
        <p>${esc([c.secteur, c.contact].filter(Boolean).join(' · '))}</p>
        <span class="count">${c.devis.length} devis · ${c.recos.length} reco</span>
      </header>
      ${devis}${recosHtml}
    </section>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Clients ARKT</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="theme-color" content="#15140F" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @font-face { font-family: "Inter"; src: url("/fonts/inter-latin.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
    @font-face { font-family: "Big Shoulders Display"; src: url("/fonts/big-shoulders-display-latin.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
    :root { --bg: #F3F1EA; --surface: #FFFFFF; --dark: #15140F; --accent: #F2533F; --accent-deep: #C24232; --ink: #15140F; --dim: #6E6A5F; --line: rgba(19,19,17,0.12); --on-dark: #F3F1EA; }
    html { background: var(--bg); color: var(--ink); font-family: "Inter", system-ui, sans-serif; font-size: 15px; -webkit-font-smoothing: antialiased; }
    a { color: inherit; text-decoration: none; }
    .top { display: flex; align-items: center; gap: 16px; padding: 0 clamp(16px,5vw,72px); height: 60px; background: var(--dark); color: var(--on-dark); position: sticky; top: 0; z-index: 10; }
    .top img { height: 30px; display: block; }
    .top span { font-size: 12px; letter-spacing: .18em; text-transform: uppercase; opacity: .62; }
    .top a { margin-left: auto; font-size: 13px; opacity: .8; }
    .top a:hover { opacity: 1; color: var(--accent); }
    main { max-width: 1080px; margin: 0 auto; padding: clamp(32px,7vh,64px) clamp(16px,5vw,32px) 80px; }
    h1 { font-family: "Big Shoulders Display", "Arial Narrow", sans-serif; font-weight: 800; text-transform: uppercase; font-size: clamp(48px,9vw,96px); line-height: .92; }
    .stats { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0 28px; }
    .stats span { font-size: 13px; padding: 6px 12px; border-radius: 999px; background: #ECE9DF; color: var(--dim); }
    .stats b { color: var(--ink); font-weight: 600; }
    #q { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); font: inherit; font-size: 16px; margin-bottom: 24px; }
    #q:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .client { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; margin-bottom: 16px; overflow: hidden; }
    .client header { display: grid; grid-template-columns: 1fr auto; gap: 2px 16px; padding: 18px 20px; border-bottom: 1px solid var(--line); align-items: baseline; }
    .client h2 { font-family: "Big Shoulders Display", "Arial Narrow", sans-serif; font-weight: 800; text-transform: uppercase; font-size: 28px; line-height: 1; }
    .client header p { grid-column: 1; color: var(--dim); font-size: 13px; }
    .count { grid-column: 2; grid-row: 1; font-size: 12px; color: var(--dim); white-space: nowrap; }
    .row { display: grid; grid-template-columns: 64px minmax(0,1fr) 110px 110px 70px; gap: 12px; align-items: center; padding: 13px 20px; border-bottom: 1px solid rgba(19,19,17,0.07); }
    .row:last-child { border-bottom: 0; }
    .row:hover { background: #F7F5EF; }
    .row:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
    .kind { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--dim); }
    .kind.reco { color: var(--accent-deep); }
    .ttl { font-weight: 600; overflow-wrap: anywhere; }
    .date, .amount { font-size: 13px; color: var(--dim); font-variant-numeric: tabular-nums; }
    .amount { text-align: right; color: var(--ink); }
    .badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px; text-align: center; }
    .badge.on { background: #DFF7E8; color: #1E6B3C; }
    .badge.off { background: #ECE9DF; color: var(--dim); }
    .empty { display: none; color: var(--dim); padding: 24px 0; }
    @media (max-width: 720px) {
      .row { grid-template-columns: 56px minmax(0,1fr) auto; }
      .row .date { grid-column: 2; font-size: 12px; }
      .row .amount { grid-column: 3; grid-row: 1; }
      .row .badge { grid-column: 3; grid-row: 2; }
      .row .badge.none, .row .amount:empty { display: none; }
      .client header { grid-template-columns: 1fr; }
      .count { grid-column: 1; grid-row: auto; }
    }
  </style>
</head>
<body>
  <div class="top"><img src="/arkt/logo-arkt.png" alt="ARKT" /><span>Clients</span><a href="/clients/?logout=1">Se déconnecter</a></div>
  <main>
    <h1>Clients</h1>
    <div class="stats"><span><b>${list.length}</b> clients</span><span><b>${nbDevis}</b> devis</span><span><b>${nbRecos}</b> recommandations</span></div>
    <input id="q" type="search" placeholder="Rechercher un client" aria-label="Rechercher un client" autocomplete="off" />
    ${cards}
    <p class="empty" id="empty">Aucun client ne correspond à cette recherche.</p>
  </main>
  <script>
    (function () {
      var q = document.getElementById('q'), cards = [].slice.call(document.querySelectorAll('.client')), empty = document.getElementById('empty');
      var norm = function (s) { return s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase(); };
      q.addEventListener('input', function () {
        var v = norm(q.value.trim()), n = 0;
        cards.forEach(function (c) { var ok = c.getAttribute('data-q').indexOf(v) !== -1; c.style.display = ok ? '' : 'none'; if (ok) n++; });
        empty.style.display = n ? 'none' : 'block';
      });
    })();
  </script>
</body>
</html>`;
}
