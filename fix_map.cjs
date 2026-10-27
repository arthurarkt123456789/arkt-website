const fs = require('fs');
let html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');

// ─── 1. Replace SVG content ───────────────────────────────────────────────────
// The J4 esplanade runs NE-SW at roughly 24° from horizontal in SVG space
// (which renders as ~16° visual tilt given the 700/451 container ratio)
// Scene (scène) is at the SW/left end, tables fill the esplanade

const oldSvg = `<svg class="plan-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <rect class="map-tables" x="18" y="40" width="50" height="20" rx="1.5" ry="1.5"/>
          <g class="map-table-lines">
            <line x1="18" y1="44.5" x2="68" y2="44.5"/>
            <line x1="18" y1="49" x2="68" y2="49"/>
            <line x1="18" y1="53.5" x2="68" y2="53.5"/>
            <line x1="18" y1="58" x2="68" y2="58"/>
          </g>
          <rect class="map-scene" x="68" y="40" width="8" height="20" rx="1.5" ry="1.5"/>
          <circle class="map-access a1" cx="33" cy="62" r="2.2"/>
          <circle class="map-access a2" cx="48" cy="62" r="2.2"/>
          <circle class="map-access a3" cx="62" cy="62" r="2.2"/>
        </svg>`;

// New SVG: 3 parallel table rows + small scene at SW end
// Group rotated -24° around center (26, 50) = esplanade centerline
// Pre-rotation: tables are horizontal, scene at left end
const newSvg = `<svg class="plan-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <g transform="rotate(-24, 26, 50)">
            <rect class="map-tables" x="11" y="41.5" width="32" height="4" rx="2"/>
            <rect class="map-tables" x="11" y="47.5" width="32" height="4" rx="2"/>
            <rect class="map-tables" x="11" y="53.5" width="32" height="4" rx="2"/>
            <rect class="map-scene" x="7"  y="52"   width="6"  height="6.5" rx="2"/>
          </g>
        </svg>`;

if(html.includes(oldSvg)){
  html = html.replace(oldSvg, newSvg);
  console.log('SVG replaced');
} else {
  console.error('SVG not found exactly');
  process.exit(1);
}

// ─── 2. Update map CSS ────────────────────────────────────────────────────────
// Replace the first CSS block (lines ~375-445)
const oldMapCss1 = `.plan-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
/* Tables */
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
.map-access.a3{transform-origin:60% 63%;transition-delay:2.3s}`;

const newMapCss1 = `.plan-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.map-tables{fill:rgba(0,0,255,.22);stroke:#0000ff;stroke-width:.9;opacity:0;transition:opacity .9s .5s}
.map-scene{fill:rgba(255,102,204,.55);stroke:#ff66cc;stroke-width:.9;opacity:0;transition:opacity .7s 1.4s}`;

if(html.includes(oldMapCss1)){
  html = html.replace(oldMapCss1, newMapCss1);
  console.log('Map CSS block 1 replaced');
} else {
  console.error('Map CSS block 1 not found');
  process.exit(1);
}

// Update the .plan.on rules
const oldOnRules = `.plan.on .map-tables{opacity:1;transform:scaleX(1)}
.plan.on .map-table-lines{opacity:1}
.plan.on .map-scene{opacity:1;transform:scale(1)}
.plan.on .map-access{opacity:1;transform:scale(1)}
.plan.on .plan-lbl{opacity:1;transform:translateY(0)}`;

const newOnRules = `.plan.on .map-tables{opacity:1}
.plan.on .map-scene{opacity:1}
.plan.on .plan-lbl{opacity:1;transform:translateY(0)}`;

if(html.includes(oldOnRules)){
  html = html.replace(oldOnRules, newOnRules);
  console.log('On-state rules updated');
}

// Update label positions to match new SVG layout
// Tables label: above-center of the tilted cluster (~30% from left, ~20% from top)
// Scene label: lower-left near scene (~5% from left, ~60% from top)
html = html.replace('.plan-lbl-tables{left:44%;top:26%;transition-delay:1.1s}', '.plan-lbl-tables{left:28%;top:18%;transition-delay:1.1s}');
html = html.replace('.plan-lbl-scene{left:74%;top:22%;transition-delay:1.8s}', '.plan-lbl-scene{left:4%;top:55%;transition-delay:1.8s}');
console.log('Label positions updated');

// ─── 3. Also fix the second/duplicate CSS block if present ───────────────────
const dupBlock = `/* INTERACTIVE MAP */
.plan{border-radius:24px;overflow:hidden;position:relative;aspect-ratio:700/451;background:#b8cfe0}
.plan-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.plan-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}`;

// Check if there's a second map-tables definition to clean up
const secondTablesIdx = html.indexOf('.map-tables{', html.indexOf('.map-tables{') + 100);
if(secondTablesIdx > -1){
  // Find end of this duplicate CSS block
  const dupEnd = html.indexOf('\n/* ', secondTablesIdx);
  const dupBlock2 = html.slice(html.lastIndexOf('\n/* ', secondTablesIdx)+1, dupEnd > -1 ? dupEnd : secondTablesIdx + 600);
  console.log('Found second map-tables block at', secondTablesIdx, ':', dupBlock2.slice(0,100));
}

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', html, 'utf8');
console.log('Done. Size:', html.length);
