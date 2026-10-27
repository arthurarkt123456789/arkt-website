const fs = require('fs');
let html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');

// ── 1. Replace STORY CAROUSEL CSS ────────────────────────────────────────────
const cssOld = `/* ── STORY CAROUSEL ─────────────────────────────────────────────────────── */
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

const cssNew = `/* ── STORY CAROUSEL ─────────────────────────────────────────────────────── */
.story-scroll{
  height:100svh;
  display:flex;
  flex-direction:column;
  overflow:hidden;
  padding:0;
}
.story-carousel-outer{
  flex:1;
  min-height:0;
  display:flex;
  overflow-x:scroll;
  overflow-y:hidden;
  scroll-snap-type:x mandatory;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none;
}
.story-carousel-outer::-webkit-scrollbar{display:none}
.story-panel{
  min-width:100vw;
  flex-shrink:0;
  scroll-snap-align:start;
  padding:clamp(40px,5vw,72px) var(--gutter) clamp(32px,4vw,56px);
  box-sizing:border-box;
  overflow-y:auto;
  overscroll-behavior-x:none;
}
.story-panel--pink{background:var(--pink)}
.story-2col{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,4vw,60px);align-items:start;margin-top:clamp(28px,3.5vw,44px)}
.story-nav{
  flex-shrink:0;
  display:flex;
  align-items:center;
  gap:14px;
  padding:14px var(--gutter) 18px;
  border-top:1px solid rgba(0,0,0,.08);
}
.story-arr{background:var(--ink);color:#fff;border:0;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:.9rem;display:grid;place-items:center;transition:opacity .2s;flex-shrink:0}
.story-arr:disabled{opacity:.25;cursor:default}
.story-dots{display:flex;gap:7px;align-items:center}
.story-dots span{width:7px;height:7px;border-radius:50%;background:var(--ink);opacity:.2;transition:opacity .3s,transform .3s;cursor:pointer}
.story-dots span.active{opacity:1;transform:scale(1.3)}
.story-labels{display:flex;gap:0;margin-left:4px;overflow:hidden}
.story-lbl{font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);opacity:0;max-width:0;white-space:nowrap;transition:opacity .3s,max-width .3s}
.story-lbl.active{opacity:1;max-width:200px}
@media(max-width:900px){.story-2col{grid-template-columns:1fr}.mani-img{display:none}}`;

if(!html.includes(cssOld)){ console.error('CSS block not found — check markers'); process.exit(1); }
html = html.replace(cssOld, cssNew);
console.log('1. CSS updated');

// ── 2. Replace the carousel JS to add wheel → horizontal conversion ───────────
const jsOld = `(function(){
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

const jsNew = `(function(){
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

  // Wheel → horizontal scroll (desktop trackpad/souris)
  outer.addEventListener('wheel', function(e){
    // If scroll is dominantly horizontal, let it pass naturally
    if(Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.5) return;
    e.preventDefault();
    outer.scrollLeft += e.deltaY * 1.2;
  }, { passive: false });

  updateUI(0);
})();`;

if(!html.includes(jsOld)){ console.error('JS block not found'); process.exit(1); }
html = html.replace(jsOld, jsNew);
console.log('2. JS updated (wheel → horizontal)');

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', html);
console.log('Done.');
