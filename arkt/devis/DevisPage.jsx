/* ARKT · page de proposition commerciale /devis/[slug] */
import React, { useEffect, useMemo, useRef, useState } from "react";
import ARKT from "../data.js";
import { ProjectDetail } from "../sections-projects.jsx";
import { Arrow } from "../sections-top.jsx";
import { computeTotals, lineTotal, expiry, isExpired, eur, fmtDate, unitLabel } from "./calc.js";

const ALL_PROJECTS = [...(ARKT.featured || []), ...(ARKT.grid || [])];
const asset = (p) => (p ? (p.startsWith("/") || p.startsWith("http") ? p : `/${p}`) : null);

function getProjectForDetail(id) {
  const p = ALL_PROJECTS.find((x) => x.id === id);
  if (!p) return null;
  const slides = (p.panels || []).filter((x) => x.kind !== "intro").map((s) => ({
    ...s,
    src: s.src ? asset(s.src) : undefined,
    poster: s.poster ? asset(s.poster) : undefined,
  }));
  const firstImg = slides.find((x) => x.kind === "media" && x.src);
  return {
    id: p.id,
    name: p.name,
    year: p.year,
    short: p.tag,
    logo: asset(p.logo || (firstImg ? firstImg.src : null)),
    slides,
    body: p.claim,
    alwaysOpen: true,
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

function PlanSlider({ steps }) {
  const ref = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setAtStart(el.scrollLeft <= 4);
      setAtEnd(max <= 4 || el.scrollLeft >= max - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    return () => el.removeEventListener("scroll", update);
  }, []);

  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 270, behavior: "smooth" });

  return (
    <div className="dv-plan-outer">
      <div className="dv-plan-wrap" ref={ref}>
        <ol className="dv-plan">
          {steps.map((p, i) => (
            <li key={i}>
              <span className="dv-plan-k">{String(i + 1).padStart(2, "0")}</span>
              <span className="dv-plan-step">{p.etape}</span>
              <span className="dv-plan-dur">{p.duree}</span>
            </li>
          ))}
        </ol>
      </div>
      <button
        className={"dv-plan-arrow dv-plan-arrow-l" + (atStart ? " dv-plan-arrow-off" : "")}
        onClick={() => scroll(-1)} aria-label="Précédent">
        <Arrow size={13} style={{ transform: "rotate(180deg)" }} />
      </button>
      <button
        className={"dv-plan-arrow dv-plan-arrow-r" + (atEnd ? " dv-plan-arrow-off" : "")}
        onClick={() => scroll(1)} aria-label="Suivant">
        <Arrow size={13} />
      </button>
    </div>
  );
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
  const projets = (d.projets_refs || []).map(getProjectForDetail).filter(Boolean).slice(0, 3);
  const equipeProjet = ARKT.team.filter((m) => (d.equipe || []).includes(m.name));
  const equipeArkt = ARKT.team;
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
          <span className="dv-top-ref">Proposition commerciale</span>
        </div>
      </header>

      <main>
        {/* ---------- HERO ---------- */}
        <section className="dv-hero">
          <div className="dv-halo" aria-hidden="true" />
          <div className="dv-wrap dv-hero-in">
            <Eyebrow>Proposition commerciale</Eyebrow>
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
              <div className="dv-refs-stack">
                {projets.map((proj) => (
                  <div key={proj.id} className="dv-ref-full dv-reveal">
                    <ProjectDetail proj={proj} onClose={() => {}} />
                  </div>
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

            {/* Aperçu maquette site */}
            {d.site_preview && (
              <div className="dv-site-preview dv-reveal">
                <div className="dv-site-preview-in">
                  <div className="dv-site-preview-text">
                    <div className="dv-eyebrow dv-eyebrow-sm"><span className="dv-dot" />Aperçu inclus</div>
                    <h3 className="dv-site-preview-title">{d.site_preview.label}</h3>
                    <p>{d.site_preview.description}</p>
                  </div>
                  <a href={d.site_preview.url} target="_blank" rel="noopener" className="dv-btn dv-btn-light dv-site-preview-cta">
                    Voir la maquette →
                  </a>
                </div>
              </div>
            )}

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
                      {o.mensuel ? (
                        <span className="dv-option-price">+ {eur(o.prix_unitaire)}<small>HT&nbsp;/&nbsp;mois · {o.quantite}&nbsp;mois</small></span>
                      ) : (
                        <span className="dv-option-price">+ {eur(lineTotal(o))} HT{unitLabel(o) && <small>{unitLabel(o)}</small>}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {d.phase2?.length > 0 && (
              <div className="dv-phase2 dv-reveal">
                <div className="dv-phase2-head">
                  <h3 className="dv-sub">Phase 2 · Horizon scale</h3>
                  <p className="dv-phase2-note">Ces prestations sont pensées pour la suite, après le bilan de la cohorte test. Elles sont listées ici pour que vous ayez une vision complète du chemin, sans engagement immédiat.</p>
                </div>
                <div className="dv-phase2-list">
                  {d.phase2.map((p, i) => (
                    <div key={i} className="dv-phase2-item">
                      <span className="dv-phase2-title">{p.titre}</span>
                      {p.description && <span className="dv-phase2-desc">{p.description}</span>}
                      <span className="dv-phase2-price">
                        {p.prix_indicatif ? `env. ${eur(p.prix_indicatif)} HT` : "Sur devis"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ---------- META ADS ---------- */}
        {d.meta_ads && (
          <section className="dv-section dv-alt">
            <div className="dv-wrap">
              <div className="dv-head dv-reveal">
                <Eyebrow>Recommandations</Eyebrow>
                <h2 className="dv-display dv-h2">Notre approche Meta Ads</h2>
                <p className="dv-lead">Une stratégie publicitaire en trois temps, pensée pour le cycle de décision propre au programme : de la découverte à l'inscription.</p>
              </div>

              <div className="dv-ads-axes">
                {d.meta_ads.axes.map((ax, i) => (
                  <div key={i} className="dv-ads-axe dv-reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                    <div className="dv-ads-axe-k">0{i + 1}</div>
                    <h3 className="dv-ads-axe-title">{ax.titre}</h3>
                    <p>{ax.detail}</p>
                  </div>
                ))}
              </div>

              <div className="dv-ads-block dv-reveal">
                <div className="dv-ads-block-label">Ciblages</div>
                <ul className="dv-ads-list">
                  {d.meta_ads.ciblages.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              <div className="dv-ads-block dv-reveal">
                <div className="dv-ads-block-label">Storyboards type</div>
                <div className="dv-ads-boards">
                  {d.meta_ads.storyboards.map((sb, i) => (
                    <div key={i} className="dv-ads-board dv-reveal" style={{ transitionDelay: `${i * 70}ms` }}>
                      <div className="dv-ads-board-format">{sb.format}</div>
                      <p className="dv-ads-board-script">{sb.script}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ---------- PARTENAIRES POTENTIELS ---------- */}
        {d.partenaires && (
          <section className="dv-section">
            <div className="dv-wrap">
              <div className="dv-head dv-reveal">
                <Eyebrow>Pour aller plus loin</Eyebrow>
                <h2 className="dv-display dv-h2">Profils à activer</h2>
                <p className="dv-lead">Des partenariats ciblés pour amplifier la crédibilité du programme et accéder à un recrutement à volume.</p>
              </div>

              <div className="dv-partner-cols">
                {d.partenaires.athletes?.length > 0 && (
                  <div className="dv-partner-col dv-reveal">
                    <div className="dv-partner-col-label">Athlètes ambassadeurs</div>
                    <ol className="dv-partner-list">
                      {d.partenaires.athletes.map((a, i) => (
                        <li key={i} className="dv-partner-item">
                          <div className="dv-partner-k">0{i + 1}</div>
                          <div>
                            <div className="dv-partner-title">{a.profil}</div>
                            <p className="dv-partner-why">{a.pourquoi}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {d.partenaires.ecoles?.length > 0 && (
                  <div className="dv-partner-col dv-reveal" style={{ transitionDelay: "120ms" }}>
                    <div className="dv-partner-col-label">Écoles et institutions sport</div>
                    <ol className="dv-partner-list">
                      {d.partenaires.ecoles.map((e, i) => (
                        <li key={i} className="dv-partner-item">
                          <div className="dv-partner-k">0{i + 1}</div>
                          <div>
                            <div className="dv-partner-title">{e.profil}</div>
                            <p className="dv-partner-why">{e.pourquoi}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ---------- PLANNING ---------- */}
        {d.planning?.length > 0 && (
          <section className="dv-section dv-alt">
            <div className="dv-wrap">
              <div className="dv-head dv-reveal">
                <Eyebrow>Planning</Eyebrow>
                <h2 className="dv-display dv-h2">Les étapes</h2>
              </div>
              <PlanSlider steps={d.planning} />
            </div>
          </section>
        )}

        {/* ---------- INVESTISSEMENT + VALIDATION ---------- */}
        <section className="dv-section" id="validation">
          <div className="dv-wrap dv-split dv-split-top">
            <div className="dv-reveal">
              <Eyebrow>Investissement</Eyebrow>
              <h2 className="dv-display dv-h2">{eur(totals.ht)} HT</h2>
              <table className="dv-totals">
                <tbody>
                  <tr><th>Prestations</th><td>{eur(totals.lots)}</td></tr>
                  {totals.opts > 0 && <tr><th>Options retenues</th><td>{eur(totals.opts)}</td></tr>}
                  {totals.remise > 0 && <tr><th>{d.remise?.label || "Remise"}</th><td>− {eur(totals.remise)}</td></tr>}
                  <tr className="dv-tot-ht"><th>Total HT</th><td>{eur(totals.ht)}</td></tr>
                  <tr><th>TVA {Math.round(totals.taux * 100)} %</th><td>{eur(totals.tva)}</td></tr>
                  <tr className="dv-tot-ttc"><th>Total TTC</th><td>{eur(totals.ttc)}</td></tr>
                </tbody>
              </table>
              {selected.some((i) => d.options?.[i]?.mensuel) && (
                <div className="dv-refact">
                  <div className="dv-sub-s">Engagement mensuel, hors total</div>
                  <ul>
                    {selected.filter((i) => d.options?.[i]?.mensuel).map((i) => {
                      const o = d.options[i];
                      return <li key={i}><span>{o.titre}</span><span>{eur(o.prix_unitaire)} HT / mois</span></li>;
                    })}
                  </ul>
                </div>
              )}
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
          {equipeProjet.length > 0 && (
            <div className="dv-team-group">
              <div className="dv-team-label">Sur ce projet</div>
              <div className="dv-team">
                {equipeProjet.map((m) => (
                  <div key={m.name} className="dv-member">
                    {m.img && <img src={asset(m.img)} alt="" loading="lazy" />}
                    <div><strong>{m.name}</strong><span>{m.role}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="dv-team-group dv-team-group-arkt">
            <div className="dv-team-label">Équipe ARKT</div>
            <div className="dv-team dv-team-sm">
              {equipeArkt.map((m) => (
                <div key={m.name} className="dv-member">
                  {m.img && <img src={asset(m.img)} alt="" loading="lazy" />}
                  <div><strong>{m.name}</strong><span>{m.role}</span></div>
                </div>
              ))}
            </div>
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
