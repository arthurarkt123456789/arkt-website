const fs = require('fs');
let html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');

// ─── 0. Reduce sp-text and sp-bullets width by ~65% ─────────────────────────
const oldSpText = '.sp-text{min-width:clamp(320px,55vw,680px)}';
const newSpText = '.sp-text{min-width:clamp(260px,32vw,420px)}';
if(!html.includes(oldSpText)){ console.error('sp-text CSS not found'); process.exit(1); }
html = html.replace(oldSpText, newSpText);
const oldSpBullets = '.sp-bullets{min-width:clamp(280px,46vw,560px);display:flex;align-items:center}';
const newSpBullets = '.sp-bullets{min-width:clamp(240px,28vw,380px);display:flex;align-items:center}';
if(!html.includes(oldSpBullets)){ console.error('sp-bullets CSS not found'); process.exit(1); }
html = html.replace(oldSpBullets, newSpBullets);
console.log('0. sp-text and sp-bullets widths reduced');

// ─── 1. Fix sp-photo: image full height, auto width, no radius ───────────────
// Replace the CSS rule for sp-photo
const oldSpPhoto = '.sp-photo{min-width:clamp(280px,48vw,600px);padding:0!important;overflow:hidden}';
const newSpPhoto = `.sp-photo{padding:0!important;overflow:hidden;height:100%;width:auto;flex-shrink:0;display:flex;align-items:stretch}
.sp-photo img{height:100%;width:auto;display:block;flex-shrink:0;border-radius:0!important}`;
if(!html.includes(oldSpPhoto)){ console.error('sp-photo CSS not found'); process.exit(1); }
html = html.replace(oldSpPhoto, newSpPhoto);
console.log('1. sp-photo CSS fixed');

// ─── 2. Add story-scroll overlay arrows CSS + auto-scroll hint ────────────────
const cssMark = '/* ── Panels split ───────────────────────────────────────────────────────── */';
const overlayCss = `/* ── Overlay arrows on carousel ─────────────────────────────────────────── */
.story-scroll{position:relative}
.story-ov-arr{
  position:absolute;
  top:50%;
  transform:translateY(-50%);
  z-index:10;
  background:rgba(255,255,255,.82);
  backdrop-filter:blur(4px);
  border:none;
  width:42px;height:42px;
  border-radius:50%;
  display:grid;place-items:center;
  font-size:1.1rem;
  cursor:pointer;
  box-shadow:0 4px 16px rgba(0,0,0,.18);
  transition:opacity .2s,transform .2s;
  color:var(--ink);
  pointer-events:all;
}
.story-ov-arr:hover{transform:translateY(-50%) scale(1.1)}
.story-ov-arr:disabled{opacity:.2;pointer-events:none}
.story-ov-arr--left{left:clamp(6px,1.5vw,18px)}
.story-ov-arr--right{right:clamp(6px,1.5vw,18px)}
/* ── Panels split ───────────────────────────────────────────────────────── */`;
if(!html.includes(cssMark)){ console.error('CSS mark not found'); process.exit(1); }
html = html.replace(cssMark, overlayCss);
console.log('2. Overlay arrows CSS added');

// ─── 3. Add overlay arrow buttons into HTML (inside .story-scroll, before .story-carousel-outer) ──
const carouselStart = '<div class="story-carousel-outer" id="storyOuter">';
const withArrows = `<button class="story-ov-arr story-ov-arr--left" id="storyOvPrev" aria-label="Précédent">&#8592;</button>
  <button class="story-ov-arr story-ov-arr--right" id="storyOvNext" aria-label="Suivant">&#8594;</button>
  ${carouselStart}`;
if(!html.includes(carouselStart)){ console.error('carousel start not found'); process.exit(1); }
html = html.replace(carouselStart, withArrows);
console.log('3. Overlay arrow buttons added');

