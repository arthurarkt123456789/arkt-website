/* ARKT · page de proposition commerciale /devis/[slug] */
import React, { useEffect, useMemo, useRef, useState } from "react";
import ARKT from "../data.js";
import { computeTotals, lineTotal, expiry, isExpired, eur, fmtDate, unitLabel } from "./calc.js";

const ALL_PROJECTS = [...(ARKT.featured || []), ...(ARKT.grid || [])];
const asset = (p) => (p ? (p.startsWith("/") || p.startsWith("http") ? p : `/${p}`) : null);

function projectCard(id) {
  const p = ALL_PROJECTS.find((x) => x.id === id);
  if (!p) return null;
  const panels = p.panels || [];
  const media = panels.find((x) => x.kind === "media");
  const video = panels.find((x) => x.kind === "video");
  const did = panels.find((x) => x.kind === "text" && /fait/i.test(x.head || ""));
  return {
    id,
    name: p.name,
    year: p.year,
    tag: p.tag,
    claim: p.claim,
    logo: asset(p.logo),
    img: asset(media?.src || video?.poster),
    did: did?.body?.[1] || did?.body?.[0] || "",
  };
}

function Rich({ text }) {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*)/g);
  return parts.map((s, i) =>
    s.startsWith("**") && s.endsWith("**") ? <strong key={i}>{s.slice(2, -2)}</strong> : <React.Fragment key={i}>{s}</React.Fragment>
  );
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".dv-reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

function Eyebrow({ children }) {
  return <div className="dv-eyebrow"><span className="dv-dot" />{children}</div>;
}

