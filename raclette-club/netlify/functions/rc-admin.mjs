// Admin Raclette Club. Header requis : x-admin-key: <RC_ADMIN_PASSWORD>
// GET  ?action=day&date=YYYY-MM-DD           -> créneaux + réservations du jour
// GET  ?action=overview                      -> remplissage par jour sur la période
// GET  ?action=export                        -> CSV de toutes les réservations
// POST { action: 'login' }                   -> 200 si mot de passe ok
// POST { action: 'block',   slotIds:[..], blocked:true|false }
// POST { action: 'block_service', date, service, blocked }
// POST { action: 'manual',  date, service, adults, kids, name, email, phone, notes, sendEmail }
// POST { action: 'cancel',  id, refund:true|false }
// POST { action: 'move',    id, bubble }     -> déplace une résa vers une autre bulle du même service
// POST { action: 'hold_service', date, services:[...], adults, kids, name, email, phone, notes, hours, amountCents?, sendEmail }
//                                            -> privatise tous les services listés (5 bulles chacun), 1 lien de paiement
import { CONFIG, json, checkAdmin, sbRpc, sbSelect, sbPatch, notifyConfirmation, sendEmail, fmtDate, hhmm, svcLabel, payUrlFor, holdEmailHtml, cancelEmailHtml, groupView, cancelBooking, isValidService, resendClientEmail } from "../lib/rc.mjs";
import { pl, pennylaneEnabled, findOrCreateCustomer, invoiceBooking, getInvoice, sendInvoice, invoiceState } from "../lib/pennylane.mjs";

/** Rafraîchit le statut Pennylane d'une résa manuelle ; passe « Encaissé » quand la facture est payée. */
export async function syncInvoice(b) {
  const inv = await getInvoice(b.pennylane_invoice_id);
  const st = invoiceState(inv);
  const patch = { pennylane_status: st.status, pennylane_invoice_number: st.number };
  if (st.paid && !b.manual_paid_at) patch.manual_paid_at = new Date().toISOString();
  const filter = b.group_id ? `group_id=eq.${b.group_id}` : `id=eq.${b.id}`;
  await sbPatch("rc_bookings", filter, patch);
  return { ...st, booking_id: b.id, marked_paid: Boolean(patch.manual_paid_at) };
}

