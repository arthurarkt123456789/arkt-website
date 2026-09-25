/* ARKT — sections basses : approche, offre, témoignages, équipe, contact, footer */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Reveal, Arrow, Logo, scrollToId } from './sections-top.jsx';
import ARKT from './data.js';

/* ---------------- Offre ---------------- */
function OffreDetail({ o }) {
  const d = o.detail;
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 90 || r.bottom > window.innerHeight) {
      window.scrollTo({ top: r.top + window.scrollY - 96, behavior: "smooth" });
    }
  }, [o.id]);
  return (
    <div className="offre-detail" ref={ref} key={o.id}>
      <div className="offre-detail-grid">
        <div className="offre-detail-block">
          <p className="offre-col-k">Ce qu'on fait</p>
          <p className="offre-detail-p">{d.faire}</p>
        </div>
        <div className="offre-detail-block">
          <p className="offre-col-k">{o.contenuLabel}</p>
          <ul className="offre-col-list">
            {o.contenu.map((c) => (<li key={c}>{c}</li>))}
          </ul>
        </div>
        <div className="offre-detail-block">
          <p className="offre-detail-p offre-detail-change">{d.change}</p>
          {o.fin && <p className="offre-col-fin">{o.fin}</p>}
          <a className="btn btn-primary offre-detail-cta" href="#contact" onClick={(e) => { e.preventDefault(); scrollToId("contact"); }}>
            {o.cta} <Arrow />
          </a>
        </div>
      </div>
    </div>
  );
}

