// Pennylane (API externe v2) : facturation des réservations manuelles.
// Variables : PENNYLANE_API_KEY (jeton), PENNYLANE_COMPANY_ID (optionnel, jeton cabinet), PENNYLANE_VAT_CODE (FR_100 par défaut),
//             PENNYLANE_TEMPLATE_ID (optionnel), PENNYLANE_LEDGER_ACCOUNT_ID (optionnel).
import { CONFIG, fmtDate, hhmm } from "./rc.mjs";

const BASE = "https://app.pennylane.com/api/external/v2";
const VAT_CODE = process.env.PENNYLANE_VAT_CODE || "FR_100";
const VAT_RATE = Number(process.env.RC_VAT_RATE ?? "0.10");

export const pennylaneEnabled = () => Boolean(process.env.PENNYLANE_API_KEY);

export async function pl(method, path, body) {
  const key = process.env.PENNYLANE_API_KEY;
  if (!key) throw new Error("PENNYLANE_API_KEY manquant dans Netlify");
  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  if (process.env.PENNYLANE_COMPANY_ID) headers["X-Company-Id"] = String(process.env.PENNYLANE_COMPANY_ID);
  if (body) headers["Content-Type"] = "application/json";
  const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!r.ok) {
    const msg = data?.message || data?.error || data?.errors?.map?.((e) => e.message || e.detail || JSON.stringify(e)).join(" ; ") || text.slice(0, 300);
    const err = new Error(`Pennylane ${method} ${path} HTTP ${r.status} ${msg}`);
    err.status = r.status; err.data = data;
    throw err;
  }
  return data;
}

const money = (cents) => (cents / 100).toFixed(2);
const htCents = (ttcCents) => Math.round(ttcCents / (1 + VAT_RATE));

/** Retrouve un client par référence externe, sinon le crée (client entreprise). */
export async function findOrCreateCustomer({ ref, name, email, phone, address, postalCode, city, country = "FR" }) {
  const filter = encodeURIComponent(JSON.stringify([{ field: "external_reference", operator: "eq", value: ref }]));
  const found = await pl("GET", `/customers?filter=${filter}&limit=1`);
  const existing = found?.items?.[0] || found?.customers?.[0] || (Array.isArray(found) ? found[0] : null);
  if (existing?.id) return existing;
  const body = {
    name, external_reference: ref,
    emails: email ? [email] : [],
    ...(phone ? { phone } : {}),
    billing_address: { address: address || "", postal_code: postalCode || "", city: city || "", country },
  };
  return pl("POST", "/company_customers", body);
}

/** Crée une facture finalisée pour une réservation (vue agrégée pour une privatisation) et l'envoie par email. */
export async function invoiceBooking(b, { customer, deadlineDays = 30, send = true, recipients }) {
  const today = new Date();
  const deadline = new Date(today.getTime() + deadlineDays * 86400000);
  const iso = (d) => d.toISOString().slice(0, 10);
  const where = b.group ? `services ${b.group.label} privatisés (${b.group.bubbles} bulles)` : `service ${hhmm(b.service)}`;
  const label = (n, what, unit) => `${n} menu${n > 1 ? "s" : ""} Raclette Club ${what} × ${money(unit)} € TTC · ${fmtDate(b.date)}, ${where}`;
  const lines = [];
  const listPrice = b.adults * CONFIG.ADULT_CENTS + b.kids * CONFIG.KID_CENTS;
  if (b.amount_cents === listPrice) {
    if (b.adults) lines.push({ label: label(b.adults, "adulte", CONFIG.ADULT_CENTS), quantity: 1, unit: "forfait", raw_currency_unit_price: money(htCents(b.adults * CONFIG.ADULT_CENTS)), vat_rate: VAT_CODE });
    if (b.kids) lines.push({ label: label(b.kids, "enfant", CONFIG.KID_CENTS), quantity: 1, unit: "forfait", raw_currency_unit_price: money(htCents(b.kids * CONFIG.KID_CENTS)), vat_rate: VAT_CODE });
  } else {
    lines.push({ label: `Raclette Club · ${fmtDate(b.date)}, ${where} · ${b.seats} convive${b.seats > 1 ? "s" : ""} (${b.adults} adulte${b.adults > 1 ? "s" : ""}${b.kids ? `, ${b.kids} enfant${b.kids > 1 ? "s" : ""}` : ""}) · tarif convenu ${money(b.amount_cents)} € TTC`, quantity: 1, unit: "forfait", raw_currency_unit_price: money(htCents(b.amount_cents)), vat_rate: VAT_CODE });
  }
  if (process.env.PENNYLANE_LEDGER_ACCOUNT_ID) lines.forEach((l) => { l.ledger_account_id = Number(process.env.PENNYLANE_LEDGER_ACCOUNT_ID); });
  const body = {
    customer_id: customer.id, date: iso(today), deadline: iso(deadline), draft: false,
    invoice_lines: lines, external_reference: `RC-${b.id.slice(0, 8).toUpperCase()}`, language: "fr_FR",
    pdf_invoice_subject: `La Meulerie Raclette Club · ${fmtDate(b.date)}`,
    pdf_invoice_free_text: `Réservation ${b.id.slice(0, 8).toUpperCase()} · ${b.name}${b.notes ? ` · ${b.notes}` : ""}`,
    ...(process.env.PENNYLANE_TEMPLATE_ID ? { customer_invoice_template_id: Number(process.env.PENNYLANE_TEMPLATE_ID) } : {}),
  };
  const inv = await pl("POST", "/customer_invoices", body);
  let sent = false, sendError = null;
  if (send && recipients?.length) {
    for (let i = 0; i < 4 && !sent; i++) {
      try { await pl("POST", `/customer_invoices/${inv.id}/send_by_email`, { recipients }); sent = true; }
      catch (e) { sendError = e.message; if (e.status === 409 && i < 3) await new Promise((r) => setTimeout(r, 2500)); else break; }
    }
  }
  return { invoice: inv, sent, sendError };
}

export async function getInvoice(id) { return pl("GET", `/customer_invoices/${id}`); }

export async function sendInvoice(id, recipients) { return pl("POST", `/customer_invoices/${id}/send_by_email`, { recipients }); }

/** Statut lisible : paid / late / upcoming / partially_paid / cancelled / draft… */
export const invoiceState = (inv) => ({ id: inv.id, number: inv.invoice_number, status: inv.status, paid: Boolean(inv.paid), amount: inv.currency_amount, remaining: inv.remaining_amount_with_tax, pdf: inv.public_file_url || null, deadline: inv.deadline });
