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
import { CONFIG, json, checkAdmin, sbRpc, sbSelect, sbPatch, stripe, notifyConfirmation, sendEmail, fmtDate, esc, eur } from "../lib/rc.mjs";

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

      case "cancel": {
        const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(d.id)}&limit=1`);
        const b = rows[0];
        if (!b) return json(404, { error: "Introuvable" });
        if (b.status === "cancelled") return json(200, { booking: b });
        let refundId = b.refund_id || null;
        if (d.refund && b.stripe_payment_intent && b.amount_cents > 0 && !refundId) {
          const refund = await stripe("POST", "/refunds", { payment_intent: b.stripe_payment_intent }, `rc-refund-${b.id}`);
          refundId = refund.id;
        }
        const upd = await sbPatch("rc_bookings", `id=eq.${b.id}`, { status: "cancelled", cancelled_at: new Date().toISOString(), refund_id: refundId });
        const nb = upd[0];
        if (d.notify && nb.email) {
          await sendEmail({
            to: nb.email,
            subject: `Annulation · Raclette Club ${fmtDate(nb.date)} ${nb.service}`,
            html: `<div style="font-family:Poppins,Arial,sans-serif;max-width:560px;margin:0 auto;background:#F0EBDA;padding:28px;border-radius:24px;color:#111">
              <h1 style="color:#0000FF;font-size:24px;margin:0 0 12px">Réservation annulée</h1>
              <p>Votre table du <strong>${esc(fmtDate(nb.date))} à ${esc(nb.service)}</strong> a été annulée par La Meulerie.</p>
              ${refundId ? `<p>Le remboursement de <strong>${eur(nb.amount_cents)}</strong> est lancé (5 à 10 jours ouvrés).</p>` : ""}
              <p>Une question : hello@lameulerie.com</p></div>`,
          });
        }
        return json(200, { booking: nb, refunded: Boolean(refundId) });
      }

      case "move": {
        const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(d.id)}&limit=1`);
        const b = rows[0];
        if (!b) return json(404, { error: "Introuvable" });
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
