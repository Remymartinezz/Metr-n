/* Metrön : le poussin (dessin, humeurs, accessoires, couleurs). Partagé par l'app et par la page mascotte.html. */
/* =====================================================
   Le poussin : visage, yeux, bec, + couches d'accessoires
   (même dessin que logo.svg, dans un cadre élargi pour les accessoires)
   ===================================================== */
const INK = '#2B1D17';
let chickUid = 0;

/* Les yeux gardent TOUJOURS la même forme : la paire de quarts de disque. Seule leur déformation change selon l'humeur
   (écrasés, inclinés, agrandis), avec un petit reflet rond dedans qui leur donne de la vie. */
const EYE_L = 'M105 124Q105 102 127 102H245V127A140 140 0 0 1 105 267Z';
const EYE_R = 'M601 124Q601 102 579 102H461V127A140 140 0 0 0 601 267Z';
const EYE_SHAPES = {          // sx, sy : échelle ; rot : inclinaison (opposée à droite) ; dy : décalage vers le bas ; hl : rayon du reflet
  open:   { sx: 1,    sy: 1,    rot: 0,   dy: 0,  hl: 21 },
  happy:  { sx: 1.02, sy: -.62, rot: 0,   dy: 16, hl: 0 },     // retournés et écrasés : des arcs ∩, les yeux qui sourient
  closed: { sx: 1.04, sy: .34,  rot: 0,   dy: 52, hl: 0 },     // paupières presque closes
  wide:   { sx: 1.2,  sy: 1.2,  rot: 0,   dy: -6, hl: 30 },    // plus grands : la surprise
  focus:  { sx: 1,    sy: .84,  rot: 15,  dy: 10, hl: 16 },    // inclinés vers le centre : on se concentre
};
function eyesSvg(mood, reflet = true, fill = 'var(--brand-brown)') {
  // « wink » : l'œil gauche sourit (arc ∩), le droit reste ouvert
  const shapeFor = side => EYE_SHAPES[mood === 'wink' ? (side === 1 ? 'happy' : 'open') : mood] || EYE_SHAPES.open;
  const eye = (path, cx, side) => {
    const p = shapeFor(side);
    const r = p.rot * side, hlx = cx - side * 28, hly = 152;
    return `<g class="eye"><g transform="translate(${cx} ${185 + p.dy}) rotate(${r}) scale(${p.sx} ${p.sy}) translate(${-cx} -185)">
      <path d="${path}" fill="${fill}"/>${reflet && p.hl ? `<circle cx="${hlx}" cy="${hly}" r="${p.hl}" fill="#FFFDF2" fill-opacity=".92"/>` : ''}</g></g>`;
  };
  return eye(EYE_L, 175, 1) + eye(EYE_R, 527, -1);
}
/* Couleurs du poussin : une palette par domaine (visage, bec, yeux).
   Elles se calculent depuis tokens.css, donc elles suivent le labo des couleurs. */
const PALS = {
  original: { name: 'Original',  face: 'var(--brand-yellow)', beak: 'var(--brand-gold)', eyes: 'var(--brand-brown)', dom: 'var(--brand-yellow)' },
  etudes:   { name: 'Études',    beak: '#FFB020' },
  sport:    { name: 'Sport',     beak: '#FFD93D' },
  sommeil:  { name: 'Sommeil',   beak: '#FFD54F' },
  social:   { name: 'Social',    beak: '#C62828' },
  repos:    { name: 'Repos',     beak: '#F2B84B' },
  projets:  { name: 'Projets',   beak: '#FFC93C' },
};
Object.keys(PALS).forEach(k => {
  if (k === 'original') return;
  const p = PALS[k];
  p.dom = `var(--dom-${k}-focus)`;
  p.face = `color-mix(in srgb, var(--dom-${k}-focus) 30%, #FFFDF0)`;
  p.eyes = `color-mix(in srgb, var(--dom-${k}) 42%, #1A0F0C)`;
});
const palOf = k => PALS[k] || PALS.original;

