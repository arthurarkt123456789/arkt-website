const fs = require('fs');
let html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');

// ─── Helper: extract a section by its opening tag ────────────────────────────
function extractSection(openTag){
  const start = html.indexOf(openTag);
  if(start === -1) return null;
  let depth = 0, pos = start;
  while(pos < html.length){
    if(html.startsWith('<section', pos)) depth++;
    else if(html.startsWith('</section>', pos)){ depth--; if(depth===0){ pos += 10; break; } }
    pos++;
  }
  return { start, end: pos, content: html.slice(start, pos) };
}

// ─── 1. Extract mani-img base64 src ──────────────────────────────────────────
const maniSection = extractSection('<section class="manifesto pad" id="projet">');
const maniImgMatch = maniSection.content.match(/class="mani-img[^>]*><img src="(data:[^"]+)"/);
const maniImgSrc = maniImgMatch ? maniImgMatch[1] : '';
console.log('Mani img src length:', maniImgSrc.length);

// ─── 2. Extract arrondissements HTML ─────────────────────────────────────────
const socialSection = extractSection('<section class="social pad">');
const arrMatch = socialSection.content.match(/<div class="arr rv"[^>]*>([\s\S]*?)<\/div>\n    <\/div>/);
const arrHtml = arrMatch ? arrMatch[0] : '';

// ─── 3. Build the new combined section ───────────────────────────────────────
const newSection = `<section class="story-scroll" id="projet">
  <div class="wrap">
    <div class="story-tabs" role="tablist">
      <button class="story-tab active" data-slide="0" role="tab">Le projet</button>
      <button class="story-tab" data-slide="1" role="tab">Portée sociale</button>
      <button class="story-tab" data-slide="2" role="tab">Dispositif de com.</button>
    </div>
  </div>

  <div class="story-outer">
    <div class="story-track" id="storyTrack">

      <!-- ── SLIDE 1 : Le projet ─────────────────────────────────────────── -->
      <div class="story-slide">
        <div class="wrap">
          <div class="sec-head rv"><span class="sec-num">01</span><span class="kicker">Le projet</span></div>
          <div class="story-2col">
            <div class="story-text">
              <h2 class="display h2 rv">Une seule tablée<br><em>face à la&nbsp;Méditerranée</em></h2>
              <p class="lead rv" style="margin-top:26px">Un dimanche d'octobre 2027, 5 000 Marseillais partagent le même repas sur le parvis du MuCEM. Une raclette géante, un record du monde, une ville entière autour de la table.</p>
              <ul class="reasons rv">
                <li data-n="1"><span>Dans <b>l'un des plus beaux lieux</b> où partager un déjeuner, entre le MuCEM, le fort Saint-Jean et la mer.</span></li>
                <li data-n="2"><span>Pour <b>faire rayonner Marseille</b> avec un record du monde inattendu.</span></li>
                <li data-n="3"><span>Pour célébrer <b>l'artisanat français et le lait cru</b> — le fromage comme produit vivant, façonné par des passionnés dans des fromageries de territoire.</span></li>
                <li data-n="4"><span>Pour faire <b>découvrir comment est fait le fromage</b> — une expérience sensorielle et pédagogique, populaire et accessible à tous.</span></li>
                <li data-n="5"><span>Pour <b>réunir tous les enfants de Marseille</b>, sans condition de moyens, autour d'un même repas.</span></li>
              </ul>
              <span class="script rv" style="margin-top:28px;display:block">Un produit populaire. Un savoir-faire unique. Une ville entière autour de la table.</span>
            </div>
            <div class="mani-img rv d2"><img src="${maniImgSrc}" alt="Raclette fondante sur pommes de terre" style="width:100%;height:100%;object-fit:cover;border-radius:20px;display:block"></div>
          </div>
        </div>
      </div>

      <!-- ── SLIDE 2 : Portée sociale ───────────────────────────────────── -->
      <div class="story-slide story-slide--pink">
        <div class="wrap">
          <div class="sec-head rv"><span class="sec-num" style="color:var(--ink);border-color:var(--ink)">04</span><span class="kicker">La portée sociale</span></div>
          <div class="social-grid">
            <div class="big-half rv">50%<small>des places offertes aux Marseillais<br>qui n'ont pas accès à ce repas</small></div>
            <div>
              <h2 class="display h2 rv" style="font-size:clamp(2.4rem,5vw,4.4rem)">La raclette, sans condition de moyens</h2>
              <p class="lead rv" style="margin-top:22px;color:var(--ink)">Depuis le premier jour, La Meulerie s'est donné une mission : démocratiser le fromage, encore souvent perçu comme un produit de niche. 2 500 places sont attribuées via les associations partenaires des 16 arrondissements.</p>
              ${arrHtml}
            </div>
          </div>
        </div>
      </div>

      <!-- ── SLIDE 3 : Dispositif de com. ───────────────────────────────── -->
      <div class="story-slide">
        <div class="wrap">
          <div class="sec-head rv"><span class="sec-num">08</span><span class="kicker">Le dispositif de com.</span></div>
          <h2 class="display h2 rv">Un événement qui vit <span class="blue">avant, pendant, après</span></h2>
          <p class="lead rv" style="margin-top:24px;max-width:64ch">De la première story jusqu'aux retombées TV — chaque étape génère de la visibilité pour nos partenaires. Une stratégie en 6 temps, construite pour amplifier l'impact à chaque phase.</p>

          <div class="comm-tl-v">

            <div class="ctv-step rv">
              <div class="ctv-dot"></div>
              <div class="ctv-phone"><div class="iphone-mock"><div class="iph-notch"></div><div class="iph-screen iph-s1"><div class="iph-ico">🧀</div><div class="iph-title">Quelque chose arrive</div><div class="iph-sub">#LaMeulerie</div></div></div></div>
              <div class="ctv-info">
                <span class="ctv-when">Automne 2026</span>
                <h3>Teasing &amp; rumeur</h3>
                <p>Teasers mystère, stories cryptées, premiers contenus. 30 000 abonnés en alerte. Ligne éditoriale inspirée de formats viraux à fort pouvoir de partage.</p>
                <div class="ctv-tags"><span>Instagram</span><span>TikTok</span><span>Newsletter</span></div>
                <div class="inspo-row">
                  <p class="inspo-label-txt">Références éditoriales :</p>
                  <div class="inspo-cards">
                    <div class="inspo-card">
                      <div class="inspo-thumb" style="background:linear-gradient(135deg,#f5a623 0%,#e4006f 100%)">
                        <span class="inspo-emoji">🎀</span>
                        <span class="inspo-title-badge">The Simple Life</span>
                      </div>
                      <span class="inspo-sub">Format reality show décalé</span>
                    </div>
                    <div class="inspo-card">
                      <div class="inspo-thumb" style="background:linear-gradient(135deg,#e50914 0%,#1a1a2e 100%)">
                        <span class="inspo-emoji">🥛</span>
                        <span class="inspo-title-badge">Lait'flix</span>
                      </div>
                      <span class="inspo-sub">Série documentaire lait &amp; terroir</span>
                    </div>
                  </div>
                  <div class="partner-suggest">
                    <span class="ps-lbl">Production de contenu suggérée :</span>
                    <div class="ps-logos">
                      <div class="ps-logo ps-logo--etendar">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" fill="var(--blue)"/><path d="M5 9h8M9 5l4 4-4 4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <span>We Are Etendar</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="ctv-step rv">
              <div class="ctv-dot"></div>
              <div class="ctv-phone"><div class="iphone-mock"><div class="iph-notch"></div><div class="iph-screen iph-s2"><div class="iph-ico">📰</div><div class="iph-title">Conférence de presse</div><div class="iph-sub">Presse · Radio · TV</div></div></div></div>
              <div class="ctv-info">
                <span class="ctv-when">Hiver 2026–2027</span>
                <h3>Annonce officielle</h3>
                <p>Conférence de presse, premiers articles locaux et nationaux. Les partenaires fondateurs cités dans tous les communiqués. Accueil des médias régionaux et nationaux.</p>
                <div class="ctv-tags"><span>Presse locale</span><span>Radio</span><span>TV régionale</span><span>Agences RP</span></div>
              </div>
            </div>

            <div class="ctv-step rv">
              <div class="ctv-dot"></div>
              <div class="ctv-phone"><div class="iphone-mock"><div class="iph-notch"></div><div class="iph-screen iph-s3"><div class="iph-ico">🎟️</div><div class="iph-title">SOLD OUT 48h</div><div class="iph-sub">5 000 places</div></div></div></div>
              <div class="ctv-info">
                <span class="ctv-when">Printemps 2027</span>
                <h3>Ouverture billetterie</h3>
                <p>Rush tickets, explosion des réseaux sociaux. Sold out en 48h comme Martigny en 2025. Les logos partenaires sur la billetterie et dans chaque email de confirmation.</p>
                <div class="ctv-tags"><span>Buzz réseaux</span><span>Articles nationaux</span><span>Billetterie</span></div>
                <div class="inspo-row">
                  <div class="inspo-cards">
                    <div class="inspo-card">
                      <div class="inspo-thumb" style="background:linear-gradient(135deg,#f5a623 0%,#e4006f 100%)">
                        <span class="inspo-emoji">🎀</span>
                        <span class="inspo-title-badge">The Simple Life</span>
                      </div>
                      <span class="inspo-sub">Contenu d'activation billetterie</span>
                    </div>
                    <div class="inspo-card">
                      <div class="inspo-thumb" style="background:linear-gradient(135deg,#e50914 0%,#1a1a2e 100%)">
                        <span class="inspo-emoji">🥛</span>
                        <span class="inspo-title-badge">Lait'flix</span>
                      </div>
                      <span class="inspo-sub">Série teaser décompte</span>
                    </div>
                  </div>
                  <div class="partner-suggest">
                    <span class="ps-lbl">Partenaire institutionnel :</span>
                    <div class="ps-logos">
                      <div class="ps-logo ps-logo--dairy">
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><ellipse cx="11" cy="11" rx="10" ry="10" fill="#fff" stroke="#0A0A14" stroke-width="1.5"/><path d="M7 8c0-2.2 1.8-4 4-4s4 1.8 4 4c0 3-4 9-4 9S7 11 7 8z" fill="#0A0A14"/><circle cx="11" cy="8" r="1.5" fill="#fff"/></svg>
                        <span>Produits Laitiers</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="ctv-step rv">
              <div class="ctv-dot"></div>
              <div class="ctv-phone"><div class="iphone-mock"><div class="iph-notch"></div><div class="iph-screen iph-s4"><div class="iph-play"></div><div class="iph-title">Dans les coulisses</div><div class="iph-sub">Artisans · Lait cru</div></div></div></div>
              <div class="ctv-info">
                <span class="ctv-when">Été 2027</span>
                <h3>Com' continue &amp; relations presse</h3>
                <p>Countdown semaine par semaine, portraits d'artisans fromagers, coulisses de la préparation. Relations presse nationales et internationales. Vos marques dans chaque contenu.</p>
                <div class="ctv-tags"><span>Vidéos artisans</span><span>Presse nationale</span><span>Countdown</span><span>Partenaires</span></div>
              </div>
            </div>

            <div class="ctv-step rv">
              <div class="ctv-dot"></div>
              <div class="ctv-phone"><div class="iphone-mock"><div class="iph-notch"></div><div class="iph-screen iph-s5"><div class="iph-live">LIVE</div><div class="iph-title">5 000 convives</div><div class="iph-sub">Parvis du MuCEM</div></div></div></div>
              <div class="ctv-info">
                <span class="ctv-when">Octobre 2027 · Jour J</span>
                <h3>Explosion des réseaux sociaux</h3>
                <p>Stories, Reels, trending France. Presse nationale en direct. Vos marques dans chaque image, chaque live, chaque article. Constat officiel et remise du titre Guinness en direct.</p>
                <div class="ctv-tags"><span>Live Instagram</span><span>Trending TikTok</span><span>Presse nat.</span><span>Guinness WR</span></div>
              </div>
            </div>

            <div class="ctv-step rv">
              <div class="ctv-dot"></div>
              <div class="ctv-phone"><div class="iphone-mock"><div class="iph-notch"></div><div class="iph-screen iph-s6"><div class="iph-play"></div><div class="iph-title">Aftermovie officiel</div><div class="iph-sub">+2M vues · TV · Int'l</div></div></div></div>
              <div class="ctv-info">
                <span class="ctv-when">Après l'événement</span>
                <h3>Retombées médias durables</h3>
                <p>TV nationale et internationale, presse écrite, aftermovie viral sur les plateformes. Votre logo dans un contenu diffusé longtemps après l'événement. Visibilité longue durée pour tous les partenaires.</p>
                <div class="ctv-tags"><span>TV</span><span>Presse int'l</span><span>Aftermovie</span><span>Plateformes</span></div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div><!-- /story-track -->
  </div><!-- /story-outer -->

  <div class="story-nav wrap">
    <button class="story-arr" id="storyPrev" aria-label="Précédent">←</button>
    <div class="story-dots" id="storyDots">
      <span class="active"></span><span></span><span></span>
    </div>
    <button class="story-arr" id="storyNext" aria-label="Suivant">→</button>
  </div>
</section>`;

// ─── 4. Replace manifesto section with new combined section ──────────────────
html = html.slice(0, maniSection.start) + newSection + html.slice(maniSection.end);
console.log('4. Manifesto replaced with combined section');

// Re-find sections after replacement (offsets changed)
const html2 = html;

// ─── 5. Remove section 04 (social) ───────────────────────────────────────────
const socialStart2 = html.indexOf('<section class="social pad">');
if(socialStart2 === -1){ console.error('Social section not found'); }
else {
  let depth = 0, pos = socialStart2;
  while(pos < html.length){
    if(html.startsWith('<section', pos)) depth++;
    else if(html.startsWith('</section>', pos)){ depth--; if(depth===0){ pos += 10; break; } }
    pos++;
  }
  html = html.slice(0, socialStart2) + html.slice(pos);
  console.log('5. Social section removed');
}

// ─── 6. Remove section 08 (dispo) ────────────────────────────────────────────
const dispoStart = html.indexOf('<section class="dispo pad" id="dispositif">');
if(dispoStart === -1){ console.error('Dispo section not found'); }
else {
  let depth = 0, pos = dispoStart;
  while(pos < html.length){
    if(html.startsWith('<section', pos)) depth++;
    else if(html.startsWith('</section>', pos)){ depth--; if(depth===0){ pos += 10; break; } }
    pos++;
  }
  html = html.slice(0, dispoStart) + html.slice(pos);
  console.log('6. Dispo section removed');
}

// ─── 7. Add CSS for new section + update global margins ──────────────────────
const newCss = `
/* ── STORY SCROLL (merged 01/04/08) ─────────────────────────────────────── */
.story-scroll{padding-top:clamp(60px,8vw,100px);padding-bottom:clamp(60px,8vw,100px)}
.story-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:clamp(36px,5vw,56px)}
.story-tab{background:transparent;border:2px solid var(--ink);border-radius:999px;padding:10px 22px;font-family:"Inter",sans-serif;font-weight:700;font-size:.86rem;cursor:pointer;transition:all .2s;color:var(--ink)}
.story-tab.active,.story-tab:hover{background:var(--ink);color:#fff}
.story-outer{overflow:hidden}
.story-track{display:flex;transition:transform .5s cubic-bezier(.4,0,.2,1)}
.story-slide{min-width:100%;flex-shrink:0}
.story-2col{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,4vw,60px);align-items:center;margin-top:clamp(36px,4vw,52px)}
.story-text{}
.story-slide--pink{background:var(--pink)}
.story-nav{display:flex;align-items:center;gap:20px;margin-top:clamp(36px,4vw,48px)}
.story-arr{background:var(--ink);color:#fff;border:0;width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:1rem;display:grid;place-items:center;transition:transform .2s,opacity .2s}
.story-arr:disabled{opacity:.3;cursor:default}
.story-dots{display:flex;gap:8px}
.story-dots span{width:8px;height:8px;border-radius:50%;background:var(--ink);opacity:.25;transition:opacity .3s}
.story-dots span.active{opacity:1}
/* Inspiration cards */
.inspo-row{margin-top:20px;border-top:1px solid rgba(0,0,0,.1);padding-top:16px}
.inspo-label-txt{font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:10px}
.inspo-cards{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.inspo-card{width:130px;flex-shrink:0}
.inspo-thumb{border-radius:12px;aspect-ratio:16/10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;overflow:hidden;position:relative}
.inspo-emoji{font-size:1.6rem}
.inspo-title-badge{font-family:"Inter",sans-serif;font-weight:800;font-size:.62rem;color:#fff;text-transform:uppercase;letter-spacing:.06em;text-align:center;padding:2px 8px;background:rgba(0,0,0,.35);border-radius:999px}
.inspo-sub{display:block;font-size:.72rem;color:var(--muted);margin-top:5px;line-height:1.3}
/* Partner suggest */
.partner-suggest{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.ps-lbl{font-size:.74rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.ps-logos{display:flex;gap:10px;flex-wrap:wrap}
.ps-logo{display:flex;align-items:center;gap:7px;background:var(--ink);color:#fff;border-radius:999px;padding:6px 14px;font-size:.78rem;font-weight:700;letter-spacing:.02em}
.ps-logo--dairy{background:var(--yellow);color:var(--ink)}
@media(max-width:900px){.story-2col{grid-template-columns:1fr}.mani-img{display:none}}
@media(max-width:600px){.story-tab{font-size:.78rem;padding:8px 14px}}`;

// Insert CSS right before the closing </style> of the first style block
const firstStyleEnd = html.indexOf('</style>');
html = html.slice(0, firstStyleEnd) + newCss + '\n' + html.slice(firstStyleEnd);
console.log('7. CSS added');

// ─── 8. Update global text margins ───────────────────────────────────────────
// Reduce max-width and increase gutter for more breathing room
html = html.replace('--maxw:1320px', '--maxw:1160px');
html = html.replace('--gutter:clamp(16px,4vw,64px)', '--gutter:clamp(20px,5vw,80px)');
console.log('8. Global text margins updated (maxw 1320→1160, gutter increased)');

// ─── 9. Add JavaScript for the story slider ───────────────────────────────────
const storyJs = `
// Story slider (merged 01/04/08)
(function(){
  var track = document.getElementById('storyTrack');
  var tabs = document.querySelectorAll('.story-tab');
  var dots = document.querySelectorAll('#storyDots span');
  var prev = document.getElementById('storyPrev');
  var next = document.getElementById('storyNext');
  var current = 0;
  var total = 3;

  function goTo(n){
    current = Math.max(0, Math.min(total-1, n));
    track.style.transform = 'translateX(-' + current*100 + '%)';
    tabs.forEach(function(t,i){ t.classList.toggle('active', i===current); });
    dots.forEach(function(d,i){ d.classList.toggle('active', i===current); });
    if(prev) prev.disabled = current === 0;
    if(next) next.disabled = current === total-1;
  }

  tabs.forEach(function(t){ t.addEventListener('click', function(){ goTo(+this.dataset.slide); }); });
  if(prev) prev.addEventListener('click', function(){ goTo(current-1); });
  if(next) next.addEventListener('click', function(){ goTo(current+1); });
  goTo(0);
})();`;

// Insert JS before closing </script> of the main script block
const mainScriptEnd = html.lastIndexOf('</script>');
html = html.slice(0, mainScriptEnd) + storyJs + '\n' + html.slice(mainScriptEnd);
console.log('9. Story slider JS added');

// ─── 10. Update nav links ─────────────────────────────────────────────────────
// Remove dispo link from nav if present
html = html.replace(/<a[^>]*href="#dispositif"[^>]*>[^<]*<\/a>/g, '');
console.log('10. Nav cleaned');

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', html, 'utf8');
console.log('Done. Size:', html.length);
