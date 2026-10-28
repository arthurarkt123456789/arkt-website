const fs = require('fs');
let html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');

function findDivEnd(src,s){let d=0,p=s;while(p<src.length){if(src.startsWith('<div',p))d++;else if(src.startsWith('</div>',p)){d--;if(d===0)return p+6;}p++;}return src.length;}
function findUlEnd(src,s){let d=0,p=s;while(p<src.length){if(src.startsWith('<ul',p))d++;else if(src.startsWith('</ul>',p)){d--;if(d===0)return p+5;}p++;}return src.length;}

const p1s = html.indexOf('<div class="story-panel">');
const p1e = findDivEnd(html, p1s);
const p1 = html.slice(p1s, p1e);

// Extract sec-head
const shS = p1.indexOf('<div class="sec-head rv">');
const shE = findDivEnd(p1, shS);
const secHead = p1.slice(shS, shE);

// Extract h2
const h2S = p1.indexOf('<h2 class="display h2 rv">');
const h2E = p1.indexOf('</h2>', h2S) + 5;
const h2 = p1.slice(h2S, h2E);

// Extract lead
const leadS = p1.indexOf('<p class="lead rv">');
const leadE = p1.indexOf('</p>', leadS) + 4;
const lead = p1.slice(leadS, leadE);

// Extract reasons ul
const ulS = p1.indexOf('<ul class="reasons rv">');
const ulE = findUlEnd(p1, ulS);
const reasons = p1.slice(ulS, ulE);

// Extract script span
const spS = p1.indexOf('<span class="script rv"');
const spE = p1.indexOf('</span>', spS) + 7;
const script = p1.slice(spS, spE);

// Extract image src (base64)
const imgS = p1.indexOf('<img src="');
const imgSrcS = imgS + 10;
const imgSrcE = p1.indexOf('"', imgSrcS);
const imgSrc = p1.slice(imgSrcS, imgSrcE);

console.log('Parts extracted. img src length:', imgSrc.length);

// Build 3 new panels
const newPanels = `
  <!-- ── 1. Titre & texte ──────────────────────────────────────────────── -->
  <div class="story-panel sp-text">
    <div class="wrap">
      ${secHead}
      ${h2}
      ${lead}
      ${script}
    </div>
  </div>

  <!-- ── 2. Photo pleine hauteur ───────────────────────────────────────── -->
  <div class="story-panel sp-photo">
    <img src="${imgSrc}" alt="Grande tablée au MuCEM" style="width:100%;height:100%;object-fit:cover;display:block">
  </div>

  <!-- ── 3. Bulletpoints bleus ─────────────────────────────────────────── -->
  <div class="story-panel sp-bullets">
    <div class="wrap">
      ${reasons}
    </div>
  </div>
`;

// Remplacer panel 1 par les 3 nouveaux panels
html = html.slice(0, p1s) + newPanels + html.slice(p1e);
console.log('Panel 1 splitté en 3');

// CSS pour les nouveaux panels
const cssAnchor = '/* ── Overrides scopés pour 70svh';
const newCss = `/* ── Panels split ───────────────────────────────────────────────────────── */
.sp-text{min-width:clamp(320px,55vw,680px)}
.sp-photo{min-width:clamp(280px,48vw,600px);padding:0!important;overflow:hidden}
.sp-bullets{min-width:clamp(280px,46vw,560px);display:flex;align-items:center}
.sp-bullets .wrap{width:100%}
.sp-bullets .reasons{margin-top:0}

`;
if(!html.includes(cssAnchor)){console.error('CSS anchor not found');process.exit(1);}
html = html.replace(cssAnchor, newCss + cssAnchor);
console.log('CSS ajouté');

// Supprimer les overrides mani-img (plus dans panel 1)
html = html.replace(
  /\.story-panel \.mani-img\{[\s\S]+?\}[\s\S]+?\.story-panel \.mani-img img\{[\s\S]+?\}/,
  ''
);
console.log('Overrides mani-img supprimés');

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', html);
console.log('Done ✓');