/* Chaque accessoire : couches back (derrière), mid (sur le visage, sous les yeux), front (devant). c = id du clip du visage. */
const DUMBBELL = `<rect x="-150" y="-13" width="300" height="26" rx="12" fill="#546E7A"/><rect x="-196" y="-58" width="46" height="116" rx="12" fill="#37474F"/><rect x="-236" y="-40" width="32" height="80" rx="10" fill="#455A64"/><rect x="150" y="-58" width="46" height="116" rx="12" fill="#37474F"/><rect x="204" y="-40" width="32" height="80" rx="10" fill="#455A64"/>`;
const ACC = {
  none:      { name: 'Aucun', dom: 'etudes', note: 'Le poussin tel quel.' },

  // Études
  lunettes:  { name: 'Lunettes rondes', dom: 'etudes', note: 'Pour se concentrer.', mood: 'focus', front: () => `<g fill="#fff" fill-opacity=".28" stroke="${INK}" stroke-width="15"><circle cx="160" cy="190" r="80"/><circle cx="540" cy="190" r="80"/></g><path d="M240 182Q350 150 460 182" stroke="${INK}" stroke-width="15" fill="none"/><path d="M84 168L36 140M616 168L664 140" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>` },
  toque:     { name: 'Toque de diplômé', dom: 'etudes', note: 'Un jour d\'examen.', front: () => `<g transform="translate(0 -62)"><path d="M350 -10L625 80L350 165L75 80Z" fill="${INK}"/><path d="M262 108V152Q350 192 438 152V108L350 140Z" fill="#3A2C25"/><path d="M625 80Q648 150 640 232" stroke="#CE9A2B" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="640" cy="244" r="17" fill="#CE9A2B"/></g>` },
  crayon:    { name: 'Crayon derrière l\'oreille', dom: 'etudes', note: 'Toujours prêt à noter.', mood: 'happy', back: () => `<g transform="translate(46 -6) rotate(28 610 160)"><rect x="592" y="20" width="36" height="200" rx="8" fill="#F5C518"/><rect x="592" y="20" width="36" height="34" rx="8" fill="#E57373"/><polygon points="592,220 628,220 610,268" fill="#F2D2A9"/><polygon points="602,247 618,247 610,268" fill="${INK}"/></g>` },
  livre:     { name: 'Un livre', dom: 'etudes', note: 'Une pause lecture.', front: () => `<g transform="translate(205 478)"><rect x="0" y="30" width="290" height="125" rx="16" fill="#2D7BB4"/><rect x="20" y="48" width="118" height="90" rx="9" fill="#FFFDF2"/><rect x="152" y="48" width="118" height="90" rx="9" fill="#FFFDF2"/><path d="M42 74H116M42 96H116M174 74H248M174 96H248" stroke="#C5D9E6" stroke-width="7" stroke-linecap="round"/></g>` },

  // Sport : une version par discipline
  course:    { name: 'Course', dom: 'sport', sport: true, note: 'Bandeau, goutte de sueur, vitesse.', mood: 'happy', mid: c => `<g clip-path="url(#${c})"><rect x="0" y="150" width="700" height="58" fill="#E53935"/><rect x="0" y="171" width="700" height="10" fill="#fff" opacity=".85"/></g>`, front: () => `<path d="M640 130Q668 190 640 212Q612 190 640 130Z" fill="#4FC3F7"/><path d="M-50 250H30M-70 310H10M-40 370H30" stroke="${INK}" stroke-opacity=".35" stroke-width="14" stroke-linecap="round"/>` },
  natation:  { name: 'Natation', dom: 'sport', sport: true, note: 'Bonnet et lunettes.', mid: c => `<g clip-path="url(#${c})"><path d="M-20 250Q350 -170 720 250Z" fill="#1E88E5"/><path d="M100 80Q350 -40 600 80" stroke="#fff" stroke-opacity=".5" stroke-width="12" fill="none"/></g>`, front: () => `<rect x="30" y="168" width="640" height="20" fill="#37474F"/><circle cx="165" cy="190" r="70" fill="#B3E5FC" fill-opacity=".8" stroke="#00ACC1" stroke-width="14"/><circle cx="535" cy="190" r="70" fill="#B3E5FC" fill-opacity=".8" stroke="#00ACC1" stroke-width="14"/><rect x="236" y="178" width="228" height="16" rx="8" fill="#00ACC1"/>` },
  velo:      { name: 'Vélo', dom: 'sport', sport: true, note: 'Casque aéré.', mid: () => `<path d="M55 255Q60 -25 350 -25Q640 -25 645 255Z" fill="#FB8C00"/><g stroke="#fff" stroke-width="18" opacity=".85" stroke-linecap="round"><path d="M240 5V120M350 -8V120M460 5V120"/></g>`, front: () => `<path d="M82 305Q150 410 350 440Q550 410 618 305" stroke="#263238" stroke-width="12" fill="none" stroke-linecap="round"/>` },
  foot:      { name: 'Football', dom: 'sport', sport: true, note: 'Le ballon aux pieds.', mood: 'happy', front: () => `<g transform="translate(565 530)"><circle r="88" fill="#fff" stroke="${INK}" stroke-width="9"/><polygon points="0,-42 40,-13 25,33 -25,33 -40,-13" fill="${INK}"/><path d="M0-42V-88M40-13L83-27M25 33L52 78M-25 33L-52 78M-40-13L-83-27" stroke="${INK}" stroke-width="9"/></g>` },
  yoga:      { name: 'Yoga', dom: 'sport', sport: true, note: 'Un chignon, un lotus, les yeux fermés.', mood: 'closed', back: () => `<circle cx="350" cy="28" r="78" fill="#8D6E63"/>`, front: () => `<g transform="translate(350 600)"><ellipse rx="44" ry="92" cy="-60" fill="#F48FB1" transform="rotate(-48)"/><ellipse rx="44" ry="92" cy="-60" fill="#F48FB1" transform="rotate(48)"/><ellipse rx="46" ry="100" cy="-62" fill="#F8BBD0"/></g>` },
  // Musculation : l'haltère est PORTÉ par de petites mains, ou bien il flotte tout seul, sans rien. Dans les deux cas il bouge.
  muscu:     { name: 'Musculation · mini mains', dom: 'sport', sport: true, note: 'Deux petites mains soulèvent l\'haltère.', mood: 'focus', mid: c => `<g clip-path="url(#${c})"><rect x="0" y="150" width="700" height="52" fill="#fff"/></g>`, front: () => `<g class="lift"><g transform="translate(350 585)">${DUMBBELL}<circle cx="-92" cy="0" r="36" fill="var(--cf)"/><circle cx="92" cy="0" r="36" fill="var(--cf)"/><path d="M-110 -10Q-92 -26 -74 -10M74 -10Q92 -26 110 -10" stroke="#2B1D17" stroke-opacity=".18" stroke-width="7" fill="none" stroke-linecap="round"/></g></g><path d="M640 130Q668 190 640 212Q612 190 640 130Z" fill="#4FC3F7"/>` },
  muscu2:    { name: 'Musculation · il flotte', dom: 'sport', sport: true, note: 'Pas de mains : l\'haltère monte et descend tout seul.', mood: 'focus', mid: c => `<g clip-path="url(#${c})"><rect x="0" y="150" width="700" height="52" fill="#fff"/></g>`, front: () => `<g class="lift float"><g transform="translate(350 585)">${DUMBBELL}</g></g><path d="M640 130Q668 190 640 212Q612 190 640 130Z" fill="#4FC3F7"/>` },

  // Sommeil
  bonnet:    { name: 'Bonnet de nuit', dom: 'sommeil', note: 'Pour la nuit.', mood: 'closed', front: () => `<g transform="translate(350 -66) scale(.62) translate(-350 0)"><g transform="rotate(-4 350 150)"><path d="M55 165Q350 20 645 165L615 220Q350 100 85 220Z" fill="#E8EAF6"/><path d="M95 160Q350 40 605 160Q560 20 470 -40Q420 -80 330 -40Q180 20 95 160Z" fill="#3949AB"/><circle cx="470" cy="-62" r="40" fill="#E8EAF6"/></g></g>` },
  masque:    { name: 'Masque de nuit', dom: 'sommeil', note: 'Plus rien ne dérange.', mood: 'closed', front: () => `<rect x="76" y="116" width="168" height="150" rx="68" fill="#3949AB"/><rect x="456" y="116" width="168" height="150" rx="68" fill="#3949AB"/><rect x="232" y="158" width="236" height="26" rx="13" fill="#3949AB"/><path d="M106 206Q160 250 214 206M486 206Q540 250 594 206" stroke="#E8EAF6" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M80 190H30M620 190H670" stroke="#3949AB" stroke-width="20" stroke-linecap="round"/>` },
  lune:      { name: 'Lune et zZz', dom: 'sommeil', note: 'Il dort presque.', mood: 'closed', front: () => `<path d="M10 20A62 62 0 1 0 82 112A50 50 0 1 1 10 20Z" fill="#FFD54F"/><g fill="#3949AB" font-weight="800" font-family="Hanken Grotesk, Arial, sans-serif"><text x="520" y="10" font-size="96">Z</text><text x="610" y="-70" font-size="64">z</text></g>` },
  oreiller:  { name: 'Oreiller', dom: 'sommeil', note: 'Prêt à se poser.', mood: 'closed', back: () => `<rect x="60" y="430" width="580" height="215" rx="100" fill="#E8EAF6"/><path d="M150 590H550" stroke="#C5CAE9" stroke-width="12" stroke-linecap="round"/>` },

  // Social
  fete:      { name: 'Chapeau de fête', dom: 'social', note: 'Une soirée entre amis.', mood: 'happy', front: () => `<g transform="rotate(9 350 80)"><path d="M255 84L350 -108L445 84Z" fill="#EA580C"/><path d="M290 22L412 22M312 -22L388 -22" stroke="#FFD54F" stroke-width="15" stroke-linecap="round"/><circle cx="350" cy="-112" r="24" fill="#FFD54F"/></g>` },
  bulles:    { name: 'Bulles de discussion', dom: 'social', note: 'On parle, on rit.', mood: 'happy', front: () => `<g><rect x="500" y="-95" width="200" height="110" rx="46" fill="#fff" stroke="${INK}" stroke-width="9"/><path d="M545 15L530 70L590 15Z" fill="#fff" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/><circle cx="560" cy="-40" r="11" fill="${INK}"/><circle cx="600" cy="-40" r="11" fill="${INK}"/><circle cx="640" cy="-40" r="11" fill="${INK}"/></g>` },
  coeur:     { name: 'Cœur', dom: 'social', note: 'Un message à quelqu\'un.', mood: 'happy', front: () => `<g transform="translate(60 -42)"><path d="M590 -10C548 -90 440 -50 500 30L590 110L680 30C740 -50 632 -90 590 -10Z" fill="#E91E63"/></g>` },
  soleil:    { name: 'Lunettes de soleil', dom: 'social', note: 'Terrasse et amis.', front: () => `<g fill="${INK}"><rect x="70" y="122" width="180" height="104" rx="46"/><rect x="450" y="122" width="180" height="104" rx="46"/><rect x="236" y="150" width="228" height="20" rx="10"/></g><path d="M100 160L148 160M480 160L528 160" stroke="#fff" stroke-opacity=".45" stroke-width="10" stroke-linecap="round"/>` },

  // Repos
  the:       { name: 'Tasse de thé', dom: 'repos', note: 'Une vraie pause.', mood: 'happy', front: () => `<g transform="translate(455 495)"><path d="M0 0H165V75Q165 140 82 140Q0 140 0 75Z" fill="#fff" stroke="${INK}" stroke-width="9"/><path d="M165 28Q225 28 225 68Q225 108 165 108" fill="none" stroke="${INK}" stroke-width="9"/><path d="M42 -14Q20 -48 46 -76M88 -14Q66 -48 92 -76M132 -14Q110 -48 136 -76" fill="none" stroke="#9E9E9E" stroke-width="9" stroke-linecap="round" opacity=".8"/></g>` },
  casque:    { name: 'Casque audio', dom: 'repos', note: 'Musique douce.', mood: 'closed', front: () => `<path d="M36 255Q36 -40 350 -40Q664 -40 664 255" fill="none" stroke="#37474F" stroke-width="32" stroke-linecap="round"/><rect x="-10" y="205" width="80" height="140" rx="34" fill="#546E7A"/><rect x="630" y="205" width="80" height="140" rx="34" fill="#546E7A"/>` },
  pousse:    { name: 'Petite pousse', dom: 'repos', note: 'Ça pousse tranquillement.', mood: 'closed', back: () => `<path d="M350 90Q350 -10 350 -70" stroke="#2E7D32" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M350 -50Q240 -120 205 -30Q300 -15 350 -50Z" fill="#43A047"/><path d="M350 -50Q460 -120 495 -30Q400 -15 350 -50Z" fill="#66BB6A"/>` },
  echarpe:   { name: 'Écharpe', dom: 'repos', note: 'Bien au chaud.', mood: 'happy', front: () => `<path d="M95 500Q350 600 605 500L625 565Q350 670 75 565Z" fill="#43A047"/><rect x="170" y="545" width="80" height="92" rx="16" fill="#2E7D32" transform="rotate(8 210 545)"/><path d="M150 530L200 622M205 530L255 622" stroke="#A5D6A7" stroke-width="10" opacity=".7"/>` },

  // Projets
  chantier:  { name: 'Casque de chantier', dom: 'projets', note: 'On construit quelque chose.', mood: 'focus', mid: () => `<path d="M65 235Q65 -20 350 -20Q635 -20 635 235Z" fill="#FDD835"/><rect x="35" y="215" width="630" height="42" rx="20" fill="#F9A825"/><rect x="312" y="-40" width="76" height="130" rx="18" fill="#F9A825"/>` },
  ampoule:   { name: 'Idée !', dom: 'projets', note: 'Une idée vient d\'arriver.', mood: 'wide', front: () => `<g transform="translate(350 -50)"><circle r="68" fill="#FFEB3B" stroke="#F9A825" stroke-width="9"/><rect x="-28" y="62" width="56" height="38" rx="9" fill="#9E9E9E"/><path d="M-22 -8Q0 36 22 -8" stroke="#F9A825" stroke-width="9" fill="none" stroke-linecap="round"/><g stroke="#F9A825" stroke-width="9" stroke-linecap="round"><path d="M-125 -66L-98 -52M125 -66L98 -52M0 -130V-104"/></g></g>` },
  pinceau:   { name: 'Pinceau', dom: 'projets', note: 'Créer, essayer.', mood: 'happy', front: () => `<g transform="translate(56 20) rotate(26 625 210)"><rect x="607" y="30" width="34" height="190" rx="11" fill="#8D6E63"/><rect x="602" y="212" width="44" height="44" fill="#BDBDBD"/><path d="M602 256Q624 350 646 256Z" fill="#9333EA"/></g><circle cx="80" cy="560" r="26" fill="#9333EA"/><circle cx="130" cy="610" r="16" fill="#9333EA"/>` },
  fusee:     { name: 'Fusée', dom: 'projets', note: 'Un projet qui décolle.', mood: 'wide', front: () => `<g transform="translate(676 -22) rotate(38) scale(.9)"><path d="M0 -105Q48 -40 36 55H-36Q-48 -40 0 -105Z" fill="#fff" stroke="${INK}" stroke-width="7"/><circle cy="-22" r="16" fill="#2D7BB4"/><path d="M-36 24L-72 80L-36 56Z M36 24L72 80L36 56Z" fill="#DC2626"/><path d="M-16 66Q0 135 16 66Z" fill="#FF9800"/></g>` },

  // Fêtes
  boite:     { name: 'Boîte en carton', dom: 'fete', note: 'Il regarde par-dessus.', mood: 'wide', front: () => `<path d="M0 345H700L650 650H50Z" fill="#C9A06C"/><path d="M0 345L-40 280L110 315Z M700 345L740 280L590 315Z" fill="#D9B27C"/><path d="M0 345H700" stroke="#A5804F" stroke-width="14"/><rect x="270" y="420" width="160" height="54" rx="10" fill="#E5C894"/>` },
  confetti:  { name: 'Confettis', dom: 'fete', note: 'Tout est fait.', mood: 'happy', front: () => { const cs = ['#E53935', '#FDD835', '#1E88E5', '#43A047', '#9333EA', '#EA580C']; let s = ''; for (let i = 0; i < 26; i++) { const x = (i * 211) % 800 - 60, y = (i * 137) % 760 - 130; if (x > 20 && x < 680 && y > 80 && y < 560) continue; s += i % 3 ? `<rect x="${x}" y="${y}" width="22" height="12" rx="3" fill="${cs[i % 6]}" transform="rotate(${i * 37} ${x} ${y})"/>` : `<circle cx="${x}" cy="${y}" r="9" fill="${cs[i % 6]}"/>`; } return s; } },
};

