/* ARKT — sections basses : approche, offre, témoignages, équipe, contact, footer */
import React, { useState, useEffect, useRef } from 'react';
import { Reveal, Arrow, Placeholder, Logo, scrollToId } from './sections-top.jsx';
import ARKT from './data.js';

/* ---------------- Approche (section claire) ---------------- */
function Approche() {
  const D = ARKT;
  return (
    <section id="approche" className="section-pad light-section on-light approche">
      <div className="wrap">
        <Reveal className="appr-head">
          <p className="eyebrow"><span className="dot" />Approche</p>
          <h2 className="display appr-title">
            Une méthode en trois temps, <span className="dim">adaptée à chaque contexte.</span>
          </h2>
          <p className="appr-lead dim">
            Chaque mission est adaptée au contexte du client. On part toujours d'une action concrète : un lancement, un repositionnement, une montée en gamme. Jamais d'une théorie abstraite.
          </p>
        </Reveal>
        <div className="appr-steps">
          {D.approche.map((s, i) => (
            <Reveal key={s.k} delay={i * 110} className={"appr-step" + (s.opt ? " live" : "")} as="article">
              <div className="appr-step-top">
                <span className="appr-k">{s.k}</span>
              </div>
              <h3 className="appr-step-t">{s.t}</h3>
              <p className="appr-step-d dim">{s.d}</p>
            </Reveal>
          ))}
          <div className="appr-track" aria-hidden="true"><span /></div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Offre ---------------- */
function OffreDetail({ o, onClose }) {
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
      <div className="offre-detail-head">
        <h4 className="offre-detail-t display">{o.name}</h4>
        <button className="pdetail-close" onClick={onClose} aria-label="Fermer">Fermer <span>×</span></button>
      </div>
      <div className="offre-detail-grid">
        <div className="offre-detail-block">
          <p className="offre-col-k">Vous vous reconnaissez ?</p>
          <ul className="offre-detail-pains">
            {d.pains.map((t) => (<li key={t}>{t}</li>))}
          </ul>
        </div>
        <div className="offre-detail-block">
          <p className="offre-col-k">Ce qu'on fait, concrètement</p>
          <p className="offre-detail-p">{d.faire}</p>
        </div>
        <div className="offre-detail-block">
          <p className="offre-col-k">Ce que ça change pour vous</p>
          <p className="offre-detail-p offre-detail-change">{d.change}</p>
          <a className="btn btn-primary offre-detail-cta" href="#contact" onClick={(e) => { e.preventDefault(); scrollToId("contact"); }}>
            Échanger sur cette offre <Arrow />
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
          {D.offre.map((o, i) => {
            const isOpen = openId === o.id;
            return (
              <Reveal key={o.id} delay={i * 90} as="button" type="button" className={"offre-col" + (isOpen ? " open" : "")}
                onClick={() => setOpenId(isOpen ? null : o.id)} aria-expanded={isOpen}>
                <div className="offre-col-num display">{i + 1}</div>
                <h3 className="offre-col-t">{o.name}</h3>
                <p className="offre-col-sub mono">{o.sub}</p>
                <div className="offre-col-block">
                  <p className="offre-col-k">Quand</p>
                  <p className="offre-col-p">{o.quand}</p>
                </div>
                <div className="offre-col-block">
                  <p className="offre-col-k">Ce que ça comprend</p>
                  <ul className="offre-col-list">
                    {o.contenu.map((c) => (<li key={c}>{c}</li>))}
                  </ul>
                </div>
                <p className="offre-col-fin">{o.fin}</p>
                <span className="offre-col-more alink">{isOpen ? "Fermer" : "En savoir plus"} <Arrow size={14} /></span>
                <span className="ptile-plus offre-col-plus" aria-hidden="true"><i /><i /></span>
              </Reveal>
            );
          })}
        </div>
        {openO && <OffreDetail o={openO} onClose={() => setOpenId(null)} />}
      </div>
    </section>
  );
}

/* ---------------- Témoignages ---------------- */
function highlightQuote(quote, hi) {
  if (!hi || !hi.length) return quote;
  let parts = [quote];
  hi.forEach((h) => {
    const next = [];
    parts.forEach((seg) => {
      if (typeof seg !== "string") { next.push(seg); return; }
      const idx = seg.indexOf(h);
      if (idx === -1) { next.push(seg); return; }
      next.push(seg.slice(0, idx));
      next.push(<em key={h} className="q-hi">{h}</em>);
      next.push(seg.slice(idx + h.length));
    });
    parts = next;
  });
  return parts;
}

function Testimonials() {
  const D = ARKT;
  const [i, setI] = useState(0);
  const t = D.testimonials[i];
  const go = (d) => setI((p) => (p + d + D.testimonials.length) % D.testimonials.length);
  return (
    <section className="section-pad testi">
      <div className="testi-halo halo" />
      <div className="wrap testi-layout">

        {/* Gauche : titre */}
        <Reveal className="testi-left">
          <p className="eyebrow testi-eyebrow"><span className="dot" />Témoignages</p>
          <h2 className="testi-bigtitle display">Ce que<br />nos clients<br />disent.</h2>
        </Reveal>

        {/* Droite : citation */}
        <Reveal className="testi-right">
          <blockquote className="testi-quote" key={i}>{highlightQuote(t.quote, t.hi)}</blockquote>
          <div className="testi-author">
            <div className="testi-avatar">
              {t.img ? <img src={t.img} alt={t.name} loading="lazy" /> : <span className="testi-avatar-ph">{t.name.split(" ").map((w) => w[0]).join("")}</span>}
            </div>
            <div>
              <div className="testi-name">{t.name}</div>
              <div className="testi-role dim">{t.role}</div>
            </div>
          </div>
          <div className="testi-foot">
            <div className="testi-dots">
              {D.testimonials.map((_, k) => (
                <button key={k} className={"dot-btn" + (k === i ? " on" : "")} onClick={() => setI(k)} aria-label={"Témoignage " + (k + 1)} />
              ))}
            </div>
            <div className="feat-nav">
              <button onClick={() => go(-1)} aria-label="Précédent"><Arrow size={16} style={{ transform: "rotate(180deg)" }} /></button>
              <button onClick={() => go(1)} aria-label="Suivant"><Arrow size={16} /></button>
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  );
}

/* ---------------- Équipe ---------------- */
function Team() {
  const D = ARKT;
  const lead = D.team[0];
  const rest = D.team.slice(1);
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
        <div className="team-grid">
          <Reveal className="team-lead-card" as="article">
            <div className="team-lead-photo">
              {lead.img ? <img src={lead.img} alt={lead.name} loading="lazy" /> : <Placeholder ratio="4/5" label="PORTRAIT" />}
            </div>
            <div className="team-lead-info">
              <span className="team-lead-tag mono">FONDATEUR</span>
              <h3 className="team-lead-name display">{lead.name}</h3>
              <div className="team-lead-role">{lead.role}</div>
              <p className="team-lead-bio dim">{lead.bio}</p>
            </div>
          </Reveal>
          <div className="team-rest">
            {rest.map((m, i) => (
              <Reveal key={m.name} delay={i * 70} className="team-card" as="article">
                <div className="team-photo">
                  {m.img ? <img src={m.img} alt={m.name} loading="lazy" /> : <div className="team-photo-ph"><span className="mono">{m.name.split(" ").map((w) => w[0]).join("")}</span></div>}
                </div>
                <h3 className="team-name">{m.name}</h3>
                <div className="team-role dim">{m.role}</div>
                <p className="team-bio dim">{m.bio}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Contact ---------------- */
function ContactForm() {
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); setErrors((p) => ({ ...p, [k]: undefined })); };

  const validate = () => {
    const er = {};
    if (!f.name.trim()) er.name = "Indiquez votre nom.";
    if (!f.email.trim()) er.email = "Indiquez votre email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) er.email = "Email invalide.";
    if (!f.subject.trim()) er.subject = "Précisez le sujet.";
    if (!f.message.trim()) er.message = "Écrivez quelques mots.";
    return er;
  };

  const submit = (e) => {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length === 0) setSent(true);
  };

  if (sent) {
    return (
      <div className="cform cform-done" role="status">
        <span className="cform-check" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 12.5L10 17.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <h3 className="cform-done-t">Message envoyé.</h3>
        <p className="cform-done-d dim">Merci {f.name.split(" ")[0]}, on revient vers vous sous 48&nbsp;h. En attendant, continuez à explorer les projets.</p>
        <button type="button" className="btn btn-ghost" onClick={() => { setSent(false); setF({ name: "", email: "", subject: "", message: "" }); }}>Envoyer un autre message</button>
      </div>
    );
  }

  const field = (k, label, type) => (
    <label className={"cfield" + (errors[k] ? " err" : "")}>
      <span className="cfield-label">{label}</span>
      <input className="cfield-input" type={type || "text"} value={f[k]} onChange={set(k)}
        placeholder={label} autoComplete={k === "name" ? "name" : k === "email" ? "email" : "off"} />
      {errors[k] && <span className="cfield-err">{errors[k]}</span>}
    </label>
  );

  return (
    <form className="cform" onSubmit={submit} noValidate>
      <div className="cform-row">
        {field("name", "Nom")}
        {field("email", "Email", "email")}
      </div>
      {field("subject", "Sujet / projet")}
      <label className={"cfield" + (errors.message ? " err" : "")}>
        <span className="cfield-label">Message</span>
        <textarea className="cfield-input cfield-area" rows={5} value={f.message} onChange={set("message")} placeholder="Parlez-nous de votre projet, votre moment, vos objectifs…" />
        {errors.message && <span className="cfield-err">{errors.message}</span>}
      </label>
      <div className="cform-foot">
        <button type="submit" className="btn btn-primary cform-btn">Envoyer le message <Arrow /></button>
        <span className="dim cform-note">Réponse sous 48&nbsp;h · Marseille / Paris</span>
      </div>
    </form>
  );
}

function Contact() {
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

export { Approche, Offre, Testimonials, Team, Contact, Footer };
