// GET /.netlify/functions/rc-booking?session_id=cs_...   -> page merci
// GET /.netlify/functions/rc-booking?id=<uuid>&t=<token>  -> page annulation (lecture)
// POST /.netlify/functions/rc-booking { id, t }           -> annulation client + remboursement Stripe
import { CONFIG, json, sbSelect, stripe, confirmPaidBooking, createCheckoutForBooking, minutesUntil, sendEmail, fmtDate, svcLabel, cancelEmailHtml, groupView, cancelBooking } from "../lib/rc.mjs";

const publicView = (b) => ({
  id: b.id, ref: b.id.slice(0, 8).toUpperCase(), date: b.date, service: b.service, bubble: b.bubble,
  adults: b.adults, kids: b.kids, seats: b.seats, name: b.name, email: b.email, amount_cents: b.amount_cents,
  status: b.status, notes: b.notes, expires_at: b.expires_at, source: b.source,
  group: b.group ? { services: b.group.services, label: b.group.label, bubbles: b.group.bubbles } : null,
  cancellable: b.status === "paid" && minutesUntil(b.date, b.service) >= CONFIG.CANCEL_HOURS * 60,
  payable: b.status === "hold" && b.source === "admin" && b.expires_at && new Date(b.expires_at) > new Date() && minutesUntil(b.date, b.service) > 0,
});

export const handler = async (event) => {
  try {
    if (event.httpMethod === "GET") {
      const q = event.queryStringParameters || {};

      if (q.session_id) {
        // Le webhook peut arriver après la redirection : on vérifie Stripe directement.
        let rows = await sbSelect("rc_bookings", `stripe_session_id=eq.${encodeURIComponent(q.session_id)}&limit=1`);
        let b = await groupView(rows[0]);
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
        return json(200, { booking: publicView(await groupView(rows[0])) }, { "Cache-Control": "no-store" });
      }
      return json(400, { error: "Paramètres manquants" });
    }

    if (event.httpMethod === "POST") {
      let d; try { d = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON invalide" }); }
      const rows = await sbSelect("rc_bookings", `id=eq.${encodeURIComponent(d.id || "")}&cancel_token=eq.${encodeURIComponent(d.t || "")}&limit=1`);
      const b = await groupView(rows[0]);
      if (!b) return json(404, { error: "Lien invalide" });

      if (d.action === "pay") {
        const v = publicView(b);
        if (b.status === "paid") return json(409, { error: "Cette réservation est déjà réglée." });
        if (!v.payable) return json(409, { error: "Ce lien de paiement a expiré. Contactez-nous à hello@lameulerie.com." });
        const remaining = Math.floor((new Date(b.expires_at) - Date.now()) / 60000);
        const session = await createCheckoutForBooking(b, Math.min(remaining, 24 * 60));
        return json(200, { url: session.url });
      }
      if (b.status === "cancelled") return json(200, { booking: publicView(b), already: true });
      if (b.status !== "paid") return json(409, { error: "Cette réservation ne peut pas être annulée en ligne" });
      if (minutesUntil(b.date, b.service) < CONFIG.CANCEL_HOURS * 60) {
        return json(409, { error: "Le délai d'annulation de 48 h est dépassé. Contactez-nous à hello@lameulerie.com." });
      }

      const { booking: nb, refundId } = await cancelBooking(b, { refund: true });

      const html = cancelEmailHtml(nb, { refunded: Boolean(refundId) });
      if (nb.email) await sendEmail({ to: nb.email, subject: `Annulation confirmée · Raclette Club ${fmtDate(nb.date)} à ${svcLabel(nb)}`, html });
      await sendEmail({ to: CONFIG.NOTIFY_EMAIL, subject: `[Raclette Club] Annulation client ${nb.date} ${svcLabel(nb)} · ${nb.group ? `${nb.group.bubbles} bulles` : `bulle ${nb.bubble}`} · ${nb.seats} pers. · ${nb.name}`, html });

      return json(200, { booking: publicView(nb), refunded: Boolean(refundId) });
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (e) {
    console.error("rc-booking", e);
    return json(500, { error: "Erreur serveur" });
  }
};