// « Lune et zZz » porte aussi le bonnet de nuit
ACC.lune.name = 'Lune, zZz et bonnet';
ACC.lune.note = 'Bonnet sur la tête, il dort presque.';
ACC.lune.front = (orig => () => ACC.bonnet.front() + orig())(ACC.lune.front);
// look : [x, y] de -1 à 1, pour un regard fixe (les yeux ne suivent plus le curseur) ; flip : tête à l'envers
function chick({ mood = 'auto', acc = [], bg = '', reflet = true, pal = 'original', look = null, flip = false, deco = false }) {
  const P = palOf(pal);
  const n = ++chickUid, c = `fc${n}`;
  const A = acc.map(id => ACC[id]).filter(Boolean);
  const layer = k => A.map(a => a[k] ? a[k](c) : '').join('');
  const m = mood === 'auto' ? ((A.find(a => a.mood) || {}).mood || 'open') : mood;
  let eyes = eyesSvg(m, reflet, P.eyes);
  if (look) eyes = eyes.replace(/class="eye"/g, `class="eye" style="transform:translate(${(look[0] * 34).toFixed(0)}px,${(look[1] * 34).toFixed(0)}px)"`);
  return `<svg class="mc"${look ? ' data-static="1"' : ''} style="--cf:${P.face};${flip ? 'transform:rotate(180deg)' : ''}" viewBox="-80 -150 860 810" ${deco ? 'aria-hidden="true"' : `role="img" aria-label="Poussin${A[0] ? ' : ' + A[0].name : ''}${flip ? ', à l’envers' : ''}"`}>
    <defs><clipPath id="${c}"><ellipse cx="350" cy="330" rx="315" ry="262"/></clipPath></defs>
    ${bg ? `<rect x="-80" y="-150" width="860" height="810" fill="${bg}"/>` : ''}
    ${layer('back')}
    <ellipse class="face" cx="350" cy="330" rx="315" ry="262" fill="${P.face}"/>
    ${layer('mid')}
    ${eyes}
    <path class="beak" d="M245 280Q353 180 462 280Q353 378 245 280Z" fill="${P.beak}"/>
    ${layer('front')}
  </svg>`;
}

