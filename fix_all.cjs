const fs = require('fs');
let html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');

// ─── 1. Logo bleu: remplace l'actuel par le nouveau (sans rose) ───────────────
const newLogoB64 = 'data:image/png;base64,' + fs.readFileSync('/tmp/logo_bleu_new.png').toString('base64');
const logoBleuIdx = html.indexOf('class="logo-bleu"');
const imgStart = html.indexOf('<img', logoBleuIdx);
const srcStart = html.indexOf('src="', imgStart) + 5;
const srcEnd = html.indexOf('"', srcStart);
html = html.slice(0, srcStart) + newLogoB64 + html.slice(srcEnd);
console.log('1. Logo bleu replaced');

// ─── 2. Hero kicker: aligner à gauche ────────────────────────────────────────
// hero-txt is flex column — add align-items:flex-start to pin children left
const oldHeroTxt = '.hero-txt{padding:120px var(--gutter) 60px;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2}';
const newHeroTxt = '.hero-txt{padding:120px var(--gutter) 60px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;position:relative;z-index:2}';
if(html.includes(oldHeroTxt)){ html = html.replace(oldHeroTxt, newHeroTxt); console.log('2. Hero txt aligned left'); }
else { console.error('hero-txt CSS not found'); }

// ─── 3. Redesign section équipe ──────────────────────────────────────────────
// Change section background to dark ink, redesign cards
const oldTeamSection = '<section class="pad">\n  <div class="wrap">\n    <div class="sec-head rv"><span class="sec-num">07</span><span class="kicker">L\'équipe</span></div>\n    <h2 class="display h2 rv" style="margin-bottom:clamp(36px,5vw,56px)">Une équipe <span class="blue">resserrée</span></h2>';
const newTeamSection = '<section class="pad team-section">\n  <div class="wrap">\n    <div class="sec-head rv"><span class="sec-num">07</span><span class="kicker">L\'équipe</span></div>\n    <h2 class="display h2 rv" style="margin-bottom:clamp(36px,5vw,56px)">Une équipe <span class="blue">resserrée</span></h2>';
if(html.includes(oldTeamSection)){ html = html.replace(oldTeamSection, newTeamSection); console.log('3. Team section class added'); }
else { console.error('Team section opening not found'); }

// Update team CSS for premium look
const oldTeamCss = `.team-orgs{display:grid;grid-template-columns:3fr 1.1fr;gap:20px;align-items:stretch}
.team-org{border:2px solid var(--ink);border-radius:24px;padding:clamp(20px,3vw,32px);display:flex;flex-direction:column}
.team-org-lbl{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap}
.team-org-lbl strong{background:var(--yellow);font-weight:700;font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;padding:5px 14px;border-radius:999px}
.team-org-lbl span{font-size:.82rem;color:var(--muted);font-weight:600}
.team-persons{display:flex;gap:18px;align-items:flex-end;margin-top:auto;padding-top:20px;flex-wrap:wrap}
.team-org.solo .team-persons{gap:0}
.pcard{display:flex;flex-direction:column;align-items:center;gap:0;text-align:center}
.pcard-photo{width:90px;height:90px;border-radius:50%;overflow:hidden;background:var(--cream);margin-bottom:10px;flex-shrink:0}
.pcard-photo img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;transition:transform .4s}
.pcard:hover .pcard-photo img{transform:scale(1.06)}
.pcard-name{font-family:"Anton",sans-serif;font-weight:400;text-transform:uppercase;font-size:.95rem;line-height:1;margin-bottom:3px}
.pcard-role{font-size:.76rem;color:var(--muted);font-weight:600}
@media(max-width:900px){.team-orgs{grid-template-columns:1fr}}
@media(max-width:600px){.team-persons{gap:14px}}`;

const newTeamCss = `.team-orgs{display:grid;grid-template-columns:3fr 1.1fr;gap:20px;align-items:stretch}
.team-org{border:2px solid rgba(255,255,255,.12);border-radius:24px;padding:clamp(24px,3vw,36px);display:flex;flex-direction:column;background:rgba(255,255,255,.05)}
.team-org-lbl{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}
.team-org-lbl strong{background:var(--yellow);color:var(--ink);font-weight:700;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;padding:5px 14px;border-radius:999px}
.team-org-lbl span{font-size:.8rem;color:rgba(255,255,255,.5);font-weight:600;text-transform:uppercase;letter-spacing:.1em}
.team-org>p{font-size:.88rem;line-height:1.65;color:rgba(255,255,255,.65);margin:0 0 0;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,.1)}
.team-persons{display:flex;gap:20px;align-items:flex-end;margin-top:auto;padding-top:22px;flex-wrap:wrap}
.team-org.solo .team-persons{gap:0}
.pcard{display:flex;flex-direction:column;align-items:center;gap:0;text-align:center}
.pcard-photo{width:88px;height:88px;border-radius:50%;overflow:hidden;background:var(--ink);margin-bottom:10px;flex-shrink:0;border:2.5px solid var(--yellow)}
.pcard-photo img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;transition:transform .4s}
.pcard:hover .pcard-photo img{transform:scale(1.06)}
.pcard-name{font-family:"Anton",sans-serif;font-weight:400;text-transform:uppercase;font-size:.9rem;line-height:1;margin-bottom:3px;color:#fff}
.pcard-role{font-size:.72rem;color:rgba(255,255,255,.5);font-weight:600}
.team-section{background:var(--ink);color:#fff}
.team-section .sec-num{color:var(--yellow);border-color:var(--yellow)}
.team-section .kicker{color:rgba(255,255,255,.6)}
.team-section .blue{color:var(--yellow)}
@media(max-width:900px){.team-orgs{grid-template-columns:1fr}}
@media(max-width:600px){.team-persons{gap:14px}}`;

if(html.includes(oldTeamCss)){ html = html.replace(oldTeamCss, newTeamCss); console.log('3. Team CSS redesigned'); }
else { console.error('Team CSS not found'); }

// Remove inline border-bottom from description paragraphs (now handled by CSS)
html = html.replace(
  'style="font-size:.88rem;line-height:1.65;color:var(--muted);margin:0 0 20px;padding-bottom:20px;border-bottom:1.5px solid var(--line)"',
  ''
);
html = html.replace(
  'style="font-size:.88rem;line-height:1.65;color:var(--muted);margin:0 0 20px;padding-bottom:20px;border-bottom:1.5px solid var(--line)"',
  ''
);
console.log('3. Inline styles cleaned');

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', html, 'utf8');
console.log('Done. Size:', html.length);
