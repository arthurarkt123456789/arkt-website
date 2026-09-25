/* ARKT — application racine + Tweaks */
import React, { useEffect } from 'react';
import { Header, Hero, ReadingProgress } from './sections-top.jsx';
import { Testimonials, Offre, Team, Contact, Footer } from './sections-bottom.jsx';
import { Projects } from './sections-projects.jsx';
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakSlider } from './tweaks-panel.jsx';

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#F2533F",
  "halo": 1,
  "displayScale": 1,
  "lightSections": true,
  "motion": 4
}/*EDITMODE-END*/;

const ACCENTS = ["#F2533F", "#FF6A00", "#E8482E", "#D8452B"];

function applyGlobals(t) {
  const root = document.documentElement;
  const accent = t.accent || "#FF4533";
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-2", shade(accent, 0.22));
  root.style.setProperty("--accent-3", shade(accent, -0.20));
  root.style.setProperty("--halo", String(t.halo));
  root.style.setProperty("--ds", String(t.displayScale));
  root.setAttribute("data-motion", String(t.motion));
  root.setAttribute("data-light", t.lightSections ? "1" : "0");
}

/* lighten(+)/darken(-) a hex in a perceptual-ish way */
function shade(hex, amt) {
  const h = hex.replace("#", "");
  let r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= (1 + amt); g *= (1 + amt); b *= (1 + amt); }
  const c = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => { applyGlobals(t); }, [t.accent, t.halo, t.displayScale, t.motion, t.lightSections]);
  if (typeof window !== "undefined" && !window.__arktInit) { window.__arktInit = true; applyGlobals(t); }

  return (
    <React.Fragment>
      <a href="#main-content" className="skip-link">Aller au contenu</a>
      <Header />
      <ReadingProgress />
      <main id="main-content">
        <Hero />
        <Testimonials />
        <Offre />
        <Projects />
        <Team />
        <Contact />
      </main>
      <Footer />

      <TweaksPanel>
        <TweakSection label="Atmosphère" />
        <TweakColor label="Accent corail" value={t.accent} options={ACCENTS}
          onChange={(v) => setTweak("accent", v)} />
        <TweakSlider label="Intensité des dégradés" value={t.halo} min={0} max={1.4} step={0.1}
          onChange={(v) => setTweak("halo", v)} />

        <TweakSection label="Typographie & motion" />
        <TweakSlider label="Échelle des titres" value={t.displayScale} min={0.82} max={1.18} step={0.02} unit="×"
          onChange={(v) => setTweak("displayScale", v)} />
        <TweakSlider label="Intensité du motion" value={t.motion} min={0} max={10} step={1}
          onChange={(v) => setTweak("motion", v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

export default App;
