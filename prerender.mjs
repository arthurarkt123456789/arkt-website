import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://arkt-conseil.com';

const DESCRIPTIONS = {
  '/mentions-legales/': "Mentions légales du site arkt-conseil.com, édité par ARKT, cabinet de conseil en stratégie de marque à Marseille.",
  '/politique-de-confidentialite/': "Politique de confidentialité du site arkt-conseil.com : données collectées, finalités, durées de conservation et droits des utilisateurs.",
};

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
  } finally {
    await vite.close();
  }
}

prerender().catch(e => { console.error(e); process.exit(1); });
