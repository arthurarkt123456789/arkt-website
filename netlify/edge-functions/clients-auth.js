/* Protège /clients/* par mot de passe, vérifié côté serveur.
   Le mot de passe est lu dans la variable d'environnement Netlify CLIENTS_PASSWORD.
   Sans cette variable, l'accès est refusé. La session tient dans un cookie signé, HttpOnly, valable 12 heures. */

const COOKIE = 'arkt_clients';
const MAX_AGE = 60 * 60 * 12;
const enc = new TextEncoder();

async function hmac(secret, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function page(message, status, showForm = true) {
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
    ? `<form method="post" action="/clients/"><img src="/arkt/logo-arkt.png" alt="ARKT" /><label for="password">Espace clients</label><input id="password" name="password" type="password" autocomplete="current-password" autofocus required /><button type="submit">Entrer</button><p>${message}</p></form>`
    : `<div class="box"><img src="/arkt/logo-arkt.png" alt="ARKT" /><p>${message}</p></div>`}
</body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
}

export default async (request, context) => {
  const password = Netlify.env.get('CLIENTS_PASSWORD');
  if (!password) return page('Accès non configuré.', 503, false);

  const url = new URL(request.url);

  if (url.searchParams.has('logout')) {
    return new Response(null, { status: 303, headers: { location: '/clients/', 'set-cookie': `${COOKIE}=; Path=/clients; HttpOnly; Secure; SameSite=Lax; Max-Age=0`, 'cache-control': 'no-store' } });
  }

  if (request.method === 'POST') {
    let given = '';
    try { given = String((await request.formData()).get('password') || ''); } catch { /* corps illisible */ }
    const ok = safeEqual(await hmac(password, given), await hmac(password, password));
    if (!ok) {
      await new Promise((r) => setTimeout(r, 1000));
      return page('Mot de passe incorrect.', 401);
    }
    const exp = String(Date.now() + MAX_AGE * 1000);
    const token = `${exp}.${await hmac(password, exp)}`;
    return new Response(null, { status: 303, headers: { location: '/clients/', 'set-cookie': `${COOKIE}=${token}; Path=/clients; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`, 'cache-control': 'no-store' } });
  }

  const cookies = request.headers.get('cookie') || '';
  const match = cookies.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (match) {
    const [exp, sig] = match.slice(COOKIE.length + 1).split('.');
    if (exp && sig && Number(exp) > Date.now() && safeEqual(sig, await hmac(password, exp))) {
      const res = await context.next();
      res.headers.set('cache-control', 'no-store');
      res.headers.set('x-robots-tag', 'noindex, nofollow');
      return res;
    }
  }
  return page('', 401);
};

export const config = { path: ['/clients', '/clients/*'] };
