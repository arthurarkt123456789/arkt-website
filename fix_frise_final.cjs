const fs = require('fs');
let html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');

// ── Helper: find closing </div> at depth 0 ───────────────────────────────────
function findDivEnd(src, start){
  let d=0,p=start;
  while(p<src.length){
    if(src.startsWith('<div',p)) d++;
    else if(src.startsWith('</div>',p)){d--;if(d===0)return p+6;}
    p++;
  }
  return src.length;
}

// ── 1. REMOVE wheel handler ───────────────────────────────────────────────────
const oldWheel = `
  // Wheel → horizontal scroll (desktop trackpad/souris)
  outer.addEventListener('wheel', function(e){
    // If scroll is dominantly horizontal, let it pass naturally
    if(Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.5) return;
    e.preventDefault();
    outer.scrollLeft += e.deltaY * 1.2;
  }, { passive: false });
`;
if(!html.includes(oldWheel.trim())){ console.error('wheel handler not found'); process.exit(1); }
html = html.replace(oldWheel, '\n');
console.log('1. Wheel handler supprimé');

// ── 2. EXTRACT panel 3 ────────────────────────────────────────────────────────
// Panel 3 is the 3rd story-panel (after panel--pink)
const p2Start = html.indexOf('<div class="story-panel story-panel--pink">');
const p2End = findDivEnd(html, p2Start);
const p3Start = html.indexOf('<div class="story-panel">', p2End);
const p3End = findDivEnd(html, p3Start);
const panel3 = html.slice(p3Start, p3End);

// ── 3. EXTRACT intro text (sec-head, h2, p.lead) ─────────────────────────────
const wrapOpen = panel3.indexOf('<div class="wrap">') + 18;
// sec-head
const shStart = panel3.indexOf('<div class="sec-head rv">');
const shEnd = findDivEnd(panel3, shStart);
const secHead = panel3.slice(shStart, shEnd);
// h2
const h2Start = panel3.indexOf('<h2 class="display h2 rv">');
const h2End = panel3.indexOf('</h2>',h2Start)+5;
const h2 = panel3.slice(h2Start, h2End);
// p.lead
const leadStart = panel3.indexOf('<p class="lead rv"', h2End);
const leadEnd = panel3.indexOf('</p>',leadStart)+4;
const lead = panel3.slice(leadStart, leadEnd);

// ── 4. EXTRACT each ctv-step ─────────────────────────────────────────────────
const steps = [];
let scanPos = 0;
while(true){
  const stepStart = panel3.indexOf('<div class="ctv-step rv">', scanPos);
  if(stepStart === -1) break;
  const stepEnd = findDivEnd(panel3, stepStart);
  const stepInner = panel3.slice(stepStart + 25, stepEnd - 6); // content inside the wrapper div

  // Extract phone block
  const phoneStart = stepInner.indexOf('<div class="ctv-phone">');
  const phoneEnd = findDivEnd(stepInner, phoneStart);
  const phone = stepInner.slice(phoneStart, phoneEnd);

  // Extract info block, then strip inspo-row from it
  const infoStart = stepInner.indexOf('<div class="ctv-info">');
  const infoEnd = findDivEnd(stepInner, infoStart);
  let info = stepInner.slice(infoStart + 22, infoEnd - 6).trim();

  // Extract inspo-row if present
  let inspo = '';
  const inspoIdx = info.indexOf('<div class="inspo-row">');
  if(inspoIdx !== -1){
    const inspoEnd2 = findDivEnd(info, inspoIdx);
    inspo = info.slice(inspoIdx, inspoEnd2);
    info = (info.slice(0, inspoIdx) + info.slice(inspoEnd2)).trim();
  }

  steps.push({ phone, info, inspo });
  scanPos = stepStart + 1;
}
console.log('2. Steps extraits:', steps.length);

// ── 5. BUILD new panel 3 HTML ─────────────────────────────────────────────────
let cards = '';

// Intro card
cards += `
    <!-- ── Intro ──────────────────────────────────────────────────────── -->
    <div class="ftl-card ftl-intro">
      ${secHead}
      ${h2}
      ${lead}
    </div>`;

// Step + optional ref cards
steps.forEach((s, i) => {
  cards += `
    <!-- ── Étape ${i+1} ──────────────────────────────────────────────────── -->
    <div class="ftl-card ftl-step">
      <div class="ftl-phone">${s.phone.replace('class="ctv-phone"','')}</div>
      <div class="ftl-info">
        ${s.info}
      </div>
    </div>`;

  if(s.inspo){
    // Extract icon from concept-card-header if present
    const iconMatch = s.inspo.match(/class="concept-card-icon">([^<]+)</);
    const icon = iconMatch ? iconMatch[1] : '✦';
    // Extract label
    const lblMatch = s.inspo.match(/class="concept-card-title">([^<]+)</);
    const lbl = lblMatch ? lblMatch[1] : 'Références';
    // Extract inspo-cards div
    const icStart = s.inspo.indexOf('<div class="inspo-cards">');
    const icEnd = findDivEnd(s.inspo, icStart);
    const inspoCards = icStart !== -1 ? s.inspo.slice(icStart, icEnd) : '';
    // Extract partner-suggest if present
    const psStart = s.inspo.indexOf('<div class="partner-suggest"');
    const psEnd = psStart !== -1 ? findDivEnd(s.inspo, psStart) : 0;
    const partnerSuggest = psStart !== -1 ? s.inspo.slice(psStart, psEnd) : '';

    cards += `
    <!-- ── Ref ${i+1} ──────────────────────────────────────────────────────── -->
    <div class="ftl-card ftl-ref">
      <div class="ftl-ref-header">
        <span class="ftl-ref-ico">${icon}</span>
        <span class="ftl-ref-lbl">${lbl}</span>
      </div>
      ${inspoCards}
      ${partnerSuggest}
    </div>`;
  }
});

