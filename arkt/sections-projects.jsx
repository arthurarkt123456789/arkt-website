/* ARKT — Projets : grille unifiée + détail 30/70 (rail continu) */

/* Normalise les deux formats (featured/grid) en format commun avec slides */
/* Intercale les 4 cartes du récit (Clarifier / Piloter / Activer / Résultat)
   entre les médias : média, carte, média, carte, média, carte, médias restants, résultat. */
function weaveStory(media, story, resultSlide) {
  const cards = [
    { kind: "text", story: true, head: "Clarifier", body: story.clarifier },
    { kind: "text", story: true, head: "Piloter", body: story.piloter },
    { kind: "text", story: true, head: "Activer", body: story.activer },
  ];
  const out = [];
  media.forEach((m, i) => { out.push(m); if (i < cards.length) out.push(cards[i]); });
  cards.slice(media.length).forEach(c => out.push(c));
  out.push(resultSlide
    ? { ...resultSlide, line: story.resultat }
    : { kind: "text", story: true, head: "Résultat", body: story.resultat });
  return out;
}

/* Offres prises par le client : champ `offres` explicite dans data.js,
   sinon les trois dès qu'un récit complet existe. */
const OFFRES_ALL = ["Clarifier", "Piloter", "Activer"];
function offresOf(p) {
  if (Array.isArray(p.offres)) return p.offres;
  return p.story ? OFFRES_ALL : [];
}

function normalizeProject(p) {
  if (p.photos) {
    /* une entrée de photos est soit un chemin d'image, soit { video, poster } */
    const media = p.photos.map(x => (typeof x === "string"
      ? { kind: "media", src: x }
      : { kind: "video", src: x.video, poster: x.poster }));
    let slides;
    if (p.story) slides = weaveStory(media, p.story, null);
    else if (p.accroche && p.body) {
      /* sans récit : la colonne affiche l'accroche, la description complète devient
         une carte dans le rail, après le 1er média */
      const card = { kind: "text", story: true, head: "Ce qu'on a fait", body: p.body };
      slides = media.length ? [media[0], card, ...media.slice(1)] : [card];
    } else slides = media;
    return { ...p, offres: offresOf(p), slides, body: p.accroche || p.body };
  }
  /* featured : panels sans l'intro deviennent les slides ;
     si un récit existe, il remplace les cartes texte d'origine */
  let slides = p.panels.filter(x => x.kind !== "intro");
  if (p.story) {
    const media = slides.filter(x => x.kind === "media");
    const result = slides.find(x => x.kind === "result") || null;
    slides = weaveStory(media, p.story, result);
  }
  const firstImg = slides.find(x => x.kind === "media" && x.src);
  return {
    id: p.id, name: p.name, year: p.year,
    short: p.tag,
    logo: firstImg ? firstImg.src : null,
    photos: slides.filter(x => x.kind === "media" && x.src).map(x => x.src),
    tags: [],
    body: p.claim,
    offres: offresOf(p),
    slides,
  };
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
      <div className="pslide pslide-video">
        <div className="iphone-frame">
          <video src={s.src} poster={s.poster} autoPlay muted loop playsInline preload="auto" draggable="false" />
        </div>
      </div>
    );
  }
  if (s.kind === "text") {
    return (
      <div className={"pslide pslide-text" + (s.story ? " pslide-story" : "")}>
        <p className="eyebrow pslide-head">{s.head}</p>
        <p className="pslide-body">{s.body}</p>
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
  return null;
}

/* ---------- Détail projet : 30% info + 70% rail continu ---------- */
function ProjectDetail({ proj, onClose }) {
  const [visible, setVisible] = useState(false);
  const [prog, setProg] = useState(0);
  const railRef = useRef(null);
  const slides = proj.slides || [];

  /* animation d'ouverture */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  /* suivi de la progression du scroll */
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setProg(max > 0 ? el.scrollLeft / max : 0);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    return () => el.removeEventListener("scroll", update);
  }, [visible]);

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
      if (e.key === "Escape")     onClose();
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
    <div className="pdetail" style={{ maxHeight: visible ? "1200px" : "0" }}>
      <div className="pdetail-in">

        {/* ─── gauche 30% : informations ─── */}
        <div className="pinfo">
          <div className="pinfo-scroll">
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
          <p className="pinfo-body">{proj.body}</p>
          </div>
          {proj.offres && proj.offres.length > 0 && (
            <ol className="pinfo-offres">
              {proj.offres.map((o, i) => (
                <li key={o}><span className="mono">{String(i + 1).padStart(2, "0")}</span>{o}</li>
              ))}
            </ol>
          )}
          <div className="pinfo-foot">
            <div className="pinfo-progress">
              <span style={{ transform: "scaleX(" + Math.max(0.04, prog) + ")" }} />
            </div>
            <div className="pinfo-nav">
              <button className="pcarr" onClick={() => scroll(-1)}
                disabled={prog <= 0.01} aria-label="Précédent">
                <Arrow size={14} style={{ transform: "rotate(180deg)" }} />
              </button>
              <button className="pcarr" onClick={() => scroll(1)}
                disabled={prog >= 0.99} aria-label="Suivant">
                <Arrow size={14} />
              </button>
            </div>
            <button className="pdetail-close" onClick={onClose}>Fermer <span>×</span></button>
          </div>
        </div>

        {/* ─── droite 70% : rail continu ─── */}
        <div className="pslider no-bar" ref={railRef}>
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

/* ---------- Grille unifiée ---------- */
function GridProjects() {
  const D = window.ARKT;
  const allProjects = [...D.featured, ...D.grid].map(normalizeProject);
  const [openId, setOpenId] = useState(null);
  const [cols, setCols] = useState(3);
  const gridRef = useRef(null);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setCols(w < 680 ? 2 : w < 1040 ? 3 : 4);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const handleOpen = (id) => {
    const next = id === openId ? null : id;
    setOpenId(next);
    if (next) {
      setTimeout(() => {
        const el = gridRef.current && gridRef.current.querySelector(".pdetail");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 150);
    }
  };

  const openIdx = openId == null ? -1 : allProjects.findIndex(g => g.id === openId);
  let insertAfter = -1;
  if (openIdx >= 0) {
    const rowEnd = (Math.floor(openIdx / cols) + 1) * cols - 1;
    insertAfter = Math.min(rowEnd, allProjects.length - 1);
  }
  const openProj = openIdx >= 0 ? allProjects[openIdx] : null;

  return (
    <div className="pgrid" style={{ "--cols": cols }} ref={gridRef}>
      {allProjects.map((g, i) => {
        const isOpen = g.id === openId;
        return (
          <React.Fragment key={g.id}>
            <Reveal as="button" delay={(i % cols) * 60}
              className={"ptile" + (isOpen ? " active" : "")}
              onClick={() => handleOpen(g.id)} aria-expanded={isOpen}>
              {g.logo
                ? <img src={g.logo} alt={g.name} loading="lazy" className="ptile-media ptile-media-img" />
                : <Placeholder ratio="1/1" label="VISUEL" className="ptile-media" />
              }
              <div className="ptile-foot">
                <div className="ptile-name">{g.name}</div>
                <div className="ptile-year mono">{g.year}</div>
              </div>
              <span className="ptile-plus" aria-hidden="true"><i /><i /></span>
            </Reveal>
            {insertAfter === i && openProj && (
              <ProjectDetail key={"d-" + openProj.id}
                proj={openProj} onClose={() => setOpenId(null)} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ---------- Section Projets ---------- */
function Projects() {
  const D = window.ARKT;
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

Object.assign(window, { Slide, GridProjects, ProjectDetail, Projects });