function Offre() {
  const D = ARKT;
  const [openId, setOpenId] = useState(null);
  const openO = D.offre.find((o) => o.id === openId) || null;

  /* nb de colonnes de la grille (doit suivre le même seuil que le CSS .offre-cols)
     → sert à savoir après quelle carte insérer le détail déplié */
  const [cols, setCols] = useState(3);
  useEffect(() => {
    const calc = () => setCols(window.innerWidth <= 1040 ? 1 : 3);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  const rowOf = (idx) => Math.floor(idx / cols);
  const openIdx = openO ? D.offre.findIndex((o) => o.id === openO.id) : -1;
  const openRow = openIdx >= 0 ? rowOf(openIdx) : -1;

  const rows = [];
  for (let i = 0; i < D.offre.length; i += cols) {
    rows.push({ rowIdx: rowOf(i), items: D.offre.slice(i, i + cols).map((o, k) => ({ o, i: i + k })) });
  }

  return (
    <section id="offre" className="section-pad offre">
      <div className="wrap">
        <Reveal className="offre-intro">
          <p className="eyebrow"><span className="dot" />Offre</p>
          <h2 className="display offre-title">
            De l'idée à l'impact, <span className="dim">tout le spectre.</span>
          </h2>
          <p className="offre-lead dim">{D.offreLead}</p>
          <a className="alink offre-link" href={"#projets"} onClick={(e) => { e.preventDefault(); scrollToId("projets"); }}>
            Voir cette étendue dans les projets <Arrow />
          </a>
        </Reveal>
        <div className="offre-cols">
          {rows.map(({ rowIdx, items }) => (
            <React.Fragment key={"row-" + rowIdx}>
              {items.map(({ o, i }) => {
                const isOpen = openId === o.id;
                return (
                  <Reveal key={o.id} delay={i * 90} as="button" type="button" className={"offre-col" + (isOpen ? " open" : "")}
                    onClick={() => setOpenId(isOpen ? null : o.id)} aria-expanded={isOpen}>
                    <div className="offre-col-num display">{i + 1}</div>
                    <h3 className="offre-col-t">{o.name}</h3>
                    <p className="offre-col-sub mono">{o.sub}</p>
                    <div className="offre-col-block">
                      <p className="offre-col-k">C'est pour vous si</p>
                      <p className="offre-col-p">{o.quand}</p>
                    </div>
                    <span className="offre-col-more alink">{isOpen ? "Fermer" : "En savoir plus"} <Arrow size={14} /></span>
                    <span className="ptile-plus offre-col-plus" aria-hidden="true"><i /><i /></span>
                  </Reveal>
                );
              })}
              {rowIdx === openRow && openO && (
                <div className="offre-detail-slot">
                  <OffreDetail o={openO} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ─── strip gains (fond sombre) ─── */}
        <Reveal className="offre-gains" as="div">
          {D.approche.map((s) => (
            <div key={s.k} className="offre-gain">
              <span className="offre-gain-bar" aria-hidden="true" />
              <p className="offre-gain-t">{s.t}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Témoignages ---------------- */
function highlightQuote(quote, hi) {
  if (!hi || !hi.length) return quote;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${hi.map(esc).join("|")})`, "g");
  return quote.split(re).map((part, i) =>
    hi.includes(part) ? <strong key={i} className="testi-hi">{part}</strong> : part
  );
}

function TestiCard({ t }) {
  return (
    <article className="testi-card">
      <span className="testi-mark" aria-hidden="true">“</span>
      <blockquote className="testi-card-q">{highlightQuote(t.quote, t.hi)}</blockquote>
      <span className="testi-divider" aria-hidden="true" />
      <div className="testi-card-author">
        <div className="testi-card-avatar">
          {t.img
            ? <img src={t.img} alt={t.name} loading="lazy" />
            : <span className="testi-card-ph">{t.name.split(" ").map(w => w[0]).join("")}</span>
          }
        </div>
        <div className="testi-card-id">
          <div className="testi-card-name">{t.name}</div>
          <div className="testi-card-role dim">{t.role}</div>
        </div>
      </div>
    </article>
  );
}

function Chevron({ dir = "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={dir === "left" ? "M12.5 4.5L6 10L12.5 15.5" : "M7.5 4.5L14 10L7.5 15.5"}
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Testimonials() {
  const D = ARKT;
  const [idx, setIdx] = useState(0);
  const go = (d) => setIdx(p => (p + d + D.testimonials.length) % D.testimonials.length);

  const dragX = useRef(null);
  const onDragStart = (e) => { dragX.current = e.clientX; };
  const onDragEnd = (e) => {
    if (dragX.current == null) return;
    const dx = e.clientX - dragX.current;
    dragX.current = null;
    if (Math.abs(dx) > 40) go(dx > 0 ? -1 : 1);
  };

  return (
    <section className="section-pad testi">
      <div className="testi-halo halo" />
      <div className="wrap">

        <Reveal className="testi-head">
          <p className="eyebrow testi-eyebrow"><span className="dot" />Témoignages</p>
          <h2 className="testi-bigtitle display">Ce que nos clients disent.</h2>
        </Reveal>

        <div className="testi-carousel" aria-live="polite">
          <button className="testi-arrow" onClick={() => go(-1)} aria-label="Précédent">
            <Chevron dir="left" />
          </button>
          <div className="testi-stage" onPointerDown={onDragStart} onPointerUp={onDragEnd}>
            {D.testimonials.map((t, i) => {
              const n = D.testimonials.length;
              let diff = i - idx;
              if (diff > n / 2) diff -= n;
              if (diff < -n / 2) diff += n;
              return (
                <div key={i} className={"testi-slide" + (i === idx ? " is-active" : "")}
                  style={{ transform: `translateX(${diff * 100}%)` }} aria-hidden={i !== idx}>
                  <TestiCard t={t} />
                </div>
              );
            })}
          </div>
          <button className="testi-arrow" onClick={() => go(1)} aria-label="Suivant">
            <Chevron dir="right" />
          </button>
        </div>

      </div>
    </section>
  );
}

/* ---------------- Équipe ---------------- */
function Team() {
  const D = ARKT;
  return (
    <section id="equipe" className="section-pad light-section on-light team">
      <div className="wrap">
        <Reveal className="team-head">
          <p className="eyebrow"><span className="dot" />Équipe</p>
          <h2 className="display team-title">
            Des expertises réunies <span className="dim">autour d'une même trajectoire.</span>
          </h2>
          <p className="team-lead dim">Stratégie, contenu, direction artistique et culture de marque : une équipe agile, impliquée, orientée impact.</p>
        </Reveal>
        <div className="team-bubbles">
          {D.team.map((m, i) => (
            <Reveal key={m.name} delay={i * 70} className="team-bubble" as="article">
              <div className="team-bubble-photo">
                {m.img ? <img src={m.img} alt={m.name} loading="lazy" /> : <div className="team-photo-ph"><span className="mono">{m.name.split(" ").map((w) => w[0]).join("")}</span></div>}
              </div>
              <h3 className="team-bubble-name">{m.name}</h3>
              <div className="team-bubble-role dim">{m.role}</div>
              <p className="team-bubble-bio dim">{m.bio}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Contact ---------------- */
function ContactForm() {
  const D = ARKT;
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); /* idle | sending | sent | error */
  const set = useCallback((k) => (e) => {
    setF(p => ({ ...p, [k]: e.target.value }));
    setErrors(p => ({ ...p, [k]: undefined }));
  }, []);

  const validate = () => {
    const er = {};
    if (!f.name.trim()) er.name = "Indiquez votre nom.";
    if (!f.email.trim()) er.email = "Indiquez votre email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) er.email = "Email invalide.";
    if (!f.subject.trim()) er.subject = "Précisez le sujet.";
    if (!f.message.trim()) er.message = "Écrivez quelques mots.";
    return er;
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length > 0) return;
    setStatus("sending");
    try {
      const body = new URLSearchParams({ "form-name": "contact", ...f }).toString();
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="cform cform-done" role="status">
        <span className="cform-check" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 12.5L10 17.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <h3 className="cform-done-t">Message envoyé.</h3>
        <p className="cform-done-d dim">Merci {f.name.split(" ")[0]}, on revient vers vous sous 48&nbsp;h. En attendant, continuez à explorer les projets.</p>
        <button type="button" className="btn btn-ghost"
          onClick={() => { setStatus("idle"); setF({ name: "", email: "", subject: "", message: "" }); }}>
          Envoyer un autre message
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="cform cform-done cform-error" role="alert">
        <span className="cform-check" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
        <h3 className="cform-done-t">Erreur d'envoi.</h3>
        <p className="cform-done-d dim">
          Une erreur est survenue. Écrivez-nous directement à&nbsp;
          <a href={"mailto:" + D.email} className="alink">{D.email}</a>.
        </p>
        <button type="button" className="btn btn-ghost" onClick={() => setStatus("idle")}>Réessayer</button>
      </div>
    );
  }

  const field = (k, label, type) => (
    <label className={"cfield" + (errors[k] ? " err" : "")}>
      <span className="cfield-label">{label}</span>
      <input className="cfield-input" type={type || "text"} value={f[k]} onChange={set(k)}
        placeholder={label} autoComplete={k === "name" ? "name" : k === "email" ? "email" : "off"} />
      {errors[k] && <span className="cfield-err" role="alert">{errors[k]}</span>}
    </label>
  );

  return (
    <form className="cform" onSubmit={submit} noValidate
      data-netlify="true" name="contact">
      <input type="hidden" name="form-name" value="contact" />
      <div className="cform-row">
        {field("name", "Nom")}
        {field("email", "Email", "email")}
      </div>
      {field("subject", "Sujet / projet")}
      <label className={"cfield" + (errors.message ? " err" : "")}>
        <span className="cfield-label">Message</span>
        <textarea className="cfield-input cfield-area" rows={5} value={f.message} onChange={set("message")}
          placeholder="Parlez-nous de votre projet, votre moment, vos objectifs…" />
        {errors.message && <span className="cfield-err" role="alert">{errors.message}</span>}
      </label>
      <div className="cform-foot">
        <button type="submit" className="btn btn-primary cform-btn" disabled={status === "sending"}>
          {status === "sending" ? "Envoi…" : "Envoyer le message"} <Arrow />
        </button>
        <span className="dim cform-note">Réponse sous 48&nbsp;h · Marseille / Paris</span>
      </div>
    </form>
  );
}

function Contact() {
  const D = ARKT;
  return (
    <section id="contact" className="contact">
      <div className="contact-grad" />
      <div className="contact-grain" aria-hidden="true" />
      <div className="wrap contact-in">
        <div className="contact-layout">
          <Reveal className="contact-card">
            <p className="eyebrow"><span className="dot" />Contact</p>
            <h2 className="display contact-title">
              Parlons de <span className="grad-text">votre projet.</span>
            </h2>
            <p className="contact-sub">
              <span className="dim">Un projet proche des nôtres&nbsp;?</span> Une idée à mettre en trajectoire&nbsp;? Parlez-nous en, on répond vite.
            </p>
            <div className="contact-channels">
              <a href={"mailto:" + D.email} className="contact-channel alink">
                {D.email} <Arrow size={13} />
              </a>
              <a href="https://www.linkedin.com/company/arkt-conseil" target="_blank" rel="noopener" className="contact-channel alink">
                LinkedIn <Arrow size={13} />
              </a>
            </div>
            <div className="contact-meta">
              <span>Marseille</span><span className="contact-sep" /><span>Paris</span><span className="contact-sep" /><span className="dim">Réponse sous 48 h</span>
            </div>
          </Reveal>
          <Reveal className="contact-form-wrap" delay={120}>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function Footer() {
  const D = ARKT;
  return (
    <footer className="foot">
      <div className="wrap foot-in">
        <div className="foot-brand">
          <Logo h={52} />
          <p className="foot-tag dim">L'arc narratif appliqué au marketing.<br />Cabinet de conseil en stratégie de marque · Marseille / Paris.</p>
        </div>
        <nav className="foot-nav" aria-label="Pied de page">
          {D.nav.map((n) => (<a key={n.id} href={"#" + n.id} onClick={(e) => { e.preventDefault(); scrollToId(n.id); }}>{n.label}</a>))}
        </nav>
        <div className="foot-contact">
          <a className="foot-mail alink" href="#contact" onClick={(e) => { e.preventDefault(); scrollToId("contact"); }}>Démarrer un projet <Arrow /></a>
          <div className="foot-social">
            <a href="https://www.linkedin.com/company/arkt-conseil" target="_blank" rel="noopener">LinkedIn</a>
            <a href="https://www.instagram.com/arkt.conseil" target="_blank" rel="noopener">Instagram</a>
          </div>
        </div>
      </div>
      <div className="wrap foot-bottom">
        <span className="dim mono">© {new Date().getFullYear()} ARKT · Tous droits réservés</span>
        <span className="dim mono">Mentions légales · Confidentialité</span>
      </div>
    </footer>
  );
}

export { Offre, Testimonials, Team, Contact, Footer };