const newPanel3 = `<div class="story-panel story-panel--frise">${cards}
</div>`;

html = html.slice(0, p3Start) + newPanel3 + html.slice(p3End);
console.log('3. Panel 3 reconstruit avec', steps.length, 'steps');

// ── 6. REPLACE old frise CSS ──────────────────────────────────────────────────
// Remove old comm-tl-wrap / comm-tl-v / ctv-step CSS block
const cssMarkerStart = html.indexOf('.comm-tl-wrap{');
const cssMarkerEnd = html.indexOf('@media(max-width:600px){', cssMarkerStart);
const cssBlock600 = html.indexOf('\n/* ACTOR SLIDER */', cssMarkerEnd);
const oldCssBlock = html.slice(cssMarkerStart - 1, cssBlock600);

const newCssBlock = `
/* ── FRISE DISPOSITIF DE COM. ────────────────────────────────────────────── */
.story-panel--frise{
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
.ftl-card{
  height:100%;
  flex-shrink:0;
  box-sizing:border-box;
  display:flex;
  flex-direction:column;
  padding:clamp(36px,4.5vw,64px) clamp(24px,2.8vw,40px);
  border-right:1px solid rgba(0,0,0,.1);
}
.ftl-intro{
  width:clamp(280px,30vw,400px);
  justify-content:center;
  gap:18px;
  background:var(--cream);
}
.ftl-intro .sec-head{margin-bottom:0}
.ftl-intro .lead{margin-top:0!important}
.ftl-step{
  width:clamp(220px,22vw,290px);
  align-items:center;
  justify-content:center;
  gap:20px;
}
.ftl-phone .iphone-mock{
  width:110px;
  aspect-ratio:9/19;
  border-radius:22px;
  border:4px solid #1a1a1a;
  position:relative;
  overflow:hidden;
  box-shadow:0 12px 32px -10px rgba(0,0,0,.4);
}
.ftl-phone .iph-notch{
  position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:44%;height:14px;
  background:#111;border-radius:0 0 10px 10px;z-index:3
}
.ftl-phone .iph-screen{
  width:100%;height:100%;
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  text-align:center;padding:20px 8px 14px;gap:5px;color:#fff
}
.ftl-phone .iph-ico{font-size:1.1rem}
.ftl-phone .iph-title{font-family:"Inter",sans-serif;font-weight:800;font-size:.82rem;text-transform:uppercase;line-height:1.1}
.ftl-phone .iph-sub{font-size:.58rem;opacity:.75}
.ftl-phone .iph-live{font-size:.45rem;padding:2px 5px;background:#ff3b30;color:#fff;border-radius:3px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.ftl-phone .iph-play{width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.2);display:grid;place-items:center;margin:0 auto}
.ftl-phone .iph-play::after{content:"";border:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:8px solid #fff;margin-left:2px}
.ftl-info{
  display:flex;
  flex-direction:column;
  align-items:center;
  text-align:center;
  gap:6px;
  width:100%;
}
.ftl-info .ctv-when{
  font-weight:800;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:var(--blue);display:block
}
.ftl-info h3{
  font-family:"Inter",sans-serif;font-weight:800;text-transform:uppercase;font-size:1rem;line-height:1.05;margin-bottom:2px
}
.ftl-info p{font-size:.8rem;color:var(--muted);max-width:22ch;line-height:1.45}
.ftl-info .ctv-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;justify-content:center}
.ftl-info .ctv-tags span{background:var(--cream);border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:.62rem;font-weight:600;color:var(--muted)}
.ftl-ref{
  width:clamp(180px,18vw,240px);
  background:rgba(0,50,200,.04);
  justify-content:center;
  gap:16px;
  border-right-color:rgba(0,0,0,.06);
}
.ftl-ref-header{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.ftl-ref-ico{font-size:1.4rem}
.ftl-ref-lbl{font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--blue)}
.ftl-ref .inspo-cards{display:flex;flex-direction:column;flex-wrap:nowrap;gap:10px;margin-bottom:0}
.ftl-ref .inspo-card{width:100%;display:flex;align-items:center;gap:10px}
.ftl-ref .inspo-thumb{width:44px;height:44px;border-radius:10px;flex-shrink:0;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;overflow:hidden;position:relative}
.ftl-ref .inspo-emoji{font-size:1.2rem}
.ftl-ref .inspo-title-badge{font-family:"Inter",sans-serif;font-weight:800;font-size:.5rem;color:#fff;text-transform:uppercase;letter-spacing:.04em;text-align:center;padding:1px 4px;background:rgba(0,0,0,.4);border-radius:999px}
.ftl-ref .inspo-sub{font-size:.72rem;color:var(--muted);line-height:1.3}
.ftl-ref .partner-suggest{flex-direction:column;align-items:flex-start;gap:8px;flex-wrap:nowrap}
.ftl-ref .ps-lbl{font-size:.62rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.ftl-ref .ps-logos{flex-wrap:nowrap}`;

html = html.slice(0, cssMarkerStart - 1) + newCssBlock + html.slice(cssBlock600);
console.log('4. CSS frise réécrit');

// ── 7. Nettoyer old ctv-phone / ctv-info CSS leftover (from previous fixes) ──
// These are no longer needed since panel 3 uses ftl-* classes
// Just keep them in case other elements use them - they won't conflict

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', html);
console.log('Done. ✓');
