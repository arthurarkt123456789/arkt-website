// GET /.netlify/functions/rc-availability            -> calendrier (toute la période)
// GET /.netlify/functions/rc-availability?date=YYYY-MM-DD -> détail des 4 services
import { CONFIG, json, sbRpc, isValidDate, minutesUntil, errDetail } from "../lib/rc.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method Not Allowed" });
  const date = event.queryStringParameters?.date;
  const noStore = { "Cache-Control": "no-store" };

  try {
    if (!date) {
      const rows = await sbRpc("rc_availability_range", { p_from: CONFIG.FIRST_DAY, p_to: CONFIG.LAST_DAY });
      const days = rows.map((r) => ({
        date: r.date,
        free: r.free_total,
        used: r.used_total,
        maxGroup: Math.min(r.max_group, CONFIG.PRIVATE_MAX),
        // journée passée : plus rien à réserver en ligne
        closed: minutesUntil(r.date, CONFIG.SERVICES.at(-1)) < CONFIG.BOOKING_CLOSE_MIN,
      }));
      return json(200, { first: CONFIG.FIRST_DAY, last: CONFIG.LAST_DAY, days, prices: { adult: CONFIG.ADULT_CENTS, kid: CONFIG.KID_CENTS } }, noStore);
    }

    if (!isValidDate(date)) return json(400, { error: "Date invalide" });
    const rows = await sbRpc("rc_availability", { p_date: date });
    const byService = Object.fromEntries(rows.map((r) => [r.service, r]));
    const services = CONFIG.SERVICES.map((s) => {
      const r = byService[s];
      const exists = Boolean(r) && r.open_bubbles > 0;
      const closed = minutesUntil(date, s) < CONFIG.BOOKING_CLOSE_MIN;
      return {
        service: s,
        exists,                                   // false = service fermé ce jour (ex. 24/12 soir)
        closed,                                   // trop tard pour réserver en ligne
        free: exists ? r.free_total : 0,
        used: exists ? Math.max(0, r.open_bubbles * CONFIG.SHARED_MAX - r.free_total) : 0,
        maxGroup: exists && !closed ? Math.min(r.max_group, CONFIG.PRIVATE_MAX) : 0,
        canPrivatize: exists && !closed && r.empty_bubbles > 0,
      };
    });
    return json(200, { date, services }, noStore);
  } catch (e) {
    console.error(e);
    return json(500, { error: "Disponibilités indisponibles", detail: errDetail(e), env: { SUPABASE_URL: Boolean(process.env.SUPABASE_URL), SUPABASE_SERVICE_KEY: Boolean(process.env.SUPABASE_SERVICE_KEY) } });
  }
};
