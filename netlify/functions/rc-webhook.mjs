// POST /.netlify/functions/rc-webhook  (Stripe)
// Événements : checkout.session.completed, checkout.session.async_payment_succeeded,
//              checkout.session.expired, checkout.session.async_payment_failed
import { json, sbPatch, verifyStripeSignature, confirmPaidBooking } from "../lib/rc.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });

  const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body || "";
  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  if (!verifyStripeSignature(raw, sig, process.env.STRIPE_WEBHOOK_SECRET)) {
    return json(400, { error: "Signature invalide" });
  }

  let evt;
  try { evt = JSON.parse(raw); } catch { return json(400, { error: "JSON invalide" }); }
  const session = evt.data?.object;

  try {
    switch (evt.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        if (session.payment_status === "paid") {
          await confirmPaidBooking(session.id, session.payment_intent);
        }
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        // Les holds posés par l'admin (24 h) gardent leur propre échéance ; seuls les holds web expirent avec la session.
        await sbPatch("rc_bookings", `stripe_session_id=eq.${encodeURIComponent(session.id)}&status=eq.hold&source=eq.web`, { status: "expired" });
        break;
      }
      default:
        break;
    }
    return json(200, { received: true });
  } catch (e) {
    console.error("webhook", evt.type, e);
    return json(500, { error: "Traitement échoué" }); // Stripe réessaiera
  }
};
