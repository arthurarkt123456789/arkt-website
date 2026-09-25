/* ARKT — Projets : grille unifiée + détail 30/70 (rail continu) */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Reveal, Arrow, Placeholder } from './sections-top.jsx';
import ARKT from './data.js';

/* Normalise les deux formats (featured/grid) en format commun avec slides */
function normalizeProject(p) {
  if (p.photos) {
    /* une entrée de photos est soit un chemin d'image, soit { video, poster } */
    return {
      ...p,
      slides: p.photos.map(x => (typeof x === "string"
        ? { kind: "media", src: x }
        : { kind: "video", src: x.video, poster: x.poster, light: x.light })),
    };
  }
  /* featured: panels sans l'intro deviennent les slides */
  const slides = p.panels.filter(x => x.kind !== "intro");
  const firstImg = slides.find(x => x.kind === "media" && x.src);
  return {
    id: p.id, name: p.name, year: p.year,
    short: p.tag,
    logo: p.logo || (firstImg ? firstImg.src : null),
    photos: slides.filter(x => x.kind === "media" && x.src).map(x => x.src),
    tags: [],
    body: p.claim,
    intro: p.intro,
    flushRail: p.flushRail,
    slides,
    ...(p.defaultOpen && { defaultOpen: true }),
    ...(p.alwaysOpen && { alwaysOpen: true }),
  };
}

/* ── Hauteur naturelle d'un bloc flex (somme des enfants, insensible à un
   height:100% hérité qui l'aurait étiré) — utilisé par la règle anti-scroll/
   anti-débordement de la capsule projet ── */
function naturalContentHeight(el) {
  if (!el) return 0;
  const cs = getComputedStyle(el);
  const gap = parseFloat(cs.rowGap || cs.gap) || 0;
  const kids = Array.from(el.children);
  return kids.reduce((sum, k) => sum + k.offsetHeight, 0)
    + gap * Math.max(0, kids.length - 1)
    + parseFloat(cs.paddingTop || 0) + parseFloat(cs.paddingBottom || 0);
}

/* ── `**mot clé**` devient un span en dégradé accent (pitch, headline résultat...) ── */
function renderAccent(text, accentClass) {
  if (!text) return text;
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <span key={i} className={accentClass}>{part}</span> : part
  );
}

/* ── Rendu d'un slide ── */
function Slide({ s, name, idx }) {
  if (s.kind === "media") {
    return (
      <div className="pslide pslide-img">
        {s.src
          ? <img src={s.src} alt={name} loading={idx === 0 ? "eager" : "lazy"} draggable="false" />
          : <Placeholder ratio="4/5" label="VISUEL" style={{ height: "100%", width: "240px" }} />
        }
      </div>
    );
  }
  if (s.kind === "video") {
    return (
      <div className={"pslide pslide-video" + (s.light ? " pslide-video-light" : "")}>
        <div className="iphone-frame">
          <video src={s.src} poster={s.poster} autoPlay muted loop playsInline preload="metadata" draggable="false" />
        </div>
      </div>
    );
  }
  if (s.kind === "text") {
    const bodies = Array.isArray(s.body) ? s.body : s.body ? [s.body] : [];
    return (
      <div className="pslide pslide-text">
        <p className="eyebrow pslide-head">{s.head}</p>
        {bodies.map((b, i) => <p key={i} className="pslide-body">{b}</p>)}
        {s.quote && <blockquote className="pslide-quote">« {s.quote} »</blockquote>}
        {s.list && s.list.length > 0 && (
          <ul className="pslide-list">
            {s.list.map(item => <li key={item}>{item}</li>)}
          </ul>
        )}
      </div>
    );
  }
  if (s.kind === "result") {
    return (
      <div className="pslide pslide-result">
        <p className="eyebrow pslide-head">Résultat</p>
        <div className="pslide-metric">
          <span className="grad-text">{s.metric}</span>
          <span className="pslide-unit">{s.unit}</span>
        </div>
        <p className="pslide-result-line">{s.line}</p>
      </div>
    );
  }
  /* résultat en prose (pas de métrique à afficher) : même famille visuelle que
     .pslide-result (fond teinté accent), mais 1re phrase en gros titre pour
     marquer le point d'arrivée, puis le reste en corps de texte normal */
  if (s.kind === "result-text") {
    const bodies = Array.isArray(s.body) ? s.body : s.body ? [s.body] : [];
    const [headline, ...rest] = bodies;
    return (
      <div className="pslide pslide-result-text">
        <p className="eyebrow pslide-head">{s.head || "Résultat"}</p>
        {headline && <p className="pslide-result-headline">{renderAccent(headline, "pslide-result-accent")}</p>}
        {rest.map((b, i) => <p key={i} className="pslide-body">{b}</p>)}
      </div>
    );
  }
  return null;
}

