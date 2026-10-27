const fs = require('fs');
const html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');

// ─── Extract base64 photos for the 4 people ─────────────────────────────────
// Each pcard-photo contains one <img src="data:image/jpeg;base64,...">
// We find them by looking for pcard-photo occurrences in order

function extractImgSrc(html, searchCtx, offset=0) {
  const ctx = html.indexOf(searchCtx, offset);
  if(ctx === -1) { console.error('Context not found:', searchCtx); process.exit(1); }
  const imgStart = html.indexOf('<img ', ctx);
  const srcStart = html.indexOf('src="', imgStart) + 5;
  const srcEnd = html.indexOf('"', srcStart);
  return { src: html.slice(srcStart, srcEnd), afterIdx: srcEnd };
}

// The 4 pcard-photos in order: Driss, Arthur, Sacha (La Meulerie), Pauline (Octobre)
let pcardIdx = 0;
const pcardPhotos = [];
let searchFrom = 0;
for(let i = 0; i < 4; i++) {
  const pcardPos = html.indexOf('class="pcard-photo"', searchFrom);
  if(pcardPos === -1) { console.error('pcard-photo not found at', i); process.exit(1); }
  const imgStart = html.indexOf('<img ', pcardPos);
  const srcStart = html.indexOf('src="', imgStart) + 5;
  const srcEnd = html.indexOf('"', srcStart);
  pcardPhotos.push(html.slice(srcStart, srcEnd));
  searchFrom = srcEnd;
}

console.log('Found', pcardPhotos.length, 'person photos');
const [drissB64, arthurB64, sachaB64, paulineB64] = pcardPhotos;

// ─── Extract collabs HTML ─────────────────────────────────────────────────────
const collabsStart = html.indexOf('<div class="collabs">');
if(collabsStart === -1) { console.error('collabs not found'); process.exit(1); }
// Find the closing div of collabs (depth counting)
let depth = 0, pos = collabsStart;
while(pos < html.length) {
  if(html.startsWith('<div', pos)) depth++;
  else if(html.startsWith('</div>', pos)) {
    depth--;
    if(depth === 0) { pos += 6; break; }
  }
  pos++;
}
const collabsHTML = html.slice(collabsStart, pos).trim();
console.log('Extracted collabs HTML:', collabsHTML.slice(0,60));

// ─── Find section range to replace ───────────────────────────────────────────
// Start: <section class="meul pad">
const sectionStart = html.indexOf('<section class="meul pad">');
if(sectionStart === -1) { console.error('meul section not found'); process.exit(1); }

// The team section starts right after a blank line following </section>
// Find the team section: <section class="pad"> containing sec-num "07"
const teamMarker = html.indexOf('sec-num">07<');
if(teamMarker === -1) { console.error('team section marker not found'); process.exit(1); }
// Walk back to find the opening <section tag
let teamSectionStart = teamMarker;
while(teamSectionStart > 0 && !html.startsWith('<section', teamSectionStart)) teamSectionStart--;

// Find end of team section
let tdepth = 0, tpos = teamSectionStart;
while(tpos < html.length) {
  if(html.startsWith('<section', tpos)) tdepth++;
  else if(html.startsWith('</section>', tpos)) {
    tdepth--;
    if(tdepth === 0) { tpos += 10; break; }
  }
  tpos++;
}
const sectionEnd = tpos;
console.log('Replacing chars', sectionStart, '-', sectionEnd);

