// Finance Raclette Club. Header requis : x-finance-key: <RC_FINANCE_PASSWORD> (à défaut RC_ADMIN_PASSWORD)
// POST { action: 'login' }      -> 200 si mot de passe ok
// GET  ?action=summary          -> C.A., trésorerie, Stripe (frais, virements), factures croisées La Fine Équipe / La Meulerie
import { timingSafeEqual } from "node:crypto";
import { json, sbSelect, stripe, hhmm } from "../lib/rc.mjs";

const VAT_RATE = Number(process.env.RC_VAT_RATE ?? "0.10");            // TVA sur la vente des repas (et la prestation La Fine Équipe)
const VAT_SERVICES = Number(process.env.RC_VAT_SERVICES ?? "0.20");    // TVA sur licence, frais de plateforme, refacturation des frais Stripe
const LICENCE_SHARE = Number(process.env.RC_LICENCE_SHARE ?? "0.08");  // licence de marque La Meulerie, % du HT
const PLATFORM_SHARE = Number(process.env.RC_PLATFORM_SHARE ?? "0.01"); // frais de plateforme de réservation, % du HT
const STRIPE_SINCE = Math.floor(new Date("2026-11-01T00:00:00Z").getTime() / 1000);

function checkFinance(event) {
  const given = event.headers["x-finance-key"] || event.headers["X-Finance-Key"] || "";
  const expected = process.env.RC_FINANCE_PASSWORD || process.env.RC_ADMIN_PASSWORD || "";
  if (!expected) return false;
  const a = Buffer.from(given); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const sum = (arr, f) => arr.reduce((n, r) => n + f(r), 0);
const ht = (ttc) => Math.round(ttc / (1 + VAT_RATE));

/**
 * Factures croisées sur une base HT donnée.
 *  - La Fine Équipe facture La Meulerie : base HT, TVA restauration.
 *  - La Meulerie facture La Fine Équipe : licence + frais de plateforme (% du HT) + frais Stripe au réel (HT), TVA services.
 *  - La Meulerie encaisse tout ; elle reverse la différence TTC entre les deux factures.
 */
function invoicesFor(baseHt, stripeFeesHt) {
  const lfe_ht = baseHt, lfe_vat = Math.round(lfe_ht * VAT_RATE), lfe_ttc = lfe_ht + lfe_vat;
  const licence_ht = Math.round(baseHt * LICENCE_SHARE), platform_ht = Math.round(baseHt * PLATFORM_SHARE), stripe_ht = stripeFeesHt;
  const lm_ht = licence_ht + platform_ht + stripe_ht, lm_vat = Math.round(lm_ht * VAT_SERVICES), lm_ttc = lm_ht + lm_vat;
  return {
    base_ht: baseHt,
    lfe: { ht: lfe_ht, vat: lfe_vat, ttc: lfe_ttc },
    lm: { licence_ht, platform_ht, stripe_ht, ht: lm_ht, vat: lm_vat, ttc: lm_ttc },
    margin_ht: licence_ht + platform_ht,
    transfer_ttc: lfe_ttc - lm_ttc,
  };
}

/** Parcourt une liste Stripe paginée (limit 100) jusqu'au bout, borné à 20 pages. */
async function stripeAll(path, params) {
  const out = []; let starting_after; let pages = 0;
  while (pages++ < 20) {
    const r = await stripe("GET", path, { limit: 100, ...params, ...(starting_after ? { starting_after } : {}) });
    out.push(...r.data);
    if (!r.has_more || !r.data.length) break;
    starting_after = r.data[r.data.length - 1].id;
  }
  return out;
}

/** Agrège un groupe (privatisation) en une ligne. */
function collapse(rows) {
  const out = []; const seen = new Set();
  for (const b of rows) {
    if (!b.group_id) { out.push(b); continue; }
    if (seen.has(b.group_id)) continue;
    seen.add(b.group_id);
    const g = rows.filter((x) => x.group_id === b.group_id);
    out.push({ ...b, seats: sum(g, (x) => x.seats), amount_cents: sum(g, (x) => x.amount_cents), services: [...new Set(g.map((x) => x.service))].sort(), stripe_payment_intent: g.find((x) => x.stripe_payment_intent)?.stripe_payment_intent || b.stripe_payment_intent });
  }
  return out;
}

export const handler = async (event) => {
  if (!checkFinance(event)) return json(401, { error: "Non autorisé" });
  const noStore = { "Cache-Control": "no-store" };

  try {
    if (event.httpMethod === "POST") {
      let d; try { d = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON invalide" }); }
      if (d.action === "login") return json(200, { ok: true });
      return json(400, { error: "Action inconnue" });
    }
    if (event.httpMethod !== "GET") return json(405, { error: "Method Not Allowed" });
    const q = event.queryStringParameters || {};
    if (q.action !== "summary") return json(400, { error: "Action inconnue" });

    const nowIso = new Date().toISOString();
    const [sold, holds, cancelled] = await Promise.all([
      sbSelect("rc_bookings", "select=id,date,service,bubble,name,email,seats,amount_cents,status,source,paid_at,manual_paid_at,stripe_payment_intent,group_id,notes&status=in.(paid,manual)&order=date.asc,service.asc,bubble.asc"),
      sbSelect("rc_bookings", `select=id,date,service,bubble,name,email,seats,amount_cents,status,source,expires_at,group_id,notes&status=eq.hold&source=eq.admin&expires_at=gt.${encodeURIComponent(nowIso)}&order=date.asc,service.asc,bubble.asc`),
      sbSelect("rc_bookings", "select=id,date,service,name,seats,amount_cents,refund_id,stripe_payment_intent,group_id&status=eq.cancelled"),
    ]);

    // ---- Chiffre d'affaires (réservations confirmées : payées en ligne + manuelles) ----
    const paidOnline = sold.filter((r) => r.status === "paid");
    const manualPaid = sold.filter((r) => r.status === "manual" && r.manual_paid_at);
    const manualDue = sold.filter((r) => r.status === "manual" && !r.manual_paid_at);
    const total_ttc = sum(sold, (r) => r.amount_cents);
    const online_ttc = sum(paidOnline, (r) => r.amount_cents);
    const manual_paid_ttc = sum(manualPaid, (r) => r.amount_cents);
    const manual_due_ttc = sum(manualDue, (r) => r.amount_cents);
    const holds_ttc = sum(holds, (r) => r.amount_cents);
    const cashed_ttc = online_ttc + manual_paid_ttc;          // encaissé à date
    const upcoming_ttc = manual_due_ttc;                        // à venir (sur place, virement…)
    const refunded_ttc = sum(cancelled.filter((r) => r.refund_id), (r) => r.amount_cents);

    // ---- Stripe : charges liées aux réservations, frais, remboursements, virements, solde ----
    const ourPIs = new Set([...sold, ...cancelled].map((r) => r.stripe_payment_intent).filter(Boolean));
    const byPI = new Map();
    for (const b of collapse(sold)) if (b.stripe_payment_intent) byPI.set(b.stripe_payment_intent, b);
    for (const b of collapse(cancelled)) if (b.stripe_payment_intent && !byPI.has(b.stripe_payment_intent)) byPI.set(b.stripe_payment_intent, b);

    let stripeOk = true, stripeError = null;
    let charges = [], payouts = [], balance = null;
    try {
      [charges, payouts, balance] = await Promise.all([
        stripeAll("/charges", { created: { gte: STRIPE_SINCE }, expand: ["data.balance_transaction"] }),
        stripeAll("/payouts", { created: { gte: STRIPE_SINCE } }),
        stripe("GET", "/balance"),
      ]);
    } catch (e) { stripeOk = false; stripeError = e.message; }

    const ours = charges.filter((c) => c.paid && ourPIs.has(c.payment_intent));
    const payments = ours.map((c) => {
      const bt = c.balance_transaction && typeof c.balance_transaction === "object" ? c.balance_transaction : null;
      const b = byPI.get(c.payment_intent);
      return {
        charge_id: c.id, payment_intent: c.payment_intent, created: c.created,
        amount_cents: c.amount, refunded_cents: c.amount_refunded, fee_cents: bt ? bt.fee : null, net_cents: bt ? bt.net : null,
        currency: c.currency, card: c.payment_method_details?.card ? `${c.payment_method_details.card.brand} ···${c.payment_method_details.card.last4}` : (c.payment_method_details?.type || ""),
        booking: b ? { id: b.id, date: b.date, service: b.services ? b.services.map(hhmm).join(" · ") : hhmm(b.service), name: b.name, seats: b.seats, status: b.status, group: Boolean(b.group_id) } : null,
      };
    }).sort((a, b) => b.created - a.created);
    const stripe_gross = sum(payments, (p) => p.amount_cents);
    const stripe_refunded = sum(payments, (p) => p.refunded_cents);
    const stripe_fees = sum(payments, (p) => p.fee_cents || 0);
    const stripe_net = sum(payments, (p) => (p.net_cents ?? p.amount_cents) - p.refunded_cents);

    const eurBal = (list) => sum((list || []).filter((x) => x.currency === "eur"), (x) => x.amount);

    return json(200, {
      generated_at: nowIso,
      params: { vat_rate: VAT_RATE, vat_services: VAT_SERVICES, licence_share: LICENCE_SHARE, platform_share: PLATFORM_SHARE, stripe_since: STRIPE_SINCE },
      revenue: {
        total_ttc, total_ht: ht(total_ttc), vat: total_ttc - ht(total_ttc),
        online_ttc, manual_ttc: manual_paid_ttc + manual_due_ttc,
        bookings: sold.length, seats: sum(sold, (r) => r.seats),
        refunded_ttc, cancelled_count: cancelled.length,
      },
      cash: {
        cashed_ttc, cashed_ht: ht(cashed_ttc), cashed_online_ttc: online_ttc, cashed_manual_ttc: manual_paid_ttc,
        upcoming_ttc, upcoming_ht: ht(upcoming_ttc),
        pending_links_ttc: holds_ttc, pending_links_count: collapse(holds).length,
        projected_ttc: total_ttc, projected_ht: ht(total_ttc),
      },
      invoices: {
        cashed: invoicesFor(ht(cashed_ttc), stripe_fees),
        total: invoicesFor(ht(total_ttc), stripe_fees),
      },
      stripe: {
        ok: stripeOk, error: stripeError,
        gross_cents: stripe_gross, refunded_cents: stripe_refunded, fees_cents: stripe_fees, net_cents: stripe_net,
        charges_count: payments.length, unmatched_charges: charges.filter((c) => c.paid && !ourPIs.has(c.payment_intent)).length,
        balance_available_cents: balance ? eurBal(balance.available) : null, balance_pending_cents: balance ? eurBal(balance.pending) : null,
        payouts: payouts.filter((p) => p.currency === "eur").map((p) => ({ id: p.id, amount_cents: p.amount, status: p.status, arrival_date: p.arrival_date, created: p.created, method: p.method, description: p.description || "" })).sort((a, b) => b.arrival_date - a.arrival_date),
        payouts_paid_cents: sum(payouts.filter((p) => p.currency === "eur" && p.status === "paid"), (p) => p.amount),
        payouts_pending_cents: sum(payouts.filter((p) => p.currency === "eur" && (p.status === "pending" || p.status === "in_transit")), (p) => p.amount),
        payments,
      },
      upcoming: collapse(manualDue).map((b) => ({ id: b.id, date: b.date, service: b.services ? b.services.map(hhmm).join(" · ") : hhmm(b.service), name: b.name, seats: b.seats, amount_cents: b.amount_cents, notes: b.notes || "", group: Boolean(b.group_id) })),
      pending_links: collapse(holds).map((b) => ({ id: b.id, date: b.date, service: b.services ? b.services.map(hhmm).join(" · ") : hhmm(b.service), name: b.name, seats: b.seats, amount_cents: b.amount_cents, expires_at: b.expires_at, group: Boolean(b.group_id) })),
      manual_cashed: collapse(manualPaid).map((b) => ({ id: b.id, date: b.date, service: b.services ? b.services.map(hhmm).join(" · ") : hhmm(b.service), name: b.name, seats: b.seats, amount_cents: b.amount_cents, paid_at: b.manual_paid_at, group: Boolean(b.group_id) })),
    }, noStore);
  } catch (e) {
    console.error("rc-finance", e);
    return json(500, { error: "Erreur serveur", detail: e.message });
  }
};
