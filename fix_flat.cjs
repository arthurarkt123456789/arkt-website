const fs = require('fs');
let html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');

function findDivEnd(src, start){
  let d=0,p=start;
  while(p<src.length){
    if(src.startsWith('<div',p)) d++;
    else if(src.startsWith('</div>',p)){d--;if(d===0)return p+6;}
    p++;
  }
  return src.length;
}

// ── 1. Retirer le wrapper story-panel--frise, garder ses enfants directs ──────
const friseStart = html.indexOf('<div class="story-panel story-panel--frise">');
if(friseStart === -1){ console.error('frise panel not found'); process.exit(1); }
const friseEnd = findDivEnd(html, friseStart);

// Le contenu intérieur (les ftl-cards sans le wrapper)
const friseInner = html.slice(friseStart + '<div class="story-panel story-panel--frise">'.length, friseEnd - 6).trim();

// Remplacer le wrapper par le contenu direct
html = html.slice(0, friseStart) + friseInner + '\n  ' + html.slice(friseEnd);
console.log('1. Wrapper story-panel--frise retiré — cards en enfants directs');

// ── 2. CSS : story-panel--frise inutile, ftl-card = flex child direct ─────────
const oldFrisePanelCss = `.story-panel--frise{
  padding:0;
  display:flex;
  flex-direction:row;
  overflow-x:auto;
  overflow-y:hidden;
  overscroll-behavior-x:contain;
  scrollbar-width:none;
  gap:0;
}
.story-panel--frise::-webkit-scrollbar{display:none}
.ftl-card{`;

const newFrisePanelCss = `.ftl-card{`;

if(!html.includes(oldFrisePanelCss)){ console.error('CSS frise panel not found'); process.exit(1); }
html = html.replace(oldFrisePanelCss, newFrisePanelCss);
console.log('2. CSS story-panel--frise supprimé');

// ── 3. ftl-card : retirer height:100% et border-right, ajouter flex-shrink ────
const oldFtlCard = `.ftl-card{
  height:100%;
  flex-shrink:0;
  box-sizing:border-box;
  display:flex;
  flex-direction:column;
  padding:clamp(36px,4.5vw,64px) clamp(24px,2.8vw,40px);
  border-right:1px solid rgba(0,0,0,.1);
}`;

const newFtlCard = `.ftl-card{
  flex-shrink:0;
  box-sizing:border-box;
  display:flex;
  flex-direction:column;
  padding:clamp(36px,4.5vw,64px) clamp(24px,2.8vw,40px);
  border-left:1px solid rgba(0,0,0,.1);
}`;

if(!html.includes(oldFtlCard)){ console.error('ftl-card CSS not found'); process.exit(1); }
html = html.replace(oldFtlCard, newFtlCard);
console.log('3. ftl-card CSS mis à jour');

// ── 4. JS : ajouter wheel handler intelligent (uniquement sur le carousel) ────
const oldUpdateUI = `  updateUI(0);
})();`;

const newUpdateUI = `  updateUI(0);

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

if(!html.includes(oldUpdateUI)){ console.error('JS updateUI not found'); process.exit(1); }
html = html.replace(oldUpdateUI, newUpdateUI);
console.log('4. Wheel handler intelligent ajouté');

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', html);
console.log('Done. ✓');
