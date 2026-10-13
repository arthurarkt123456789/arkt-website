/* ARKT · validation d'une proposition commerciale (/devis/[slug])
   Recalcule le montant côté serveur à partir du fichier content/devis/{slug}.json,
   puis envoie un e-mail récapitulatif à ARKT et une confirmation au client (Resend). */
import DEVIS from "./devis-data.generated.json";
import { computeTotals, lineTotal, isExpired, eur } from "../../arkt/devis/calc.js";

const DEST = "arthur@arkt-conseil.com";
const FROM = "ARKT Conseil <noreply@arkt-conseil.com>";
const SITE = "https://arkt-conseil.com";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let data;
  try { data = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, body: "Bad Request" }; }

  const { slug = "", nom = "", fonction = "", email = "", accepte = false, website = "" } = data;
  if (website) return json(200, { ok: true }); /* pot de miel */

  const devis = DEVIS[slug];
  if (!devis) return { statusCode: 404, body: "Unknown quote" };
  if (isExpired(devis)) return { statusCode: 410, body: "Expired" };
  if (!accepte || !nom.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { statusCode: 422, body: "Missing fields" };

  const nbOptions = (devis.options || []).length;
  const options = [...new Set((Array.isArray(data.options) ? data.options : []).map(Number))]
    .filter((i) => Number.isInteger(i) && i >= 0 && i < nbOptions)
    .sort((a, b) => a - b);
  const t = computeTotals(devis, options);

  const h = event.headers || {};
  const trace = {
    slug,
    numero: devis.numero,
    societe: devis.client?.societe,
    nom, fonction, email,
    options: options.map((i) => devis.options[i].titre),
    total_ht: t.ht,
    total_ttc: t.ttc,
    ip: h["x-nf-client-connection-ip"] || (h["x-forwarded-for"] || "").split(",")[0].trim(),
    user_agent: h["user-agent"] || "",
    validated_at: new Date().toISOString(),
  };
  console.log("DEVIS_VALIDATION", JSON.stringify(trace));

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set");
    return { statusCode: 503, body: "Email service not configured" };
  }

  const lignes = [
    ...(devis.lots || []).map((l) => [l.titre, eur(lineTotal(l))]),
    ...options.map((i) => [`Option : ${devis.options[i].titre}`, eur(lineTotal(devis.options[i]))]),
  ];
  if (t.remise > 0) lignes.push([devis.remise?.label || "Remise", `− ${eur(t.remise)}`]);

  const table = `
<table style="width:100%;border-collapse:collapse;font-size:14px">
  ${lignes.map(([a, b]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(a)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${esc(b)} HT</td></tr>`).join("")}
  <tr><td style="padding:10px 0"><strong>Total HT</strong></td><td style="padding:10px 0;text-align:right"><strong>${eur(t.ht)}</strong></td></tr>
  <tr><td style="padding:4px 0;color:#666">TVA ${Math.round(t.taux * 100)} %</td><td style="padding:4px 0;text-align:right;color:#666">${eur(t.tva)}</td></tr>
  <tr><td style="padding:4px 0"><strong>Total TTC</strong></td><td style="padding:4px 0;text-align:right"><strong>${eur(t.ttc)}</strong></td></tr>
</table>`;

  const lien = `${SITE}/devis/${slug}/`;

  const interne = `
<div style="font-family:sans-serif;max-width:620px;margin:0 auto;color:#15140F">
  <h2 style="margin:0 0 4px">Devis ${esc(devis.numero)} validé</h2>
  <p style="margin:0 0 20px;color:#666">${esc(devis.client?.societe || "")} · <a href="${lien}">${lien}</a></p>
  <p><strong>Signataire :</strong> ${esc(nom)}${fonction ? `, ${esc(fonction)}` : ""}<br>
     <strong>E-mail :</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>
  ${table}
  <p style="font-size:12px;color:#888;margin-top:24px">
    Horodatage : ${trace.validated_at}<br>IP : ${esc(trace.ip)}<br>Navigateur : ${esc(trace.user_agent)}
  </p>
</div>`;

  const client = `
<div style="font-family:sans-serif;max-width:620px;margin:0 auto;color:#15140F">
  <p>Bonjour ${esc(nom.split(" ")[0])},</p>
  <p>Nous avons bien reçu votre validation de la proposition ${esc(devis.numero)}${devis.client?.societe ? ` pour ${esc(devis.client.societe)}` : ""}.</p>
  ${table}
  <p>La proposition reste consultable ici : <a href="${lien}">${lien}</a></p>
  <p>Nous revenons vers vous pour lancer le projet.</p>
  <p>L'équipe ARKT</p>
</div>`;

  const send = (payload) => fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const res = await send({
    from: FROM,
    to: [DEST],
    reply_to: email,
    subject: `[ARKT] Devis ${devis.numero} validé · ${devis.client?.societe || ""} · ${eur(t.ht)} HT`,
    html: interne,
  });
  if (!res.ok) {
    console.error("Resend error (interne)", res.status, await res.text());
    return { statusCode: 502, body: "Email sending failed" };
  }

  const resClient = await send({
    from: FROM,
    to: [email],
    reply_to: DEST,
    subject: `Votre validation de la proposition ${devis.numero}`,
    html: client,
  });
  if (!resClient.ok) console.error("Resend error (client)", resClient.status, await resClient.text());

  return json(200, { ok: true });
};

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function esc(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
