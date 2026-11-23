/* Protège /clients/* par mot de passe, vérifié côté serveur.
   Le mot de passe général est lu dans la variable d'environnement Netlify CLIENTS_PASSWORD : il ouvre tout l'espace clients.
   Un espace peut avoir son propre code (ESPACES) : ce code n'ouvre que /clients/<espace>/, jamais l'index ni les autres espaces.
   Sans CLIENTS_PASSWORD, l'accès est refusé. Les sessions tiennent dans des cookies signés, HttpOnly, valables 12 heures. */

/* Code par espace, stocké sous forme d'empreinte SHA-256.
   La variable d'environnement CLIENTS_CODE_<ESPACE> (ex. CLIENTS_CODE_PALAUMA), si elle existe, remplace l'empreinte. */
const ESPACES = {
  palauma: '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab',
};

const COOKIE = 'arkt_clients';
const MAX_AGE = 60 * 60 * 12;
const enc = new TextEncoder();

async function hmac(secret, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(msg) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(msg));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function espaceDe(pathname) {
  const m = pathname.match(/^\/clients\/([a-z0-9-]+)(?:\/|$)/);
  return m && Object.hasOwn(ESPACES, m[1]) ? m[1] : null;
}

async function codeValide(espace, given) {
  const env = Netlify.env.get(`CLIENTS_CODE_${espace.toUpperCase().replace(/-/g, '_')}`);
  return safeEqual(await sha256(given), env ? await sha256(env) : ESPACES[espace]);
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function page(message, status, showForm = true, action = '/clients/') {
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Clients ARKT</title><meta name="robots" content="noindex, nofollow" />
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:#15140F;color:#F3F1EA;font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;justify-content:center}
form,div.box{width:90%;max-width:340px;text-align:center}
img{height:30px;margin:0 auto 44px;display:block}
label{display:block;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(243,241,234,.5);margin-bottom:18px}
input{width:100%;padding:15px;border-radius:14px;border:1px solid rgba(243,241,234,.18);background:rgba(243,241,234,.06);color:#F3F1EA;font:inherit;font-size:17px;text-align:center}
input:focus-visible{outline:2px solid #F2533F;outline-offset:2px}
button{width:100%;margin-top:12px;padding:14px;border-radius:14px;border:0;background:#F2533F;color:#15140F;font:inherit;font-weight:600;font-size:15px;cursor:pointer}
p{color:#F2533F;font-size:13px;margin-top:14px;min-height:18px}
</style></head><body>
${showForm
    ? `<form method="post" action="${action}"><img src="/arkt/logo-arkt.png" alt="ARKT" /><label for="password">Espace clients</label><input id="password" name="password" type="password" autocomplete="current-password" autofocus required /><button type="submit">Entrer</button><p>${message}</p></form>`
    : `<div class="box"><img src="/arkt/logo-arkt.png" alt="ARKT" /><p>${message}</p></div>`}
</body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
}

export default async (request, context) => {
  const password = Netlify.env.get('CLIENTS_PASSWORD');
  if (!password) return page('Accès non configuré.', 503, false);

  const url = new URL(request.url);
  const espace = espaceDe(url.pathname);
  const accueil = espace ? `/clients/${espace}/` : '/clients/';
  const cookieEspace = espace ? `${COOKIE}_${espace}` : '';
  const attrs = 'HttpOnly; Secure; SameSite=Lax';

  if (url.searchParams.has('logout')) {
    const headers = new Headers({ location: accueil, 'cache-control': 'no-store' });
    headers.append('set-cookie', `${COOKIE}=; Path=/clients; ${attrs}; Max-Age=0`);
    if (espace) headers.append('set-cookie', `${cookieEspace}=; Path=/clients/${espace}; ${attrs}; Max-Age=0`);
    return new Response(null, { status: 303, headers });
  }

  if (request.method === 'POST') {
    let given = '';
    try { given = String((await request.formData()).get('password') || ''); } catch { /* corps illisible */ }
    const exp = String(Date.now() + MAX_AGE * 1000);
    if (safeEqual(await hmac(password, given), await hmac(password, password))) {
      const token = `${exp}.${await hmac(password, exp)}`;
      return new Response(null, { status: 303, headers: { location: accueil, 'set-cookie': `${COOKIE}=${token}; Path=/clients; ${attrs}; Max-Age=${MAX_AGE}`, 'cache-control': 'no-store' } });
    }
    if (espace && await codeValide(espace, given)) {
      const token = `${exp}.${await hmac(password, `${espace}:${exp}`)}`;
      return new Response(null, { status: 303, headers: { location: accueil, 'set-cookie': `${cookieEspace}=${token}; Path=/clients/${espace}; ${attrs}; Max-Age=${MAX_AGE}`, 'cache-control': 'no-store' } });
    }
    await new Promise((r) => setTimeout(r, 1000));
    return page('Mot de passe incorrect.', 401, true, accueil);
  }

  const cookies = (request.headers.get('cookie') || '').split(/;\s*/);
  const lire = (name) => {
    const c = cookies.find((x) => x.startsWith(`${name}=`));
    return c ? c.slice(name.length + 1).split('.') : [];
  };
  const valide = async (name, prefixe) => {
    const [exp, sig] = lire(name);
    return Boolean(exp && sig && Number(exp) > Date.now() && safeEqual(sig, await hmac(password, `${prefixe}${exp}`)));
  };
  if (await valide(COOKIE, '') || (espace && await valide(cookieEspace, `${espace}:`))) {
    const res = await context.next();
    res.headers.set('cache-control', 'no-store');
    res.headers.set('x-robots-tag', 'noindex, nofollow');
    return res;
  }
  return page('', 401, true, accueil);
};

export const config = { path: ['/clients', '/clients/*'] };