/* ---------- Pour l'app ---------- */
// L'accessoire par défaut de chaque domaine
const DOM_ACC = { etudes: 'lunettes', sport: 'course', sommeil: 'bonnet', social: 'soleil', repos: 'casque', projets: 'chantier' };

// Une couleur CSS (variable, color-mix…) en #rrggbb : utile pour un SVG autonome (icône d'onglet, export)
function resolveColor(v) {
  const probe = document.createElement('i'); document.body.appendChild(probe); probe.style.color = v;
  const css = getComputedStyle(probe).color; probe.remove();
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const x = cv.getContext('2d', { willReadFrequently: true });
  x.fillStyle = css; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data;
  return '#' + [d[0], d[1], d[2]].map(n => n.toString(16).padStart(2, '0')).join('');
}
// Un SVG autonome (sans variables CSS) à partir d'un chick()
function standaloneSvg(svg, pal = 'original') {
  const P = palOf(pal), root = getComputedStyle(document.documentElement);
  return svg.replace(/ style="[^"]*"/g, m => /rotate\(180deg\)/.test(m) ? ' transform="rotate(180 350 330)"' : (/transform:translate/.test(m) ? m : ''))
    .replace(/var\(--cf\)/g, P.face)
    .replace(/(fill|stroke)="([^"]*(?:var\(|color-mix)[^"]*)"/g, (m, a, v) => `${a}="${resolveColor(v.replace(/var\((--[a-z0-9-]+)\)/g, (mm, n) => root.getPropertyValue(n).trim() || mm))}"`)
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
}

// L'intérieur d'un poussin (sans balise <svg>) pour l'insérer dans un autre dessin, comme le centre du radar
const chickInner = o => chick(o).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
// Un petit poussin décoratif, fixe (il ne suit pas le curseur) : coches, jours, repères des barres
const miniChick = (o = {}) => chick({ look: [0, 0], deco: true, ...o });
