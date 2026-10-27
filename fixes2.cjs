const fs = require('fs');
let html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');

// ─── Add CTAs to entreprise packs using index-based replacement ───────────────
// Find the entreprise ap-packs block: it's the first occurrence that contains "1 place · Partenaire principal"
const ANCHOR_START = '<div class="ap-packs">\n              <div class="ap-pack gold"><span class="pk">1 place · Partenaire principal</span>';
const idx = html.indexOf(ANCHOR_START);
if(idx === -1){ console.error('Entreprise packs anchor not found'); process.exit(1); }

// Find the end of this ap-packs block: closing </div>\n            </div>\n\n          </div>
// We count depth from the ap-packs div start
let depth = 0, pos = idx;
while(pos < html.length){
  if(html.startsWith('<div', pos)) depth++;
  else if(html.startsWith('</div>', pos)){
    depth--;
    if(depth === 0){ pos += 6; break; }
  }
  pos++;
}
const packsEnd = pos;
console.log('Entreprise packs block:', idx, '-', packsEnd);
console.log('Current block (truncated):', html.slice(idx, Math.min(idx+200, packsEnd)));

// New packs block with CTAs and prices
const newPacks = `<div class="ap-packs">
              <div class="ap-pack gold"><span class="pk">1 place · Partenaire principal</span><h4>Naming & présence totale</h4><ul><li>Naming « présenté par [votre marque] »</li><li>Logo majeur sur tous les supports</li><li>Prise de parole sur scène</li><li>10 tables réservées, nappes brandées</li><li>Espace d'activation sur site</li><li>Usage du titre record du monde</li></ul><div class="ap-pack-footer"><div><span class="ap-price">30 000 €<small>HT</small></span></div><button class="ap-pack-btn" onclick="document.getElementById('contact').scrollIntoView({behavior:'smooth'})">Devenir partenaire principal →</button></div></div>
              <div class="ap-pack"><span class="pk">4 places · Partenaire officiel</span><h4>Visibilité & activation</h4><ul><li>Logo sur affiches, minisite, billetterie</li><li>Citation dans les communiqués</li><li>3 tables réservées, nappes brandées</li><li>Stand sur site</li><li>Accès espace hospitalité</li></ul><div class="ap-pack-footer"><div><span class="ap-price">10 000 €<small>HT</small></span></div><button class="ap-pack-btn" onclick="document.getElementById('contact').scrollIntoView({behavior:'smooth'})">Réserver ce forfait →</button></div></div>
              <div class="ap-pack"><span class="pk">20 places · Partenaire table</span><h4>Une table à vos couleurs</h4><ul><li>Une table de 8 à votre nom</li><li>Logo sur écrans géants</li><li>Logo sur le minisite</li><li>Contenu dédié sur nos réseaux</li></ul><div class="ap-pack-footer"><div><span class="ap-price">3 500 €<small>HT</small></span></div><button class="ap-pack-btn" onclick="document.getElementById('contact').scrollIntoView({behavior:'smooth'})">Réserver une table →</button></div></div>
            </div>
            <div class="ap-cta">
              <p>Un projet à votre mesure ? On s'adapte. Contactez-nous pour recevoir le dossier partenaires complet.</p>
              <button class="ap-cta-btn" onclick="document.getElementById('contact').scrollIntoView({behavior:'smooth'})">Recevoir le dossier partenaires →</button>
            </div>`;

html = html.slice(0, idx) + newPacks + html.slice(packsEnd);
console.log('Entreprise CTAs injected');

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', html, 'utf8');
console.log('Done. Size:', html.length);