export default function DevisPage({ devis }) {
  const d = devis;
  const [selected, setSelected] = useState(() =>
    (d.options || []).map((o, i) => (o.preselection ? i : -1)).filter((i) => i >= 0)
  );
  const [expired, setExpired] = useState(false);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nom: d.client?.contact || "",
    fonction: d.client?.fonction || "",
    email: d.client?.email || "",
    accepte: false,
    website: "",
  });
  const formRef = useRef(null);

  useReveal();
  useEffect(() => { setExpired(isExpired(d)); }, [d]);

  const totals = useMemo(() => computeTotals(d, selected), [d, selected]);
  const projets = (d.projets_refs || []).map(projectCard).filter(Boolean).slice(0, 3);
  const equipe = ARKT.team;
  const accountManager = d.equipe?.[0] || ARKT.team[0]?.name;
  const temoignages = (ARKT.testimonials || []).slice(0, 2);
  const exp = expiry(d);

  const toggle = (i) => setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i].sort()));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (state === "sending") return;
    setError("");
    if (!form.accepte) { setError("Cochez la case de validation pour continuer."); return; }
    setState("sending");
    try {
      const res = await fetch("/.netlify/functions/devis-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: d.slug, ...form, options: selected }),
      });
      if (res.status === 410) { setExpired(true); setState("idle"); return; }
      if (!res.ok) throw new Error(String(res.status));
      setState("done");
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    } catch {
      setState("error");
      setError(`L'envoi n'a pas abouti. Écrivez-nous à ${ARKT.email} en mentionnant la proposition ${d.numero}.`);
    }
  }

  return (
    <div className="dv">
      <header className="dv-top">
        <div className="dv-wrap dv-top-in">
          <a href="/" className="dv-brand" aria-label="ARKT Conseil">
            <img src="/arkt/logo-arkt.png" alt="ARKT Conseil" />
          </a>
          <span className="dv-top-ref">Proposition {d.numero}</span>
        </div>
      </header>

      <main>
        {/* ---------- HERO ---------- */}
        <section className="dv-hero">
          <div className="dv-halo" aria-hidden="true" />
          <div className="dv-wrap dv-hero-in">
            <Eyebrow>Proposition commerciale · {d.numero}</Eyebrow>
            <h1 className="dv-display dv-hero-title">{d.client?.societe}</h1>
            {d.accroche && <p className="dv-hero-lead">{d.accroche}</p>}
            <dl className="dv-hero-meta">
              {d.client?.contact && (
                <div><dt>Pour</dt><dd>{d.client.contact}{d.client.fonction ? `, ${d.client.fonction}` : ""}</dd></div>
              )}
              <div><dt>Émise le</dt><dd>{fmtDate(d.date)}</dd></div>
              <div><dt>Valable jusqu'au</dt><dd>{fmtDate(exp)}</dd></div>
              <div><dt>Investissement</dt><dd>{eur(computeTotals(d, []).ht)} HT</dd></div>
            </dl>
            <a href="#proposition" className="dv-btn dv-btn-light">Voir la proposition</a>
          </div>
        </section>

        {/* ---------- ARKT ---------- */}
        <section className="dv-section">
          <div className="dv-wrap">
            <div className="dv-head dv-reveal">
              <Eyebrow>ARKT</Eyebrow>
              <h2 className="dv-display dv-h2">De l'idée à l'impact</h2>
              <p className="dv-lead">{ARKT.offreLead}</p>
            </div>
            <div className="dv-offres">
              {ARKT.offre.map((o, i) => (
                <article key={o.id} className="dv-offre dv-reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                  <div className="dv-offre-k">0{i + 1}</div>
                  <h3 className="dv-display">{o.name}</h3>
                  <div className="dv-offre-sub">{o.sub}</div>
                  <p>{o.detail?.faire}</p>
                </article>
              ))}
            </div>
            <div className="dv-logos dv-reveal" aria-label="Ils nous ont fait confiance">
              {ARKT.clients.map((c) => (
                <img key={c.name} src={asset(c.logo)} alt={c.name} loading="lazy" />
              ))}
            </div>
          </div>
        </section>

        {/* ---------- RÉFÉRENCES ---------- */}
        {projets.length > 0 && (
          <section className="dv-section dv-alt">
            <div className="dv-wrap">
              <div className="dv-head dv-reveal">
                <Eyebrow>Références</Eyebrow>
                <h2 className="dv-display dv-h2">Des projets inspirants</h2>
              </div>
              <div className="dv-refs">
                {projets.map((p, i) => (
                  <article key={p.id} className="dv-ref dv-reveal" style={{ transitionDelay: `${i * 90}ms` }}>
                    {p.img && <div className="dv-ref-img"><img src={p.img} alt={p.name} loading="lazy" /></div>}
                    <div className="dv-ref-body">
                      <div className="dv-ref-top">
                        {p.logo && <img className="dv-ref-logo" src={p.logo} alt="" loading="lazy" />}
                        <div>
                          <div className="dv-ref-name">{p.name} <span>{p.year}</span></div>
                          <div className="dv-ref-tag">{p.tag}</div>
                        </div>
                      </div>
                      <p className="dv-ref-claim"><Rich text={p.claim} /></p>
                      {p.did && <p className="dv-ref-did">{p.did}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------- VOTRE PROJET ---------- */}
        {(d.contexte || d.enjeux?.length) && (
          <section className="dv-section">
            <div className="dv-wrap dv-split">
              <div className="dv-reveal">
                <Eyebrow>Votre projet</Eyebrow>
                <h2 className="dv-display dv-h2">Ce que nous avons compris</h2>
                {d.contexte && <p className="dv-lead">{d.contexte}</p>}
              </div>
              {d.enjeux?.length > 0 && (
                <ol className="dv-enjeux">
                  {d.enjeux.map((e, i) => (
                    <li key={i} className="dv-reveal" style={{ transitionDelay: `${i * 70}ms` }}>
                      <span className="dv-enjeu-k">0{i + 1}</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        )}

        {/* ---------- PROPOSITION ---------- */}
        <section className="dv-section dv-dark" id="proposition">
          <div className="dv-wrap">
            <div className="dv-head dv-reveal">
              <Eyebrow>Notre proposition</Eyebrow>
              <h2 className="dv-display dv-h2">Ce que nous allons faire</h2>
            </div>
            <div className="dv-lots">
              {(d.lots || []).map((l, i) => (
                <article key={i} className="dv-lot dv-reveal">
                  <div className="dv-lot-k">{String(i + 1).padStart(2, "0")}</div>
                  <div className="dv-lot-main">
                    <h3 className="dv-lot-title">{l.titre}</h3>
                    {l.description && <p>{l.description}</p>}
                    {l.livrables?.length > 0 && (
                      <ul className="dv-chips">{l.livrables.map((x, j) => <li key={j}>{x}</li>)}</ul>
                    )}
                  </div>
                  <div className="dv-lot-price">
                    <strong>{eur(lineTotal(l))} <small>HT</small></strong>
                    {unitLabel(l) && <span>{unitLabel(l)}</span>}
                  </div>
                </article>
              ))}
            </div>

            {d.options?.length > 0 && (
              <div className="dv-options">
                <h3 className="dv-sub dv-reveal">Options</h3>
                {d.options.map((o, i) => {
                  const on = selected.includes(i);
                  return (
                    <label key={i} className={`dv-option${on ? " on" : ""}`}>
                      <input type="checkbox" checked={on} onChange={() => toggle(i)} disabled={state === "done"} />
                      <span className="dv-check" aria-hidden="true" />
                      <span className="dv-option-main">
                        <span className="dv-option-title">{o.titre}</span>
                        {o.description && <span className="dv-option-desc">{o.description}</span>}
                      </span>
                      <span className="dv-option-price">+ {eur(lineTotal(o))} HT{unitLabel(o) && <small>{unitLabel(o)}</small>}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ---------- PLANNING ---------- */}
        {d.planning?.length > 0 && (
          <section className="dv-section">
            <div className="dv-wrap">
              <div className="dv-head dv-reveal">
                <Eyebrow>Planning</Eyebrow>
                <h2 className="dv-display dv-h2">Les étapes</h2>
              </div>
              <ol className="dv-plan">
                {d.planning.map((p, i) => (
                  <li key={i} className="dv-reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                    <span className="dv-plan-k">{String(i + 1).padStart(2, "0")}</span>
                    <span className="dv-plan-step">{p.etape}</span>
                    <span className="dv-plan-dur">{p.duree}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* ---------- INVESTISSEMENT + VALIDATION ---------- */}
        <section className="dv-section dv-alt" id="validation">
          <div className="dv-wrap dv-split dv-split-top">
            <div className="dv-reveal">
              <Eyebrow>Investissement</Eyebrow>
              <h2 className="dv-display dv-h2">{eur(totals.ht)} HT</h2>
              <table className="dv-totals">
                <tbody>
                  <tr><th>Prestations</th><td>{eur(totals.lots)}</td></tr>
                  {d.options?.length > 0 && <tr><th>Options retenues</th><td>{eur(totals.opts)}</td></tr>}
                  {totals.remise > 0 && <tr><th>{d.remise?.label || "Remise"}</th><td>− {eur(totals.remise)}</td></tr>}
                  <tr className="dv-tot-ht"><th>Total HT</th><td>{eur(totals.ht)}</td></tr>
                  <tr><th>TVA {Math.round(totals.taux * 100)} %</th><td>{eur(totals.tva)}</td></tr>
                  <tr className="dv-tot-ttc"><th>Total TTC</th><td>{eur(totals.ttc)}</td></tr>
                </tbody>
              </table>
              {d.refacturations?.length > 0 && (
                <div className="dv-refact">
                  <div className="dv-sub-s">Refacturé au réel, hors total</div>
                  <ul>
                    {d.refacturations.map((r, i) => (
                      <li key={i}><span>{r.label}</span>{r.estimation != null && <span>env. {eur(r.estimation)} HT{r.unite === "mois" ? " / mois" : ""}</span>}</li>
                    ))}
                  </ul>
                </div>
              )}
              <ul className="dv-conds">
                {d.conditions?.paiement && <li><strong>Paiement</strong> {d.conditions.paiement}</li>}
                {d.conditions?.hors_brief && <li><strong>Périmètre</strong> {d.conditions.hors_brief}</li>}
                <li><strong>Validité</strong> Proposition valable jusqu'au {fmtDate(exp)}.</li>
              </ul>
              {d.pdf_url && <a className="dv-link" href={d.pdf_url} target="_blank" rel="noopener">Télécharger le devis PDF</a>}
            </div>

            <div className="dv-form-wrap dv-reveal" ref={formRef}>
              {state === "done" ? (
                <div className="dv-done" role="status">
                  <div className="dv-done-mark" aria-hidden="true">✓</div>
                  <h3 className="dv-display">Merci {form.nom.split(" ")[0]}</h3>
                  <p>Votre validation de la proposition {d.numero} est enregistrée pour {eur(totals.ht)} HT.</p>
                  <p>Un e-mail de confirmation vient de vous être envoyé. Nous revenons vers vous pour lancer le projet.</p>
                </div>
              ) : expired ? (
                <div className="dv-done">
                  <h3 className="dv-display">Proposition expirée</h3>
                  <p>Cette proposition n'est plus valable depuis le {fmtDate(exp)}.</p>
                  <a className="dv-btn" href={`mailto:${ARKT.email}?subject=${encodeURIComponent(`Proposition ${d.numero}`)}`}>Nous contacter</a>
                </div>
              ) : (
                <form className="dv-form" onSubmit={submit} noValidate>
                  <h3 className="dv-display">Je valide la proposition</h3>
                  <label className="dv-field"><span>Nom et prénom</span>
                    <input required value={form.nom} onChange={set("nom")} autoComplete="name" />
                  </label>
                  <label className="dv-field"><span>Fonction</span>
                    <input value={form.fonction} onChange={set("fonction")} autoComplete="organization-title" />
                  </label>
                  <label className="dv-field"><span>E-mail</span>
                    <input required type="email" value={form.email} onChange={set("email")} autoComplete="email" />
                  </label>
                  <input className="dv-hp" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} aria-hidden="true" />
                  <label className="dv-accept">
                    <input type="checkbox" checked={form.accepte} onChange={set("accepte")} />
                    <span>
                      Je valide la proposition {d.numero} de {d.client?.societe ? `${d.client.societe} ` : ""}pour un montant de{" "}
                      <strong>{eur(totals.ht)} HT</strong> ({eur(totals.ttc)} TTC) et j'en accepte les conditions.
                    </span>
                  </label>
                  {error && <p className="dv-error" role="alert">{error}</p>}
                  <button className="dv-btn dv-btn-big" type="submit" disabled={state === "sending"}>
                    {state === "sending" ? "Envoi…" : "Je valide le devis"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* ---------- TÉMOIGNAGES ---------- */}
        {temoignages.length > 0 && (
          <section className="dv-section">
            <div className="dv-wrap dv-quotes">
              {temoignages.map((t) => (
                <figure key={t.name} className="dv-quote dv-reveal">
                  <blockquote>« {t.quote} »</blockquote>
                  <figcaption>
                    {t.img && <img src={asset(t.img)} alt="" loading="lazy" />}
                    <span><strong>{t.name}</strong>{t.role}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ---------- ÉQUIPE / CONTACT ---------- */}
      <footer className="dv-foot">
        <div className="dv-wrap">
          <Eyebrow>Votre équipe</Eyebrow>
          <div className="dv-team">
            {equipe.map((m) => (
              <div key={m.name} className={`dv-member${m.name === accountManager ? " dv-member-am" : ""}`}>
                {m.name === accountManager && <span className="dv-member-am-label">Contact privilégié</span>}
                {m.img && <img src={asset(m.img)} alt="" loading="lazy" />}
                <div><strong>{m.name}</strong><span>{m.role}</span></div>
              </div>
            ))}
          </div>
          <div className="dv-foot-bottom">
            <a href={`mailto:${ARKT.email}?subject=${encodeURIComponent(`Proposition ${d.numero}`)}`}>{ARKT.email}</a>
            <span>ARKT Conseil · Marseille / Paris</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
