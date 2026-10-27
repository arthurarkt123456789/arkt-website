const fs = require('fs');
let html = fs.readFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html','utf8');

// 1. Update Google Fonts import — Inter 300-900
html = html.replace(
  '<link href="https://fonts.googleapis.com/css2?family=Anton&family=Kalam:wght@400;700&family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,700;1,800&display=swap" rel="stylesheet">',
  '<link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..900;1,14..32,300..900&display=swap" rel="stylesheet">'
);
console.log('1. Font import updated');

// 2. Body font-family
html = html.replace(
  'font-family:"Poppins",system-ui,sans-serif;',
  'font-family:"Inter",system-ui,sans-serif;'
);

// 3. Replace all remaining font-family occurrences
html = html.replace(/font-family:"Anton",Impact,sans-serif/g, 'font-family:"Inter",system-ui,sans-serif');
html = html.replace(/font-family:"Anton",sans-serif/g, 'font-family:"Inter",sans-serif');
html = html.replace(/font-family:"Poppins",sans-serif/g, 'font-family:"Inter",sans-serif');
html = html.replace(/font-family:"Poppins",system-ui,sans-serif/g, 'font-family:"Inter",system-ui,sans-serif');
html = html.replace(/font-family:"Kalam",cursive/g, 'font-family:"Inter",sans-serif');
console.log('2. All font-family references replaced');

// 4. Fix display class: Anton at 400 → Inter needs 900 + tighter tracking for big headings
// .display was: font-family:"Anton",Impact,sans-serif;text-transform:uppercase;line-height:.92;letter-spacing:.005em;font-weight:400
html = html.replace(
  '.display{font-family:"Inter",system-ui,sans-serif;text-transform:uppercase;line-height:.92;letter-spacing:.005em;font-weight:400}',
  '.display{font-family:"Inter",system-ui,sans-serif;text-transform:uppercase;line-height:.92;letter-spacing:-.03em;font-weight:900}'
);
console.log('3. .display weight→900, letter-spacing tightened');

// 5. Fix .script class — Kalam was script/handwriting, Inter italic bold looks nice
html = html.replace(
  '.script{font-family:"Inter",sans-serif;text-transform:none;font-weight:400}',
  '.script{font-family:"Inter",sans-serif;text-transform:none;font-weight:500;font-style:italic}'
);
console.log('4. .script → Inter italic');

// 6. Bump all Anton-pattern uses: font-weight:400 adjacent to Inter → 800
// These are all the places where Anton was used as a "heading/display" font
// We look for cases where Inter replaced Anton, followed shortly by font-weight:400
// Strategy: replace ";font-weight:400" → ";font-weight:800" but ONLY in the CSS rules
// that also reference "Anton" style usage (display text, numbers, labels, etc.)
// The safest: do targeted replacements for the known patterns