// ─── New CSS ─────────────────────────────────────────────────────────────────
const oldCssBlock = `/* TEAM REDESIGN */
.team-orgs{display:grid;grid-template-columns:3fr 1.1fr;gap:20px;align-items:start}
.team-org{border:2px solid var(--ink);border-radius:24px;padding:clamp(20px,3vw,32px)}
.team-org-lbl{display:flex;align-items:center;gap:10px;margin-bottom:22px;flex-wrap:wrap}
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

const newCssBlock = `/* ORGANISATEURS */
.orgs-grid{display:grid;grid-template-columns:3fr 2fr;gap:24px;margin-bottom:clamp(40px,5vw,60px);align-items:start}
.org-card{border:2px solid var(--ink);border-radius:24px;padding:clamp(24px,3vw,40px)}
.org-tag{display:inline-block;background:var(--yellow);font-size:.74rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:4px 14px;border-radius:999px;margin-bottom:14px}
.org-name{font-family:"Anton",sans-serif;font-size:clamp(2.2rem,4.5vw,3.4rem);line-height:1;text-transform:uppercase;margin-bottom:0}
.org-divider{border:none;border-top:1.5px solid var(--line);margin:20px 0}
.org-desc{font-size:.9rem;line-height:1.7;color:var(--ink);margin-bottom:20px}
.org-stats-row{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px}
.org-stat{background:var(--cream);border-radius:12px;padding:10px 16px;display:flex;flex-direction:column;gap:2px;flex:1;min-width:80px}
.org-stat b{font-family:"Anton",sans-serif;font-size:1.3rem;line-height:1;color:var(--blue)}
.org-stat span{font-size:.72rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.org-people{display:flex;gap:16px;flex-wrap:wrap;border-top:1.5px solid var(--line);padding-top:20px}
.pmini{display:flex;align-items:center;gap:10px}
.pmini-photo{width:50px;height:50px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--cream)}
.pmini-photo img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block}
.pmini-name{font-weight:700;font-size:.84rem;line-height:1.25;color:var(--ink)}
.pmini-role{font-size:.72rem;color:var(--muted);font-weight:500}
@media(max-width:860px){.orgs-grid{grid-template-columns:1fr}}`;

// ─── New HTML section ─────────────────────────────────────────────────────────
const newSection = `<section class="pad" id="orgs">
  <div class="wrap">
    <div class="sec-head rv"><span class="sec-num">06</span><span class="kicker" style="color:var(--yellow)">Les organisateurs</span></div>
    <h2 class="display h2 rv" style="margin-bottom:clamp(36px,5vw,56px)">Derrière le projet, <span class="blue">deux équipes</span></h2>
    <div class="orgs-grid">

      <div class="org-card rv">
        <span class="org-tag">Organisateur de l'événement</span>
        <div class="org-name">La Meulerie</div>
        <hr class="org-divider">
        <p class="org-desc">Fromagerie marseillaise fondée sur la passion du fromage et l'énergie d'une ville. Quatre boutiques à Marseille, trois franchises en développement — La Meulerie incarne un fromage accessible, festif et ancré dans la culture populaire méditerranéenne. Une philosophie inclusive, une communication digitale affirmée et des partenariats audacieux avec des marques nationales.</p>
        <div class="org-stats-row">
          <div class="org-stat"><b>4</b><span>boutiques Marseille</span></div>
          <div class="org-stat"><b>3</b><span>franchises</span></div>
          <div class="org-stat"><b>30K+</b><span>abonnés</span></div>
        </div>
        <div class="org-people">
          <div class="pmini">
            <div class="pmini-photo"><img src="${drissB64}" alt="Driss Azzoug"></div>
            <div><div class="pmini-name">Driss Azzoug</div><div class="pmini-role">Cofondateur</div></div>
          </div>
          <div class="pmini">
            <div class="pmini-photo"><img src="${arthurB64}" alt="Arthur Barret"></div>
            <div><div class="pmini-name">Arthur Barret</div><div class="pmini-role">Cofondateur</div></div>
          </div>
          <div class="pmini">
            <div class="pmini-photo"><img src="${sachaB64}" alt="Sacha Bassili"></div>
            <div><div class="pmini-name">Sacha Bassili</div><div class="pmini-role">Directrice des Opérations</div></div>
          </div>
        </div>
      </div>

      <div class="org-card rv d1">
        <span class="org-tag">Relations institutionnelles</span>
        <div class="org-name">Octobre</div>
        <hr class="org-divider">
        <p class="org-desc">Cabinet de conseil en stratégie événementielle et mécénat culturel. Pauline Mateo a piloté le prologue de la Flamme Olympique à Marseille (Paris 2024), accompagné 8BA, le Festival d'Aix-en-Provence et la fondation YEMMA (13 Habitat). Une expertise rare au croisement de l'événementiel, du territoire et de l'intérêt général.</p>
        <div class="org-people">
          <div class="pmini">
            <div class="pmini-photo"><img src="${paulineB64}" alt="Pauline Mateo"></div>
            <div><div class="pmini-name">Pauline Mateo</div><div class="pmini-role">Fondatrice</div></div>
          </div>
        </div>
      </div>

    </div>

    ${collabsHTML}
  </div>
</section>

`;

// ─── Apply changes ────────────────────────────────────────────────────────────
let result = html.slice(0, sectionStart) + newSection + html.slice(sectionEnd);

// Replace the CSS block
if(!result.includes(oldCssBlock)) {
  console.error('CSS block not found - attempting partial match');
  // Try finding just the start marker
  const cssMarker = result.indexOf('/* TEAM REDESIGN */');
  if(cssMarker === -1) { console.error('TEAM REDESIGN CSS marker missing'); process.exit(1); }
  // Find end of that CSS block (next comment or blank line)
  const nextComment = result.indexOf('\n\n/* COMM', cssMarker);
  if(nextComment === -1) { console.error('Could not find end of TEAM CSS block'); process.exit(1); }
  result = result.slice(0, cssMarker) + newCssBlock + result.slice(nextComment);
} else {
  result = result.replace(oldCssBlock, newCssBlock);
}

// Update section number 07 → 07 (team removed, dispositif was 08, update numbering)
// Section 07 (team) is now gone, so renumber: dispositif 08 → 07, acteurs 09 → 08 etc.
// Actually let's just leave other section numbers as is to avoid cascading changes

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', result, 'utf8');
console.log('Done. File size:', result.length, 'bytes');