/* ---------- Détail projet : 30% info + 70% rail continu ---------- */
function ProjectDetail({ proj, onClose }) {
  const railRef = useRef(null);
  const progFillRef = useRef(null);
  const pinfoRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [capsuleH, setCapsuleH] = useState(null);
  const slides = proj.slides || [];

  /* règle : jamais de scroll/coupure ni à gauche ni dans les blocs texte du rail —
     on agrandit la capsule (hauteur seulement) au besoin. On mesure la somme des
     blocs réels de .pinfo ET la hauteur naturelle de chaque bloc texte/résultat du
     rail (ils sont horizontalement scrollables, donc potentiellement hors-écran,
     mais leur hauteur naturelle reste mesurable) plutôt que le scrollHeight des
     conteneurs : ceux-ci peuvent porter une hauteur fixée par un projet précédent
     (même rangée) et fausseraient la mesure d'un projet plus court. */
  useEffect(() => {
    const calc = () => {
      /* sous 1040px, la capsule passe en une seule colonne empilée (CSS responsive,
         hauteur auto) — la mesure/hauteur forcée ne s'applique qu'au format 30/70 large */
      if (window.innerWidth <= 1040) { setCapsuleH(null); return; }
      const floor = Math.min(460, Math.max(340, window.innerHeight * 0.44));
      let content = naturalContentHeight(pinfoRef.current);
      if (railRef.current) {
        railRef.current.querySelectorAll(".pslide-text, .pslide-result, .pslide-result-text").forEach(slide => {
          content = Math.max(content, naturalContentHeight(slide));
        });
      }
      setCapsuleH(Math.max(floor, content));
    };
    calc();
    /* re-mesure une fois la police "Big Shoulders Display" chargée : avant ça, le
       texte du pitch s'affiche dans une police de secours, souvent plus étroite,
       ce qui sous-évalue la hauteur réellement nécessaire une fois la vraie police en place */
    if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(calc);
    }
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [proj.id]);

  /* suivi de la progression — DOM direct pour le fill, setState uniquement aux bornes */
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    let prevStart = true, prevEnd = false;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const p = max > 0 ? el.scrollLeft / max : 0;
      if (progFillRef.current) progFillRef.current.style.transform = `scaleX(${Math.max(0.04, p)})`;
      const nowStart = p <= 0.01, nowEnd = p >= 0.99;
      if (nowStart !== prevStart || nowEnd !== prevEnd) {
        prevStart = nowStart; prevEnd = nowEnd;
        setAtStart(nowStart); setAtEnd(nowEnd);
      }
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    return () => el.removeEventListener("scroll", update);
  }, []);

  /* drag souris */
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    let down = false, sx = 0, sl = 0, moved = false;
    const md = (e) => {
      down = true; moved = false;
      sx = e.clientX; sl = el.scrollLeft;
      el.classList.add("grabbing");
    };
    const mm = (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = sl - dx;
    };
    const mu = () => { down = false; el.classList.remove("grabbing"); };
    const click = (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } };
    el.addEventListener("pointerdown", md);
    window.addEventListener("pointermove", mm);
    window.addEventListener("pointerup", mu);
    el.addEventListener("click", click, true);
    return () => {
      el.removeEventListener("pointerdown", md);
      window.removeEventListener("pointermove", mm);
      window.removeEventListener("pointerup", mu);
      el.removeEventListener("click", click, true);
    };
  }, []);

  /* clavier */
  useEffect(() => {
    const handler = (e) => {
      const el = railRef.current;
      if (!el) return;
      if (e.key === "ArrowRight") el.scrollBy({ left: el.clientWidth * 0.7, behavior: "smooth" });
      if (e.key === "ArrowLeft")  el.scrollBy({ left: -el.clientWidth * 0.7, behavior: "smooth" });
      if (e.key === "Escape" && !proj.alwaysOpen) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const scroll = (dir) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.72, behavior: "smooth" });
  };

  return (
    <div className="pdetail">
      <div className="pdetail-in" style={capsuleH ? { height: capsuleH + "px" } : undefined}>

        {/* ─── gauche 30% : informations ─── */}
        <div className="pinfo" ref={pinfoRef}>
          <div className="pinfo-top">
            {proj.logo && <img src={proj.logo} alt={proj.name} className="pinfo-logo" />}
            <div className="pinfo-header">
              <h4 className="pinfo-name display">{proj.name}</h4>
              <p className="pinfo-meta mono dim">
                {proj.year}{proj.short ? " · " + proj.short : ""}
              </p>
            </div>
            {proj.tags && proj.tags.length > 0 && (
              <div className="pinfo-tags">
                {proj.tags.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            )}
          </div>
          {/* pitch centré verticalement entre le haut (logo/nom) et le bas (nav/fermer) */}
          <div className="pinfo-mid">
            <blockquote className="pinfo-pitch">{renderAccent(proj.body, "pinfo-pitch-accent")}</blockquote>
            {proj.intro && <p className="pinfo-body">{proj.intro}</p>}
          </div>
          <div className="pinfo-foot">
            <div className="pinfo-progress">
              <span ref={progFillRef} />
            </div>
            <div className="pinfo-nav">
              <button className="pcarr" onClick={() => scroll(-1)}
                disabled={atStart} aria-label="Précédent">
                <Arrow size={14} style={{ transform: "rotate(180deg)" }} />
              </button>
              <button className="pcarr" onClick={() => scroll(1)}
                disabled={atEnd} aria-label="Suivant">
                <Arrow size={14} />
              </button>
            </div>
            {!proj.alwaysOpen && (
              <button className="pdetail-close" onClick={onClose}>Fermer <span>×</span></button>
            )}
          </div>
        </div>

        {/* ─── droite 70% : rail continu ─── */}
        <div className={"pslider no-bar" + (proj.flushRail ? " pslider-flush" : "")} ref={railRef}>
          {slides.length > 0
            ? slides.map((s, i) => <Slide key={i} s={s} name={proj.name} idx={i} />)
            : <Placeholder ratio="4/3" label="VISUELS" style={{ height: "100%", width: "100%", borderRadius: 0 }} />
          }
          <div className="pslider-pad" />
        </div>

      </div>
    </div>
  );
}

