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

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

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
        .replace('<div id="root"></div>', `<div id="root">${renderDevis(devis)}</div><script>window.__DEVIS__=${safeJson(devis)}</script>`);
      const out = path.join(__dirname, 'dist/devis', slug);
      await mkdir(out, { recursive: true });
      await writeFile(path.join(out, 'index.html'), html);
      console.log(`✓ Devis /devis/${slug}/`);
    }
  }

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
