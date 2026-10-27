const fs = require('fs');
let html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');

// The duplicate CSS blocks to remove/replace (there are 3 copies)
// They all contain the old transform-based animation rules
const dupCssBlock = `/* Tables */
.map-tables{
  fill:rgba(0,0,255,0.22);
  stroke:#0000ff;
  stroke-width:1.2;
  rx:2;
  opacity:0;
  transform:scaleX(0);
  transform-origin:28% 55%;
  transition:opacity 0.1s 0.5s, transform 0.9s 0.5s cubic-bezier(.2,.8,.2,1)
}
/* Lignes des tables */
.map-table-lines{
  stroke:rgba(0,0,255,0.4);
  stroke-width:0.5;
  opacity:0;
  transition:opacity 0.6s 1.4s
}
/* Scène */
.map-scene{
  fill:rgba(243,224,59,0.75);
  stroke:var(--ink);
  stroke-width:1.2;
  opacity:0;
  transform:scale(0);
  transform-origin:72% 56%;
  transition:opacity 0.1s 1.5s, transform 0.6s 1.5s cubic-bezier(.34,1.56,.64,1)
}
/* Accès */
.map-access{
  fill:var(--yellow);
  stroke:var(--ink);
  stroke-width:0.8;
  opacity:0;
  transform:scale(0);
  transition:opacity 0.1s, transform 0.4s cubic-bezier(.34,1.56,.64,1)
}
.map-access.a1{transform-origin:44% 63%;transition-delay:2s}
.map-access.a2{transform-origin:52% 64%;transition-delay:2.15s}
.map-access.a3{transform-origin:60% 63%;transition-delay:2.3s}
/* Labels */
.plan-lbl{
  position:absolute;
  display:flex;flex-direction:column;align-items:center;
  pointer-events:none;
  opacity:0;
  transform:translateY(8px);
  transition:opacity 0.5s, transform 0.5s
}
.plan-lbl b{
  display:block;
  background:var(--blue);color:#fff;
  font-family:"Anton",sans-serif;font-weight:400;font-size:clamp(.7rem,1.3vw,1rem);
  padding:5px 12px;border-radius:999px;white-space:nowrap;
  box-shadow:0 4px 12px rgba(0,0,60,.35)
}
.plan-lbl.lbl-scene b{background:var(--ink)}
.plan-lbl small{display:block;font-size:clamp(.55rem,1vw,.75rem);color:rgba(255,255,255,.85);margin-top:3px;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,.5)}
.plan-lbl i{width:2px;height:18px;background:var(--blue);display:block}
.plan-lbl.lbl-scene i{background:var(--ink)}
.plan-lbl s{width:10px;height:10px;border-radius:50%;background:var(--blue);border:2px solid #fff;display:block;animation:pulse 2s ease-out infinite}
.plan-lbl.lbl-scene s{background:var(--ink)}
.plan-lbl-tables{left:44%;top:26%;transition-delay:1.1s}
.plan-lbl-scene{left:74%;top:22%;transition-delay:1.8s}
/* On state */
.plan.on .map-tables{opacity:1;transform:scaleX(1)}
.plan.on .map-table-lines{opacity:1}
.plan.on .map-scene{opacity:1;transform:scale(1)}
.plan.on .map-access{opacity:1;transform:scale(1)}
.plan.on .plan-lbl{opacity:1;transform:translateY(0)}`;

let count = 0;
while(html.includes(dupCssBlock)){
  html = html.replace(dupCssBlock, '');
  count++;
}
console.log('Removed', count, 'duplicate CSS blocks');

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', html, 'utf8');
console.log('Done. Size:', html.length);
