import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function prerender() {
  const vite = await createServer({
    root: __dirname,
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const { render } = await vite.ssrLoadModule('/arkt/ssr-entry.jsx');
    const appHtml = render();

    const distHtml = path.join(__dirname, 'dist/index.html');
    let template = await readFile(distHtml, 'utf-8');
    const injected = template.replace(
      '<div id="root"></div>',
      `<div id="root">${appHtml}</div>`
    );

    if (injected === template) {
      console.warn('⚠ Marqueur <div id="root"></div> introuvable dans dist/index.html');
    } else {
      await writeFile(distHtml, injected);
      console.log('✓ Prérendu injecté dans dist/index.html');
    }
  } finally {
    await vite.close();
  }
}

prerender().catch(e => { console.error(e); process.exit(1); });
