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

const LOGO_URL = () => `${CONFIG.SITE}${CONFIG.BASE_PATH}/assets/logo-raclette-club-blanc.png`;
const MAPS_URL = "https://maps.google.com/?q=Les+Terrasses+du+Port,+9+quai+du+Lazaret,+13002+Marseille";
export const hhmm = (service) => service.replace(":", "h");

/** Lien "Ajouter à Google Agenda" pour un service (durée indicative 2 h). */
export function calendarUrl(b) {
  const [h, m] = b.service.split(":").map(Number);
  const d = b.date.replace(/-/g, "");
  const pad = (n) => String(n).padStart(2, "0");
  const start = `${d}T${pad(h)}${pad(m)}00`, end = `${d}T${pad(h + 2)}${pad(m)}00`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: "La Meulerie Raclette Club", dates: `${start}/${end}`, ctz: "Europe/Paris",
    details: `Raclette Club · ${b.seats} place(s) · bulle n°${b.bubble} · réf. ${b.id.slice(0, 8).toUpperCase()}`, location: "Les Terrasses du Port, 9 quai du Lazaret, 13002 Marseille" });
  return `https://calendar.google.com/calendar/render?${q}`;
}

/**
 * Gabarit commun des emails : bandeau bleu + logo, carte principale, blocs, pied.
 * @param {object} o  { kicker, title, lead, rows:[[label,value]], blocks:[html], buttons:[{label,url,primary}], logoSrc }
 */
