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
import { CONFIG, json, checkAdmin, sbRpc, sbSelect, sbPatch, notifyConfirmation, sendEmail, fmtDate, hhmm, svcLabel, payUrlFor, holdEmailHtml, cancelEmailHtml, groupView, cancelBooking, isValidService } from "../lib/rc.mjs";

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
          sbSelect("rc_bookings", "select=seats,amount_cents,status,source,date&status=in.(paid,manual)"),
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
          refunded_cents: sum(cancelled.filter((r) => r.refund_id), (r) => r.amount_cents),
          bookings_count: sold.length,
        }, noStore);
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
            p_hold_minutes: Math.round(hours * 60), p_source: "admin", p_status: "hold",
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
            p_hold_minutes: Math.round(hours * 60), p_source: "admin", p_status: "hold",
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

      case "extend": {
        const hours = Number(d.hours) > 0 ? Number(d.hours) : 24;
        const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(d.id)}&limit=1`);
        const b = rows[0];
        if (!b) return json(404, { error: "Introuvable" });
        const filter = b.group_id ? `group_id=eq.${b.group_id}` : `id=eq.${b.id}`;
        const upd = await sbPatch("rc_bookings", `${filter}&status=eq.hold&source=eq.admin`, { status: "hold", expires_at: new Date(Date.now() + hours * 3600000).toISOString() });
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
