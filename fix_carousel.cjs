const fs = require('fs');
let html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');

// ─── 1. Extract current story section ────────────────────────────────────────
const secStart = html.indexOf('<section class="story-scroll" id="projet">');
let depth = 0, pos = secStart;
while(pos < html.length){
  if(html.startsWith('<section', pos)) depth++;
  else if(html.startsWith('</section>', pos)){ depth--; if(depth===0){ pos += 10; break; } }
  pos++;
}
const secEnd = pos;
const secContent = html.slice(secStart, secEnd);

// ─── 2. Extract the 3 panel contents (strip outer slide wrapper) ──────────────
function extractPanels(sec){
  const panels = [];
  let s = 0;
  while(true){
    const idx = sec.indexOf('<div class="story-slide', s);
    if(idx === -1) break;
    // Find closing div for this story-slide
    let d = 0, p = idx;
    while(p < sec.length){
      if(sec.startsWith('<div', p)) d++;
      else if(sec.startsWith('</div>', p)){ d--; if(d===0){ p += 6; break; } }
      p++;
    }
    // Extract the inner content (inside the story-slide div, between first > and last </div>)
    const openClose = sec.indexOf('>', idx) + 1;
    const innerContent = sec.slice(openClose, p - 6); // strip outer <div class="story-slide..."> and </div>
    const isClass = sec.slice(idx, sec.indexOf('>', idx) + 1);
    panels.push({ class: isClass, inner: innerContent });
    s = p;
  }
  return panels;
}

const panels = extractPanels(secContent);
console.log('Panels found:', panels.length);

if(panels.length !== 3){ console.error('Expected 3 panels, got', panels.length); process.exit(1); }

// ─── 3. Build new scroll-carousel section ────────────────────────────────────
const newSection = `<section class="story-scroll" id="projet">
  <div class="story-carousel-outer" id="storyOuter">

    <!-- ── PANEL 1 : Le projet ────────────────────────────────────────────── -->
    <div class="story-panel">${panels[0].inner}
    </div>

    <!-- ── PANEL 2 : Portée sociale ──────────────────────────────────────── -->
    <div class="story-panel story-panel--pink">${panels[1].inner}
    </div>

    <!-- ── PANEL 3 : Dispositif de com. ──────────────────────────────────── -->
    <div class="story-panel">${panels[2].inner}
    </div>

  </div>

  <div class="story-nav wrap">
    <button class="story-arr" id="storyPrev" aria-label="Précédent">←</button>
    <div class="story-dots" id="storyDots">
      <span class="active" title="Le projet"></span>
      <span title="Portée sociale"></span>
      <span title="Dispositif de com."></span>
    </div>
    <button class="story-arr" id="storyNext" aria-label="Suivant">→</button>
    <div class="story-labels" aria-hidden="true">
      <span class="story-lbl active">Le projet</span>
      <span class="story-lbl">Portée sociale</span>
      <span class="story-lbl">Dispositif de com.</span>
    </div>
  </div>
</section>`;

html = html.slice(0, secStart) + newSection + html.slice(secEnd);
console.log('3. Section rebuilt as scroll carousel');

// ─── 4. Replace story CSS ─────────────────────────────────────────────────────
const cssStart = html.indexOf('/* ── STORY SCROLL (merged 01/04/08) ─────────────────────────────────────── */');
const cssEnd = html.indexOf('\n/* Inspiration cards */', cssStart);
if(cssStart === -1 || cssEnd === -1){ console.error('CSS markers not found', cssStart, cssEnd); process.exit(1); }

const newCss = `/* ── STORY CAROUSEL ─────────────────────────────────────────────────────── */
.story-scroll{padding-top:0;padding-bottom:0}
.story-carousel-outer{
  display:flex;
  overflow-x:scroll;
  scroll-snap-type:x mandatory;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none;
}
.story-carousel-outer::-webkit-scrollbar{display:none}
.story-panel{
  min-width:100%;
  flex-shrink:0;
  scroll-snap-align:start;
  padding:clamp(60px,8vw,100px) var(--gutter);
  box-sizing:border-box;
}
.story-panel--pink{background:var(--pink)}
.story-2col{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,4vw,60px);align-items:center;margin-top:clamp(36px,4vw,52px)}
.story-nav{display:flex;align-items:center;gap:14px;padding:20px var(--gutter) clamp(48px,7vw,80px)}
.story-arr{background:var(--ink);color:#fff;border:0;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:.95rem;display:grid;place-items:center;transition:opacity .2s;flex-shrink:0}
.story-arr:disabled{opacity:.25;cursor:default}
.story-dots{display:flex;gap:7px;align-items:center}
.story-dots span{width:7px;height:7px;border-radius:50%;background:var(--ink);opacity:.2;transition:opacity .3s,transform .3s;cursor:pointer}
.story-dots span.active{opacity:1;transform:scale(1.3)}
.story-labels{display:flex;gap:0;margin-left:4px;overflow:hidden}
.story-lbl{font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);opacity:0;max-width:0;white-space:nowrap;transition:opacity .3s,max-width .3s}
.story-lbl.active{opacity:1;max-width:200px}
@media(max-width:900px){.story-2col{grid-template-columns:1fr}.mani-img{display:none}}`;

html = html.slice(0, cssStart) + newCss + html.slice(cssEnd);
console.log('4. CSS replaced');

// ─── 5. Replace story JS ─────────────────────────────────────────────────────
const jsStart = html.indexOf('\n// Story slider (merged 01/04/08)');
const jsEnd = html.indexOf('\n})();\n', jsStart) + 7;
if(jsStart === -1 || jsEnd === 6){ console.error('JS not found', jsStart, jsEnd); process.exit(1); }

const newJs = `
// Story carousel — continuous horizontal scroll-snap
(function(){
  var outer = document.getElementById('storyOuter');
  var prev = document.getElementById('storyPrev');
  var next = document.getElementById('storyNext');
  var dots = document.querySelectorAll('#storyDots span');
  var lbls = document.querySelectorAll('.story-lbl');
  var total = 3;

  function getIdx(){
    return Math.round(outer.scrollLeft / outer.clientWidth);
  }
  function updateUI(idx){
    dots.forEach(function(d,i){ d.classList.toggle('active', i===idx); });
    lbls.forEach(function(l,i){ l.classList.toggle('active', i===idx); });
    if(prev) prev.disabled = idx === 0;
    if(next) next.disabled = idx === total - 1;
  }
  function goTo(idx){
    outer.scrollTo({ left: idx * outer.clientWidth, behavior: 'smooth' });
  }

  if(prev) prev.addEventListener('click', function(){ goTo(Math.max(0, getIdx()-1)); });
  if(next) next.addEventListener('click', function(){ goTo(Math.min(total-1, getIdx()+1)); });
  dots.forEach(function(d,i){ d.addEventListener('click', function(){ goTo(i); }); });
  outer.addEventListener('scroll', function(){ updateUI(getIdx()); }, { passive: true });

  updateUI(0);
})();`;

html = html.slice(0, jsStart) + newJs + html.slice(jsEnd);
console.log('5. JS replaced');

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', html, 'utf8');
console.log('Done. Size:', html.length);
