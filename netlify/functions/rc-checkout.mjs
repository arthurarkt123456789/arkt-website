// POST /.netlify/functions/rc-checkout
// { date, service, adults, kids, name, email, phone, notes }
// -> pose un hold de 30 min puis crée la session Stripe Checkout. Retourne { url }.
import { CONFIG, json, sbRpc, sbPatch, stripe, isValidDate, isValidService, minutesUntil, fmtDate } from "../lib/rc.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });

  let d;
  try { d = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON invalide" }); }

  const date = String(d.date || "");
  const service = String(d.service || "");
  const adults = Number.parseInt(d.adults, 10) || 0;
  const kids = Number.parseInt(d.kids, 10) || 0;
  const seats = adults + kids;
  const name = String(d.name || "").trim().slice(0, 120);
  const email = String(d.email || "").trim().toLowerCase().slice(0, 160);
  const phone = String(d.phone || "").trim().slice(0, 40);
  const notes = String(d.notes || "").trim().slice(0, 500);

  if (!isValidDate(date) || !isValidService(service)) return json(400, { error: "Créneau invalide" });
  if (seats < 1 || seats > CONFIG.PRIVATE_MAX || adults < 0 || kids < 0) return json(400, { error: `Entre 1 et ${CONFIG.PRIVATE_MAX} places` });
  if (adults < 1) return json(400, { error: "Au moins un adulte par réservation" });
  if (name.length < 2) return json(400, { error: "Nom requis" });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { error: "Email invalide" });
  if (phone.replace(/\D/g, "").length < 9) return json(400, { error: "Téléphone invalide" });
  if (minutesUntil(date, service) < CONFIG.BOOKING_CLOSE_MIN) return json(409, { error: "Les réservations en ligne pour ce service sont fermées" });

  const amount = adults * CONFIG.ADULT_CENTS + kids * CONFIG.KID_CENTS;

  // 1. Hold transactionnel
  let booking;
  try {
    booking = await sbRpc("rc_hold", {
      p_date: date, p_service: service, p_adults: adults, p_kids: kids,
      p_name: name, p_email: email, p_phone: phone, p_notes: notes,
      p_amount_cents: amount, p_hold_minutes: CONFIG.HOLD_MINUTES, p_source: "web", p_status: "hold",
    });
  } catch (e) {
    if (/NO_CAPACITY/.test(e.message)) return json(409, { error: seats >= CONFIG.PRIVATE_MIN ? "Plus de bulle libre à privatiser sur ce service" : "Plus assez de places sur ce service pour ce groupe" });
    console.error("hold", e);
    return json(500, { error: "Réservation impossible pour le moment" });
  }

  // 2. Session Stripe Checkout
  const base = `${CONFIG.SITE}${CONFIG.BASE_PATH}`;
  const label = `${fmtDate(date)} à ${service}`;
  const lineItems = [];
  if (adults) lineItems.push({ quantity: adults, price_data: { currency: "eur", unit_amount: CONFIG.ADULT_CENTS, product_data: { name: "Menu Raclette adulte", description: `Raclette Club · ${label}` } } });
  if (kids) lineItems.push({ quantity: kids, price_data: { currency: "eur", unit_amount: CONFIG.KID_CENTS, product_data: { name: "Menu Raclette enfant", description: `Raclette Club · ${label}` } } });

  try {
    const session = await stripe("POST", "/checkout/sessions", {
      mode: "payment",
      locale: "fr",
      customer_email: email,
      client_reference_id: booking.id,
      line_items: lineItems,
      // Stripe impose un minimum de 30 min ; aligné sur le hold.
      expires_at: Math.floor(Date.now() / 1000) + CONFIG.HOLD_MINUTES * 60,
      success_url: `${base}/merci/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?date=${date}&service=${encodeURIComponent(service)}&cancelled=1`,
      metadata: { booking_id: booking.id, date, service, bubble: booking.bubble, adults, kids, name, phone },
      payment_intent_data: {
        description: `Raclette Club ${label} · ${seats} pers. · ${name}`,
        metadata: { booking_id: booking.id, date, service },
      },
      custom_text: { submit: { message: "Boissons et desserts se règlent sur place. Annulation gratuite jusqu'à 48 h avant." } },
    }, `rc-checkout-${booking.id}`);

    await sbPatch("rc_bookings", `id=eq.${booking.id}`, { stripe_session_id: session.id });
    return json(200, { url: session.url, bookingId: booking.id, bubble: booking.bubble });
  } catch (e) {
    console.error("stripe", e);
    // Libère le hold si Stripe échoue
    await sbPatch("rc_bookings", `id=eq.${booking.id}`, { status: "expired" }).catch(() => {});
    return json(502, { error: "Paiement indisponible, réessayez dans un instant" });
  }
};
