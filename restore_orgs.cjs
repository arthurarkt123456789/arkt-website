const fs = require('fs');
let html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');
const oldBlock = fs.readFileSync('/tmp/old_org_sections.html','utf8');

// ─── 1. Replace new orgs section with old meul+team ──────────────────────────
const newOrgStart = html.indexOf('<section class="pad" id="orgs">');
if(newOrgStart === -1){ console.error('new orgs section not found'); process.exit(1); }

// Find the next section after new orgs (dispo)
const dispoStart = html.indexOf('<section class="dispo pad"');
if(dispoStart === -1){ console.error('dispo section not found'); process.exit(1); }

console.log('Replacing chars', newOrgStart, '-', dispoStart);

// Modify oldBlock to add descriptions inside team-org cards
let modBlock = oldBlock;

// Add description after team-org-lbl for La Meulerie
const lmLblClose = '</div>\n        <div class="team-persons">';
const lmDesc = `</div>\n        <p style="font-size:.88rem;line-height:1.65;color:var(--muted);margin:0 0 20px;padding-bottom:20px;border-bottom:1.5px solid var(--line)">Fromagerie marseillaise née de l'énergie d'une ville. Quatre boutiques, trois franchises en développement — un fromage populaire, accessible et festif. Une communication digitale affirmée et des partenariats audacieux avec des marques nationales.</p>\n        <div class="team-persons">`;
modBlock = modBlock.replace(lmLblClose, lmDesc);

// Add description after team-org-lbl for Octobre
const octLblClose = `<div class="team-org-lbl"><strong>Octobre</strong><span>Relations institutionnelles</span></div>\n        <div class="team-persons">`;
const octDesc = `<div class="team-org-lbl"><strong>Octobre</strong><span>Relations institutionnelles</span></div>\n        <p style="font-size:.88rem;line-height:1.65;color:var(--muted);margin:0 0 20px;padding-bottom:20px;border-bottom:1.5px solid var(--line)">Cabinet de conseil en stratégie événementielle et mécénat culturel. Pauline Mateo a piloté le prologue de la Flamme Olympique à Marseille (Paris 2024), accompagné 8BA, le Festival d'Aix‑en‑Provence et la fondation YEMMA (13 Habitat).</p>\n        <div class="team-persons">`;
modBlock = modBlock.replace(octLblClose, octDesc);

html = html.slice(0, newOrgStart) + modBlock + '\n\n' + html.slice(dispoStart);
console.log('Org sections restored with descriptions');

// ─── 2. Replace CSS: /* ORGANISATEURS */ → /* TEAM REDESIGN */ ───────────────
const oldCssMarker = '/* ORGANISATEURS */';
const oldCssEnd = '\n\n/* COMM TIMELINE';
const cssStart = html.indexOf(oldCssMarker);
const cssEnd = html.indexOf(oldCssEnd, cssStart);
if(cssStart === -1 || cssEnd === -1){ console.error('CSS markers not found', cssStart, cssEnd); process.exit(1); }

const newTeamCss = `/* TEAM REDESIGN */
.team-orgs{display:grid;grid-template-columns:3fr 1.1fr;gap:20px;align-items:start}
.team-org{border:2px solid var(--ink);border-radius:24px;padding:clamp(20px,3vw,32px)}
.team-org-lbl{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap}
.team-org-lbl strong{background:var(--yellow);font-weight:700;font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;padding:5px 14px;border-radius:999px}
.team-org-lbl span{font-size:.82rem;color:var(--muted);font-weight:600}
.team-persons{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.team-org.solo .team-persons{grid-template-columns:1fr}
.pcard{display:flex;flex-direction:column;gap:0}
.pcard-photo{width:100%;aspect-ratio:1/1;border-radius:16px;overflow:hidden;background:var(--cream);margin-bottom:12px}
.pcard-photo img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;transition:transform .4s}
.pcard:hover .pcard-photo img{transform:scale(1.04)}
.pcard-name{font-family:"Anton",sans-serif;font-weight:400;text-transform:uppercase;font-size:clamp(1.05rem,1.8vw,1.4rem);line-height:1;margin-bottom:4px}
.pcard-role{font-size:.82rem;color:var(--muted);font-weight:600}
@media(max-width:900px){.team-orgs{grid-template-columns:1fr}.team-org.solo .team-persons{grid-template-columns:1fr}}
@media(max-width:600px){.team-persons{grid-template-columns:repeat(2,1fr)}}`;

html = html.slice(0, cssStart) + newTeamCss + html.slice(cssEnd);
console.log('CSS restored to team-redesign style');

// ─── 3. Restore collabs CSS to original (no blue bg — meul section already blue) ──
// In old design, collabs was inside .meul section (blue bg), no extra bg needed
const blueBgCollabs = '.collabs{background:var(--blue);border-radius:24px;padding:clamp(32px,4vw,56px);margin-top:clamp(60px,8vw,100px)}';
const origCollabs = '.collabs{margin-top:clamp(60px,8vw,100px)}';
if(html.includes(blueBgCollabs)){
  html = html.replace(blueBgCollabs, origCollabs);
  console.log('Collabs CSS restored to no extra bg (already inside meul blue section)');
}

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', html, 'utf8');
console.log('Done. Size:', html.length);