const antonWeight400Patterns = [
  // .badge strong
  { old: 'font-family:"Inter",sans-serif;font-size:clamp(2rem,3.4vw,2.8rem);font-weight:400', new: 'font-family:"Inter",sans-serif;font-size:clamp(2rem,3.4vw,2.8rem);font-weight:900' },
  // .marquee span
  { old: 'font-family:"Inter",sans-serif;font-size:clamp(1.4rem,3vw,2.2rem);padding:14px 0;text-transform:uppercase', new: 'font-family:"Inter",sans-serif;font-size:clamp(1.4rem,3vw,2.2rem);font-weight:800;padding:14px 0;text-transform:uppercase' },
  // .sec-num — keep bolder
  { old: 'font-family:"Inter",sans-serif;font-size:1rem;color:var(--blue)', new: 'font-family:"Inter",sans-serif;font-size:1rem;font-weight:700;color:var(--blue)' },
  // .num strong (big yellow numbers)
  { old: 'font-family:"Inter",sans-serif;font-weight:400;font-size:clamp(2.6rem,5.2vw,4.8rem)', new: 'font-family:"Inter",sans-serif;font-weight:900;font-size:clamp(2.6rem,5.2vw,4.8rem)' },
  // .bar .val (chart values)
  { old: 'font-family:"Inter",sans-serif;font-size:clamp(1.2rem,2.6vw,2.2rem);margin-bottom:8px', new: 'font-family:"Inter",sans-serif;font-size:clamp(1.2rem,2.6vw,2.2rem);font-weight:800;margin-bottom:8px' },
  // .record-note h4
  { old: 'font-family:"Inter",sans-serif;font-weight:400;font-size:1.5rem;text-transform:uppercase', new: 'font-family:"Inter",sans-serif;font-weight:800;font-size:1.5rem;text-transform:uppercase' },
  // .pinpt b
  { old: 'font-family:"Inter",sans-serif;font-weight:400;letter-spacing:.06em', new: 'font-family:"Inter",sans-serif;font-weight:700;letter-spacing:.04em' },
  // .facts b
  { old: 'font-family:"Inter",sans-serif;font-weight:400;font-size:1.5rem;display:block;color:var(--blue);text-transform:uppercase', new: 'font-family:"Inter",sans-serif;font-weight:900;font-size:1.5rem;display:block;color:var(--blue);text-transform:uppercase' },
  // .big-half
  { old: 'font-family:"Inter",sans-serif;font-size:clamp(7rem,22vw,19rem);line-height:.8', new: 'font-family:"Inter",sans-serif;font-size:clamp(7rem,22vw,19rem);font-weight:900;line-height:.8' },
  // .big-half small
  { old: 'font-family:"Inter",sans-serif;font-weight:800;font-size:clamp(1rem,2vw,1.4rem)', new: 'font-family:"Inter",sans-serif;font-weight:800;font-size:clamp(1rem,2vw,1.4rem)' },
  // .arr span
  { old: 'font-family:"Inter",sans-serif;font-size:.95rem;transition:transform .3s,background .3s', new: 'font-family:"Inter",sans-serif;font-size:.95rem;font-weight:700;transition:transform .3s,background .3s' },
  // .exp h3
  { old: 'font-family:"Inter",sans-serif;font-weight:400;text-transform:uppercase;font-size:1.9rem', new: 'font-family:"Inter",sans-serif;font-weight:800;text-transform:uppercase;font-size:1.9rem' },
  // .meul-stats b
  { old: 'font-family:"Inter",sans-serif;font-weight:400;font-size:clamp(2rem,3.6vw,3rem)', new: 'font-family:"Inter",sans-serif;font-weight:900;font-size:clamp(2rem,3.6vw,3rem)' },
  // .collabs h3
  { old: 'font-family:"Inter",sans-serif;font-weight:400;text-transform:uppercase;font-size:clamp(1.8rem,3vw,2.6rem)', new: 'font-family:"Inter",sans-serif;font-weight:800;text-transform:uppercase;font-size:clamp(1.8rem,3vw,2.6rem)' },
  // .card h3
  { old: 'font-family:"Inter",sans-serif;font-weight:400;text-transform:uppercase;font-size:clamp(1.9rem,3vw,2.6rem)', new: 'font-family:"Inter",sans-serif;font-weight:800;text-transform:uppercase;font-size:clamp(1.9rem,3vw,2.6rem)' },
  // .d .n
  { old: '.d .n{font-family:"Inter",sans-serif;color:var(--blue)', new: '.d .n{font-family:"Inter",sans-serif;font-weight:700;color:var(--blue)' },
  // .d h4
  { old: 'font-family:"Inter",sans-serif;font-weight:400;text-transform:uppercase;font-size:1.6rem', new: 'font-family:"Inter",sans-serif;font-weight:800;text-transform:uppercase;font-size:1.6rem' },
  // .why b
  { old: 'font-family:"Inter",sans-serif;font-weight:400;font-size:2.4rem;color:var(--yellow)', new: 'font-family:"Inter",sans-serif;font-weight:900;font-size:2.4rem;color:var(--yellow)' },
  // .tier h3
  { old: 'font-family:"Inter",sans-serif;font-weight:400;text-transform:uppercase;font-size:1.8rem', new: 'font-family:"Inter",sans-serif;font-weight:800;text-transform:uppercase;font-size:1.8rem' },
  // .inst h4
  { old: 'font-family:"Inter",sans-serif;font-weight:400;text-transform:uppercase;font-size:1.7rem', new: 'font-family:"Inter",sans-serif;font-weight:800;text-transform:uppercase;font-size:1.7rem' },
  // .step h4
  { old: 'font-family:"Inter",sans-serif;font-weight:400;text-transform:uppercase;font-size:1.45rem', new: 'font-family:"Inter",sans-serif;font-weight:800;text-transform:uppercase;font-size:1.45rem' },
  // .step .pin
  { old: 'font-family:"Inter",sans-serif;color:var(--blue);position:relative', new: 'font-family:"Inter",sans-serif;font-weight:800;color:var(--blue);position:relative' },
  // .person b
  { old: 'font-family:"Inter",sans-serif;font-weight:400;font-size:1.5rem;text-transform:uppercase', new: 'font-family:"Inter",sans-serif;font-weight:900;font-size:1.5rem;text-transform:uppercase' },
  // .ctl-info h3
  { old: 'font-family:"Inter",sans-serif;font-weight:400;text-transform:uppercase;font-size:clamp(1.5rem,2.5vw,2.2rem)', new: 'font-family:"Inter",sans-serif;font-weight:800;text-transform:uppercase;font-size:clamp(1.5rem,2.5vw,2.2rem)' },
  // .iph-title
  { old: 'font-family:"Inter",sans-serif;font-weight:400;font-size:.85rem;text-transform:uppercase', new: 'font-family:"Inter",sans-serif;font-weight:800;font-size:.85rem;text-transform:uppercase' },
  // .ap-head h3
  { old: 'font-family:"Inter",sans-serif;font-weight:400;text-transform:uppercase;font-size:clamp(1.8rem,3.5vw,3rem)', new: 'font-family:"Inter",sans-serif;font-weight:900;text-transform:uppercase;font-size:clamp(1.8rem,3.5vw,3rem)' },
  // .ap-why b
  { old: 'font-family:"Inter",sans-serif;font-weight:400;font-size:2rem;color:var(--yellow)', new: 'font-family:"Inter",sans-serif;font-weight:900;font-size:2rem;color:var(--yellow)' },
  // .ap-pack h4
  { old: 'font-family:"Inter",sans-serif;font-weight:400;text-transform:uppercase;font-size:1.4rem', new: 'font-family:"Inter",sans-serif;font-weight:800;text-transform:uppercase;font-size:1.4rem' },
  // .arr-prev,.arr-next
  { old: 'font-family:"Inter",sans-serif}\n.arr-prev', new: 'font-family:"Inter",sans-serif;font-weight:700}\n.arr-prev' },
  // .pw-headline
  { old: 'font-family:"Inter",sans-serif;font-weight:400;font-size:clamp(1.4rem,3vw,2rem)', new: 'font-family:"Inter",sans-serif;font-weight:900;font-size:clamp(1.4rem,3vw,2rem)' },
  // .pw-drum-inner span
  { old: 'font-family:"Inter",sans-serif;font-size:2.2rem;color:#fff;font-weight:400', new: 'font-family:"Inter",sans-serif;font-size:2.2rem;color:#fff;font-weight:900' },
  // .plan-lbl b
  { old: 'font-family:"Inter",sans-serif;font-weight:400;font-size:clamp(.7rem,1.3vw,1rem)', new: 'font-family:"Inter",sans-serif;font-weight:700;font-size:clamp(.7rem,1.3vw,1rem)' },
  // .reasons li::before
  { old: 'font-family:"Inter",sans-serif;color:#fff;background:var(--blue)', new: 'font-family:"Inter",sans-serif;font-weight:700;color:#fff;background:var(--blue)' },
  // pcard-name
  { old: 'font-family:"Inter",sans-serif;font-weight:400;text-transform:uppercase;font-size:.95rem;line-height:1;margin-bottom:3px', new: 'font-family:"Inter",sans-serif;font-weight:800;text-transform:uppercase;font-size:.95rem;line-height:1;margin-bottom:3px' },
  { old: 'font-family:"Inter",sans-serif;font-weight:400;text-transform:uppercase;font-size:.9rem;line-height:1;margin-bottom:3px', new: 'font-family:"Inter",sans-serif;font-weight:800;text-transform:uppercase;font-size:.9rem;line-height:1;margin-bottom:3px' },
];

