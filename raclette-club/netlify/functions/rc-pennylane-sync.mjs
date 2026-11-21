// Toutes les 15 minutes : passe « Encaissé » les réservations manuelles dont la facture Pennylane est payée.
import { sbSelect } from "../lib/rc.mjs";
import { pennylaneEnabled } from "../lib/pennylane.mjs";
import { syncInvoice } from "./rc-admin.mjs";

export const handler = async () => {
  if (!pennylaneEnabled()) return { statusCode: 200, body: "pennylane off" };
  const rows = await sbSelect("rc_bookings", "status=eq.manual&pennylane_invoice_id=not.is.null&manual_paid_at=is.null");
  const seen = new Set(); let paid = 0, errors = 0;
  for (const b of rows) {
    const k = b.group_id || b.id; if (seen.has(k)) continue; seen.add(k);
    try { const r = await syncInvoice(b); if (r.marked_paid) paid++; } catch (e) { errors++; console.error("pennylane sync", b.id, e.message); }
  }
  console.log(`pennylane sync: ${seen.size} facture(s), ${paid} encaissée(s), ${errors} erreur(s)`);
  return { statusCode: 200, body: JSON.stringify({ checked: seen.size, paid, errors }) };
};