export function emailLayout(o) {
  const rows = (o.rows || []).map(([k, v]) => `
      <tr><td style="padding:9px 0;border-bottom:1px solid #EDE8D6;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#777;font-weight:700;width:38%">${esc(k)}</td>
          <td style="padding:9px 0;border-bottom:1px solid #EDE8D6;font-size:15px;color:#0B0B14;font-weight:600">${v}</td></tr>`).join("");
  const buttons = (o.buttons || []).map((b) => `<a href="${b.url}" style="display:inline-block;margin:4px 6px 4px 0;padding:13px 22px;border-radius:999px;font-weight:800;font-size:14px;text-decoration:none;${b.primary ? "background:#0000FF;color:#FFFFFF;border:2px solid #0000FF;" : "background:#fff;color:#0000FF;border:2px solid #0000FF;"}">${esc(b.label)}</a>`).join("");
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#F0EBDA">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#F0EBDA" style="background:#F0EBDA"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;font-family:Poppins,'Helvetica Neue',Arial,sans-serif">
  <tr><td bgcolor="#FFFFFF" style="background:#fff;border-radius:24px 24px 0 0;padding:30px 32px 0;text-align:center">
    <p style="margin:0;color:#0000FF;font-size:15px;letter-spacing:.16em;text-transform:uppercase;font-weight:900;line-height:1.4">La Meulerie Raclette Club · Les Terrasses du Port</p>
  </td></tr>
  <tr><td bgcolor="#FFFFFF" style="background:#fff;padding:22px 32px 10px">
    ${o.kicker ? `<p style="margin:0 0 8px;color:#FF5CA8;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:800">${esc(o.kicker)}</p>` : ""}
    <h1 style="margin:0 0 10px;color:#0000FF;font-size:30px;line-height:1.05;letter-spacing:-.02em;font-weight:900">${o.title}</h1>
    ${o.lead ? `<p style="margin:0 0 18px;color:#333;font-size:15px;line-height:1.5">${o.lead}</p>` : ""}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>
    ${buttons ? `<p style="margin:22px 0 10px">${buttons}</p>` : ""}
  </td></tr>
  ${(o.blocks || []).map((html) => `<tr><td bgcolor="#FFFFFF" style="background:#fff;padding:0 32px 22px">${html}</td></tr>`).join("")}
  <tr><td bgcolor="#FFFFFF" style="background:#fff;border-radius:0 0 24px 24px;padding:4px 32px 28px;border-top:1px solid #EDE8D6">
    <p style="margin:16px 0 0;color:#666;font-size:12px;line-height:1.6">La Meulerie Raclette Club est une proposition de <strong>La Meulerie</strong>, fromageries ensoleillées à Marseille.<br>
    Une question ? <a href="mailto:hello@lameulerie.com" style="color:#0000FF">hello@lameulerie.com</a> · <a href="https://www.instagram.com/lameulerie" style="color:#0000FF">@lameulerie</a> · <a href="https://www.lameulerie.com" style="color:#0000FF">lameulerie.com</a></p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

const block = (bg, title, html) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td bgcolor="${bg}" style="background:${bg};border-radius:16px;padding:16px 18px"><p style="margin:0 0 6px;font-weight:800;font-size:14px;color:#0B0B14">${title}</p><div style="font-size:14px;line-height:1.55;color:#222">${html}</div></td></tr></table>`;

const MENU_BLOCK = block("#F7F65C", "Au menu, 36 € adulte · 24 € enfant",
  "Fromage à raclette <strong>nature, ail des ours, 3 poivres et truffe</strong>, charcuteries (option veggie ou halal), pommes de terre et condiments, salade verte, eau minérale à discrétion. Desserts, vin chaud et boissons se commandent et se règlent sur place.");

const INFOS_BLOCK = block("#F0EBDA", "Bon à savoir",
  `Rendez-vous <strong>10 minutes avant</strong> le début du service, aux Terrasses du Port, <a href="${MAPS_URL}" style="color:#0000FF">9 quai du Lazaret, 13002 Marseille</a> (métro Joliette, parking du centre commercial). Les bulles sont face à la mer, prévoyez une petite laine pour l'arrivée.`);

export const tickets = (b) => [b.adults ? `${b.adults} adulte${b.adults > 1 ? "s" : ""}` : null, b.kids ? `${b.kids} enfant${b.kids > 1 ? "s" : ""}` : null].filter(Boolean).join(" + ");
const bubbleLine = (b) => b.seats >= CONFIG.PRIVATE_MIN
  ? `Bulle n°${b.bubble} · <strong>privatisée</strong>${b.seats > CONFIG.SHARED_MAX ? ` (${b.seats} convives : capacité réduite à 8 cette année pour plus de confort, l'espace sera plus serré qu'à 8)` : ""}`
  : `Bulle n°${b.bubble} · partagée, vous pourrez être installés avec d'autres convives`;

export function bookingEmailHtml(b, { cancelUrl, logoSrc } = {}) {
  return emailLayout({
    logoSrc, kicker: "Réservation confirmée", title: "C'est réservé !",
    lead: `Votre table est prête pour le <strong>${esc(fmtDate(b.date))} à ${hhmm(b.service)}</strong>. On s'occupe du fromage.`,
    rows: [
      ["Date", `${esc(fmtDate(b.date))} à <strong>${hhmm(b.service)}</strong>`],
      ["Forfaits", `${esc(tickets(b))} · ${b.seats} place${b.seats > 1 ? "s" : ""}`],
      ["Bulle", bubbleLine(b)],
      ["Au nom de", esc(b.name)],
      ...(b.notes ? [["Remarques", esc(b.notes)]] : []),
      ["Réglé", `<strong>${eur(b.amount_cents)}</strong> par carte`],
      ["Référence", esc(b.id.slice(0, 8).toUpperCase())],
    ],
    buttons: [{ label: "Ajouter à mon agenda", url: calendarUrl(b), primary: true }, { label: "Itinéraire", url: MAPS_URL }],
    blocks: [INFOS_BLOCK, MENU_BLOCK, ...(cancelUrl ? [`<p style="margin:0;color:#555;font-size:13px;line-height:1.5">Un empêchement ? Annulation gratuite jusqu'à 48 h avant le service, remboursement intégral : <a href="${cancelUrl}" style="color:#0000FF">annuler ma réservation</a>.</p>`] : [])],
  });
}

export function holdEmailHtml(b, { logoSrc } = {}) {
  const until = new Date(b.expires_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  return emailLayout({
    logoSrc, kicker: "Table bloquée pour vous", title: "Confirmez votre table",
    lead: `Nous vous avons réservé une table le <strong>${esc(fmtDate(b.date))} à ${hhmm(b.service)}</strong>. Elle est bloquée jusqu'au <strong>${esc(until)}</strong> : réglez le menu en ligne pour la confirmer.`,
    rows: [
      ["Date", `${esc(fmtDate(b.date))} à <strong>${hhmm(b.service)}</strong>`],
      ["Forfaits", `${esc(tickets(b))} · ${b.seats} place${b.seats > 1 ? "s" : ""}`],
      ["Bulle", bubbleLine(b)],
      ["Au nom de", esc(b.name)],
      ["À régler", `<strong>${eur(b.amount_cents)}</strong>`],
    ],
    buttons: [{ label: "Payer et confirmer ma table", url: payUrlFor(b), primary: true }],
    blocks: [MENU_BLOCK, `<p style="margin:0;color:#555;font-size:13px;line-height:1.5">Sans paiement avant l'échéance, les places sont remises en vente. Le paiement est sécurisé par Stripe.</p>`],
  });
}

export function cancelEmailHtml(b, { byVenue = false, refunded = false, logoSrc } = {}) {
  return emailLayout({
    logoSrc, kicker: "Annulation", title: "Réservation annulée",
    lead: byVenue
      ? `Votre table du <strong>${esc(fmtDate(b.date))} à ${hhmm(b.service)}</strong> a été annulée par La Meulerie. Nous sommes désolés pour la gêne occasionnée.`
      : `Votre table du <strong>${esc(fmtDate(b.date))} à ${hhmm(b.service)}</strong> est annulée, comme demandé.`,
    rows: [
      ["Date", `${esc(fmtDate(b.date))} à <strong>${hhmm(b.service)}</strong>`],
      ["Forfaits", `${esc(tickets(b))} · ${b.seats} place${b.seats > 1 ? "s" : ""}`],
      ["Au nom de", esc(b.name)],
      ["Référence", esc(b.id.slice(0, 8).toUpperCase())],
      ...(refunded ? [["Remboursement", `<strong>${eur(b.amount_cents)}</strong>, visible sur votre compte sous 5 à 10 jours ouvrés`]] : []),
    ],
    buttons: [{ label: "Réserver une autre date", url: `${CONFIG.SITE}${CONFIG.BASE_PATH}/`, primary: true }],
    blocks: [],
  });
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
  const subject = `C'est réservé ! Raclette Club · ${fmtDate(b.date)} à ${hhmm(b.service)}`;
  if (b.email) await sendEmail({ to: b.email, subject, html });
  await sendEmail({
    to: CONFIG.NOTIFY_EMAIL,
    subject: `[Raclette Club] ${b.source === "admin" ? "Résa manuelle" : "Nouvelle résa"} ${b.date} ${hhmm(b.service)} · bulle ${b.bubble} · ${b.seats} pers. · ${b.name}`,
    html: `<p style="font-family:Arial,sans-serif;font-size:14px;background:#fff;padding:12px 16px;margin:0"><strong>${esc(b.name)}</strong> · <a href="mailto:${esc(b.email || "")}">${esc(b.email || "")}</a> · <a href="tel:${esc(b.phone || "")}">${esc(b.phone || "")}</a>${b.notes ? ` · ${esc(b.notes)}` : ""} · ${b.source === "admin" ? "manuel" : "web"} · ${eur(b.amount_cents)}</p>` + html,
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

export function cancelUrlFor(b) {
  return `${CONFIG.SITE}${CONFIG.BASE_PATH}/annulation/?id=${b.id}&t=${b.cancel_token}`;
}