// ─── 4. Replace Marseille dans les alpages card ────────────────────────────────
const oldAlpages = `    <div class="ftl-card ftl-step">
      <div class="ftl-phone"><div ><div class="iphone-mock"><div class="iph-notch"></div><div class="iph-screen iph-s1"><div class="iph-ico">🏔️</div><div class="iph-title">Dans les alpages</div><div class="iph-sub">Marseille × fromage</div></div></div></div></div>
      <div class="ftl-info">
        <span class="ctv-when">Début 2027 · production — Avril/Mai · diffusion</span>
                <h3>Marseille dans les alpages</h3>
                <p>Des personnages iconiques de Marseille — tous âges, tous univers — partent fabriquer leur propre raclette dans les alpages. Ils rentrent avec leur fromage et le font déguster le Jour J. Un dispositif créateurs de contenu sur plusieurs mois qui génère un buzz organique massif avant l'ouverture de la billetterie.</p>
                <div class="ctv-tags"><span>Créateurs de contenu</span><span>Instagram</span><span>TikTok</span><span>YouTube</span></div>
      </div>
    </div>`;

const newAlpages = `    <div class="ftl-card ftl-step ftl-step--alpages">
      <div class="alpages-iphones">
        <div class="iph-big"><div class="iphone-mock iphone-mock--big"><div class="iph-notch"></div><video src="./videos/v1.mp4" autoplay muted loop playsinline></video></div></div>
        <div class="iph-big"><div class="iphone-mock iphone-mock--big"><div class="iph-notch"></div><video src="./videos/v2.mp4" autoplay muted loop playsinline></video></div></div>
        <div class="iph-big"><div class="iphone-mock iphone-mock--big"><div class="iph-notch"></div><video src="./videos/v3.mp4" autoplay muted loop playsinline></video></div></div>
        <div class="iph-big"><div class="iphone-mock iphone-mock--big"><div class="iph-notch"></div><video src="./videos/v4.mp4" autoplay muted loop playsinline></video></div></div>
      </div>
    </div>`;

if(!html.includes(oldAlpages)){ console.error('alpages card not found'); process.exit(1); }
html = html.replace(oldAlpages, newAlpages);
console.log('4. Marseille dans les alpages card replaced');

// ─── 5. Add alpages CSS ─────────────────────────────────────────────────────
// Insert after the overrides block (after @media rule in story CSS)
const cssInsertMark = '@media(max-width:900px){.story-2col{grid-template-columns:1fr}.mani-img{display:none}}';
const alpagesCss = `@media(max-width:900px){.story-2col{grid-template-columns:1fr}.mani-img{display:none}}
/* ── Marseille dans les alpages card ─────────────────────────────────────── */
.ftl-step--alpages{
  background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cellipse cx='45' cy='35' rx='38' ry='25' fill='%23111'/%3E%3Cellipse cx='160' cy='70' rx='28' ry='36' fill='%23111'/%3E%3Cellipse cx='90' cy='120' rx='44' ry='28' fill='%23111'/%3E%3Cellipse cx='215' cy='150' rx='30' ry='40' fill='%23111'/%3E%3Cellipse cx='35' cy='200' rx='34' ry='22' fill='%23111'/%3E%3Cellipse cx='185' cy='25' rx='20' ry='28' fill='%23111'/%3E%3Cellipse cx='130' cy='220' rx='36' ry='20' fill='%23111'/%3E%3Cellipse cx='250' cy='210' rx='22' ry='30' fill='%23111'/%3E%3C/svg%3E") repeat!important;
  width:auto!important;
  min-width:auto!important;
  flex-direction:row!important;
  align-items:center!important;
  justify-content:center!important;
  padding:calc(70svh * 0.1) clamp(20px,2.5vw,40px)!important;
  gap:clamp(10px,1.2vw,20px)!important;
  border-left:none!important;
}
.alpages-iphones{display:flex;gap:clamp(10px,1.2vw,20px);align-items:center;height:100%}
.iph-big{height:calc(70svh * 0.8);flex-shrink:0}
.iphone-mock--big{
  width:calc(calc(70svh * 0.8) * 9 / 19)!important;
  height:100%!important;
  border-radius:clamp(16px,2.5vw,28px)!important;
  border:5px solid #1a1a1a!important;
  aspect-ratio:unset!important;
  overflow:hidden;
  position:relative;
  box-shadow:0 24px 48px -16px rgba(0,0,0,.5);
  background:#111;
}
.iphone-mock--big video{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.iphone-mock--big .iph-notch{
  position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:44%;height:18px;background:#111;border-radius:0 0 12px 12px;z-index:3;
}`;
if(!html.includes(cssInsertMark)){ console.error('CSS insert mark not found'); process.exit(1); }
html = html.replace(cssInsertMark, alpagesCss);
console.log('5. Alpages CSS added');

