// Bibliothèque partagée : La Meulerie Raclette Club
// Supabase (PostgREST) et Stripe via fetch, sans SDK.
import { createHmac, timingSafeEqual } from "node:crypto";

export const CONFIG = {
  SITE: process.env.URL || "https://arkt-conseil.com",
  BASE_PATH: "/LAMEULERIERACLETTECLUB",
  ADULT_CENTS: 3600,
  KID_CENTS: 2400,
  SERVICES: ["12:00", "14:00", "19:00", "21:00"],
  SHARED_MAX: 8,            // places vendues par bulle en partagé
  PRIVATE_MIN: 8,           // à partir de 8, la bulle est privatisée
  PRIVATE_MAX: 10,          // jusqu'à 10 pour un seul groupe
  FIRST_DAY: "2026-11-27",
  LAST_DAY: "2026-12-24",
  HOLD_MINUTES: 30,
  BOOKING_CLOSE_MIN: 60,       // fermeture des résas en ligne : 60 min avant le service
  CANCEL_HOURS: 48,            // annulation client possible jusqu'à 48 h avant
  NOTIFY_EMAIL: process.env.RC_NOTIFY_EMAIL || "hello@lameulerie.com",
  FROM: "La Meulerie Raclette Club <noreply@arkt-conseil.com>",
  REPLY_TO: process.env.RC_REPLY_TO || "hello@lameulerie.com",
};

/** Message d'erreur court et sans secret, renvoyé au client pour diagnostiquer la config. */
export const errDetail = (e) => {
  let host = "?"; try { host = new URL(process.env.SUPABASE_URL).host; } catch { host = "URL invalide"; }
  const k = (process.env.SUPABASE_SERVICE_KEY || "").trim();
  const kind = k.startsWith("sb_secret_") ? "sb_secret" : k.startsWith("sb_publishable_") ? "sb_publishable (mauvaise clé)" : k.startsWith("eyJ") ? "jwt" : `inconnu (${k.length} car.)`;
  return `${String(e?.message || e?.cause?.message || e)} | host=${host} key=${kind}`.replace(/sb_secret_\S+|eyJ\S+/g, "***").slice(0, 400);
};

export const json = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  body: JSON.stringify(body),
});

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const eur = (cents) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);

export const fmtDate = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// ---------- Dates Europe/Paris ----------
export function parisNow() {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, minutes: Number(g("hour")) % 24 * 60 + Number(g("minute")) };
}

/** Minutes entre maintenant (Paris) et le début d'un service. Négatif si passé. */
export function minutesUntil(date, service) {
  const now = parisNow();
  const dayDiff = (new Date(date + "T00:00:00Z") - new Date(now.date + "T00:00:00Z")) / 86400000;
  const [h, m] = service.split(":").map(Number);
  return dayDiff * 1440 + (h * 60 + m) - now.minutes;
}

export const isValidDate = (d) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= CONFIG.FIRST_DAY && d <= CONFIG.LAST_DAY;
export const isValidService = (s) => CONFIG.SERVICES.includes(s);

// ---------- Supabase ----------
function sbHeaders(extra = {}) {
  const key = (process.env.SUPABASE_SERVICE_KEY || "").trim();
  if (!key) throw new Error("SUPABASE_SERVICE_KEY manquant");
  // Clé legacy service_role (JWT) : apikey + Authorization. Nouvelle clé sb_secret_… : apikey suffit.
  const h = { apikey: key, "Content-Type": "application/json", ...extra };
  if (key.startsWith("eyJ")) h.Authorization = `Bearer ${key}`;
  return h;
}
function sbUrl(path) {
  const base = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  if (!base) throw new Error("SUPABASE_URL manquant");
  return `${base}/rest/v1${path}`;
}

