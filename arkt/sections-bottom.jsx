/* ARKT — sections basses : approche, offre, témoignages, équipe, contact, footer */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Reveal, Arrow, Placeholder, SectionKicker, Logo, scrollToId } from './sections-top.jsx';
import ARKT from './data.js';

/* ---------------- Parcours (timeline Arthur) ---------------- */
function Parcours() {
  const D = ARKT;
  return (
    <section id="parcours" className="section-pad parcours">
      <div className="wrap">
        <Reveal className="parcours-head">
          <SectionKicker num="II" label="PARCOURS" />
          <h2 className="display parcours-title">
            Terrain réel, <span className="dim">avant le conseil.</span>
          </h2>
          <p className="parcours-lead dim">
            Chaque mission s'appuie sur une expérience opérationnelle directe : directions marketing dans des marques à forte croissance, puis co-fondation d'une enseigne retail.
          </p>
        </Reveal>
        <div className="parcours-steps">
          <div className="parcours-line" aria-hidden="true" />
          {D.parcours.map((s, i) => (
            <Reveal key={s.co} delay={i * 90} className="parcours-step" as="article">
              <span className="parcours-dot" aria-hidden="true" />
              <p className="parcours-year mono">{s.year}</p>
              <h3 className="parcours-co">{s.co}</h3>
              <p className="parcours-role mono dim">{s.role}</p>
              <p className="parcours-desc dim">{s.desc}</p>
            </Reveal>
          ))}
        </div>
        {D.prises.length > 0 && (
          <div className="parcours-prises">{/* TODO: grid prises de parole */}</div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Approche (fond sombre) ---------------- */
function Approche() {
  const D = ARKT;
  return (
    <section id="approche" className="section-pad approche">
      <div className="wrap">
        <Reveal className="appr-head">
          <SectionKicker num="III" label="APPROCHE" />
          <p className="eyebrow"><span className="dot" />Approche</p>
          <h2 className="display appr-title">
            Ce qui change tout, <span className="dim">c'est la clarté avant l'action.</span>
          </h2>
          <p className="appr-lead dim">
            Beaucoup d'agences passent directement à l'exécution. Nous commençons toujours par comprendre votre marché, vos vraies contraintes et ce qui vous rend différent — avant de proposer quoi que ce soit.
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
          <SectionKicker num="IV" label="OFFRE" />
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
function TestiCard({ t }) {
  return (
    <article className="testi-card">
      <blockquote className="testi-card-q">{t.quote}</blockquote>
      <div className="testi-card-author">
        <div className="testi-card-avatar">
          {t.img
            ? <img src={t.img} alt={t.name} loading="lazy" />
            : <span className="testi-card-ph">{t.name.split(" ").map(w => w[0]).join("")}</span>
          }
        </div>
        <div>
          <div className="testi-card-name">{t.name}</div>
          <div className="testi-card-role dim">{t.role}</div>
        </div>
      </div>
    </article>
  );
}

function Testimonials() {
  const D = ARKT;
  const [idx, setIdx] = useState(0);
  const go = (d) => setIdx(p => (p + d + D.testimonials.length) % D.testimonials.length);

  return (
    <section className="section-pad testi">
      <div className="testi-halo halo" />
      <div className="wrap">

        <Reveal className="testi-head">
          <SectionKicker num="I" label="MANIFESTE" />
          <p className="eyebrow testi-eyebrow"><span className="dot" />Témoignages</p>
          <h2 className="testi-bigtitle display">Ce que nos clients disent.</h2>
        </Reveal>

        {/* Desktop : grille statique 2 × 2 */}
        <div className="testi-grid" aria-label="Témoignages clients">
          {D.testimonials.map((t, i) => (
            <Reveal key={i} delay={i * 60}><TestiCard t={t} /></Reveal>
          ))}
        </div>

        {/* Mobile : carousel */}
        <div className="testi-carousel" aria-live="polite">
          <TestiCard t={D.testimonials[idx]} />
          <div className="testi-carousel-nav">
            <button className="pcarr" onClick={() => go(-1)} aria-label="Précédent">
              <Arrow size={14} style={{ transform: "rotate(180deg)" }} />
            </button>
            <span className="testi-carousel-count mono dim">{idx + 1} / {D.testimonials.length}</span>
            <button className="pcarr" onClick={() => go(1)} aria-label="Suivant">
              <Arrow size={14} />
            </button>
          </div>
        </div>

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
          <SectionKicker num="VI" label="ÉQUIPE" />
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
            <SectionKicker num="VII" label="CONTACT" />
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

export { Parcours, Approche, Offre, Testimonials, Team, Contact, Footer };