// ─── 6. Update JS: wire overlay arrows + add auto-scroll hint ─────────────────
const oldJsBlock = `// Story carousel — continuous horizontal scroll-snap
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

  // Wheel → scroll horizontal uniquement quand la souris est sur le carousel
  var mouseOver = false;
  outer.addEventListener('mouseenter', function(){ mouseOver = true; });
  outer.addEventListener('mouseleave', function(){ mouseOver = false; });
  document.addEventListener('wheel', function(e){
    if(!mouseOver) return;
    if(Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.5) return;
    e.preventDefault();
    outer.scrollLeft += e.deltaY;
  }, { passive: false });
})();`;

const newJsBlock = `// Story carousel — continuous horizontal scroll-snap
(function(){
  var outer = document.getElementById('storyOuter');
  var prev = document.getElementById('storyPrev');
  var next = document.getElementById('storyNext');
  var ovPrev = document.getElementById('storyOvPrev');
  var ovNext = document.getElementById('storyOvNext');
  var dots = document.querySelectorAll('#storyDots span');
  var lbls = document.querySelectorAll('.story-lbl');
  var panels = outer ? outer.querySelectorAll('.story-panel') : [];
  var total = panels.length;

  function getIdx(){
    var w = outer.clientWidth;
    return Math.round(outer.scrollLeft / w);
  }
  function updateUI(idx){
    dots.forEach(function(d,i){ d.classList.toggle('active', i===idx); });
    lbls.forEach(function(l,i){ l.classList.toggle('active', i===idx); });
    var atStart = outer.scrollLeft < 10;
    var atEnd = outer.scrollLeft + outer.clientWidth >= outer.scrollWidth - 10;
    if(prev){ prev.disabled = atStart; }
    if(next){ next.disabled = atEnd; }
    if(ovPrev){ ovPrev.disabled = atStart; }
    if(ovNext){ ovNext.disabled = atEnd; }
  }
  function scrollBy(delta){
    outer.scrollBy({ left: delta, behavior: 'smooth' });
  }
  function goTo(idx){
    outer.scrollTo({ left: idx * outer.clientWidth, behavior: 'smooth' });
  }

  if(prev) prev.addEventListener('click', function(){ goTo(Math.max(0, getIdx()-1)); });
  if(next) next.addEventListener('click', function(){ goTo(Math.min(total-1, getIdx()+1)); });
  if(ovPrev) ovPrev.addEventListener('click', function(){ scrollBy(-outer.clientWidth * 0.85); });
  if(ovNext) ovNext.addEventListener('click', function(){ scrollBy(outer.clientWidth * 0.85); });
  dots.forEach(function(d,i){ d.addEventListener('click', function(){ goTo(i); }); });
  outer.addEventListener('scroll', function(){ updateUI(getIdx()); }, { passive: true });

  // Auto-scroll hint on load: peek right then back
  setTimeout(function(){
    var hint = 220;
    outer.scrollBy({ left: hint, behavior: 'smooth' });
    setTimeout(function(){
      outer.scrollBy({ left: -hint, behavior: 'smooth' });
    }, 900);
  }, 1000);

  updateUI(0);

  // Wheel: vertical → horizontal when mouse over carousel
  var mouseOver = false;
  outer.addEventListener('mouseenter', function(){ mouseOver = true; });
  outer.addEventListener('mouseleave', function(){ mouseOver = false; });
  document.addEventListener('wheel', function(e){
    if(!mouseOver) return;
    if(Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.5) return;
    e.preventDefault();
    outer.scrollLeft += e.deltaY;
  }, { passive: false });
})();`;

if(!html.includes(oldJsBlock)){ console.error('JS block not found'); process.exit(1); }
html = html.replace(oldJsBlock, newJsBlock);
console.log('6. JS updated with overlay arrows + auto-scroll hint');

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', html, 'utf8');
console.log('Done. Size:', html.length);
