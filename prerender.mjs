import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://arkt-conseil.com';

const DESCRIPTIONS = {
  '/mentions-legales/': "Mentions légales du site arkt-conseil.com, édité par ARKT, cabinet de conseil en stratégie de marque à Marseille.",
  '/politique-de-confidentialite/': "Politique de confidentialité du site arkt-conseil.com : données collectées, finalités, durées de conservation et droits des utilisateurs.",
};

/* Les fichiers content/devis/_*.json (modèles) ne sont publiés qu'en local et en preview Netlify. */
const IS_PROD = process.env.CONTEXT === 'production';

const GATE_SCRIPT = `<script>
(function(){
  var K='arkt_devis_auth';
  if(sessionStorage.getItem(K)==='ok'){return;}
  var d=document;
  d.documentElement.style.overflow='hidden';
  var g=d.createElement('div');
  g.style.cssText='position:fixed;inset:0;z-index:99999;background:#15140F;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0;font-family:Inter,system-ui,sans-serif;';
  g.innerHTML='<div style="text-align:center;color:#F3F1EA;width:90%;max-width:340px;">'
    +'<img src="/arkt/logo-arkt.png" style="height:28px;margin-bottom:48px;display:block;margin-left:auto;margin-right:auto;" alt="ARKT"/>'
    +'<p style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(243,241,234,.45);margin-bottom:22px;">Accès restreint</p>'
    +'<input id="_gi" type="password" inputmode="numeric" placeholder="· · · ·" autocomplete="one-time-code" style="width:100%;padding:16px;border-radius:14px;border:1px solid rgba(243,241,234,.15);background:rgba(243,241,234,.06);color:#F3F1EA;font-size:22px;text-align:center;letter-spacing:.4em;outline:none;font-family:inherit;transition:border-color .2s;" />'
    +'<p id="_ge" style="color:#F2533F;font-size:13px;margin-top:14px;min-height:18px;"></p>'
    +'</div>';
  d.body.appendChild(g);
  var inp=d.getElementById('_gi'),err=d.getElementById('_ge');
  setTimeout(function(){inp.focus();},60);
  inp.addEventListener('focus',function(){inp.style.borderColor='rgba(243,241,234,.4)';});
  inp.addEventListener('blur',function(){inp.style.borderColor='rgba(243,241,234,.15)';});
  inp.addEventListener('keydown',function(e){
    if(e.key!=='Enter')return;
    if(inp.value.trim()==='2026'){
      sessionStorage.setItem(K,'ok');
      g.style.transition='opacity .3s';
      g.style.opacity='0';
      setTimeout(function(){g.remove();d.documentElement.style.overflow='';},300);
    } else {
      err.textContent='Code incorrect.';
      inp.value='';
      inp.style.borderColor='#F2533F';
      setTimeout(function(){inp.style.borderColor='rgba(243,241,234,.15)';err.textContent='';},2000);
    }
  });
})();
</script>`;

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function devisIndexHtml(allDevis) {
  const eur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const list = Object.values(allDevis)
    .filter((d) => !d.slug?.startsWith('_'))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  function totalHT(d) {
    const lots = (d.lots || []).reduce((s, l) => s + (l.prix_unitaire || 0) * (l.quantite || 1), 0);
    const remise = d.remise?.type === 'absolu' ? (d.remise.valeur || 0) : d.remise?.type === 'pct' ? lots * (d.remise.valeur || 0) / 100 : 0;
    return lots - remise;
  }

  function isExpired(d) {
    if (!d.date || !d.validite_jours) return false;
    const exp = new Date(d.date);
    exp.setDate(exp.getDate() + d.validite_jours);
    return exp < new Date();
  }

  function expiryDate(d) {
    if (!d.date || !d.validite_jours) return null;
    const exp = new Date(d.date);
    exp.setDate(exp.getDate() + d.validite_jours);
    return exp;
  }

  const total = list.reduce((s, d) => s + totalHT(d), 0);
  const actives = list.filter((d) => !isExpired(d)).length;

  const rows = list.map((d) => {
    const expired = isExpired(d);
    const exp = expiryDate(d);
    const ht = totalHT(d);
    const statusLabel = expired ? 'Expirée' : 'Active';
    const statusClass = expired ? 'idx-expired' : 'idx-active';
    const expStr = exp ? exp.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    return `
      <a class="idx-row${expired ? ' is-expired' : ''}" href="/devis/${escAttr(d.slug)}/">
        <span class="idx-num">${escAttr(d.numero || '—')}</span>
        <span class="idx-client">
          <strong>${escAttr(d.client?.societe || '—')}</strong>
          <span>${escAttr(d.client?.contact || '')}${d.client?.fonction ? ` · ${escAttr(d.client.fonction)}` : ''}</span>
        </span>
        <span class="idx-sector">${escAttr(d.client?.secteur || '—')}</span>
        <span class="idx-date">${fmtDate(d.date)}</span>
        <span class="idx-amount">${eur(ht)}</span>
        <span class="idx-exp">${expStr}</span>
        <span class="idx-badge ${statusClass}">${statusLabel}</span>
        <span class="idx-arrow">→</span>
      </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Propositions ARKT</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="theme-color" content="#15140F" />
  <link rel="icon" type="image/png" href="/assets/logo-mark-CP7M4SgX.png" />
  <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/fonts/big-shoulders-display-latin.woff2" as="font" type="font/woff2" crossorigin />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @font-face { font-family: "Inter"; src: url("/fonts/inter-latin.woff2") format("woff2"); font-weight: 100 900; font-style: normal; font-display: swap; }
    @font-face { font-family: "Big Shoulders Display"; src: url("/fonts/big-shoulders-display-latin.woff2") format("woff2"); font-weight: 100 900; font-style: normal; font-display: swap; }
    :root { --bg: #F5F3EC; --dark: #15140F; --accent: #F2533F; --ink: #15140F; --ink-dim: #6E6A5F; --line: rgba(19,19,17,0.12); --line-dark: rgba(243,241,234,0.14); --on-dark: #F3F1EA; --on-dark-dim: rgba(243,241,234,0.62); }
    html { background: var(--dark); color: var(--on-dark); font-family: "Inter", system-ui, sans-serif; font-size: 15px; -webkit-font-smoothing: antialiased; }
    a { color: inherit; text-decoration: none; }

    /* top bar */
    .idx-top { display: flex; align-items: center; justify-content: space-between; padding: 0 clamp(16px,5vw,72px); height: 60px; border-bottom: 1px solid var(--line-dark); position: sticky; top: 0; background: rgba(21,20,15,0.9); backdrop-filter: blur(10px); z-index: 10; }
    .idx-brand img { height: 30px; display: block; }
    .idx-top-label { font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--on-dark-dim); }

    /* hero */
    .idx-hero { padding: clamp(48px,10vh,96px) clamp(16px,5vw,72px) clamp(32px,6vh,64px); }
    .idx-eyebrow { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--on-dark-dim); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
    .idx-eyebrow::before { content: ""; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex: none; }
    .idx-title { font-family: "Big Shoulders Display", sans-serif; font-weight: 800; text-transform: uppercase; font-size: clamp(48px,8vw,112px); line-height: 0.92; letter-spacing: -0.01em; margin-bottom: 40px; }

    /* stats */
    .idx-stats { display: flex; gap: 0; border-top: 1px solid var(--line-dark); margin-bottom: clamp(32px,5vh,64px); }
    .idx-stat { padding: 20px 32px 20px 0; flex: none; }
    .idx-stat-val { font-family: "Big Shoulders Display", sans-serif; font-weight: 800; text-transform: uppercase; font-size: 36px; line-height: 1; }
    .idx-stat-lbl { font-size: 12px; color: var(--on-dark-dim); margin-top: 4px; letter-spacing: 0.1em; text-transform: uppercase; }
    .idx-stat + .idx-stat { border-left: 1px solid var(--line-dark); padding-left: 32px; }

    /* table */
    .idx-wrap { max-width: 1240px; margin: 0 auto; padding: 0 clamp(16px,5vw,72px) 80px; }
    .idx-thead { display: grid; grid-template-columns: 120px 1fr 1fr 110px 120px 110px 90px 28px; gap: 12px; padding: 10px 16px; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--on-dark-dim); border-bottom: 1px solid var(--line-dark); }
    .idx-row { display: grid; grid-template-columns: 120px 1fr 1fr 110px 120px 110px 90px 28px; gap: 12px; padding: 18px 16px; border-bottom: 1px solid var(--line-dark); align-items: center; transition: background .18s; border-radius: 8px; margin: 0 -16px; cursor: pointer; }
    .idx-row:hover { background: rgba(243,241,234,0.05); }
    .idx-row.is-expired { opacity: 0.52; }
    .idx-num { font-size: 13px; color: var(--on-dark-dim); font-variant-numeric: tabular-nums; }
    .idx-client strong { display: block; font-size: 15px; font-weight: 600; }
    .idx-client span { display: block; font-size: 12px; color: var(--on-dark-dim); margin-top: 2px; }
    .idx-sector { font-size: 13px; color: var(--on-dark-dim); line-height: 1.4; }
    .idx-date { font-size: 13px; color: var(--on-dark-dim); font-variant-numeric: tabular-nums; }
    .idx-amount { font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .idx-exp { font-size: 13px; color: var(--on-dark-dim); font-variant-numeric: tabular-nums; }
    .idx-badge { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; text-align: center; }
    .idx-active { background: rgba(0,200,100,0.14); color: #4ADE80; }
    .idx-expired { background: rgba(243,241,234,0.08); color: var(--on-dark-dim); }
    .idx-arrow { color: var(--accent); font-size: 18px; text-align: right; }
    .idx-new { display: inline-flex; align-items: center; gap: 8px; padding: 12px 22px; border-radius: 999px; background: var(--accent); color: #fff; font-weight: 600; font-size: 14px; margin-top: 32px; transition: opacity .2s; }
    .idx-new:hover { opacity: .85; }
    @media (max-width: 900px) {
      .idx-thead { display: none; }
      .idx-row { grid-template-columns: 1fr auto; grid-template-rows: auto auto auto; gap: 6px; padding: 16px; }
      .idx-num { grid-column: 1; grid-row: 1; font-size: 12px; }
      .idx-client { grid-column: 1; grid-row: 2; }
      .idx-sector { display: none; }
      .idx-date { display: none; }
      .idx-amount { grid-column: 2; grid-row: 2; text-align: right; align-self: start; }
      .idx-exp { grid-column: 1; grid-row: 3; font-size: 12px; }
      .idx-badge { grid-column: 2; grid-row: 1; justify-self: end; }
      .idx-arrow { display: none; }
    }
  </style>
</head>
<body>
  <header class="idx-top">
    <a href="/" class="idx-brand"><img src="/arkt/logo-arkt.png" alt="ARKT Conseil" /></a>
    <span class="idx-top-label">Propositions commerciales</span>
  </header>

  <div class="idx-hero">
    <div class="idx-eyebrow">ARKT Conseil</div>
    <h1 class="idx-title">Propositions</h1>
    <div class="idx-stats">
      <div class="idx-stat">
        <div class="idx-stat-val">${list.length}</div>
        <div class="idx-stat-lbl">Propositions</div>
      </div>
      <div class="idx-stat">
        <div class="idx-stat-val">${actives}</div>
        <div class="idx-stat-lbl">Actives</div>
      </div>
      <div class="idx-stat">
        <div class="idx-stat-val">${eur(total)}</div>
        <div class="idx-stat-lbl">Volume total HT</div>
      </div>
    </div>
  </div>

  <div class="idx-wrap">
    <div class="idx-thead">
      <span>Numéro</span>
      <span>Client</span>
      <span>Secteur</span>
      <span>Émise le</span>
      <span>Montant HT</span>
      <span>Expire le</span>
      <span>Statut</span>
      <span></span>
    </div>
    ${rows}
  </div>
  ${GATE_SCRIPT}
</body>
</html>`;
}

async function prerenderDevis(vite) {
  const dir = path.join(__dirname, 'content/devis');
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith('.json'));
  const index = {};

  if (files.length) {
    const { renderDevis } = await vite.ssrLoadModule('/arkt/devis/ssr-devis.jsx');
    const template = await readFile(path.join(__dirname, 'dist/devis.html'), 'utf-8');

    for (const file of files) {
      if (file.startsWith('_') && IS_PROD) continue;
      const slug = file.replace(/\.json$/, '');
      const devis = JSON.parse(await readFile(path.join(dir, file), 'utf-8'));
      if (devis.slug && devis.slug !== slug) console.warn(`⚠ ${file} : slug "${devis.slug}" ≠ nom du fichier, le nom du fichier fait foi`);
      devis.slug = slug;
      index[slug] = devis;

      const title = `Proposition ARKT · ${devis.client?.societe || ''} · ${devis.numero || ''}`;
      const html = template
        .replace(/<title>[^<]*<\/title>/, `<title>${escAttr(title)}</title>`)
        .replace('<div id="root"></div>', `<div id="root">${renderDevis(devis)}</div><script>window.__DEVIS__=${safeJson(devis)}</script>`)
        .replace('</body>', `${GATE_SCRIPT}\n</body>`);
      const out = path.join(__dirname, 'dist/devis', slug);
      await mkdir(out, { recursive: true });
      await writeFile(path.join(out, 'index.html'), html);
      console.log(`✓ Devis /devis/${slug}/`);
    }
  }

  /* Page index des propositions */
  const outIndex = path.join(__dirname, 'dist/devis');
  await mkdir(outIndex, { recursive: true });
  await writeFile(path.join(outIndex, 'index.html'), devisIndexHtml(index));
  console.log(`✓ Index /devis/`);

  /* index lu par netlify/functions/devis-validation.mjs (bundlé après le build) */
  await writeFile(path.join(__dirname, 'netlify/functions/devis-data.generated.json'), JSON.stringify(index));
}

async function prerender() {
  const vite = await createServer({
    root: __dirname,
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const { render, legalRoutes } = await vite.ssrLoadModule('/arkt/ssr-entry.jsx');
    const distHtml = path.join(__dirname, 'dist/index.html');
    const template = await readFile(distHtml, 'utf-8');
    if (!template.includes('<div id="root"></div>')) {
      console.warn('⚠ Marqueur <div id="root"></div> introuvable dans dist/index.html');
      return;
    }

    await writeFile(distHtml, template.replace('<div id="root"></div>', `<div id="root">${render('/')}</div>`));
    console.log('✓ Prérendu injecté dans dist/index.html');

    for (const { path: route, title } of legalRoutes) {
      const url = SITE + route;
      const desc = DESCRIPTIONS[route] || '';
      /* page légale : ni JSON-LD de l'accueil, ni balises sociales de l'accueil */
      const html = template
        .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
        .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${desc}" />`)
        .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`)
        .replace(/\s*<!-- Open Graph -->[\s\S]*?<\/script>/, '')
        .replace('<div id="root"></div>', `<div id="root">${render(route)}</div>`);
      const dir = path.join(__dirname, 'dist', route);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'index.html'), html);
      console.log(`✓ Prérendu ${route}`);
    }

    await prerenderDevis(vite);
  } finally {
    await vite.close();
  }
}

prerender().catch(e => { console.error(e); process.exit(1); });
