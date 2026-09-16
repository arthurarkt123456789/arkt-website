/* ARKT — Projets : grille unifiée + détail 30/70 */

/* Adapte les deux formats de données (featured/grid) en format commun */
function normalizeProject(p) {
  if (p.photos) return p;
  const photos = p.panels
    .filter(x => x.kind === "media" && x.src)
    .map(x => x.src);
  return {
    id: p.id, name: p.name, year: p.year,
    short: p.tag,
    logo: photos[0] || null,
    photos,
    tags: [],
    body: p.claim,
  };
}

/* ---------- Détail projet : 30% info fixe + 70% slider immersif ---------- */
function ProjectDetail({ proj, onClose }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const sliderRef = useRef(null);
  const photos = proj.photos || [];
  const n = photos.length;

  useEffect(() => { setIdx(0); }, [proj.id]);

  /* animation d'ouverture */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  /* navigation clavier */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight") setIdx(i => Math.min(n - 1, i + 1));
      if (e.key === "ArrowLeft")  setIdx(i => Math.max(0, i - 1));
      if (e.key === "Escape")     onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [n, onClose]);

  /* swipe / drag sur le slider */
  useEffect(() => {
    const el = sliderRef.current;
    if (!el || n <= 1) return;
    let sx = 0, active = false;
    const start = (e) => { sx = e.touches ? e.touches[0].clientX : e.clientX; active = true; };
    const end = (e) => {
      if (!active) return;
      active = false;
      const ex = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const dx = sx - ex;
      if (Math.abs(dx) > 40) {
        if (dx > 0) setIdx(i => Math.min(n - 1, i + 1));
        else         setIdx(i => Math.max(0, i - 1));
      }
    };
    el.addEventListener("pointerdown", start);
    el.addEventListener("pointerup", end);
    return () => { el.removeEventListener("pointerdown", start); el.removeEventListener("pointerup", end); };
  }, [n]);

  return (
    <div className="pdetail" style={{ maxHeight: visible ? "1200px" : "0" }}>
      <div className="pdetail-in">

        {/* ─── gauche 30% : informations ─── */}
        <div className="pinfo">
          {proj.logo && (
            <img src={proj.logo} alt={proj.name} className="pinfo-logo" />
          )}
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
          <div className="pinfo-foot">
            {n > 1 && (
              <div className="pinfo-dots">
                {photos.map((_, i) => (
                  <button key={i}
                    className={"pd-dot" + (i === idx ? " on" : "")}
                    onClick={() => setIdx(i)}
                    aria-label={"Photo " + (i + 1)} />
                ))}
              </div>
            )}
            <button className="pdetail-close" onClick={onClose}>
              Fermer <span>×</span>
            </button>
          </div>
        </div>

        {/* ─── droite 70% : slider immersif ─── */}
        <div className="pslider" ref={sliderRef}>
          {n > 0 ? (
            <div className="pslider-track"
              style={{ transform: "translateX(" + (-idx * 100) + "%)" }}>
              {photos.map((src, i) => (
                <div key={i} className="pslide">
                  <img src={src} alt={proj.name + " · " + (i + 1)}
                    loading={i === 0 ? "eager" : "lazy"} />
                </div>
              ))}
            </div>
          ) : (
            <Placeholder ratio="4/3" label="VISUELS" style={{ height: "100%", borderRadius: 0 }} />
          )}
          {n > 1 && (
            <div className="pslider-nav">
              <button className="pcarr pcarr-inv"
                onClick={() => setIdx(i => Math.max(0, i - 1))}
                disabled={idx === 0} aria-label="Précédent">
                <Arrow size={14} style={{ transform: "rotate(180deg)" }} />
              </button>
              <span className="mono pslider-count">{idx + 1} / {n}</span>
              <button className="pcarr pcarr-inv"
                onClick={() => setIdx(i => Math.min(n - 1, i + 1))}
                disabled={idx === n - 1} aria-label="Suivant">
                <Arrow size={14} />
              </button>
            </div>
          )}
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

Object.assign(window, { GridProjects, ProjectDetail, Projects });