export async function sbRpc(fn, args) {
  const r = await fetch(sbUrl(`/rpc/${fn}`), { method: "POST", headers: sbHeaders(), body: JSON.stringify(args) });
  const text = await r.text();
  if (!r.ok) {
    let msg = text;
    try { msg = JSON.parse(text).message || text; } catch {}
    const e = new Error(`Supabase rpc/${fn} HTTP ${r.status} ${r.statusText} ${String(msg).slice(0, 200)}`.trim()); e.status = r.status; throw e;
  }
  return text ? JSON.parse(text) : null;
}

export async function sbSelect(table, query) {
  const r = await fetch(sbUrl(`/${table}?${query}`), { headers: sbHeaders() });
  if (!r.ok) throw new Error(`Supabase select ${table}: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function sbPatch(table, query, patch) {
  const r = await fetch(sbUrl(`/${table}?${query}`), {
    method: "PATCH", headers: sbHeaders({ Prefer: "return=representation" }), body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`Supabase patch ${table}: ${r.status} ${await r.text()}`);
  return r.json();
}

// ---------- Stripe ----------
function stripeForm(obj, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((item, i) => typeof item === "object" ? stripeForm(item, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item)));
    else if (typeof v === "object") stripeForm(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function stripe(method, path, body, idempotencyKey) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY manquant");
  const headers = { Authorization: `Bearer ${key}` };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  let url = `https://api.stripe.com/v1${path}`;
  const init = { method, headers };
  if (body && method !== "GET") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = stripeForm(body).toString();
  } else if (body) {
    url += `?${stripeForm(body)}`;
  }
  const r = await fetch(url, init);
  const data = await r.json();
  if (!r.ok) { const e = new Error(data?.error?.message || "Stripe error"); e.status = r.status; e.stripe = data?.error; throw e; }
  return data;
}

/** Vérifie la signature Stripe-Signature d'un webhook. */
export function verifyStripeSignature(rawBody, sigHeader, secret, toleranceSec = 300) {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(sigHeader.split(",").map((kv) => kv.split("=")));
  const t = parts.t; const v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected); const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- Admin ----------
export function checkAdmin(event) {
  const given = event.headers["x-admin-key"] || event.headers["X-Admin-Key"] || "";
  const expected = process.env.RC_ADMIN_PASSWORD || "";
  if (!expected) return false;
  const a = Buffer.from(given); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- Emails (Resend) ----------
export async function sendEmail({ to, subject, html, replyTo, bcc }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.error("RESEND_API_KEY manquant"); return false; }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: CONFIG.FROM, to: [].concat(to), bcc: bcc ? [].concat(bcc) : undefined, reply_to: replyTo || CONFIG.REPLY_TO, subject, html }),
  });
  if (!r.ok) console.error("Resend", r.status, await r.text());
  return r.ok;
}