let fixCount = 0;
for(const p of antonWeight400Patterns){
  if(html.includes(p.old)){
    html = html.replace(p.old, p.new);
    fixCount++;
  }
}
console.log('5. Fixed weights for', fixCount, '/', antonWeight400Patterns.length, 'Anton→Inter patterns');

// 7. Fix .mani-grid .script (Poppins override, now Inter)
html = html.replace(
  'font-family:"Inter",sans-serif;font-weight:500;font-style:normal;text-transform:none;letter-spacing:0}',
  'font-family:"Inter",sans-serif;font-weight:400;font-style:normal;text-transform:none;letter-spacing:0}'
);

// 8. Fix .reasons li::before remaining weight:400 reference
html = html.replace(
  ';font-size:.85rem}\n.reasons',
  ';font-size:.85rem;font-weight:700}\n.reasons'
);

// Verify no Anton/Poppins/Kalam remain
const remaining = (html.match(/"Anton"|"Poppins"|"Kalam"/g) || []);
if(remaining.length > 0){
  console.warn('WARNING: still found', remaining.length, 'unreplaced font refs');
} else {
  console.log('6. All font references cleaned');
}

fs.writeFileSync('/Users/arthurbarret/arkt-website/public/raclette/index.html', html, 'utf8');
console.log('Done. Size:', html.length);