const csvCell = (v) => { const s = String(v ?? ""); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export const handler = async (event) => {
  if (!checkAdmin(event)) return json(401, { error: "Non autorisé" });
  const noStore = { "Cache-Control": "no-store" };

  try {
    if (event.httpMethod === "GET") {
      const q = event.queryStringParameters || {};
      if (q.action === "day") {
        const data = await sbRpc("rc_day", { p_date: q.date });
        return json(200, data, noStore);
      }
      if (q.action === "overview") {
        const rows = await sbRpc("rc_availability_range", { p_from: CONFIG.FIRST_DAY, p_to: CONFIG.LAST_DAY });
        return json(200, { days: rows }, noStore);
      }
      if (q.action === "stats") {
        const [slots, sold, cancelled] = await Promise.all([
          sbSelect("rc_slots", "select=capacity,status"),
          sbSelect("rc_bookings", "select=seats,amount_cents,status,source,date,manual_paid_at&status=in.(paid,manual)"),
          sbSelect("rc_bookings", "select=seats,amount_cents,refund_id&status=eq.cancelled"),
        ]);
        const sum = (arr, f) => arr.reduce((n, r) => n + f(r), 0);
        const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
        return json(200, {
          capacity_total: sum(slots, (r) => r.capacity),
          capacity_open: sum(slots.filter((r) => r.status === "open"), (r) => r.capacity),
          seats_sold: sum(sold, (r) => r.seats),
          seats_paid: sum(sold.filter((r) => r.status === "paid"), (r) => r.seats),
          seats_manual: sum(sold.filter((r) => r.status === "manual"), (r) => r.seats),
          seats_past: sum(sold.filter((r) => r.date < today), (r) => r.seats),
          revenue_cents: sum(sold, (r) => r.amount_cents),
          revenue_online_cents: sum(sold.filter((r) => r.status === "paid"), (r) => r.amount_cents),
          revenue_manual_cents: sum(sold.filter((r) => r.status === "manual"), (r) => r.amount_cents),
          revenue_manual_paid_cents: sum(sold.filter((r) => r.status === "manual" && r.manual_paid_at), (r) => r.amount_cents),
          refunded_cents: sum(cancelled.filter((r) => r.refund_id), (r) => r.amount_cents),
          bookings_count: sold.length,
        }, noStore);
      }
      if (q.action === "pennylane_check") {
        if (!pennylaneEnabled()) return json(200, { enabled: false });
        try { const me = await pl("GET", "/me"); return json(200, { enabled: true, ok: true, company: me?.company?.name || me?.company || null, user: me?.user?.email || me?.email || null }, noStore); }
        catch (e) { return json(200, { enabled: true, ok: false, error: e.message }, noStore); }
      }
      if (q.action === "invoice_sync") {
        if (!pennylaneEnabled()) return json(200, { enabled: false, synced: [] });
        const rows = await sbSelect("rc_bookings", "status=eq.manual&pennylane_invoice_id=not.is.null&manual_paid_at=is.null&order=date.asc");
        const seen = new Set(); const out = [];
        for (const b of rows) {
          const k = b.group_id || b.id; if (seen.has(k)) continue; seen.add(k);
          try { out.push(await syncInvoice(b)); } catch (e) { out.push({ booking_id: b.id, error: e.message }); }
        }
        return json(200, { enabled: true, synced: out }, noStore);
      }
      if (q.action === "manual_list") {
        const rows = await sbSelect("rc_bookings", `status=eq.manual&order=date.asc,service.asc,bubble.asc`);
        // une ligne par réservation ; une privatisation de service (group_id) est agrégée
        const out = []; const seen = new Set();
        for (const b of rows) {
          if (!b.group_id) { out.push({ ...b, bubbles: 1 }); continue; }
          if (seen.has(b.group_id)) continue;
          seen.add(b.group_id);
          const g = rows.filter((x) => x.group_id === b.group_id);
          out.push({ ...b, adults: g.reduce((n, x) => n + x.adults, 0), kids: g.reduce((n, x) => n + x.kids, 0), seats: g.reduce((n, x) => n + x.seats, 0), amount_cents: g.reduce((n, x) => n + x.amount_cents, 0), services: [...new Set(g.map((x) => x.service))].sort(), bubbles: g.length });
        }
        return json(200, { bookings: out, pennylane: pennylaneEnabled() }, noStore);
      }
      if (q.action === "export") {
        const rows = await sbSelect("rc_bookings", `status=in.(paid,manual,cancelled)&order=date.asc,service.asc,bubble.asc`);
        const head = ["date", "service", "bulle", "statut", "source", "nom", "email", "telephone", "adultes", "enfants", "places", "montant_eur", "remarques", "reference", "creee_le", "stripe_payment_intent"];
        const lines = rows.map((b) => [b.date, b.service, b.bubble, b.status, b.source, b.name, b.email, b.phone, b.adults, b.kids, b.seats, (b.amount_cents / 100).toFixed(2).replace(".", ","), b.notes, b.id.slice(0, 8).toUpperCase(), b.created_at, b.stripe_payment_intent].map(csvCell).join(";"));
        return { statusCode: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="raclette-club-reservations.csv"`, ...noStore }, body: "﻿" + [head.join(";"), ...lines].join("\n") };
      }
      return json(400, { error: "Action inconnue" });
    }

    if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });
    let d; try { d = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON invalide" }); }

    switch (d.action) {
      case "login":
        return json(200, { ok: true });

      case "block": {
        const ids = (d.slotIds || []).map(Number).filter(Number.isInteger);
        if (!ids.length) return json(400, { error: "slotIds requis" });
        const rows = await sbPatch("rc_slots", `id=in.(${ids.join(",")})`, { status: d.blocked ? "blocked" : "open" });
        return json(200, { updated: rows.length });
      }

      case "block_service": {
        const rows = await sbPatch("rc_slots", `date=eq.${d.date}&service=eq.${encodeURIComponent(d.service)}`, { status: d.blocked ? "blocked" : "open" });
        return json(200, { updated: rows.length });
      }

      case "manual": {
        const adults = Number.parseInt(d.adults, 10) || 0, kids = Number.parseInt(d.kids, 10) || 0;
        if (adults + kids < 1) return json(400, { error: "Au moins une place" });
        let b;
        try {
          b = await sbRpc("rc_hold", {
            p_date: d.date, p_service: d.service, p_adults: adults, p_kids: kids,
            p_name: String(d.name || "Réservation manuelle").trim(), p_email: String(d.email || "").trim(), p_phone: String(d.phone || "").trim(),
            p_notes: String(d.notes || "").trim(), p_amount_cents: Number.isInteger(d.amountCents) ? d.amountCents : 0,
            p_hold_minutes: 0, p_source: "admin", p_status: "manual",
          });
        } catch (e) {
          if (/NO_CAPACITY/.test(e.message)) return json(409, { error: "Pas de bulle ouverte avec assez de places" });
          throw e;
        }
        if (d.sendEmail && b.email) await notifyConfirmation(b);
        return json(200, { booking: b });
      }

      case "hold": {
        // Bloque les places 24 h et renvoie un lien de paiement à transmettre au client
        const adults = Number.parseInt(d.adults, 10) || 0, kids = Number.parseInt(d.kids, 10) || 0;
        if (adults + kids < 1) return json(400, { error: "Au moins une place" });
        const hours = Number(d.hours) > 0 ? Number(d.hours) : 24;
        let b;
        try {
          b = await sbRpc("rc_hold", {
            p_date: d.date, p_service: d.service, p_adults: adults, p_kids: kids,
            p_name: String(d.name || "Réservation").trim(), p_email: String(d.email || "").trim(), p_phone: String(d.phone || "").trim(),
            p_notes: String(d.notes || "").trim(), p_amount_cents: adults * CONFIG.ADULT_CENTS + kids * CONFIG.KID_CENTS,
            p_hold_minutes: Math.round((hours + CONFIG.HOLD_GRACE_HOURS) * 60), p_source: "admin", p_status: "hold",
          });
        } catch (e) {
          if (/NO_CAPACITY/.test(e.message)) return json(409, { error: "Pas de bulle ouverte avec assez de places" });
          throw e;
        }
        const url = payUrlFor(b);
        if (d.sendEmail && b.email) await sendEmail({ to: b.email, subject: `Votre table au Raclette Club est bloquée · ${fmtDate(b.date)} à ${hhmm(b.service)}`, html: holdEmailHtml(b) });
        return json(200, { booking: b, url });
      }

      case "hold_service": {
        const services = [...new Set((d.services || []).map(String))].filter(isValidService).sort();
        if (!services.length) return json(400, { error: "Choisis au moins un service" });
        const adults = Number.parseInt(d.adults, 10) || 0, kids = Number.parseInt(d.kids, 10) || 0;
        const bubbles = 5 * services.length;
        if (adults + kids < bubbles) return json(400, { error: `Au moins ${bubbles} convives pour ${bubbles} bulles` });
        if (adults + kids > CONFIG.PRIVATE_MAX * bubbles) return json(400, { error: `Au plus ${CONFIG.PRIVATE_MAX * bubbles} convives` });
        const hours = Number(d.hours) > 0 ? Number(d.hours) : 24;
        const amount = Number.isInteger(d.amountCents) && d.amountCents >= 0 ? d.amountCents : adults * CONFIG.ADULT_CENTS + kids * CONFIG.KID_CENTS;
        let rows;
        try {
          rows = await sbRpc("rc_hold_group", {
            p_date: d.date, p_services: services, p_adults: adults, p_kids: kids,
            p_name: String(d.name || "Privatisation").trim(), p_email: String(d.email || "").trim(), p_phone: String(d.phone || "").trim(),
            p_notes: String(d.notes || "").trim(), p_amount_cents: amount,
            p_hold_minutes: Math.round((hours + CONFIG.HOLD_GRACE_HOURS) * 60), p_source: "admin", p_status: "hold",
          });
        } catch (e) {
          if (/NO_CAPACITY/.test(e.message)) return json(409, { error: "Un des services demandés a déjà une réservation ou une bulle bloquée : il doit être entièrement libre" });
          if (/TOO_FEW|TOO_MANY/.test(e.message)) return json(400, { error: "Nombre de convives hors limites" });
          throw e;
        }
        const b = await groupView(rows[0]);
        const url = payUrlFor(b);
        if (d.sendEmail && b.email) await sendEmail({ to: b.email, subject: `Votre privatisation du Raclette Club est bloquée · ${fmtDate(b.date)} à ${svcLabel(b)}`, html: holdEmailHtml(b) });
        return json(200, { booking: b, url });
      }

      case "resend": {
        // Renvoie le mail de confirmation (ou le lien de paiement) au client, à l'adresse enregistrée ou à une autre
        const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(d.id)}&limit=1`);
        const b = rows[0];
        if (!b) return json(404, { error: "Introuvable" });
        const kind = await resendClientEmail(await groupView(b), d.email);
        return json(200, { ok: true, kind });
      }

      case "edit": {
        // Modifie nom, email, téléphone, remarques (toutes les lignes d'une privatisation)
        const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(d.id)}&limit=1`);
        const b = rows[0];
        if (!b) return json(404, { error: "Introuvable" });
        const name = String(d.name ?? b.name).trim();
        if (name.length < 2) return json(400, { error: "Nom requis" });
        const patch = { name, email: String(d.email ?? b.email ?? "").trim() || null, phone: String(d.phone ?? b.phone ?? "").trim() || null, notes: String(d.notes ?? b.notes ?? "").trim() || null };
        if (patch.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(patch.email)) return json(400, { error: "Email invalide" });
        const filter = b.group_id ? `group_id=eq.${b.group_id}` : `id=eq.${b.id}`;
        const upd = await sbPatch("rc_bookings", filter, patch);
        let resent = null;
        if (d.resend && patch.email) { try { resent = await resendClientEmail(await groupView(upd[0])); } catch (e) { resent = "erreur : " + e.message; } }
        return json(200, { booking: upd[0], resent });
      }

      case "to_manual": {
        // Blocage avec lien de paiement -> réservation manuelle (paiement hors ligne)
        const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(d.id)}&limit=1`);
        const b = rows[0];
        if (!b) return json(404, { error: "Introuvable" });
        if (b.status !== "hold" || b.source !== "admin") return json(409, { error: "Seul un blocage admin en attente de paiement peut être converti" });
        const filter = b.group_id ? `group_id=eq.${b.group_id}` : `id=eq.${b.id}`;
        const upd = await sbPatch("rc_bookings", `${filter}&status=eq.hold`, { status: "manual", paid_at: new Date().toISOString(), expires_at: null, manual_paid_at: null });
        if (!upd.length) return json(409, { error: "Le blocage a expiré, refais une résa manuelle" });
        return json(200, { booking: await groupView(upd[0]) });
      }

      case "invoice": {
        // Crée le client et la facture dans Pennylane, l'envoie par email, mémorise le numéro
        if (!pennylaneEnabled()) return json(400, { error: "Pennylane n'est pas configuré (PENNYLANE_API_KEY)" });
        const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(d.id)}&limit=1`);
        const b0 = rows[0];
        if (!b0) return json(404, { error: "Introuvable" });
        if (b0.status !== "manual") return json(409, { error: "Seule une réservation manuelle se facture" });
        if (b0.pennylane_invoice_id) return json(409, { error: `Déjà facturée (${b0.pennylane_invoice_number || b0.pennylane_invoice_id})` });
        const b = await groupView(b0);
        if (!b.amount_cents) return json(400, { error: "Montant à 0 : rien à facturer" });
        const email = String(d.email || b.email || "").trim();
        const company = String(d.company || b.name || "").trim();
        if (!company) return json(400, { error: "Raison sociale requise" });
        const customer = await findOrCreateCustomer({
          ref: `rc-${(email || b.id).toLowerCase()}`, name: company, email, phone: b.phone || "",
          address: String(d.address || "").trim(), postalCode: String(d.postalCode || "").trim(), city: String(d.city || "").trim(),
        });
        const deadlineDays = Number(d.deadlineDays) > 0 ? Number(d.deadlineDays) : 30;
        const { invoice, sent, sendError } = await invoiceBooking(b, { customer, deadlineDays, send: Boolean(d.send) && Boolean(email), recipients: email ? [email] : [] });
        const st = invoiceState(invoice);
        const filter = b.group_id ? `group_id=eq.${b.group_id}` : `id=eq.${b.id}`;
        const patch = { pennylane_customer_id: customer.id, pennylane_invoice_id: st.id, pennylane_invoice_number: st.number || null, pennylane_status: st.status || null, pennylane_invoiced_at: new Date().toISOString(), ...(sent ? { pennylane_sent_at: new Date().toISOString() } : {}) };
        if (email && email !== b.email) patch.email = email;
        await sbPatch("rc_bookings", filter, patch);
        return json(200, { invoice: st, sent, sendError, customer_id: customer.id });
      }

      case "invoice_send": {
        const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(d.id)}&limit=1`);
        const b = rows[0];
        if (!b || !b.pennylane_invoice_id) return json(404, { error: "Pas de facture Pennylane" });
        const email = String(d.email || b.email || "").trim();
        if (!email) return json(400, { error: "Email du client requis" });
        await sendInvoice(b.pennylane_invoice_id, [email]);
        const filter = b.group_id ? `group_id=eq.${b.group_id}` : `id=eq.${b.id}`;
        await sbPatch("rc_bookings", filter, { pennylane_sent_at: new Date().toISOString(), ...(email !== b.email ? { email } : {}) });
        return json(200, { ok: true });
      }

      case "invoice_status": {
        const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(d.id)}&limit=1`);
        const b = rows[0];
        if (!b || !b.pennylane_invoice_id) return json(404, { error: "Pas de facture Pennylane" });
        return json(200, { invoice: await syncInvoice(b) });
      }

      case "manual_paid": {
        const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(d.id)}&limit=1`);
        const b = rows[0];
        if (!b || b.status !== "manual") return json(404, { error: "Réservation manuelle introuvable" });
        const filter = b.group_id ? `group_id=eq.${b.group_id}` : `id=eq.${b.id}`;
        const upd = await sbPatch("rc_bookings", `${filter}&status=eq.manual`, { manual_paid_at: d.paid ? new Date().toISOString() : null });
        return json(200, { booking: upd[0], paid: Boolean(d.paid) });
      }

      case "extend": {
        const hours = Number(d.hours) > 0 ? Number(d.hours) : 24;
        const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(d.id)}&limit=1`);
        const b = rows[0];
        if (!b) return json(404, { error: "Introuvable" });
        const filter = b.group_id ? `group_id=eq.${b.group_id}` : `id=eq.${b.id}`;
        const upd = await sbPatch("rc_bookings", `${filter}&status=eq.hold&source=eq.admin`, { status: "hold", expires_at: new Date(Date.now() + (hours + CONFIG.HOLD_GRACE_HOURS) * 3600000).toISOString() });
        if (!upd.length) return json(404, { error: "Introuvable" });
        const v = await groupView(upd[0]);
        return json(200, { booking: v, url: payUrlFor(v) });
      }

      case "cancel": {
        const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(d.id)}&limit=1`);
        const b = rows[0];
        if (!b) return json(404, { error: "Introuvable" });
        if (b.status === "cancelled") return json(200, { booking: b });
        const { booking: nb, refundId } = await cancelBooking(b, { refund: Boolean(d.refund) });
        if (d.notify && nb.email) {
          await sendEmail({ to: nb.email, subject: `Annulation · Raclette Club ${fmtDate(nb.date)} à ${svcLabel(nb)}`, html: cancelEmailHtml(nb, { byVenue: true, refunded: Boolean(refundId) }) });
        }
        return json(200, { booking: nb, refunded: Boolean(refundId) });
      }

      case "move": {
        const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(d.id)}&limit=1`);
        const b = rows[0];
        if (!b) return json(404, { error: "Introuvable" });
        if (b.group_id) return json(409, { error: "Une privatisation de service occupe toutes les bulles, rien à déplacer" });
        const bubble = Number(d.bubble);
        const usage = await sbSelect("rc_slot_usage", `date=eq.${b.date}&service=eq.${encodeURIComponent(b.service)}&bubble=eq.${bubble}&limit=1`);
        const target = usage[0];
        if (!target) return json(404, { error: "Bulle introuvable" });
        if (b.seats >= CONFIG.PRIVATE_MIN ? target.used > 0 : target.free < b.seats) return json(409, { error: b.seats >= CONFIG.PRIVATE_MIN ? `Bulle ${bubble} déjà occupée, une privatisation exige une bulle vide` : `Bulle ${bubble} : ${target.free} place(s) libre(s), il en faut ${b.seats}` });
        const upd = await sbPatch("rc_bookings", `id=eq.${b.id}`, { slot_id: target.slot_id, bubble });
        return json(200, { booking: upd[0] });
      }

      default:
        return json(400, { error: "Action inconnue" });
    }
  } catch (e) {
    console.error("rc-admin", e);
    return json(500, { error: e.message || "Erreur serveur" });
  }
};