/* ---------- Grille unifiée — un seul projet ouvert à la fois + URL hash ---------- */
function GridProjects() {
  const D = ARKT;
  const allProjects = [...D.featured, ...D.grid].map(normalizeProject);
  const [openId, setOpenId] = useState(null);
  const [cols, setCols] = useState(3);
  const gridRef = useRef(null);

  const rowOf = useCallback((idx) => Math.floor(idx / cols), [cols]);

  /* colonnes responsive */
  const colsRef = useRef(null);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      const next = w < 680 ? 2 : w < 1040 ? 3 : 4;
      if (colsRef.current === next) return; /* même nombre de colonnes : on ne touche pas au panneau ouvert */
      colsRef.current = next;
      setCols(next);
      /* le nombre de colonnes a changé → les rangées sont redistribuées, on ferme tout
         (évite les décalages), sauf le projet "toujours ouvert" */
      const always = allProjects.find((p) => p.alwaysOpen);
      setOpenId(always ? always.id : null);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  /* URL hash → état initial */
  useEffect(() => {
    const m = window.location.hash.match(/[#&]open=([^&]+)/);
    if (!m) return;
    const id = m[1].split(",").filter(Boolean)[0];
    if (id && allProjects.some((p) => p.id === id)) setOpenId(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* defaultOpen → ouverture automatique au chargement (sauf si hash déjà présent) */
  useEffect(() => {
    if (window.location.hash.match(/[#&]open=([^&]+)/)) return;
    const def = allProjects.find((p) => p.defaultOpen);
    if (def) setOpenId(def.id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* état → URL hash */
  useEffect(() => {
    const hash = openId ? "#open=" + openId : "";
    window.history.replaceState(null, "", hash || window.location.pathname);
  }, [openId]);

  const scrollToPanel = useCallback((rowIdx) => {
    setTimeout(() => {
      const el = gridRef.current && gridRef.current.querySelector('[data-row="' + rowIdx + '"]');
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 220);
  }, []);

  const toggle = useCallback((id) => {
    const proj = allProjects.find((p) => p.id === id);
    if (proj.alwaysOpen && openId === id) return; /* ne peut pas se fermer elle-même */
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    scrollToPanel(rowOf(allProjects.findIndex((p) => p.id === id)));
  }, [allProjects, rowOf, scrollToPanel, openId]);

  /* événement cross-composant (logos marquee) */
  useEffect(() => {
    const handler = ({ detail }) => {
      const id = detail.id;
      const idx = allProjects.findIndex(p => p.id === id);
      if (idx < 0) return;
      setOpenId(id);
      scrollToPanel(rowOf(idx));
    };
    window.addEventListener("arkt:openProject", handler);
    return () => window.removeEventListener("arkt:openProject", handler);
  }, [allProjects, rowOf, scrollToPanel]);

  /* calcul des rangées et points d'insertion */
  const items = [];
  let i = 0;
  while (i < allProjects.length) {
    const rowIdx = rowOf(i);
    const rowItems = [];
    while (i < allProjects.length && rowOf(i) === rowIdx) {
      rowItems.push({ g: allProjects[i], i });
      i++;
    }
    items.push({ rowIdx, rowItems });
  }

  const openProj = openId ? allProjects.find((p) => p.id === openId) : null;
  const openRow = openProj ? rowOf(allProjects.findIndex((p) => p.id === openId)) : -1;

  return (
    <div className="pgrid" style={{ "--cols": cols }} ref={gridRef}>
      {items.map(({ rowIdx, rowItems }) => (
        <React.Fragment key={"row-" + rowIdx}>
          {rowItems.map(({ g, i: idx }) => {
            const isOpen = openId === g.id;
            return (
              <Reveal key={g.id} as="button" delay={(idx % cols) * 60}
                className={"ptile" + (isOpen ? " active" : "")}
                onClick={() => toggle(g.id)} aria-expanded={isOpen}>
                {g.logo
                  ? <img src={g.logo} alt={g.name} loading="lazy" className="ptile-media ptile-media-img" />
                  : <Placeholder ratio="1/1" label="VISUEL" className="ptile-media" />
                }
                <div className="ptile-foot">
                  <div className="ptile-name">{g.name}</div>
                  <div className="ptile-year mono">{g.year}</div>
                </div>
                <span className="ptile-plus" aria-hidden="true"><i /><i /></span>
                {g.body && <span className="visually-hidden">{g.body}</span>}
              </Reveal>
            );
          })}
          {/* panneau toujours dans le DOM pour le SEO, masqué par CSS quand fermé */}
          {(() => {
            const showHere = rowIdx === openRow && openProj;
            return (
              <div key={"panel-" + rowIdx} data-row={rowIdx}
                className={"prow-panel" + (showHere ? " open" : "")}>
                {showHere && (
                  <ProjectDetail proj={openProj} onClose={() => setOpenId(null)} />
                )}
              </div>
            );
          })()}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ---------- Section Projets ---------- */
function Projects() {
  const D = ARKT;
  const total = D.featured.length + D.grid.length;
  return (
    <section id="projets" className="section-pad projects">
      <div className="wrap">
        <Reveal className="proj-head">
          <p className="eyebrow"><span className="dot" />Projets</p>
          <h2 className="display proj-title">
            La preuve, <span className="dim">plutôt que les promesses.</span>
          </h2>
        </Reveal>
        <Reveal className="grid-head">
          <h3 className="grid-title">
            Tous les projets <span className="dim">— {total}</span>
          </h3>
          <p className="dim grid-sub">Cliquez une vignette pour découvrir le cas.</p>
        </Reveal>
        <GridProjects />
      </div>
    </section>
  );
}

export { Slide, GridProjects, ProjectDetail, Projects };
