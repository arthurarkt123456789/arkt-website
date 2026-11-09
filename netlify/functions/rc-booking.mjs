// GET /.netlify/functions/rc-booking?session_id=cs_...   -> page merci
// GET /.netlify/functions/rc-booking?id=<uuid>&t=<token>  -> page annulation (lecture)
// POST /.netlify/functions/rc-booking { id, t }           -> annulation client + remboursement Stripe
import { CONFIG, json, sbSelect, sbPatch, stripe, confirmPaidBooking, minutesUntil, sendEmail, fmtDate, esc, eur } from "../lib/rc.mjs";

const publicView = (b) => ({
  id: b.id, ref: b.id.slice(0, 8).toUpperCase(), date: b.date, service: b.service, bubble: b.bubble,
  adults: b.adults, kids: b.kids, seats: b.seats, name: b.name, email: b.email, amount_cents: b.amount_cents,
  status: b.status, notes: b.notes,
  cancellable: b.status === "paid" && minutesUntil(b.date, b.service) >= CONFIG.CANCEL_HOURS * 60,
});

export const handler = async (event) => {
  try {
    if (event.httpMethod === "GET") {
      const q = event.queryStringParameters || {};

      if (q.session_id) {
        // Le webhook peut arriver après la redirection : on vérifie Stripe directement.
        let rows = await sbSelect("rc_bookings", `stripe_session_id=eq.${encodeURIComponent(q.session_id)}&limit=1`);
        let b = rows[0];
        if (!b) return json(404, { error: "Réservation introuvable" });
        if (b.status === "hold") {
          const s = await stripe("GET", `/checkout/sessions/${encodeURIComponent(q.session_id)}`);
          if (s.payment_status === "paid") {
            const r = await confirmPaidBooking(s.id, s.payment_intent);
            b = r.booking || b;
          }
        }
        return json(200, { booking: publicView(b), pending: b.status === "hold" }, { "Cache-Control": "no-store" });
      }

      if (q.id && q.t) {
        const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(q.id)}&cancel_token=eq.${encodeURIComponent(q.t)}&limit=1`);
        if (!rows[0]) return json(404, { error: "Lien invalide" });
        return json(200, { booking: publicView(rows[0]) }, { "Cache-Control": "no-store" });
      }
      return json(400, { error: "Paramètres manquants" });
    }

    if (event.httpMethod === "POST") {
      let d; try { d = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON invalide" }); }
      const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(d.id || "")}&cancel_token=eq.${encodeURIComponent(d.t || "")}&limit=1`);
      const b = rows[0];
      if (!b) return json(404, { error: "Lien invalide" });
      if (b.status === "cancelled") return json(200, { booking: publicView(b), already: true });
      if (b.status !== "paid") return json(409, { error: "Cette réservation ne peut pas être annulée en ligne" });
      if (minutesUntil(b.date, b.service) < CONFIG.CANCEL_HOURS * 60) {
        return json(409, { error: "Le délai d'annulation de 48 h est dépassé. Contactez-nous à hello@lameulerie.com." });
      }

      let refundId = null;
      if (b.stripe_payment_intent && b.amount_cents > 0) {
        const refund = await stripe("POST", "/refunds", { payment_intent: b.stripe_payment_intent }, `rc-refund-${b.id}`);
        refundId = refund.id;
      }
      const upd = await sbPatch("rc_bookings", `id=eq.${b.id}&status=eq.paid`, {
        status: "cancelled", cancelled_at: new Date().toISOString(), refund_id: refundId,
      });
      const nb = upd[0] || b;

      const html = `<div style="font-family:Poppins,Arial,sans-serif;max-width:560px;margin:0 auto;background:#F0EBDA;padding:28px;border-radius:24px;color:#111">
        <h1 style="color:#0000FF;font-size:24px;margin:0 0 12px">Réservation annulée</h1>
        <p>Votre table du <strong>${esc(fmtDate(nb.date))} à ${esc(nb.service)}</strong> (${nb.seats} place${nb.seats > 1 ? "s" : ""}) est annulée.</p>
        ${refundId ? `<p>Le remboursement de <strong>${eur(nb.amount_cents)}</strong> est lancé. Il apparaît sur votre compte sous 5 à 10 jours ouvrés selon votre banque.</p>` : ""}
        <p style="color:#555;font-size:13px">Référence ${esc(nb.id.slice(0, 8).toUpperCase())} · La Meulerie · hello@lameulerie.com</p></div>`;
      if (nb.email) await sendEmail({ to: nb.email, subject: `Annulation confirmée · Raclette Club ${fmtDate(nb.date)} ${nb.service}`, html });
      await sendEmail({ to: CONFIG.NOTIFY_EMAIL, subject: `[Raclette Club] Annulation client ${nb.date} ${nb.service} · bulle ${nb.bubble} · ${nb.seats} pers. · ${nb.name}`, html });

      return json(200, { booking: publicView(nb), refunded: Boolean(refundId) });
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (e) {
    console.error("rc-booking", e);
    return json(500, { error: "Erreur serveur" });
  }
};
