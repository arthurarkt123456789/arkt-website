/* ARKT — helpers + sections hautes (header, hero, preuve sociale, votre moment) */
const { useState, useEffect, useRef, useCallback } = React;

/* ---------------- shared helpers ---------------- */
function Reveal({ as = "div", delay = 0, className = "", style = {}, children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el) return;
    if (document.documentElement.getAttribute("data-motion") === "0") { setShown(true); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io.unobserve(el); } }),
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  const Tag = as;
  return <Tag ref={ref} className={"reveal " + (shown ? "in " : "") + className} style={{ "--rd": delay + "ms", ...style }} {...rest}>{children}</Tag>;
}

function Arrow({ size = 16, style }) {
  return (
    <svg className="arr" width={size} height={size} viewBox="0 0 16 16" fill="none" style={style} aria-hidden="true">
      <path d="M4 12L12 4M12 4H5.5M12 4V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Placeholder({ ratio = "4/5", label, style = {}, className = "" }) {
  return (
    <div className={"ph " + className} style={{ aspectRatio: ratio.replace("/", " / "), borderRadius: 12, ...style }}>
      {label && <span className="ph-tag mono">{label}</span>}
    </div>
  );
}

function Logo({ h = 30, withWord = true, color }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 11 }}>
      <img src="arkt/logo-arkt.png" alt="ARKT" style={{ height: h, width: "auto" }} />
      {withWord && (
        <span style={{ fontWeight: 600, letterSpacing: "0.16em", fontSize: h * 0.46, color: color || "inherit" }}>ARKT</span>
      )}
    </span>
  );
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: "smooth" });
}

/* ---------------- TopBar ---------------- */
function TopBar() {
  return (
    <div className="topbar">
      <span className="topbar-dot" />
      Agence de conseil en stratégie de marque&nbsp;&middot;&nbsp;Marseille / Paris
    </div>
  );
}

/* ---------------- Header ---------------- */
function Header() {
  const D = window.ARKT;
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={"hdr" + (solid ? " solid" : "")}>
      <div className="wrap hdr-in">
        <a href="#top" className="hdr-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="ARKT — accueil">
          <img src="arkt/logo-mark.png" alt="" aria-hidden="true" className="hdr-logo-mark" />
          <span className="hdr-wordmark">ARKT</span>
        </a>
        <nav className="hdr-nav" aria-label="Navigation principale">
          {D.nav.map((n) => (
            <a key={n.id} href={"#" + n.id} onClick={(e) => { e.preventDefault(); scrollToId(n.id); }}>{n.label}</a>
          ))}
        </nav>
        <div className="hdr-right">
          <a className="btn btn-primary hdr-cta" href="#contact" onClick={(e) => { e.preventDefault(); scrollToId("contact"); }}>Échanger <Arrow /></a>
          <button className="hdr-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span style={{ transform: open ? "translateY(4px) rotate(45deg)" : "none" }} />
            <span style={{ opacity: open ? 0 : 1 }} />
            <span style={{ transform: open ? "translateY(-4px) rotate(-45deg)" : "none" }} />
          </button>
        </div>
      </div>
      <div className={"hdr-mobile" + (open ? " open" : "")}>
        {D.nav.map((n) => (
          <a key={n.id} href={"#" + n.id} onClick={(e) => { e.preventDefault(); setOpen(false); scrollToId(n.id); }}>{n.label}</a>
        ))}
        <a className="btn btn-primary" style={{ marginTop: 12 }} href="#contact" onClick={(e) => { e.preventDefault(); setOpen(false); scrollToId("contact"); }}>Nous écrire <Arrow /></a>
      </div>
    </header>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  return (
    <section id="top" className="hero">
      <div className="hero-halo-tl halo" />
      <div className="hero-halo-br halo" />

      <div className="wrap hero-center">
        <p className="hero-eyebrow">Agence de marque · Marseille / Paris</p>
        <h1 className="hero-t1 display">De l'idée</h1>
        <p className="hero-t2 display" style={{ color: "var(--accent)" }}>à l'impact.</p>
        <div className="hero-cta">
          <button className="btn btn-primary" onClick={() => scrollToId("projets")}>Voir nos projets <Arrow /></button>
          <a className="btn btn-ghost" href="#contact" onClick={(e) => { e.preventDefault(); scrollToId("contact"); }}>Nous écrire</a>
        </div>
        <button className="hero-scroll" onClick={() => scrollToId("clients")} aria-label="Défiler">
          <span className="mono">SCROLLEZ</span>
          <svg width="14" height="22" viewBox="0 0 14 22" fill="none"><path d="M7 1V20M7 20L1 14M7 20L13 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </section>
  );
}

/* ---------------- Preuve sociale ---------------- */
function SocialProof() {
  const D = window.ARKT;
  const row = [...D.clients, ...D.clients];
  return (
    <section id="clients" className="proof">
      <div className="wrap">
        <p className="proof-label eyebrow reveal"><span className="dot" />Ils nous ont fait confiance</p>
      </div>
      <div className="proof-marquee" aria-hidden="false">
        <div className="proof-track">
          {row.map((c, i) => (<span key={i} className="proof-logo">{c}</span>))}
        </div>
      </div>
      <div className="wrap"><hr className="rule" style={{ marginTop: "clamp(48px,7vh,90px)" }} /></div>
    </section>
  );
}

/* ---------------- Votre moment ---------------- */
function Moment() {
  const D = window.ARKT;
  const [active, setActive] = useState(null);
  return (
    <section className="section-pad moment">
      <div className="wrap">
        <Reveal className="moment-head">
          <p className="eyebrow"><span className="dot" />Votre moment</p>
          <h2 className="display moment-title">
            Où en êtes-vous, <span className="dim">là, maintenant&nbsp;?</span>
          </h2>
        </Reveal>
        <div className="moment-grid">
          {D.moments.map((m, i) => (
            <Reveal key={m.k} delay={i * 90} className="moment-card" as="article"
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
              style={active === i ? { borderColor: "rgba(255,69,51,0.4)" } : {}}>
              <span className="moment-k mono">{m.k}</span>
              <h3 className="moment-card-t">{m.t}</h3>
              <p className="moment-card-d dim">{m.d}</p>
              <span className="moment-arr"><Arrow size={18} /></span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Reveal, Arrow, Placeholder, Logo, scrollToId, TopBar, Header, Hero, SocialProof, Moment });
