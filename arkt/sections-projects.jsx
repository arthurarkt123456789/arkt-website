/* ARKT — Projets : coups de cœur (3 mécaniques) + grille accordéon */

/* ---------- rendu d'un panneau de coup de cœur ---------- */
function Panel({ p }) {
  if (p.kind === "intro") {
    return (
      <div className="panel panel-intro">
        <div className="panel-halo halo" />
        <p className="eyebrow"><span className="dot" />{p.label}</p>
        <h3 className="panel-intro-title display">{p.title}</h3>
        <p className="panel-intro-sub dim">{p.sub}</p>
      </div>
    );
  }
  if (p.kind === "text") {
    return (
      <div className="panel panel-text">
        <p className="eyebrow">{p.head}</p>
        <p className="panel-body">{p.body}</p>
      </div>
    );
  }
  if (p.kind === "media") {
    return (
      <div className="panel panel-media">
        {p.src
          ? <img src={p.src} alt={p.caption} loading="lazy"
              style={{ width: "100%", flex: 1, minHeight: 0, objectFit: "cover", display: "block", borderRadius: 12 }} />
          : <Placeholder ratio={p.phr} label={"VISUEL · " + (p.phr).replace("/", ":")} className="panel-media-ph" />
        }
      </div>
    );
  }
  if (p.kind === "result") {
    return (
      <div className="panel panel-result">
        <div className="panel-halo halo" />
        <p className="eyebrow">Résultat</p>
        <div className="panel-metric">
          <span className="grad-text">{p.metric}</span>
          <span className="panel-unit">{p.unit}</span>
        </div>
        <p className="panel-result-line">{p.line}</p>
      </div>
    );
  }
  if (p.kind === "list") {
    return (
      <div className="panel panel-list">
        <p className="eyebrow">{p.head}</p>
        <ul className="panel-list-ul">
          {p.items.map((item, i) => (
            <li key={i} className="panel-list-li">{item}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (p.kind === "proofs") {
    return (
      <div className="panel panel-proofs">
        <p className="eyebrow">En chiffres</p>
        <div className="proofs-list">
          {p.items.map((item, i) => (
            <div key={i} className="proof-item">
              <span className="proof-item-metric grad-text">{item.metric}</span>
              <span className="proof-item-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (p.kind === "gallery") {
    return (
      <div className="panel panel-gallery">
        <p className="eyebrow">Galerie</p>
        <div className="gallery-grid">
          {p.srcs.map((src, i) => (
            <img key={i} src={src} alt={"Photo " + (i + 1)} loading="lazy" />
          ))}
        </div>
      </div>
    );
  }
  return null;
}

/* ---------- un coup de cœur (3 mécaniques) ---------- */
function FeaturedCase({ data, idx, mechanic }) {
  const stripRef = useRef(null);
  const railRef = useRef(null);
  const pinWrapRef = useRef(null);
  const [prog, setProg] = useState(0);
  const [step, setStep] = useState(0);
  // drop the intro panel — its title is already shown in the head above
  const panels = data.panels.filter((p) => p.kind !== "intro");
  const n = panels.length;

  /* RAIL — progress + drag */
  useEffect(() => {
    if (mechanic !== "rail") return;
    const el = railRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      setProg(max > 0 ? el.scrollLeft / max : 0);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    let down = false, sx = 0, sl = 0, moved = false;
    const md = (e) => { down = true; moved = false; sx = e.clientX; sl = el.scrollLeft; el.classList.add("grabbing"); };
    const mm = (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; el.scrollLeft = sl - dx; };
    const up = () => { down = false; el.classList.remove("grabbing"); };
    const click = (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } };
    el.addEventListener("pointerdown", md);
    window.addEventListener("pointermove", mm);
    window.addEventListener("pointerup", up);
    el.addEventListener("click", click, true);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", md);
      window.removeEventListener("pointermove", mm);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("click", click, true);
    };
  }, [mechanic]);

  /* PINNED — vertical scroll → horizontal translate */
  useEffect(() => {
    if (mechanic !== "pinned") return;
    const wrap = pinWrapRef.current;
    const strip = stripRef.current;
    if (!wrap || !strip) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = wrap.getBoundingClientRect();
        const total = wrap.offsetHeight - window.innerHeight;
        const p = Math.min(1, Math.max(0, -rect.top / (total || 1)));
        setProg(p);
        const dist = strip.scrollWidth - strip.parentElement.clientWidth;
        strip.style.transform = "translate3d(" + (-p * dist) + "px,0,0)";
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [mechanic]);

  const railScroll = (dir) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 560), behavior: "smooth" });
  };

  const head = (
    <div className="feat-head">
      <div className="feat-head-l">
        <span className="feat-num mono">COUP DE CŒUR · 0{idx + 1}</span>
        <h3 className="feat-name display">{data.name}</h3>
        <div className="feat-meta">
          <span className="feat-year">{data.year}</span>
          <span className="feat-dotsep" />
          <span className="dim">{data.tag}</span>
        </div>
      </div>
      <p className="feat-claim">{data.claim}</p>
    </div>
  );

  /* ----- RAIL ----- */
  if (mechanic === "rail") {
    return (
      <Reveal className="feat" as="article">
        {head}
        <div className="feat-rail-wrap">
          <div className="feat-rail no-bar" ref={railRef}>
            {panels.map((p, i) => (<Panel key={i} p={p} />))}
            <div className="feat-railpad" />
          </div>
        </div>
        <div className="feat-controls">
          <div className="feat-progress"><span style={{ transform: "scaleX(" + Math.max(0.06, prog) + ")" }} /></div>
          <div className="feat-nav">
            <button onClick={() => railScroll(-1)} aria-label="Précédent" disabled={prog <= 0.01}><Arrow size={16} style={{ transform: "rotate(180deg)" }} /></button>
            <button onClick={() => railScroll(1)} aria-label="Suivant" disabled={prog >= 0.99}><Arrow size={16} /></button>
          </div>
        </div>
      </Reveal>
    );
  }

  /* ----- STEPS ----- */
  if (mechanic === "steps") {
    return (
      <Reveal className="feat feat--steps" as="article">
        {head}
        <div className="steps-stage">
          <div className="steps-track" style={{ transform: "translateX(" + (-step * 100) + "%)" }}>
            {panels.map((p, i) => (
              <div className="steps-cell" key={i} aria-hidden={i !== step}><Panel p={p} /></div>
            ))}
          </div>
        </div>
        <div className="feat-controls">
          <div className="steps-dots">
            {panels.map((_, i) => (
              <button key={i} className={"dot-btn" + (i === step ? " on" : "")} onClick={() => setStep(i)} aria-label={"Panneau " + (i + 1)} />
            ))}
          </div>
          <div className="feat-meta-count mono">{String(step + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</div>
          <div className="feat-nav">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} aria-label="Précédent" disabled={step === 0}><Arrow size={16} style={{ transform: "rotate(180deg)" }} /></button>
            <button onClick={() => setStep((s) => Math.min(n - 1, s + 1))} aria-label="Suivant" disabled={step === n - 1}><Arrow size={16} /></button>
          </div>
        </div>
      </Reveal>
    );
  }

  /* ----- PINNED ----- */
  return (
    <article className="feat feat--pinned" ref={pinWrapRef} style={{ height: "calc(100vh + " + (n * 46) + "vh)" }}>
      <div className="pin-sticky">
        {head}
        <div className="pin-viewport">
          <div className="pin-strip" ref={stripRef}>
            {panels.map((p, i) => (<Panel key={i} p={p} />))}
          </div>
        </div>
        <div className="feat-controls pin-controls">
          <div className="feat-progress"><span style={{ transform: "scaleX(" + Math.max(0.06, prog) + ")" }} /></div>
          <div className="mono dim">Défilez pour explorer →</div>
        </div>
      </div>
    </article>
  );
}

/* ---------- grille accordéon ---------- */
function GridProjects() {
  const D = window.ARKT;
  const [openId, setOpenId] = useState(null);
  const [cols, setCols] = useState(3);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setCols(w < 680 ? 2 : w < 1040 ? 3 : 4);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const openIdx = openId == null ? -1 : D.grid.findIndex((g) => g.id === openId);
  let insertAfter = -1;
  if (openIdx >= 0) {
    const rowEnd = (Math.floor(openIdx / cols) + 1) * cols - 1;
    insertAfter = Math.min(rowEnd, D.grid.length - 1);
  }
  const openProj = openIdx >= 0 ? D.grid[openIdx] : null;

  return (
    <div className="pgrid" style={{ "--cols": cols }}>
      {D.grid.map((g, i) => {
        const isOpen = g.id === openId;
        return (
          <React.Fragment key={g.id}>
            <Reveal as="button" delay={(i % cols) * 70} className={"ptile" + (isOpen ? " active" : "")}
              onClick={() => setOpenId(isOpen ? null : g.id)} aria-expanded={isOpen}>
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
            {insertAfter === i && openProj && <ProjectDetail proj={openProj} onClose={() => setOpenId(null)} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ProjectDetail({ proj, onClose }) {
  const inner = useRef(null);
  const [h, setH] = useState(0);
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = proj.photos || [];
  const nph = photos.length;

  useEffect(() => { setPhotoIdx(0); }, [proj.id]);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const measure = () => {
      const s = getComputedStyle(el);
      const mt = parseFloat(s.marginTop) || 0;
      const mb = parseFloat(s.marginBottom) || 0;
      setH(el.scrollHeight + mt + mb);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [proj, photoIdx]);
  return (
    <div className="pdetail" style={{ maxHeight: h }}>
      <div className="pdetail-in" ref={inner}>
        <div className="pdetail-media">
          {nph > 0 ? (
            <div className="pdetail-carousel">
              <div className="pdetail-carousel-img">
                <img src={photos[photoIdx]} alt={proj.name} loading="lazy" />
              </div>
              {nph > 1 && (
                <div className="pdetail-carousel-nav">
                  <button className="pcarr" onClick={() => setPhotoIdx((i) => Math.max(0, i - 1))} disabled={photoIdx === 0} aria-label="Précédent">
                    <Arrow size={14} style={{ transform: "rotate(180deg)" }} />
                  </button>
                  <span className="mono dim">{photoIdx + 1} / {nph}</span>
                  <button className="pcarr" onClick={() => setPhotoIdx((i) => Math.min(nph - 1, i + 1))} disabled={photoIdx === nph - 1} aria-label="Suivant">
                    <Arrow size={14} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Placeholder ratio="1/1" label="VISUELS" />
          )}
          <div className="pdetail-tags">
            {proj.tags.map((t) => (<span key={t} className="tag">{t}</span>))}
          </div>
        </div>
        <div className="pdetail-body">
          <div className="pdetail-top">
            <h4 className="pdetail-name display">{proj.name}</h4>
            <button className="pdetail-close" onClick={onClose} aria-label="Fermer">Fermer <span>×</span></button>
          </div>
          <div className="pdetail-meta mono dim">{proj.year} · {proj.short}</div>
          <p className="pdetail-text">{proj.body}</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- section projets ---------- */
function Projects({ mechanic }) {
  const D = window.ARKT;
  return (
    <section id="projets" className="section-pad projects">
      <div className="wrap">
        <Reveal className="proj-head">
          <p className="eyebrow"><span className="dot" />Projets</p>
          <h2 className="display proj-title">
            La preuve, <span className="dim">plutôt que les promesses.</span>
          </h2>
        </Reveal>
      </div>
      <div className="wrap feat-stack">
        {D.featured.map((f, i) => (<FeaturedCase key={f.id} data={f} idx={i} mechanic={mechanic} />))}
      </div>
      <div className="wrap">
        <Reveal className="grid-head">
          <h3 className="grid-title">Tous les projets <span className="dim">— {D.grid.length}</span></h3>
          <p className="dim grid-sub">Cliquez une vignette pour déplier le cas.</p>
        </Reveal>
        <GridProjects />
      </div>
    </section>
  );
}

Object.assign(window, { Panel, FeaturedCase, GridProjects, ProjectDetail, Projects });
