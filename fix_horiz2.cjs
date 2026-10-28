const fs = require('fs');
let html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');

// ── 1. CAROUSEL : retirer scroll-snap, garder défilement libre ────────────────
const oldCarouselCss = `.story-carousel-outer{
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
}`;

const newCarouselCss = `.story-carousel-outer{
  flex:1;
  min-height:0;
  display:flex;
  overflow-x:scroll;
  overflow-y:hidden;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none;
  scroll-behavior:smooth;
}
.story-carousel-outer::-webkit-scrollbar{display:none}
.story-panel{
  min-width:100vw;
  flex-shrink:0;
  padding:clamp(40px,5vw,72px) var(--gutter) clamp(32px,4vw,56px);
  box-sizing:border-box;
  overflow-y:auto;
  overflow-x:hidden;
}`;

if(!html.includes(oldCarouselCss)){ console.error('Carousel CSS not found'); process.exit(1); }
html = html.replace(oldCarouselCss, newCarouselCss);
console.log('1. Carousel scroll-snap retiré → défilement libre');

// ── 2. FRISE : réécrire le CSS de la timeline en horizontal ──────────────────
// On cherche le bloc depuis .comm-tl-wrap jusqu'à /* Scroll indicator */
const oldFriseCss = `.comm-tl-wrap{
  height:680px;
  overflow-y:auto;
  overflow-x:hidden;
  border-radius:20px;
  border:2px solid var(--line);
  padding:0 32px;
  margin-top:clamp(40px,5vw,60px);
  scrollbar-width:thin;
  scrollbar-color:var(--blue) var(--line)
}
.comm-tl-wrap::-webkit-scrollbar{width:4px}
.comm-tl-wrap::-webkit-scrollbar-track{background:var(--line)}
.comm-tl-wrap::-webkit-scrollbar-thumb{background:var(--blue);border-radius:2px}
.comm-tl-v{
  position:relative;
  padding:36px 0 20px 56px
}
/* La ligne unique continue du début à la fin */
.comm-tl-v::before{
  content:"";
  position:absolute;
  left:18px;
  top:52px;
  bottom:20px;
  width:3px;
  background:linear-gradient(to bottom,var(--blue) 0%,var(--blue) 80%,var(--yellow) 100%)
}
.ctv-step{
  position:relative;
  display:grid;
  grid-template-columns:110px 1fr;
  gap:20px;
  align-items:flex-start;
  margin-bottom:48px
}
.ctv-step:last-child{margin-bottom:0}
.ctv-dot{
  position:absolute;
  left:-47px;
  top:20px;
  width:18px;height:18px;
  border-radius:50%;
  background:var(--blue);
  border:3px solid #fff;
  box-shadow:0 0 0 3px var(--blue);
  z-index:2
}
.ctv-step:last-child .ctv-dot{
  background:var(--yellow);
  box-shadow:0 0 0 3px var(--ink);
  width:22px;height:22px;
  left:-49px;top:18px
}`;

const newFriseCss = `.comm-tl-wrap{margin-top:clamp(32px,4vw,48px)}
/* ─── Frise horizontale ───────────────────────────────────────────────── */
.comm-tl-v{
  display:flex;
  flex-direction:row;
  gap:0;
  padding:20px 0 28px;
  overflow-x:auto;
  overscroll-behavior-x:contain;
  scrollbar-width:none;
  position:relative;
}
.comm-tl-v::-webkit-scrollbar{display:none}
/* ligne horizontale qui passe sur les dots */
.comm-tl-v::before{
  content:"";
  position:absolute;
  top:calc(190px + 10px + 8px);
  left:80px;
  right:80px;
  height:3px;
  width:auto;
  background:linear-gradient(to right,var(--blue) 0%,var(--blue) 85%,var(--yellow) 100%);
  pointer-events:none;
  z-index:0
}
.ctv-step{
  display:flex;
  flex-direction:column;
  align-items:center;
  width:170px;
  flex-shrink:0;
  padding:0 10px;
  position:relative;
  margin-bottom:0
}
.ctv-step:last-child{margin-bottom:0}
.ctv-dot{
  order:2;
  position:relative;
  left:auto;
  top:auto;
  width:16px;height:16px;
  border-radius:50%;
  background:var(--blue);
  border:3px solid #fff;
  box-shadow:0 0 0 3px var(--blue);
  z-index:2;
  flex-shrink:0;
  margin:10px 0
}
.ctv-step:last-child .ctv-dot{
  background:var(--yellow);
  box-shadow:0 0 0 3px var(--ink);
  width:20px;height:20px;
  left:auto;top:auto
}`;

if(!html.includes(oldFriseCss)){ console.error('Frise CSS not found'); process.exit(1); }
html = html.replace(oldFriseCss, newFriseCss);
console.log('2. Frise réécrite en horizontal');

// ── 3. Réordonner phone/dot/info dans .ctv-step via CSS ──────────────────────
// Le HTML est : dot → phone → info
// On veut visuellement : phone (order:1) → dot (order:2) → info (order:3)
const oldCtvPhone = `.ctv-phone .iphone-mock{
  width:90px;`;
// On ajoute juste un order:1 sur .ctv-phone
// Chercher .ctv-info{}
const oldCtvInfo = `.ctv-info{}`;
const newCtvInfo = `.ctv-phone{order:1}
.ctv-info{order:3;text-align:center}`;

if(!html.includes(oldCtvInfo)){ console.error('.ctv-info{} not found'); process.exit(1); }
html = html.replace(oldCtvInfo, newCtvInfo);
console.log('3. order phone→dot→info ajouté');

// ── 4. Aligner le texte info et réduire la taille pour la frise ──────────────
const oldCtvInfoP = `.ctv-info p{font-size:.84rem;color:var(--muted);max-width:38ch}`;
const newCtvInfoP = `.ctv-info p{font-size:.78rem;color:var(--muted);max-width:none}`;
if(html.includes(oldCtvInfoP)){
  html = html.replace(oldCtvInfoP, newCtvInfoP);
  console.log('4. ctv-info p adapté');
} else { console.log('4. ctv-info p — skip (déjà à jour)'); }

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', html);
console.log('Done.');
