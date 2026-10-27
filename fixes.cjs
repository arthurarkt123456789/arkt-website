const fs = require('fs');
let html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');

// ─── 1. Chauffage du public → La rumeur commence ─────────────────────────────
html = html.replace('<h3>Chauffage du public</h3>', '<h3>La rumeur commence</h3>');
console.log('1. chauffage fixed');

// ─── 2. Fix collabs CSS — restore dark background ────────────────────────────
const oldCollabsCss = `.collabs{margin-top:clamp(60px,8vw,100px)}
.collabs h3{font-family:"Anton",sans-serif;font-weight:400;text-transform:uppercase;font-size:clamp(1.8rem,3vw,2.6rem);margin-bottom:22px}
.cgrid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
.cgrid figure{position:relative;border-radius:14px;overflow:hidden;aspect-ratio:4/5;background:#000}
.cgrid img{width:100%;height:100%;object-fit:cover;transition:transform .6s,opacity .4s}
.cgrid figure:hover img{transform:scale(1.07);opacity:.55}
.cgrid figcaption{position:absolute;left:0;right:0;bottom:0;padding:24px 10px 10px;background:linear-gradient(0deg,rgba(0,0,0,.75),transparent);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;line-height:1.25}
.cgrid figcaption small{display:block;font-weight:500;opacity:.75}
@media(max-width:1000px){.cgrid{grid-template-columns:repeat(4,1fr)}}
@media(max-width:600px){.cgrid{grid-template-columns:repeat(2,1fr)}}`;

const newCollabsCss = `.collabs{background:var(--blue);border-radius:24px;padding:clamp(32px,4vw,56px);margin-top:clamp(60px,8vw,100px)}
.collabs h3{font-family:"Anton",sans-serif;font-weight:400;text-transform:uppercase;font-size:clamp(1.8rem,3vw,2.6rem);margin-bottom:22px;color:#fff}
.cgrid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
.cgrid figure{position:relative;border-radius:14px;overflow:hidden;aspect-ratio:4/5;background:#000}
.cgrid img{width:100%;height:100%;object-fit:cover;transition:transform .6s,opacity .4s}
.cgrid figure:hover img{transform:scale(1.07);opacity:.55}
.cgrid figcaption{position:absolute;left:0;right:0;bottom:0;padding:24px 10px 10px;background:linear-gradient(0deg,rgba(0,0,0,.75),transparent);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;line-height:1.25;color:#fff}
.cgrid figcaption small{display:block;font-weight:500;opacity:.75;color:#fff}
@media(max-width:1000px){.cgrid{grid-template-columns:repeat(4,1fr)}}
@media(max-width:600px){.cgrid{grid-template-columns:repeat(2,1fr)}}`;

if(html.includes(oldCollabsCss)){
  html = html.replace(oldCollabsCss, newCollabsCss);
  console.log('2. collabs CSS fixed (occurrence 1)');
} else {
  console.error('collabs CSS not found');
  process.exit(1);
}

// If there's a second occurrence (duplicate style block), fix it too
if(html.includes(oldCollabsCss)){
  html = html.replace(oldCollabsCss, newCollabsCss);
  console.log('2b. collabs CSS fixed (occurrence 2)');
}

// ─── 3. Add CTAs to entreprise packs ─────────────────────────────────────────
const oldEntreprisePacks = `<div class="ap-packs">
<div class="ap-pack gold"><span class="pk">1 place · Partenaire principal</span><h4>Naming & présence totale</h4><ul><li>Naming « présenté par [votre marque] »</li><li>Logo majeur sur tous les supports</li><li>Prise de parole sur scène</li><li>10 tables réservées, nappes brandées</li><li>Espace d'activation sur site</li><li>Usage du titre record du monde</li></ul></div>
              <div class="ap-pack"><span class="pk">4 places · Partenaire officiel</span><h4>Visibilité & activation</h4><ul><li>Logo sur affiches, minisite, billetterie</li><li>Citation dans les communiqués</li><li>3 tables réservées, nappes brandées</li><li>Stand sur site</li><li>Accès espace hospitalité</li></ul></div>
              <div class="ap-pack"><span class="pk">20 places · Partenaire table</span><h4>Une table à vos couleurs</h4><ul><li>Une table de 8 à votre nom</li><li>Logo sur écrans géants</li><li>Logo sur le minisite</li><li>Contenu dédié sur nos réseaux</li></ul></div>
            </div>
          </div>`;

const newEntreprisePacks = `<div class="ap-packs">
<div class="ap-pack gold"><span class="pk">1 place · Partenaire principal</span><h4>Naming & présence totale</h4><ul><li>Naming « présenté par [votre marque] »</li><li>Logo majeur sur tous les supports</li><li>Prise de parole sur scène</li><li>10 tables réservées, nappes brandées</li><li>Espace d'activation sur site</li><li>Usage du titre record du monde</li></ul><div class="ap-pack-footer"><div><span class="ap-price">30 000 €<small>HT</small></span></div><button class="ap-pack-btn" onclick="document.getElementById('contact').scrollIntoView({behavior:'smooth'})">Devenir partenaire principal →</button></div></div>
              <div class="ap-pack"><span class="pk">4 places · Partenaire officiel</span><h4>Visibilité & activation</h4><ul><li>Logo sur affiches, minisite, billetterie</li><li>Citation dans les communiqués</li><li>3 tables réservées, nappes brandées</li><li>Stand sur site</li><li>Accès espace hospitalité</li></ul><div class="ap-pack-footer"><div><span class="ap-price">10 000 €<small>HT</small></span></div><button class="ap-pack-btn" onclick="document.getElementById('contact').scrollIntoView({behavior:'smooth'})">Réserver ce forfait →</button></div></div>
              <div class="ap-pack"><span class="pk">20 places · Partenaire table</span><h4>Une table à vos couleurs</h4><ul><li>Une table de 8 à votre nom</li><li>Logo sur écrans géants</li><li>Logo sur le minisite</li><li>Contenu dédié sur nos réseaux</li></ul><div class="ap-pack-footer"><div><span class="ap-price">3 500 €<small>HT</small></span></div><button class="ap-pack-btn" onclick="document.getElementById('contact').scrollIntoView({behavior:'smooth'})">Réserver une table →</button></div></div>
            </div>
            <div class="ap-cta">
              <p>Un projet à votre mesure ? On s'adapte. Contactez-nous pour un devis personnalisé ou pour échanger sur les opportunités de visibilité.</p>
              <button class="ap-cta-btn" onclick="document.getElementById('contact').scrollIntoView({behavior:'smooth'})">Recevoir le dossier partenaires →</button>
            </div>
          </div>`;

if(html.includes(oldEntreprisePacks)){
  html = html.replace(oldEntreprisePacks, newEntreprisePacks);
  console.log('3. entreprise CTAs added');
} else {
  // Try without leading whitespace (could vary)
  console.error('entreprise packs block not found exactly');
  // Debug: show what we're looking for
  const idx = html.indexOf('Naming & présence totale');
  console.log('Naming found at:', idx);
  if(idx > -1){
    console.log('Context:', html.slice(idx-200, idx+500).replace(/\n/g,'↵'));
  }
  process.exit(1);
}

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', html, 'utf8');
console.log('Done. Size:', html.length);