export function bookingEmailHtml(b, { cancelUrl } = {}) {
  const tickets = [
    b.adults ? `${b.adults} menu${b.adults > 1 ? "s" : ""} adulte` : null,
    b.kids ? `${b.kids} menu${b.kids > 1 ? "s" : ""} enfant` : null,
  ].filter(Boolean).join(" + ");
  const priv = b.seats >= CONFIG.PRIVATE_MIN ? `<p style="margin:6px 0"><strong>Bulle privatisée</strong>${b.seats > CONFIG.SHARED_MAX ? " · tablée serrée, prévoyez de jouer des coudes" : ""}</p>` : `<p style="margin:6px 0;color:#555">Bulle partagée : vous pourrez être installés avec d'autres convives.</p>`;
  return `
<div style="font-family:Poppins,Arial,sans-serif;max-width:560px;margin:0 auto;background:#F0EBDA;padding:28px;border-radius:24px;color:#111">
  <h1 style="color:#0000FF;font-size:26px;margin:0 0 4px;letter-spacing:-.02em">La Meulerie Raclette Club</h1>
  <p style="margin:0 0 20px;color:#333">Les Terrasses du Port, Marseille</p>
  <div style="background:#fff;border-radius:18px;padding:20px;margin-bottom:16px">
    <p style="margin:0 0 10px;font-size:18px"><strong>${esc(fmtDate(b.date))} à ${esc(b.service)}</strong></p>
    <p style="margin:6px 0">${esc(tickets)} · ${b.seats} place${b.seats > 1 ? "s" : ""} · bulle n°${b.bubble}</p>
    ${priv}
    <p style="margin:6px 0">Au nom de <strong>${esc(b.name)}</strong></p>
    ${b.notes ? `<p style="margin:6px 0;color:#555">Remarques : ${esc(b.notes)}</p>` : ""}
    <p style="margin:12px 0 0;font-size:18px"><strong>${b.amount_cents ? eur(b.amount_cents) + " réglés" : "Réservation enregistrée"}</strong></p>
    <p style="margin:4px 0 0;color:#555;font-size:13px">Référence : ${esc(b.id.slice(0, 8).toUpperCase())}</p>
  </div>
  <div style="background:#F7F65C;border-radius:18px;padding:16px 20px;margin-bottom:16px">
    <p style="margin:0 0 6px"><strong>Au menu (36 € adulte, 24 € enfant)</strong></p>
    <p style="margin:0;color:#222;font-size:14px">Fromage à raclette (nature, ail des ours, 3 poivres, truffe), charcuteries (option veggie ou halal sur place), pommes de terre, condiments, salade verte, eau minérale à discrétion. Boissons et desserts se règlent sur place.</p>
  </div>
  <p style="font-size:14px;color:#333;margin:0 0 6px">Merci d'arriver 10 minutes avant le début du service.</p>
  ${cancelUrl ? `<p style="font-size:14px;color:#333;margin:0 0 6px">Annulation possible jusqu'à 48 h avant le service, remboursement intégral : <a href="${cancelUrl}" style="color:#0000FF">annuler ma réservation</a>.</p>` : ""}
  <p style="font-size:13px;color:#666;margin:18px 0 0">La Meulerie · hello@lameulerie.com</p>
</div>`;
}

/**
 * Passe une réservation en 'paid' à partir d'une session Stripe et envoie les emails.
 * Idempotent : si déjà payée, renvoie la ligne sans réémettre d'email.
 */
export async function confirmPaidBooking(sessionId, paymentIntent) {
  const updated = await sbPatch(
    "rc_bookings",
    `stripe_session_id=eq.${encodeURIComponent(sessionId)}&status=eq.hold`,
    { status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent: paymentIntent || null, expires_at: null },
  );
  if (updated.length) {
    const b = updated[0];
    await notifyConfirmation(b);
    return { booking: b, transitioned: true };
  }
  const rows = await sbSelect("rc_bookings", `stripe_session_id=eq.${encodeURIComponent(sessionId)}&limit=1`);
  return { booking: rows[0] || null, transitioned: false };
}

export async function notifyConfirmation(b) {
  const html = bookingEmailHtml(b, { cancelUrl: b.email ? cancelUrlFor(b) : null });
  const subject = `Votre table au Raclette Club · ${fmtDate(b.date)} ${b.service}`;
  if (b.email) await sendEmail({ to: b.email, subject, html });
  await sendEmail({
    to: CONFIG.NOTIFY_EMAIL,
    subject: `[Raclette Club] ${b.source === "admin" ? "Résa manuelle" : "Nouvelle résa"} ${b.date} ${b.service} · bulle ${b.bubble} · ${b.seats} pers. · ${b.name}`,
    html: `<p>${esc(b.name)} · ${esc(b.email || "")} · ${esc(b.phone || "")}</p>` + html,
    replyTo: b.email || undefined,
  });
}

export function payUrlFor(b) {
  return `${CONFIG.SITE}${CONFIG.BASE_PATH}/payer/?id=${b.id}&t=${b.cancel_token}`;
}

/** Crée une session Stripe Checkout pour une réservation en attente (hold). */
export async function createCheckoutForBooking(b, expiresInMin = CONFIG.HOLD_MINUTES) {
  const base = `${CONFIG.SITE}${CONFIG.BASE_PATH}`;
  const label = `${fmtDate(b.date)} à ${b.service}`;
  const lineItems = [];
  if (b.adults) lineItems.push({ quantity: b.adults, price_data: { currency: "eur", unit_amount: CONFIG.ADULT_CENTS, product_data: { name: "Menu Raclette adulte", description: `Raclette Club · ${label}` } } });
  if (b.kids) lineItems.push({ quantity: b.kids, price_data: { currency: "eur", unit_amount: CONFIG.KID_CENTS, product_data: { name: "Menu Raclette enfant", description: `Raclette Club · ${label}` } } });
  const session = await stripe("POST", "/checkout/sessions", {
    mode: "payment", locale: "fr", customer_email: b.email || undefined, client_reference_id: b.id, line_items: lineItems,
    expires_at: Math.floor(Date.now() / 1000) + Math.max(30, expiresInMin) * 60,
    success_url: `${base}/merci/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: b.source === "admin" ? payUrlFor(b) : `${base}/?date=${b.date}&service=${encodeURIComponent(b.service)}&cancelled=1`,
    metadata: { booking_id: b.id, date: b.date, service: b.service, bubble: b.bubble, adults: b.adults, kids: b.kids, name: b.name, phone: b.phone || "" },
    payment_intent_data: { description: `Raclette Club ${label} · ${b.seats} pers. · ${b.name}`, metadata: { booking_id: b.id, date: b.date, service: b.service } },
    custom_text: { submit: { message: "Boissons et desserts se règlent sur place. Annulation gratuite jusqu'à 48 h avant." } },
  }, `rc-checkout-${b.id}-${Date.now()}`);
  await sbPatch("rc_bookings", `id=eq.${b.id}`, { stripe_session_id: session.id });
  return session;
}

