/* ARKT · calculs partagés entre la page devis et la function de validation */

export function lineTotal(l) {
  const q = Number(l.quantite ?? 1);
  const pu = Number(l.prix_unitaire || 0);
  return Math.round(q * pu * 100) / 100;
}

export function computeTotals(devis, selected = []) {
  const lots = (devis.lots || []).reduce((s, l) => s + lineTotal(l), 0);
  const opts = (devis.options || []).reduce((s, o, i) => (!o.mensuel && selected.includes(i) ? s + lineTotal(o) : s), 0);
  const brut = lots + opts;
  let remise = 0;
  const r = devis.remise;
  if (r && Number(r.valeur)) {
    remise = r.type === "pourcent" ? Math.round(brut * Number(r.valeur)) / 100 : Number(r.valeur);
  }
  const ht = Math.round((brut - remise) * 100) / 100;
  const taux = devis.tva ?? 0.2;
  const tva = Math.round(ht * taux * 100) / 100;
  return { lots, opts, brut, remise, ht, taux, tva, ttc: Math.round((ht + tva) * 100) / 100 };
}

export function expiry(devis) {
  const d = new Date(`${devis.date}T23:59:59`);
  d.setDate(d.getDate() + Number(devis.validite_jours || 30));
  return d;
}

export function isExpired(devis, now = new Date()) {
  return now > expiry(devis);
}

export function eur(n) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: v % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(v).replace(/\u202F/g, "\u00A0");
}

export function fmtDate(d) {
  const date = d instanceof Date ? d : new Date(`${d}T12:00:00`);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function unitLabel(l) {
  const q = Number(l.quantite ?? 1);
  if (l.unite === "mois") return `${eur(l.prix_unitaire)} HT / mois × ${q} mois`;
  if (q !== 1) return `${eur(l.prix_unitaire)} HT × ${q}${l.unite && l.unite !== "forfait" ? ` ${l.unite}${q > 1 ? "s" : ""}` : ""}`;
  return "";
}
