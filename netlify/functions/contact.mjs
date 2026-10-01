const DEST = "arthur@arkt-conseil.com";
const FROM = "ARKT Contact <noreply@arkt-conseil.com>";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Bad Request" };
  }

  const { name = "", email = "", subject = "", message = "" } = data;

  if (!name || !email || !subject || !message) {
    return { statusCode: 422, body: "Missing fields" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set");
    return { statusCode: 503, body: "Email service not configured" };
  }

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <h2 style="color:#0F2244;margin-bottom:4px">Nouveau lead — ARKT Conseil</h2>
  <hr style="border:1px solid #eee;margin-bottom:20px">
  <p><strong>Nom :</strong> ${esc(name)}</p>
  <p><strong>Email :</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>
  <p><strong>Sujet :</strong> ${esc(subject)}</p>
  <p><strong>Message :</strong></p>
  <p style="white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:6px">${esc(message)}</p>
</div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [DEST],
      reply_to: email,
      subject: `[ARKT] ${subject} — ${name}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error", res.status, err);
    return { statusCode: 502, body: "Email sending failed" };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  };
};

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