export function holdEmailHtml(b) {
  const tickets = [b.adults ? `${b.adults} menu${b.adults > 1 ? "s" : ""} adulte` : null, b.kids ? `${b.kids} menu${b.kids > 1 ? "s" : ""} enfant` : null].filter(Boolean).join(" + ");
  const until = new Date(b.expires_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  return `
<div style="font-family:Poppins,Arial,sans-serif;max-width:560px;margin:0 auto;background:#F0EBDA;padding:28px;border-radius:24px;color:#111">
  <h1 style="color:#0000FF;font-size:26px;margin:0 0 4px;letter-spacing:-.02em">La Meulerie Raclette Club</h1>
  <p style="margin:0 0 20px;color:#333">Les Terrasses du Port, Marseille</p>
  <div style="background:#fff;border-radius:18px;padding:20px;margin-bottom:16px">
    <p style="margin:0 0 10px;font-size:18px"><strong>Votre table est bloquée</strong></p>
    <p style="margin:6px 0"><strong>${esc(fmtDate(b.date))} à ${esc(b.service)}</strong> · ${esc(tickets)} · ${b.seats} place${b.seats > 1 ? "s" : ""}${b.seats >= CONFIG.PRIVATE_MIN ? " · bulle privatisée" : ""}</p>
    <p style="margin:6px 0">Au nom de <strong>${esc(b.name)}</strong></p>
    <p style="margin:12px 0 0;font-size:18px"><strong>${eur(b.amount_cents)}</strong> à régler en ligne</p>
  </div>
  <p style="text-align:center;margin:22px 0"><a href="${payUrlFor(b)}" style="display:inline-block;background:#F7F65C;color:#0B0B14;font-weight:900;padding:16px 28px;border-radius:999px;text-decoration:none;border:3px solid #0B0B14">Payer et confirmer ma table</a></p>
  <p style="font-size:14px;color:#333;margin:0 0 6px">Les places vous sont réservées jusqu'au <strong>${esc(until)}</strong>. Sans paiement d'ici là, elles sont remises en vente.</p>
  <p style="font-size:13px;color:#666;margin:18px 0 0">La Meulerie · hello@lameulerie.com</p>
</div>`;
}

export function cancelUrlFor(b) {
  return `${CONFIG.SITE}${CONFIG.BASE_PATH}/annulation/?id=${b.id}&t=${b.cancel_token}`;
}
