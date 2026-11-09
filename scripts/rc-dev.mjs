// Serveur de dev Raclette Club : sert public/ + fonctions rc-* avec Supabase et Stripe simulés en mémoire.
// Usage : node scripts/rc-dev.mjs  ->  http://localhost:8788/LAMEULERIERACLETTECLUB/
// Aucune dépendance, aucun appel réseau. Pour tester contre le vrai Supabase/Stripe, utiliser `netlify dev`.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID, createHmac } from "node:crypto";

process.env.SUPABASE_URL = "https://mock.supabase.local";
process.env.SUPABASE_SERVICE_KEY = "mock";
process.env.STRIPE_SECRET_KEY = "sk_test_mock";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock";
process.env.RC_ADMIN_PASSWORD = process.env.RC_ADMIN_PASSWORD || "raclette";
process.env.URL = "http://localhost:8788";
delete process.env.RESEND_API_KEY; // pas d'email en dev

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PUBLIC = path.join(ROOT, "public");

// ---------- Base en mémoire ----------
const SERVICES = ["12:00", "14:00", "19:00", "21:00"];
const slots = []; let slotId = 1;
for (let d = new Date("2026-11-27T12:00:00Z"); d <= new Date("2026-12-30T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
  const date = d.toISOString().slice(0, 10);
  for (const s of SERVICES) for (let b = 1; b <= 5; b++) {
    if (date === "2026-12-25") continue;
    if (date === "2026-12-24" && (s === "19:00" || s === "21:00")) continue;
    slots.push({ id: slotId++, date, service: s, bubble: b, capacity: 8, status: "open" });
  }
}
const bookings = [];
const sessions = new Map();
const active = (b) => b.status === "paid" || b.status === "manual" || (b.status === "hold" && new Date(b.expires_at) > new Date());
const usage = (s) => { const used = bookings.filter((b) => b.slot_id === s.id && active(b)).reduce((n, b) => n + b.seats, 0); return { slot_id: s.id, date: s.date, service: s.service, bubble: s.bubble, capacity: s.capacity, status: s.status, used, free: s.capacity - used }; };

// Données de démo : quelques résas payées
function seed() {
  const demo = [["2026-11-27", "19:00", 4, 0, "Famille Martin"], ["2026-11-27", "19:00", 2, 1, "Sophie L."], ["2026-11-27", "19:00", 8, 0, "Anniversaire Driss"], ["2026-11-28", "12:00", 2, 0, "Paul & Léa"], ["2026-12-12", "21:00", 6, 0, "Team ARKT"]];
  for (const [date, service, adults, kids, name] of demo) {
    const b = hold({ p_date: date, p_service: service, p_adults: adults, p_kids: kids, p_name: name, p_email: "demo@example.com", p_phone: "0600000000", p_notes: "", p_amount_cents: adults * 3600 + kids * 2400, p_hold_minutes: 30, p_source: "web", p_status: "hold" });
    b.status = "paid"; b.paid_at = new Date().toISOString(); b.stripe_payment_intent = "pi_demo_" + b.id.slice(0, 6); b.stripe_session_id = "cs_demo_" + b.id.slice(0, 6);
  }
}

function hold(a) {
  const seats = a.p_adults + a.p_kids;
  if (seats < 1 || seats > 8) throw Object.assign(new Error("SEATS_OUT_OF_RANGE"), { code: 400 });
  bookings.forEach((b) => { if (b.status === "hold" && new Date(b.expires_at) <= new Date()) b.status = "expired"; });
  const cands = slots.filter((s) => s.date === a.p_date && s.service === a.p_service && s.status === "open").map(usage).filter((u) => u.free >= seats).sort((x, y) => x.free - y.free || x.bubble - y.bubble);
  if (!cands.length) throw Object.assign(new Error("NO_CAPACITY"), { code: 400 });
  const u = cands[0];
  const b = { id: randomUUID(), slot_id: u.slot_id, date: a.p_date, service: a.p_service, bubble: u.bubble, adults: a.p_adults, kids: a.p_kids, seats, name: a.p_name, email: a.p_email || null, phone: a.p_phone || null, notes: a.p_notes || null, amount_cents: a.p_amount_cents, status: a.p_status, source: a.p_source, stripe_session_id: null, stripe_payment_intent: null, refund_id: null, cancel_token: randomUUID().replace(/-/g, ""), expires_at: a.p_status === "hold" ? new Date(Date.now() + a.p_hold_minutes * 60000).toISOString() : null, created_at: new Date().toISOString(), paid_at: a.p_status === "manual" ? new Date().toISOString() : null, cancelled_at: null };
  bookings.push(b); return b;
}

function parseFilters(qs) {
  const f = [];
  for (const [k, v] of new URLSearchParams(qs)) {
    if (["limit", "order", "select"].includes(k)) continue;
    const m = v.match(/^(eq|in)\.(.*)$/); if (!m) continue;
    f.push(m[1] === "eq" ? (r) => String(r[k]) === m[2] : (r) => m[2].replace(/^\(|\)$/g, "").split(",").includes(String(r[k])));
  }
  return (r) => f.every((fn) => fn(r));
}

async function mockSupabase(url, init) {
  const u = new URL(url); const [, , , table] = u.pathname.split("/"); const method = init?.method || "GET";
  const body = init?.body ? JSON.parse(init.body) : null;
  const ok = (d) => new Response(JSON.stringify(d), { status: 200, headers: { "content-type": "application/json" } });
  const err = (m, code = 400) => new Response(JSON.stringify({ message: m }), { status: code });
  if (table === "rpc") {
    const fn = u.pathname.split("/").pop();
    try {
      if (fn === "rc_hold") return ok(hold(body));
      if (fn === "rc_availability") {
        return ok(SERVICES.map((s) => { const us = slots.filter((x) => x.date === body.p_date && x.service === s).map(usage); if (!us.length) return null; const open = us.filter((x) => x.status === "open"); return { service: s, free_total: open.reduce((n, x) => n + x.free, 0), max_group: Math.max(0, ...open.map((x) => x.free)), open_bubbles: open.length, empty_bubbles: open.filter((x) => x.free === x.capacity).length }; }).filter(Boolean));
      }
      if (fn === "rc_availability_range") {
        const days = {}; slots.filter((s) => s.date >= body.p_from && s.date <= body.p_to).map(usage).forEach((x) => { const d = days[x.date] ||= { date: x.date, free_total: 0, max_group: 0, used_total: 0 }; d.used_total += x.used; if (x.status === "open") { d.free_total += x.free; d.max_group = Math.max(d.max_group, x.free); } });
        return ok(Object.values(days));
      }
      if (fn === "rc_day") return ok({ slots: slots.filter((s) => s.date === body.p_date).map(usage), bookings: bookings.filter((b) => b.date === body.p_date && (["paid", "manual", "cancelled"].includes(b.status) || active(b))) });
    } catch (e) { return err(e.message, e.code || 500); }
  }
  const store = table === "rc_bookings" ? bookings : table === "rc_slots" ? slots : table === "rc_slot_usage" ? slots.map(usage) : null;
  if (!store) return err("table inconnue", 404);
  const match = parseFilters(u.search.slice(1));
  if (method === "GET") return ok(store.filter(match));
  if (method === "PATCH") { const rows = store.filter(match); rows.forEach((r) => Object.assign(r, body)); return ok(rows); }
  return err("méthode", 405);
}

async function mockStripe(url, init) {
  const u = new URL(url); const p = new URLSearchParams(init?.body || "");
  const ok = (d) => new Response(JSON.stringify(d), { status: 200, headers: { "content-type": "application/json" } });
  if (u.pathname === "/v1/checkout/sessions" && init.method === "POST") {
    const id = "cs_test_" + randomUUID().replace(/-/g, "").slice(0, 20);
    const s = { id, object: "checkout.session", payment_status: "unpaid", payment_intent: "pi_" + id.slice(8), client_reference_id: p.get("client_reference_id"), success_url: p.get("success_url") };
    sessions.set(id, s);
    return ok({ ...s, url: `${process.env.URL}/__stripe-mock/${id}` });
  }
  const m = u.pathname.match(/^\/v1\/checkout\/sessions\/(.+)$/);
  if (m) return ok(sessions.get(m[1]) || { id: m[1], payment_status: "unpaid" });
  if (u.pathname === "/v1/refunds") return ok({ id: "re_" + randomUUID().slice(0, 8), status: "succeeded", payment_intent: p.get("payment_intent") });
  return new Response(JSON.stringify({ error: { message: "mock: route inconnue " + u.pathname } }), { status: 404 });
}

const realFetch = globalThis.fetch;
globalThis.fetch = (url, init) => {
  const s = String(url);
  if (s.startsWith(process.env.SUPABASE_URL)) return mockSupabase(s, init);
  if (s.startsWith("https://api.stripe.com")) return mockStripe(s, init);
  return realFetch(url, init);
};

seed();

// ---------- Serveur HTTP ----------
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon" };
const fns = {};
for (const n of ["rc-availability", "rc-checkout", "rc-webhook", "rc-booking", "rc-admin"]) fns[n] = (await import(`../netlify/functions/${n}.mjs`)).handler;

http.createServer(async (req, res) => {
  const url = new URL(req.url, process.env.URL);
  let raw = ""; for await (const c of req) raw += c;

  // Page Stripe simulée : bouton payer -> webhook signé -> success_url
  const sm = url.pathname.match(/^\/__stripe-mock\/(.+)$/);
  if (sm) {
    const s = sessions.get(sm[1]);
    if (!s) { res.writeHead(404); return res.end("session inconnue"); }
    if (url.searchParams.get("pay")) {
      s.payment_status = "paid";
      const payload = JSON.stringify({ id: "evt_" + randomUUID().slice(0, 8), type: "checkout.session.completed", data: { object: s } });
      const t = Math.floor(Date.now() / 1000); const sig = createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
      const r = await fns["rc-webhook"]({ httpMethod: "POST", headers: { "stripe-signature": `t=${t},v1=${sig}` }, body: payload });
      console.log("webhook ->", r.statusCode, r.body);
      res.writeHead(302, { Location: s.success_url.replace("{CHECKOUT_SESSION_ID}", s.id) }); return res.end();
    }
    if (url.searchParams.get("expire")) {
      const payload = JSON.stringify({ id: "evt_x", type: "checkout.session.expired", data: { object: s } });
      const t = Math.floor(Date.now() / 1000); const sig = createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
      await fns["rc-webhook"]({ httpMethod: "POST", headers: { "stripe-signature": `t=${t},v1=${sig}` }, body: payload });
      res.writeHead(302, { Location: "/LAMEULERIERACLETTECLUB/?cancelled=1" }); return res.end();
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(`<!doctype html><body style="font-family:sans-serif;padding:40px;max-width:480px;margin:auto"><h2>Stripe Checkout (simulé)</h2><p>Session ${s.id}</p><p><a href="?pay=1" style="display:inline-block;padding:14px 22px;background:#635bff;color:#fff;border-radius:8px;text-decoration:none">Payer</a> &nbsp; <a href="?expire=1">Abandonner (expire la session)</a></p></body>`);
  }

  const fm = url.pathname.match(/^\/\.netlify\/functions\/([\w-]+)$/);
  if (fm && fns[fm[1]]) {
    const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), v]));
    const r = await fns[fm[1]]({ httpMethod: req.method, headers, queryStringParameters: Object.fromEntries(url.searchParams), body: raw, isBase64Encoded: false });
    res.writeHead(r.statusCode, r.headers || {}); return res.end(r.body);
  }

  // Statique
  let file = path.join(PUBLIC, decodeURIComponent(url.pathname));
  try { if ((await stat(file)).isDirectory()) file = path.join(file, "index.html"); } catch {}
  try {
    const data = await readFile(file);
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" }); res.end(data);
  } catch { res.writeHead(404); res.end("404"); }
}).listen(8788, () => console.log("Raclette Club dev : http://localhost:8788/LAMEULERIERACLETTECLUB/  (admin : mot de passe « " + process.env.RC_ADMIN_PASSWORD + " »)"));
