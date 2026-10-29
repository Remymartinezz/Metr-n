'use strict';

/* =====================================================
   Catalogue : domaines et habitudes proposées
   h = heures par fois, w = fois par semaine
   ===================================================== */

const CAT = {
  etudes:  { name: `Études`,  habits: [{ n: `Session de travail focus`, h: 1, w: 5 }, { n: `Révision légère`, h: .5, w: 4 }, { n: `Devoirs et rendus`, h: 1, w: 3 }] },
  sport:   { name: `Sport`,   habits: [{ n: `Marche ou activité douce`, h: .5, w: 4 }, { n: `Séance de sport`, h: 1, w: 2 }, { n: `Étirements ou yoga`, h: .25, w: 4 }] },
  sommeil: { name: `Sommeil`, habits: [{ n: `Nuit de sommeil`, h: 8, w: 7 }, { n: `Sieste`, h: .5, w: 3 }] },
  social:  { name: `Social`,  habits: [{ n: `Voir des proches`, h: 2, w: 2 }, { n: `Appeler quelqu'un`, h: .5, w: 2 }, { n: `Sortie entre amis`, h: 3, w: 1 }] },
  repos:   { name: `Repos`,   habits: [{ n: `Pause sans écran`, h: .5, w: 5 }, { n: `Soirée tranquille`, h: 2, w: 2 }, { n: `Lecture ou musique`, h: 1, w: 3 }] },
  projets: { name: `Projets`, habits: [{ n: `Avancer sur mon projet`, h: 1.5, w: 3 }, { n: `Explorer, créer`, h: .5, w: 3 }, { n: `Apprendre une compétence`, h: 1, w: 2 }] },
};
const ORDER = Object.keys(CAT);

// Pour un·e jeune actif·ve, « Études » devient « Travail »
const WORK = { label: `Travail`, names: { 'Session de travail focus': `Travail concentré`, 'Révision légère': `Apprendre un peu` } };

const DOMAIN_PICKS = [
  ['etudes', `Études ou travail`, `Apprendre, avancer, produire`],
  ['sport', `Sport`, `Bouger, se dépenser`],
  ['sommeil', `Sommeil`, `Des nuits qui tiennent`],
  ['social', `Social`, `Les gens qui comptent`],
  ['repos', `Repos`, `Souffler, déconnecter`],
  ['projets', `Projets perso`, `Ce qui est à toi`],
];

const STATUS = [
  ['etudiant', `Étudiant·e`, `Cours, examens, rythme scolaire`],
  ['apprenti', `Apprenti·e`, `Entre école et entreprise`],
  ['actif', `Jeune actif·ve`, `Travail, horaires, vie à côté`],
];

const RHYTHMS = [
  ['calme', `Calme`, `Peu de pression en ce moment`],
  ['normal', `Normal`, `Une semaine ordinaire`],
  ['charge', `Chargé`, `Examens, rush, période dense`],
];

// Le rythme déplace la mesure, il ne la juge pas.
const RHYTHM_K = {
  calme:  { sport: 1.2, projets: 1.2, social: 1.2 },
  normal: {},
  charge: { etudes: 1.3, sport: .7, social: .7, projets: .5 },
};

/* =====================================================
   État
   ===================================================== */

const KEY = 'metron.v2';
const PREVIEW = new URLSearchParams(location.search).get('screen');   // aperçu pour le labo : ne rien lire ni écrire
const DAY = 864e5;
const EASE = t => 1 - Math.pow(1 - t, 4);


function emptyDraft() { return { status: null, domains: [], habits: [], touched: [], rhythm: 'normal' }; }

// On arrive directement sur un tableau de bord déjà rempli : une habitude par domaine.
function starter() {
  return {
    profile: { starter: true, status: null, domains: ORDER.slice() },
    habits: ORDER.map(id => { const t = CAT[id].habits[0]; return { id: uid(), domain: id, name: t.n, h: t.h, w: t.w }; }),
    logs: [], rhythm: 'normal', labels: {}, start: Date.now(),
  };
}
let firstOpen = true;                    // vrai tant que rien n'a jamais été enregistré
function load() {
  if (PREVIEW) return starter();
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.profile) { firstOpen = false; return s; } } catch (e) {}
  return starter();
}
function save() { if (PREVIEW) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

const $ = s => document.querySelector(s);

/* =====================================================
   Accessibilité : la base est toujours là (formes + noms en plus des couleurs, contrastes, focus visible),
   et le mode accessibilité va plus loin : texte plus grand, contraste renforcé, moins d'animations, noms partout
   ===================================================== */
const A11Y_DEFAULT = { text: 0, contrast: false, motion: false, labels: false };
const a11y = () => Object.assign({}, A11Y_DEFAULT, S.a11y || {});
const reduced = () => a11y().motion || matchMedia('(prefers-reduced-motion: reduce)').matches;
function applyA11y() {
  const a = a11y(), r = document.documentElement;
  r.dataset.text = String(a.text); r.dataset.contrast = a.contrast ? 'high' : 'normal';
  r.dataset.motion = a.motion ? 'off' : 'on'; r.dataset.labels = a.labels ? 'on' : 'off';
  r.style.setProperty('--z', [1, 1.14, 1.3][a.text] || 1);
}
const uid = () => Math.random().toString(36).slice(2, 9);
const dayKey = d => new Date(d).toLocaleDateString('sv-SE');
const today = () => dayKey(Date.now());
const dname = id => S.labels[id] || CAT[id].name;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = h => (Math.round(h * 100) / 100).toString().replace('.', ',');
const fmtDur = h => h < 1 ? `${Math.round(h * 60)} min` : (h % 1 === 0 ? `${h} h` : `${Math.floor(h)} h ${Math.round((h % 1) * 60)}`);

let S = load();                         // données persistées
let ui = { onboarding: firstOpen, obMin: 0, animCurve: true, filter: 'all', show: 'all', day: dayKey(Date.now()), period: 7, periodOpen: false, step: 0, dir: 'fwd', sheet: null, draft: emptyDraft() };

/* =====================================================
   Génération automatique des habitudes
   ===================================================== */

// Ses habitudes actuelles deviennent son tracker. Un domaine important
// sans aucune habitude cochée reçoit une première habitude douce.
function generate(d) {
  const work = d.status === 'actif';
  const mk = (id, t) => ({ id: uid(), domain: id, name: (work && WORK.names[t.n]) || t.n, h: t.h, w: t.w });
  const habits = [], added = [];
  ORDER.filter(id => d.domains.includes(id)).forEach(id => {
    const inc = includedHabits(d), picked = CAT[id].habits.filter((t, i) => inc.includes(`${id}:${i}`));
    if (picked.length) picked.forEach(t => habits.push(mk(id, t)));
    else { habits.push(mk(id, CAT[id].habits[0])); added.push(id); }
  });
  return { habits, added };
}

/* =====================================================
   Mesure : un seul langage (0–.4 dessous, .4–.7 dans la mesure, .7–1 dessus)
   ===================================================== */

const pos = (v, t) =>
  v < t.min ? .4 * (v / t.min)
  : v <= t.max ? .4 + .3 * (v - t.min) / (t.max - t.min)
  : Math.min(1, .7 + .3 * (v - t.max) / (t.max * .5));

const WORDS = { obs: `en observation`, low2: `un coup de pouce ?`, low: `tu peux y revenir`, in: `dans ta mesure`, high: `tu peux lever le pied` };
const FOCUS_TITLE = { low: n => `${n} : tu peux y revenir`, low2: n => `${n} : un coup de pouce ?`, high: n => `${n} : tu peux lever le pied` };
const COLORS = { obs: 'var(--muted)', low2: 'var(--low)', low: 'var(--low)', in: 'var(--band-ink)', high: 'var(--high)' };

/* ---------- Identité : le poussin, le ö, le mot ---------- */
// Le « ö » : deux points bruns en quart de disque. Le visage : un ovale jaune et un bec doré.
const CHAR = `<svg class="char" viewBox="30 60 640 540" aria-hidden="true">
  <ellipse class="face" cx="350" cy="330" rx="315" ry="262" fill="var(--brand-yellow)"/>
  <path class="eye" d="M105 124Q105 102 127 102H245V127A140 140 0 0 1 105 267Z" fill="var(--brand-brown)"/>
  <path class="eye" d="M601 124Q601 102 579 102H461V127A140 140 0 0 0 601 267Z" fill="var(--brand-brown)"/>
  <path class="beak" d="M245 280Q353 180 462 280Q353 378 245 280Z" fill="var(--brand-gold)"/>
</svg>`;
const TILE = `<svg class="tile" viewBox="0 0 100 100" aria-hidden="true">
  <rect width="100" height="100" rx="26" fill="var(--brand-blue)"/>
  <g transform="translate(50 52) scale(.125) translate(-350 -330)">
    <ellipse class="face" cx="350" cy="330" rx="315" ry="262" fill="var(--brand-yellow)"/>
    <path class="eye" d="M105 124Q105 102 127 102H245V127A140 140 0 0 1 105 267Z" fill="var(--brand-brown)"/>
    <path class="eye" d="M601 124Q601 102 579 102H461V127A140 140 0 0 0 601 267Z" fill="var(--brand-brown)"/>
    <path class="beak" d="M245 280Q353 180 462 280Q353 378 245 280Z" fill="var(--brand-gold)"/>
  </g></svg>`;
const WORD = `<span class="word">Metr<span class="uml">o</span>n</span>`;

function daysActive(at = Date.now()) {
  const a = new Date(S.start); a.setHours(0, 0, 0, 0);
  const b = new Date(at); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / DAY) + 1;
}
const inWindow = (day, n = 7, at = Date.now()) => day >= dayKey(at - (n - 1) * DAY) && day <= dayKey(at);

// Mesure à une date donnée, sur une fenêtre glissante de n jours
function measure(at = Date.now(), n = ui.period) {
  const da = daysActive(at);
  const factor = Math.min(1, da / n);
  const k = RHYTHM_K[S.rhythm] || {};
  const doms = ORDER.filter(id => S.habits.some(h => h.domain === id));
  return doms.map(id => {
    const planned = S.habits.filter(h => h.domain === id).reduce((a, h) => a + h.h * h.w, 0) * (k[id] || 1) * (n / 7) * factor;
    const v = S.logs.filter(l => l.domain === id && inWindow(l.day, n, at)).reduce((a, l) => a + l.h, 0);
    const t = { min: planned * .8, max: planned * 1.2 };
    let s;
    if (v < t.min) s = v < t.min * .6 ? 'low2' : 'low';
    else s = v > t.max ? 'high' : 'in';
    if (da < 4) s = 'obs';                       // premiers jours : on observe
    else if (da < n && s === 'high') s = 'in';   // en avance : pas un défaut
    if (ui.fakeStatus && ui.fakeStatus[id]) { s = ui.fakeStatus[id]; return { id, name: dname(id), v, t, p: s === 'high' ? .92 : .55, s }; }
    return { id, name: dname(id), v, t, p: pos(v, t), s };
  });
}

// Courbe d'évolution : pour chaque jour de la période, où en était chaque domaine
// sur la semaine glissante qui se terminait ce jour-là.
function history() {
  const span = ui.period, pts = [];
  for (let i = span - 1; i >= 0; i--) {
    const at = Date.now() - i * DAY;
    if (daysActive(at) < 1) { pts.push(null); continue; }   // avant ton premier jour
    pts.push({ at, m: measure(at, 7) });
  }
  return pts;
}

function headline(m) {
  if (daysActive() < 4) return [``, ``];            // premiers jours : aucun message, on observe en silence
  const inN = m.filter(x => x.s === 'in').length;
  if (inN === m.length) return [`Tu es dans ta mesure.`, `Rien à corriger. Continue sans en faire plus.`];
  const off = m.filter(x => x.s !== 'in').map(x => x.name.toLowerCase()).slice(0, 3).join(`, `);
  return [`${inN} domaine${inN > 1 ? 's' : ''} sur ${m.length} dans ta mesure.`, `À regarder si tu en as envie : ${off}.`];
}

/* =====================================================
   Rendu général
   ===================================================== */

// Texte lisible sur une couleur : blanc ou brun foncé, selon le meilleur contraste
function onColor(cssVar) {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return '#FFFDF2';
  const lum = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
  return (1.05 / (lum + .05)) >= ((lum + .05) / .0647) ? '#FFFDF2' : '#2B1D17';   // blanc, ou brun #2B1D17 (luminance ≈ .0147)
}

// Sur un domaine, tout l'écran prend sa couleur : --accent (vive) et --accent-on (texte dessus)
function applyFocusTheme(phone) {
  const f = ui.filter;
  if (!ui.onboarding && f !== 'all') {
    phone.classList.add('focused');
    phone.style.setProperty('--accent', `var(--dom-${f}-focus)`);
    phone.style.setProperty('--accent-on', onColor(`--dom-${f}-focus`));
  } else {
    phone.classList.remove('focused');
    phone.style.removeProperty('--accent'); phone.style.removeProperty('--accent-on');
  }
}

function render() {
  applyA11y();
  const screen = $('#screen');
  const phone = $('#phone');
  applyFocusTheme(phone);
  renderIsland();
  $('#tabbar').hidden = true;                      // une seule page : le tableau de bord
  if (ui.onboarding) {
    const bg = ui.generating ? GEN_COLOR : OB_COLORS[ui.step];
    phone.classList.add('ob-mode');
    phone.classList.remove('dark-ob');
    const key = ui.generating ? 'gen' : OB_KEYS[ui.step];                  // chaque page a ses couleurs : fond, texte, opacité
    phone.style.setProperty('--obbg', bg);
    phone.style.setProperty('--obink', `var(--ob-${key}-ink)`);
    phone.style.setProperty('--obop', `var(--ob-${key}-op)`);
    screen.innerHTML = ui.generating ? viewGenerating() : viewOnboarding();
    return;
  }
  phone.classList.remove('ob-mode', 'dark-ob');
  phone.style.removeProperty('--obbg'); phone.style.removeProperty('--obink'); phone.style.removeProperty('--obop');
  const st = screen.scrollTop;
  screen.innerHTML = `<div class="pad ${ui.noAnim ? '' : 'rise'}">${viewDashboard()}</div>`;
  screen.scrollTop = st;
  const car = $('#carousel'); if (car) car.scrollLeft = (ui.slide || 0) * slideStep(car);   // on reste sur la carte choisie
  ui.noAnim = false; ui.animCurve = false;
  drawRadar(measure());
  updateIcon();
}

/* ---------- Onboarding : trois pages plein écran ---------- */

const STEPS = 6;                                   // 0 bienvenue · 1 explication · 2 statut · 3 domaines · 4 rythme · 5 habitudes
const OB_KEYS = ['1', '2', '3', '4', 'r', '5'];     // la page de chaque étape dans les couleurs (--ob-1 … --ob-r … --ob-5)
const OB_COLORS = OB_KEYS.map(k => `var(--ob-${k})`);
const GEN_COLOR = 'var(--ob-gen)';

// Habitudes suggérées : la première de chaque domaine choisi, tant qu'on n'y a pas touché.
// Elles s'affichent à mi-chemin entre « non choisi » et « choisi » ; un tap les confirme, un second tap les retire.
// Dès qu'une habitude du domaine est choisie, la suggestion de ce domaine disparaît : c'est plus clair.
const sugKeys = d => d.domains.filter(id => !d.habits.some(k => k.startsWith(id + ':'))).map(id => `${id}:0`).filter(k => !d.touched.includes(k));
const includedHabits = d => [...new Set([...d.habits, ...sugKeys(d)])].filter(k => d.domains.includes(k.split(':')[0]));

function viewOnboarding() {
  const d = ui.draft, i = ui.step;
  const lab = id => (d.status === 'actif' && id === 'etudes') ? WORK.label : CAT[id].name;
  const picked = includedHabits(d), sugN = sugKeys(d).length;
  const defs = [
    {
      q: `Bienvenue sur ${WORD}.`, sub: `Une app pour trouver ta juste mesure, pas pour faire plus.`,
      body: `<div class="hero-mark">${CHAR}</div>`,
      ok: true, cta: `Découvrir`, skip: true,
    },
    {
      q: `Comment ça marche ?`, sub: `Trois gestes, et c'est tout.`,
      body: `<ol class="how">
        <li><span>1</span><div><b>Tu te racontes en 3 questions</b><small>Ce que tu fais, ce qui compte, tes habitudes actuelles.</small></div></li>
        <li><span>2</span><div><b>Metrön compose ton tracker</b><small>Tes habitudes, rangées par domaine de vie. Tu peux tout modifier.</small></div></li>
        <li><span>3</span><div><b>Tu coches, tu vois ton équilibre</b><small>Pas de score, pas d'échec : seulement si tu es dans ta mesure.</small></div></li>
      </ol>`,
      ok: true, cta: `C'est parti`,
    },
    {
      q: `Qu'est-ce que tu fais dans la vie ?`, sub: `Pour parler ta langue, pas celle d'un formulaire.`,
      body: `<div class="big">${STATUS.map(([id, n, s]) =>
        `<button class="pill" data-act="pick-status" data-v="${id}" aria-pressed="${d.status === id}"><b>${n}</b><small>${s}</small></button>`).join('')}</div>`,
      ok: !!d.status,
    },
    {
      q: `Qu'est-ce qui est important pour toi ?`, sub: `Choisis au moins 3 domaines. Ils formeront ton équilibre.`,
      body: `<div class="big two">${DOMAIN_PICKS.map(([id, n, s]) =>
        `<button class="pill chk" data-act="pick-domain" data-v="${id}" aria-pressed="${d.domains.includes(id)}"><b>${n}</b></button>`).join('')}</div>`,
      ok: d.domains.length >= 3,
      count: `${d.domains.length} sélectionné${d.domains.length > 1 ? 's' : ''} sur 6`,
    },
    {
      q: `Et en ce moment ?`, sub: `Examens, rush ou semaine tranquille : ça règle ta mesure. Tu pourras le changer.`,
      body: `<div class="big">${RHYTHMS.map(([id, n, s]) =>
        `<button class="pill chk" data-act="pick-rhythm" data-v="${id}" aria-pressed="${d.rhythm === id}"><b>${n}</b><small>${s}</small></button>`).join('')}</div>`,
      ok: !!d.rhythm,
    },
    {
      q: `Quelles sont tes habitudes actuelles ?`, sub: `Touche celles que tu as déjà. Les teintes claires sont des suggestions : touche pour les garder.`,
      body: ORDER.filter(id => d.domains.includes(id)).map(id => `
        <p class="grp">${esc(lab(id))}</p>
        <div class="wrap">${CAT[id].habits.map((t, k) => {
          const key = `${id}:${k}`, on = d.habits.includes(key), sug = !on && sugKeys(d).includes(key);
          return `<button class="pill sm chk${sug ? ' sug' : ''}" data-act="pick-habit" data-v="${key}" aria-pressed="${on}" ${sug ? 'data-sug="1"' : ''}>${esc((d.status === 'actif' && WORK.names[t.n]) || t.n)}</button>`;
        }).join('')}</div>`).join(''),
      ok: picked.length > 0,
      count: picked.length ? `${picked.length} habitude${picked.length > 1 ? 's' : ''}${sugN ? ` · ${sugN} suggérée${sugN > 1 ? 's' : ''}` : ''} · tout est modifiable` : `Au moins une, même petite`,
    },
  ];
  const s = defs[i];
  return `
  <div class="ob">
    <div class="ob-top">
      <button class="back" data-act="back" ${i === 0 ? 'disabled' : ''} aria-label="Retour">‹</button>
      <div class="bar"><i style="width:${((i + 1) / STEPS) * 100}%"></i></div>
    </div>
    <div class="ob-body ${ui.dir}">
      <h1 class="q">${s.q}</h1>
      <p class="q-sub">${s.sub}</p>
      ${s.body}
    </div>
    <div class="ob-foot">
      <p class="count">${s.count || ''}</p>
      <button class="cta" data-act="next" ${s.ok ? '' : 'disabled'}>${s.cta || (i === STEPS - 1 ? `Créer mon tracker` : `Continuer`)}</button>
      ${s.skip ? `<button class="skip" data-act="skip-ob">Passer, voir le tableau de bord</button>` : ``}
    </div>
  </div>`;
}

const GEN_LINES = [`Je lis ce que tu m'as dit…`, `Je range tes habitudes par domaine…`, `Je règle ta juste mesure…`, `Voilà.`];
function viewGenerating() {
  return `<div class="gen"><div class="hero-mark breathing">${CHAR}</div><p id="gen-line">${GEN_LINES[0]}</p></div>`;
}
let genTimer = 0;
function startGenerating() {
  ui.generating = true; render();
  let i = 0;
  genTimer = setInterval(() => {
    i++;
    const el = $('#gen-line'); if (el && GEN_LINES[i]) el.textContent = GEN_LINES[i];
    if (i >= GEN_LINES.length) { clearInterval(genTimer); finishOnboarding(); }
  }, 750);
}
function finishOnboarding() {
  const d = ui.draft;
  const { habits, added } = generate(d);
  S = {
    profile: { status: d.status, domains: d.domains },
    habits, logs: [], rhythm: d.rhythm || 'normal', start: Date.now(),
    labels: d.status === 'actif' ? { etudes: WORK.label } : {},
  };
  save();
  ui.animCurve = true; ui.generating = false; ui.onboarding = false; ui.filter = "all"; ui.day = today(); prevShape = []; prevMark = {};
  render();
  toast(added.length
    ? `Ton tracker est prêt. J'ai ajouté une première habitude pour ${added.map(dname).join(` et `).toLowerCase()}.`
    : `Ton tracker est prêt. Tu pourras tout modifier.`, 2200);
}

/* ---------- Tableau de bord ---------- */

function weekCount(hid) { return S.logs.filter(l => l.habit === hid && inWindow(l.day)).length; }
const doneOn = (hid, day) => S.logs.some(l => l.habit === hid && l.day === day);
const lastDays = () => Array.from({ length: 7 }, (_, i) => dayKey(Date.now() - (6 - i) * DAY));

const FILTER = `<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/></svg>`;
const PEN = `<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>`;
// Roue dentée dont le centre est occupé par deux petits yeux (les pupilles suivent le regard)
const GEAR = `<svg class="set-eyes" viewBox="0 0 24 24"><g class="sclera"><circle cx="10.3" cy="12" r="1.75"/><circle cx="13.7" cy="12" r="1.75"/></g><g class="pupils"><circle class="pupil" cx="10.3" cy="12" r=".85"/><circle class="pupil" cx="13.7" cy="12" r=".85"/></g><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

/* ---------- Courbe d'évolution ---------- */

function viewCurve() {
  const pts = history(), span = pts.length;
  const W = 320, H = 170, L = 8, R = 8, T = 10, B = 26, iw = W - L - R, ih = H - T - B;
  const x = i => L + (span === 1 ? 0 : i / (span - 1)) * iw;
  const y = p => T + (1 - p) * ih;
  const f = n => n.toFixed(1);
  const only = ui.filter !== 'all' ? ui.filter : null;

  // Une série = suite de positions (null avant ton premier jour)
  const mean = pt => pt.m.reduce((a, d) => a + d.p, 0) / pt.m.length;
  const dom = id => pts.map(pt => { const d = pt && pt.m.find(z => z.id === id); return d ? d.p : null; });
  const global = pts.map(pt => pt ? mean(pt) : null);
  const ids = ORDER.filter(id => S.habits.some(h => h.domain === id));

  const path = (s, cls, style = '') => {
    let d = '', prev = null;
    s.forEach((p, i) => {
      if (p == null) { prev = null; return; }
      if (prev == null) d += `M${f(x(i))} ${f(y(p))}`;
      else { const mx = (x(prev.i) + x(i)) / 2; d += `C${f(mx)} ${f(y(prev.p))} ${f(mx)} ${f(y(p))} ${f(x(i))} ${f(y(p))}`; }
      prev = { i, p };
    });
    return d ? `<path class="${cls}${ui.animCurve ? ' draw' : ''}" pathLength="1" style="${style}" d="${d}"/>` : ``;
  };
  const lastDot = (s, fill) => { const i = s.map(v => v != null).lastIndexOf(true); return i < 0 ? `` : `<circle class="c-dot" cx="${f(x(i))}" cy="${f(y(s[i]))}" r="${only ? 6 : 4.5}" style="fill:${fill}"/>`; };
  const nowM = measure(), balancedNow = nowM.length > 0 && nowM.every(z => z.s === 'in');       // tout est dans la mesure : turquoise
  const mainColor = only ? `var(--dom-${only}-focus)` : balancedNow ? 'var(--dom-balance)' : 'currentColor';

  const main = only ? dom(only) : global;
  const fmtD = at => new Date(at).toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });
  const labels = [0, Math.floor((span - 1) / 2), span - 1].filter((v, i, a) => a.indexOf(v) === i)
    .map((i, k, a) => `<text x="${f(x(i))}" y="${H - 6}" text-anchor="${k === 0 ? 'start' : k === a.length - 1 ? 'end' : 'middle'}">${i === span - 1 ? `Auj.` : fmtD(Date.now() - (span - 1 - i) * DAY)}</text>`).join('');

  // Tendance : on se rapproche ou on s'éloigne de la juste mesure (centre = .55)
  const dist = pt => pt.m.reduce((a, d) => a + Math.abs(d.p - .55), 0) / pt.m.length;
  const real = pts.filter(Boolean);
  let note = `La courbe se dessine au fil des jours.`;
  if (real.length >= 4 && daysActive() >= 4) {
    const d = dist(real[real.length - 1]) - dist(real[0]);
    note = d < -.04 ? `Tu te rapproches de ta mesure.` : d > .04 ? `Tu t'éloignes un peu de ta mesure. Rien de grave.` : `Ton équilibre est stable.`;
  }

  return `<div class="card slide-card curve-card sl" ${slStyle('curve')}>
    <div class="curve-head"><b>Évolution</b><small>${only ? esc(dname(only)) : `moyenne de tes domaines`}</small></div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution de ton équilibre sur ${span} jours">
      <rect class="c-band" x="${L}" y="${f(y(.7))}" width="${iw}" height="${f(y(.4) - y(.7))}" rx="8"/>
      <text class="c-tag" x="${W - L - 6}" y="${f(y(.55) + 3)}" text-anchor="end">ta mesure</text>
      ${only ? `` : ids.map(id => path(dom(id), 'c-thin', `stroke:var(--dom-${id})`)).join('')}
      ${path(main, 'c-main' + (only ? ' hot' : ''), `stroke:${mainColor}`)}${lastDot(main, mainColor)}
      ${labels}
    </svg>
    <p class="cap">${note}</p>
  </div>`;
}

/* ---------- Graphiques : un par aspect, à faire glisser ---------- */

const fmt1 = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
const plural = n => n >= 2 ? 's' : '';

// Équilibre : où tu en es sur chaque domaine
function viewBalanceCard(m) {
  const [title, line] = headline(m);
  const x = ui.filter !== 'all' ? m.find(z => z.id === ui.filter) : null;
  // Un domaine touché : ses chiffres s'affichent à la place du résumé
  const read = x
    ? `<p class="cap cap-read"><b style="color:var(--dom-${x.id}-focus)">${esc(x.name)}</b> : ${fmt1(x.v)} h sur ${fmt1(x.t.min)} à ${fmt1(x.t.max)} h · ${WORDS[x.s]}</p>`
    : (title ? `<p class="cap"><b>${esc(title)}</b> ${esc(line)}</p>` : ``);
  return `<div class="card slide-card radar-card sl" ${slStyle('balance')}>
    <div class="curve-head"><b>Équilibre</b>${m.length > 0 && m.every(z => z.s === 'in') ? `<span class="bal-pill">Équilibré</span>` : ``}<span class="info">
      <button type="button" class="info-btn" aria-label="Information" aria-describedby="radar-tip">?</button>
      <span class="info-tip" id="radar-tip" role="tooltip">L'anneau clair est ta juste mesure. Le but n'est pas de remplir, c'est de rester dedans.</span>
    </span></div>
    <svg id="radar" viewBox="-155 -158 310 316" role="img" aria-label="Équilibre entre tes domaines"></svg>
    ${read}
    <p class="cap cap-help">Plus la forme touche la zone jaune, plus tu es dans ta mesure. Touche un domaine pour voir ses chiffres.</p></div>`;
}
// Régularité : combien d'habitudes cochées chaque jour
function viewRegularity() {
  const span = ui.period, startKey = dayKey(S.start);
  const days = Array.from({ length: span }, (_, i) => dayKey(Date.now() - (span - 1 - i) * DAY));
  const counts = days.map(d => d < startKey ? null : new Set(S.logs.filter(l => l.day === d).map(l => l.habit)).size);
  const real = counts.filter(c => c != null), active = real.filter(c => c > 0).length;
  const avg = real.length ? real.reduce((a, c) => a + c, 0) / real.length : 0;
  const planned = S.habits.reduce((a, h) => a + h.w, 0) / 7;
  const W = 320, H = 170, L = 8, R = 8, T = 14, B = 26, iw = W - L - R, ih = H - T - B;
  const max = Math.max(S.habits.length, ...real, 1), bw = iw / span;
  const y = v => T + (1 - v / max) * ih, f = n => n.toFixed(1);
  const bars = counts.map((c, i) => c == null ? `` :
    `<rect class="r-bar${c === 0 ? ' zero' : ''}" x="${f(L + i * bw + bw * .16)}" y="${f(y(c))}" width="${f(bw * .68)}" height="${f(Math.max(c === 0 ? 2.5 : 0, ih * c / max))}" rx="${f(Math.min(4, bw * .3))}"/>`).join('');
  const fmtD = at => new Date(at).toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });
  const note = real.length
    ? `${active} jour${plural(active)} actif${plural(active)} sur ${real.length}. En moyenne ${fmt1(avg)} habitude${plural(avg)} par jour, pour ${fmt1(planned)} prévue${plural(planned)}.`
    : `La régularité se dessine au fil des jours.`;
  return `<div class="card slide-card curve-card sl" ${slStyle('regular')}>
    <div class="curve-head"><b>Régularité</b><small>habitudes cochées par jour</small></div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Habitudes cochées chaque jour sur ${span} jours">
      <line class="r-plan" x1="${L}" x2="${W - R}" y1="${f(y(planned))}" y2="${f(y(planned))}"/>
      <text class="c-tag" x="${W - R}" y="${f(y(planned) - 4)}" text-anchor="end">prévu</text>
      ${bars}
      <text x="${L}" y="${H - 6}" text-anchor="start">${fmtD(Date.now() - (span - 1) * DAY)}</text>
      <text x="${W - R}" y="${H - 6}" text-anchor="end">Auj.</text>
    </svg>
    <p class="cap">${note}</p>
  </div>`;
}

// Répartition : où va ton temps éveillé
function viewShare() {
  const n = ui.period;
  const ids = ORDER.filter(id => id !== 'sommeil' && S.habits.some(h => h.domain === id));
  const hrs = ids.map(id => S.logs.filter(l => l.domain === id && inWindow(l.day, n)).reduce((a, l) => a + l.h, 0));
  const tot = hrs.reduce((a, b) => a + b, 0);
  let body;
  if (!tot) body = `<p class="empty">Rien de noté pour l'instant.</p>`;
  else {
    const r = 52, C = 2 * Math.PI * r;
    let acc = 0;
    const segs = ids.map((id, i) => {
      const len = hrs[i] / tot * C, dash = Math.max(0, len - 2);
      const s = hrs[i] ? `<circle class="dseg" cx="70" cy="70" r="${r}" stroke="var(--dom-${id})" stroke-dasharray="${dash.toFixed(1)} ${(C - dash).toFixed(1)}" stroke-dashoffset="${(-acc).toFixed(1)}"/>` : ``;
      acc += len; return s;
    }).join('');
    const legend = ids.map((id, i) => [id, hrs[i]]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).map(([id, h]) =>
      `<li><i class="ddot sh-${id}" style="background:var(--dom-${id})" aria-hidden="true"></i><span class="lg-n">${esc(dname(id))}</span><span class="lg-v"><b>${fmt1(h)} h</b> · ${Math.round(h / tot * 100)} %</span></li>`).join('');
    body = `<div class="share">
      <svg viewBox="0 0 140 140" role="img" aria-label="Répartition de ton temps éveillé"><g transform="rotate(-90 70 70)">${segs}</g>
        <text x="70" y="78" text-anchor="middle" class="share-n">${fmt1(tot)} h</text></svg>
      <ul>${legend}</ul></div>`;
  }
  return `<div class="card slide-card sl" ${slStyle('share')}>
    <div class="curve-head"><b>Répartition</b><small>où va ton temps éveillé</small></div>${body}</div>`;
}

/* ---------- Cartes d'action : ce qui compte pour toi, là, maintenant ---------- */

// Chaque carte du carrousel a son fond, la couleur de son texte et l'opacité de son sous-texte (voir tokens.css, --sl-*)
const slStyle = k => `style="--sl:var(--sl-${k});--sl-i:var(--sl-${k}-ink);--sl-o:var(--sl-${k}-op)"`;

const nextHabit = () => S.habits.find(h => !doneOn(h.id, today()));

// 1. Aujourd'hui : combien il en reste, et la prochaine à cocher
function viewTodayCta() {
  const left = S.habits.filter(h => !doneOn(h.id, today())), nxt = left[0];
  const title = !S.habits.length ? `Ajoute ta première habitude`
    : left.length ? `Il te reste ${left.length} habitude${plural(left.length)}`
    : `Tout est fait.`;
  const sub = !S.habits.length ? `Une seule, même petite, suffit pour commencer.`
    : nxt ? `Prochaine : ${esc(nxt.name)} · ${fmtDur(nxt.h)}`
    : `Profite de ta journée.`;
  const btn = !S.habits.length ? `<button class="cta-btn" data-act="add">Ajouter une habitude</button>`
    : nxt ? `<button class="cta-btn" data-act="toggle" data-v="${nxt.id}">C'est fait : ${esc(nxt.name)}</button>`
    : `<button class="cta-btn" data-act="slide-name" data-v="Équilibre">Voir mon équilibre</button>`;
  return `<div class="card slide-card cta-card cta-today sl" ${slStyle('today')}>
    <p class="cta-eyebrow">Aujourd'hui</p>
    <h3 class="cta-title">${title}</h3>
    <p class="cta-sub">${sub}</p>
    <div class="cta-row">${btn}${left.length ? `<button class="cta-link" data-act="goto" data-v="habits">Voir la liste</button>` : ``}</div>
    <div class="cta-char">${chick({ mood: left.length || !S.habits.length ? 'open' : 'happy', acc: left.length || !S.habits.length ? [] : ['confetti'], deco: true })}</div>
  </div>`;
}

// 2. Premier pas : le tracker de départ devient le tien
function viewStartCta() {
  return `<div class="card slide-card cta-card cta-start sl" ${slStyle('start')}>
    <p class="cta-eyebrow">Pour toi</p>
    <p class="cta-sub">3 questions, et Metrön compose des habitudes qui te ressemblent.</p>
    <span class="cta-initial cta-num" aria-hidden="true">3</span>
    <p class="cta-sub">3 questions, et Metrön compose des habitudes qui te ressemblent.</p>
    <div class="cta-row"><button class="cta-btn" data-act="start-ob">Commencer</button><button class="cta-link" data-act="dismiss-banner">Plus tard</button></div>
  </div>`;
}

// 3. À regarder : le domaine qui s'éloigne le plus de ta mesure
function viewFocusCta(m) {
  const off = m.filter(x => x.s !== 'in' && x.s !== 'obs').sort((a, b) => Math.abs(b.p - .55) - Math.abs(a.p - .55))[0];
  if (!off) return `<div class="card slide-card cta-card cta-focus sl" ${slStyle('focus')}>
    <p class="cta-eyebrow">À regarder</p>
    <h3 class="cta-title">${daysActive() < 4 ? `On observe tes premiers jours` : `Tu es dans ta mesure`}</h3>
    <p class="cta-sub">${daysActive() < 4 ? `Coche ce que tu fais, sans te juger. Metrön s'adapte.` : `Rien à corriger. Continue sans en faire plus.`}</p>
    <div class="cta-row"><button class="cta-btn" data-act="slide-name" data-v="Équilibre">Voir l'équilibre</button></div>
    ${daysActive() < 4 ? `<div class="cta-char obs">${chick({ acc: ['loupe'], look: [0, 0], deco: true })}</div>` : ``}</div>`;
  const low = off.s === 'low' || off.s === 'low2';
  return `<div class="card slide-card cta-card cta-focus sl" ${slStyle('focus')}>
    <p class="cta-eyebrow">À regarder</p>
    <h3 class="cta-title">${esc(FOCUS_TITLE[off.s](off.name))}</h3>
    <p class="cta-sub">${low ? `Une petite habitude suffirait pour revenir dans ta mesure.` : `Tu peux lever le pied, sans culpabiliser.`}</p>
    <div class="cta-gauge" aria-hidden="true"><div class="gtrack"><i class="gzone"></i><i class="gmark" style="left:${off.p * 100}%;transform:translateX(-${off.p * 100}%);background:var(--dom-${off.id}-focus)"></i></div><small>${low ? `en dessous` : `au-dessus`} · ta mesure au centre</small></div>
    <div class="cta-row"><button class="cta-btn" data-act="focus" data-v="${off.id}">Voir ses habitudes</button></div>
    ${off.s === 'high' ? `<div class="cta-hang">${chick({ mood: 'wide', flip: true, pal: off.id, look: [0, 0], deco: true })}</div>` : ``}
  </div>`;
}

// 0. Domaine : quand on est sur un domaine, une carte à sa couleur, avec sa personnalité
function viewDomainCta(m) {
  const id = ui.filter, x = m.find(z => z.id === id);
  if (!x) return ``;
  const mine = S.habits.filter(h => h.domain === id), left = mine.filter(h => !doneOn(h.id, today())), nxt = left[0];
  const state = daysActive() < 4 ? `On observe tes premiers jours` : WORDS[x.s].charAt(0).toUpperCase() + WORDS[x.s].slice(1);
  const sub = `${state} · ${fmt1(x.v)} h sur ${ui.period} jours`;
  const btn = nxt ? `<button class="cta-btn" data-act="toggle" data-v="${nxt.id}">C'est fait : ${esc(nxt.name)}</button>` : `<button class="cta-btn" data-act="add">Ajouter une habitude ici</button>`;
  return `<div class="card slide-card cta-card cta-domain" style="--dc:var(--dom-${id}-focus)">
    <p class="cta-eyebrow">Domaine · ${mine.length} habitude${plural(mine.length)}</p>
    <h3 class="cta-title">${esc(x.name)}</h3>
    <p class="cta-sub">${sub}${left.length ? `<br>${left.length} à cocher aujourd'hui` : mine.length ? `<br>Tout est fait aujourd'hui` : ``}</p>
    <div class="cta-row">${btn}<button class="cta-link" data-act="filter" data-v="all">Voir tous les domaines</button></div>
    <span class="cta-initial" aria-hidden="true">${esc(x.name.charAt(0))}</span>
    ${x.s === 'high'
      ? `<div class="cta-hang">${chick({ mood: 'wide', flip: true, acc: [DOM_ACC[id]], pal: id, look: [0, 0], deco: true })}</div>`            // trop haut : il fait le poirier
      : `<div class="cta-char dom">${chick({ mood: 'happy', acc: [DOM_ACC[id]], pal: id, deco: true })}</div>`}
  </div>`;
}

function slidesList(m) {
  const s = [];
  if (ui.filter !== 'all' && m.some(z => z.id === ui.filter)) s.push([dname(ui.filter), viewDomainCta(m)]);   // sur un domaine : sa carte d'abord
  if (isWeekCard()) s.push(['Ta semaine', viewWeekCta()]);                     // dimanche soir : le bilan de la semaine
  s.push(['Aujourd\'hui', viewTodayCta()]);
  if (S.profile.starter && !S.profile.dismissed) s.push(['Pour toi', viewStartCta()]);
  if (S.habits.length) s.push(['À regarder', viewFocusCta(m)]);
  if (m.length >= 3) s.push(['Équilibre', viewBalanceCard(m)]);
  if (S.habits.length) s.push(['Évolution', viewCurve()], ['Régularité', viewRegularity()], ['Répartition', viewShare()]);
  return s;
}

/* ---------- Tableau de bord ---------- */

function viewDashboard() {
  if (isNight()) return viewNight();
  const m = measure();
  const [title, line] = headline(m);
  const hour = new Date().getHours();
  const hello = hour < 5 ? `Bonne nuit` : hour < 18 ? `Bonjour` : `Bonsoir`;
  const date = new Date().toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });

  if (ui.filter !== 'all' && !S.habits.some(h => h.domain === ui.filter)) ui.filter = 'all';
  const doms = ORDER.filter(id => S.habits.some(h => h.domain === id));
  const inDom = S.habits.filter(h => ui.filter === 'all' || h.domain === ui.filter);
  const doneN = inDom.filter(h => doneOn(h.id, ui.day)).length;
  const list = inDom.filter(h => ui.show === 'all' || (ui.show === 'done') === doneOn(h.id, ui.day))
    .sort((a, b) => doneOn(a.id, ui.day) - doneOn(b.id, ui.day));   // les faites descendent en bas
  const dayLabel = ui.day === today() ? `Aujourd'hui` : new Date(ui.day + 'T12:00').toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });
  // Détail par domaine : seulement les domaines pratiqués (au moins une case sur la période), les autres sur demande
  const practiced = m.filter(x => x.v > 0);
  const hiddenN = ui.filter === 'all' && practiced.length && practiced.length < m.length ? m.length - practiced.length : 0;
  const rows = ui.filter !== 'all' ? m.filter(x => x.id === ui.filter) : hiddenN && !ui.allDoms ? practiced : m;
  const banner = S.profile.starter && !S.profile.dismissed;
  const slides = slidesList(m);
  if (ui.slideName) { const k = slides.findIndex(s => s[0] === ui.slideName); if (k >= 0) ui.slide = k; ui.slideName = null; }
  ui.slide = Math.min(ui.slide || 0, Math.max(0, slides.length - 1));
  const SHOW = { all: `Tout`, todo: `À faire`, done: `Fait` };

  return `
  <div class="hero">
    <div class="topbar">
      <div class="brand">${TILE}<span class="wordmark">${WORD}</span></div>
      <button class="icon-btn set" data-act="open-settings" aria-label="Réglages">${GEAR}</button>
    </div>
    <header class="head">
      <div class="head-line">
        <p class="eyebrow">${esc(date)}</p>
        <div class="period">
          <button class="period-btn" data-act="period-toggle" aria-expanded="${ui.periodOpen}">${ui.period} derniers jours <span class="caret">⌄</span></button>
          ${ui.periodOpen ? `<div class="period-menu" role="menu">${[7, 30].map(n =>
            `<button role="menuitemradio" data-act="period" data-v="${n}" aria-checked="${ui.period === n}">${n} derniers jours</button>`).join('')}</div>` : ``}
        </div>
      </div>
      <h1 class="h1">${hello}</h1>
    </header>

    ${slides.length ? `<div class="carousel" id="carousel" aria-label="Pour toi, fais glisser">${slides.map(([n, html]) =>
      `<div class="slide" role="group" aria-label="${n}">${html}</div>`).join('')}</div>
    <div class="sdots" role="tablist" aria-label="Choisir une carte">${slides.map(([n], i) =>
      `<button role="tab" data-act="slide" data-v="${i}" aria-label="${n}" aria-selected="${ui.slide === i}"></button>`).join('')}</div>` : ``}
  </div>

  <section class="blk" id="habits-blk">
    <div class="blk-head">
      <h2 class="h2">${esc(dayLabel)} <small>${doneN} / ${inDom.length}</small></h2>
      <button class="icon-btn filter-btn" data-act="open-filters" aria-label="Filtrer" data-on="${ui.filter !== 'all' || ui.show !== 'all'}">${FILTER}</button>
    </div>
    ${ui.filter !== 'all' || ui.show !== 'all' ? `<div class="active-filters">
      ${ui.filter !== 'all' ? `<button class="afil" data-act="filter" data-v="all"><i class="ddot sh-${ui.filter}" style="background:var(--dom-${ui.filter}-focus)"></i>${esc(dname(ui.filter))} <span>✕</span></button>` : ``}
      ${ui.show !== 'all' ? `<button class="afil" data-act="show" data-v="all">${SHOW[ui.show]} <span>✕</span></button>` : ``}
    </div>` : ``}

    <div class="days" role="group" aria-label="Choisir un jour">
      ${lastDays().map(d => {
        const dt = new Date(d + 'T12:00'), has = S.logs.some(l => l.day === d), before = d < dayKey(S.start);
        return `<button data-act="day" data-v="${d}" aria-pressed="${ui.day === d}"><small>${dt.toLocaleDateString('fr-CH', { weekday: 'narrow' })}</small><b>${dt.getDate()}</b><span class="dc${before ? ' off' : ''}" aria-hidden="true">${miniChick({ mood: has ? 'happy' : 'closed' })}</span></button>`;
      }).join('')}
    </div>

    <div class="habits">
      ${list.length ? list.map(h => {
        const done = doneOn(h.id, ui.day), wk = weekCount(h.id);
        return `<div class="hrow">
          <button class="habit ${ui.pop === h.id ? 'pop' : ''}" style="--dc:var(--dom-${h.domain})" data-act="toggle" data-v="${h.id}" aria-pressed="${done}">
            <span class="tick" aria-hidden="true">${miniChick({ mood: done ? 'wink' : 'open', pal: done ? h.domain : 'original' })}</span>
            <span class="n"><b>${esc(h.name)}</b><small><i class="ddot sh-${h.domain}" style="background:var(--dom-${h.domain})" aria-hidden="true"></i>${fmtDur(h.h)}<span class="dn">${esc(dname(h.domain))}</span><span class="wk">${wk} cette sem.</span></small></span>
          </button>
          <button class="pen" data-act="edit" data-v="${h.id}" aria-label="Modifier ${esc(h.name)}">${PEN}</button>
        </div>`;
      }).join('') : `<div class="empty-art">${inDom.length && ui.show === 'todo' ? miniChick({ mood: 'happy', acc: ['confetti'] }) : miniChick({ mood: 'wide', acc: ['boite'] })}<p class="empty">${inDom.length ? (ui.show === 'todo' ? `Tout est fait pour ce jour.` : `Rien de fait pour l'instant.`) : `Aucune habitude ici.`}</p></div>`}
    </div>
    <button class="add" data-act="add">+ Ajouter une habitude</button>
  </section>

  <section class="blk">
    <h2 class="h2">Détail par domaine${ui.filter === 'all' ? `` : ` <small>${esc(dname(ui.filter))}</small>`}</h2>
    <p class="note">La zone jaune est ta mesure : tu y es bien. Elle vient de tes habitudes (durée × fréquence), de 80 % à 120 %, et se déplace avec ton rythme « ${esc((RHYTHMS.find(r => r[0] === S.rhythm) || [])[1] || 'Normal')} ».${daysActive() < ui.period ? ` Pendant tes premiers jours, elle s'ajuste.` : ``}</p>
    <ul class="rows">
      ${rows.map(x => `<li>
        <div class="row-head"><span class="row-name"><i class="ddot sh-${x.id}" style="background:var(--dom-${x.id})" aria-hidden="true"></i><b>${esc(x.name)}</b></span><span class="row-state" data-s="${x.s}">${WORDS[x.s]}</span></div>
        <div class="track"><div class="zone"></div><div class="mark" data-id="${x.id}" data-p="${x.p}" style="left:${(prevMark[x.id] ?? 0) * 100}%;transform:translateX(-${(prevMark[x.id] ?? 0) * 100}%)">${miniChick({ acc: [DOM_ACC[x.id]], pal: x.id, mood: { in: 'happy', obs: 'open', low: 'closed', low2: 'closed', high: 'wide' }[x.s] })}</div></div>
        <div class="row-foot"><span class="row-num"><b>${fmt1(x.v)} h</b> sur ${fmt1(x.t.min)} à ${fmt1(x.t.max)} h</span>${x.s === 'low' || x.s === 'low2' || x.s === 'high' ? `<button class="row-act" data-act="focus" data-v="${x.id}">${x.s === 'high' ? `Voir ses habitudes` : `Une petite habitude ?`} ›</button>` : ``}</div>
      </li>`).join('')}
    </ul>
    ${hiddenN ? `<button class="row-act more-doms" data-act="all-doms">${ui.allDoms ? `Masquer les domaines non pratiqués` : `Voir les ${hiddenN} autre${plural(hiddenN)} domaine${plural(hiddenN)}`} ›</button>` : ``}
  </section>`;
}
// Un mini-poussin par domaine, avec son accessoire, au-dessus du nom (en dessous pour les domaines du bas)
function radarMini(id, lx, ly) {
  const w = 30, h = w * 810 / 860, y = ly < 0 ? ly - 8 - h : ly + 8;
  return miniChick({ acc: [DOM_ACC[id]], pal: id }).replace('<svg class="mc"', `<svg class="mc rmini" x="${(lx - w / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h.toFixed(1)}"`);
}
let raf = 0, prevShape = [], prevMark = {};
function drawRadar(m) {
  // Les repères glissent depuis leur position précédente
  requestAnimationFrame(() => document.querySelectorAll('.mark').forEach(el => {
    el.style.left = (el.dataset.p * 100) + '%';
    el.style.transform = `translateX(-${el.dataset.p * 100}%)`;
    prevMark[el.dataset.id] = +el.dataset.p;
  }));
  const svg = $('#radar');
  if (!svg) return;
  const N = m.length, R = 100;
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / N;
  const pt = (i, r) => [Math.cos(ang(i)) * r * R, Math.sin(ang(i)) * r * R];
  const poly = rs => rs.map((r, i) => pt(i, r).map(n => n.toFixed(1)).join(',')).join(' ');
  const ring = r => 'M' + Array.from({ length: N }, (_, i) => pt(i, r).map(n => n.toFixed(1)).join(' ')).join('L') + 'Z';
  // Une couleur par domaine ; le domaine mis en avant (filtre) passe en couleur vive avec lueur ;
  // quand tout est dans la mesure, la forme prend la couleur unique de l'équilibre.
  const focus = ui.filter !== 'all' ? ui.filter : null;
  const balanced = N > 0 && m.every(x => x.s === 'in');
  const col = (id, hot) => `var(--dom-${id}${hot ? '-focus' : ''})`;
  svg.innerHTML = `
    <polygon class="ring" points="${poly(Array(N).fill(1))}"/>
    <path class="band" fill-rule="evenodd" d="${ring(.7)}${ring(.4)}"/>
    ${m.map((x, i) => {
      const hot = x.id === focus, dim = focus && !hot, [a, b] = pt(i, 1), [lx, ly] = pt(i, 1.18);
      return `<line class="axis${hot ? ' hot' : ''}" x1="0" y1="0" x2="${a}" y2="${b}" style="${hot ? `stroke:${col(x.id, 1)}` : ''}"/>
        <g class="rhit${dim ? ' dim' : ''}${hot ? ' hot' : ''}" data-act="filter" data-v="${hot ? 'all' : x.id}"><circle class="hit" cx="${lx}" cy="${ly}" r="20"/>${radarMini(x.id, lx, ly)}<text x="${lx}" y="${ly}" ${hot ? `style="fill:${col(x.id, 1)}"` : ``}>${esc(x.name)}</text></g>`;
    }).join('')}
    <polygon class="shape${balanced ? ' balanced' : ''}" id="shape"/>
    ${m.map((x, i) => {
      const hot = x.id === focus, dim = focus && !hot;
      return `<circle class="dot${hot ? ' hot' : ''}${dim ? ' dim' : ''}" id="dot${i}" r="${hot ? 7.5 : 4.5}" data-act="filter" data-v="${hot ? 'all' : x.id}" style="fill:${col(x.id, hot)};--glow:${col(x.id, 1)}"/>`;
    }).join('')}`;
  svg.insertAdjacentHTML('beforeend', radarChick(m, ang));        // le poussin au centre : son regard désigne le domaine à regarder
  const to = m.map(x => x.p), t0 = performance.now();
  const from = prevShape.length === N ? prevShape.slice() : Array(N).fill(0);
  cancelAnimationFrame(raf);
  const step = now => {
    const k = Math.min(1, (now - t0) / (reduced() ? 1 : 600));
    const rs = to.map((v, i) => from[i] + (v - from[i]) * EASE(k));
    prevShape = rs;
    $('#shape')?.setAttribute('points', poly(rs));
    rs.forEach((r, i) => { const c = $('#dot' + i); if (!c) return; const [x, y] = pt(i, r); c.setAttribute('cx', x); c.setAttribute('cy', y); });
    if (k < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

/* ---------- Feuille : modifier une habitude / réglages ---------- */

function openSheet(id) { ui.sheet = id; renderSheet(); }
function renderSheet() {
  const sh = $('#sheet'), panel = $('#sheet-panel');
  const wasOpen = !sh.hidden;
  const show = html => { sh.hidden = false; if (wasOpen) panel.style.animation = 'none'; panel.innerHTML = html; };

  // Filtres : un seul bouton rond sur le tableau de bord, tout se règle ici
  if (ui.sheet === 'filters') {
    const doms = ORDER.filter(id => S.habits.some(h => h.domain === id));
    const SHOW = { all: `Tout`, todo: `À faire`, done: `Fait` };
    return show(`
      <div class="grab"></div>
      <h2 class="h2" style="margin-bottom:6px">Filtrer</h2>
      <span class="lbl">Domaine</span>
      <div class="chips">
        <button class="chip" data-act="filter" data-v="all" aria-pressed="${ui.filter === 'all'}">Tout</button>
        ${doms.map(id => `<button class="chip" data-act="filter" data-v="${id}" aria-pressed="${ui.filter === id}"><i class="ddot sh-${id}" style="background:var(--dom-${id})"></i>${esc(dname(id))}</button>`).join('')}
      </div>
      <span class="lbl">Afficher</span>
      <div class="seg">${Object.entries(SHOW).map(([id, n]) => `<button data-act="show" data-v="${id}" aria-pressed="${ui.show === id}">${n}</button>`).join('')}</div>
      <div class="sheet-actions"><button class="cta" data-act="close-sheet">Terminé</button></div>`);
  }

  // Pause de 5 minutes : il gonfle et se dégonfle, tu respires avec lui
  if (ui.sheet === 'breathe') {
    return show(`
      <div class="grab"></div>
      <h2 class="h2" style="margin-bottom:6px">Pause de 5 minutes</h2>
      <p class="cap" style="margin:0;text-align:left;padding:0">Inspire quand il gonfle, souffle quand il se dégonfle. Rien d'autre à faire.</p>
      <div class="breathe-art"><i></i><i></i><i></i>${chick({ mood: 'closed', pal: 'repos', look: [0, 0], deco: true })}</div>
      <p class="bcount" id="bcount">5:00</p>
      <div class="sheet-actions"><button class="cta" data-act="close-sheet">Terminer</button></div>`);
  }

  if (ui.sheet === 'settings') {
    const rem = S.reminder || { on: false, time: '19:00' };
    const perm = typeof Notification === 'undefined' ? 'non-supporte' : Notification.permission;
    return show(`
      <div class="grab"></div>
      <h2 class="h2" style="margin-bottom:6px">Réglages</h2>

      <span class="lbl">Mon rythme</span>
      <div class="seg">${RHYTHMS.map(([id, n]) => `<button data-act="rhythm" data-v="${id}" aria-pressed="${S.rhythm === id}">${n}</button>`).join('')}</div>
      <p class="cap" style="margin-top:10px;text-align:left;padding:0">Calme : plus de sport, de social et de projets. Chargé (examens) : plus d'études, moins de sport et de social. Ta mesure se déplace, sans jugement.</p>

      <span class="lbl">Accessibilité</span>
      <p class="cap" style="margin:0 0 12px;text-align:left;padding:0">Les couleurs sont toujours doublées par une forme et un nom. Ces réglages vont plus loin.</p>
      <div class="seg" role="group" aria-label="Taille du texte">${[['0', 'Texte normal'], ['1', 'Grand'], ['2', 'Très grand']].map(([v, n]) => `<button data-act="a11y-text" data-v="${v}" aria-pressed="${a11y().text === +v}">${n}</button>`).join('')}</div>
      ${[['contrast', 'Contraste renforcé', 'Texte plus noir, bords plus nets'], ['motion', 'Moins d\'animations', 'Presque aucun mouvement'], ['labels', 'Noms toujours visibles', 'Le domaine écrit sur chaque habitude']].map(([k, t, s]) =>
        `<div class="rem a11y-row"><span class="rem-t"><b>${t}</b><small>${s}</small></span><button class="switch" role="switch" aria-checked="${a11y()[k]}" data-act="a11y-toggle" data-v="${k}" aria-label="${t}"><i></i></button></div>`).join('')}

      <div class="rem a11y-row"><span class="rem-t"><b>Il s’endort à 23 h</b><small>La nuit, l’écran se repose : une phrase et lui qui dort</small></span><button class="switch" role="switch" aria-checked="${S.night !== false}" data-act="night-toggle" aria-label="Mode nuit"><i></i></button></div>
      <button class="erow" data-act="open-breathe"><span><b>Pause de 5 minutes</b><br><small>Il gonfle, il se dégonfle, tu respires. (Appui long sur lui, en haut)</small></span><span class="chev">›</span></button>

      <span class="lbl">Rappel doux</span>
      <div class="rem">
        <button class="switch" role="switch" aria-checked="${rem.on}" data-act="rem-toggle" aria-label="Activer le rappel"><i></i></button>
        <span class="rem-t">« Une petite chose aujourd'hui ? »</span>
        <input type="time" id="rem-time" value="${rem.time}" aria-label="Heure du rappel">
      </div>
      <p class="cap" style="margin-top:8px;text-align:left;padding:0">${perm === 'denied' ? `Les notifications sont bloquées dans ton navigateur : autorise-les pour recevoir le rappel.` : perm === 'non-supporte' ? `Ce navigateur ne gère pas les notifications.` : `Le rappel arrive tant que Metrön est ouverte ou installée sur ton écran d'accueil. Pour un rappel garanti app fermée, il faudra une app native.`}</p>

      <span class="lbl">Sur ton téléphone</span>
      ${installEvt ? `<button class="erow" data-act="install"><span><b>Installer Metrön</b><br><small>Ajoute l'icône à ton écran d'accueil</small></span><span class="chev">›</span></button>`
        : `<div class="erow plain"><span><b>Écran d'accueil</b><br><small>Menu du navigateur › « Ajouter à l'écran d'accueil ». Appui long sur l'icône : « Cocher la prochaine ».</small></span></div>`}
      <a class="erow" href="widgets.html" target="_blank" rel="noopener"><span><b>Voir les widgets</b><br><small>Aperçu : un tap pour cocher, depuis l'écran d'accueil</small></span><span class="chev">›</span></a>

      <span class="lbl">Tes données</span>
      <button class="erow" data-act="export-json"><span><b>Exporter une sauvegarde</b><br><small>Un fichier JSON : habitudes et historique</small></span><span class="chev">›</span></button>
      <button class="erow" data-act="export-csv"><span><b>Exporter en tableau (CSV)</b><br><small>Pour Excel, Sheets, Obsidian…</small></span><span class="chev">›</span></button>
      <button class="erow" data-act="import"><span><b>Importer une sauvegarde</b><br><small>Remplace tes données actuelles</small></span><span class="chev">›</span></button>
      <p class="cap" style="margin-top:6px;text-align:left;padding:0">Tes données restent sur cet appareil, sans compte. Exporte de temps en temps.</p>

      <span class="lbl">Ton tracker</span>
      <button class="erow" data-act="restart-today"><span><b>Repartir d'aujourd'hui</b><br><small>Garde tes habitudes, range l'historique : on recommence à observer</small></span><span class="chev">›</span></button>
      <button class="erow" data-act="retake"><span><b>Refaire le questionnaire</b><br><small>4 questions, ton tracker sera recomposé</small></span><span class="chev">›</span></button>
      <button class="erow" data-act="wipe"><span><b>Tout remettre à zéro</b><br><small>Efface tes habitudes et ton historique</small></span><span class="chev">›</span></button>
      <div class="sheet-actions"><button class="cta" data-act="close-sheet">Terminé</button></div>`);
  }

  const h = S.habits.find(x => x.id === ui.sheet);
  if (!h) { sh.hidden = true; return; }
  const lg = S.logs.find(l => l.habit === h.id && l.day === ui.day);
  const when = ui.day === today() ? `aujourd'hui` : new Date(ui.day + 'T12:00').toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });
  show(`
    <div class="grab"></div>
    <span class="lbl" style="margin-top:0">Nom</span>
    <input class="text-in" id="h-name" value="${esc(h.name)}" placeholder="Nom de l'habitude" autocomplete="off">
    ${lg ? `<span class="lbl">Durée réelle · ${esc(when)}</span>
    <div class="step real"><span class="v">${fmtDur(lg.h)} <small>ce jour-là</small></span>
      <span class="btns"><button data-act="log-dur" data-v="-1" aria-label="Moins">−</button><button data-act="log-dur" data-v="1" aria-label="Plus">+</button></span></div>
    <p class="cap" style="margin-top:6px;text-align:left;padding:0">Ta mesure compte le temps réel. Astuce : reste appuyé·e sur une habitude pour venir ici.</p>` : ``}
    <span class="lbl">Domaine</span>
    <div class="chips">${ORDER.map(id => `<button class="chip" data-act="h-domain" data-v="${id}" aria-pressed="${h.domain === id}">${esc(dname(id))}</button>`).join('')}</div>
    <span class="lbl">Durée prévue</span>
    <div class="step"><span class="v">${fmtDur(h.h)} <small>par fois</small></span>
      <span class="btns"><button data-act="h-dur" data-v="-1" aria-label="Moins">−</button><button data-act="h-dur" data-v="1" aria-label="Plus">+</button></span></div>
    <span class="lbl">Fréquence</span>
    <div class="step"><span class="v">${h.w} <small>fois par semaine</small></span>
      <span class="btns"><button data-act="h-freq" data-v="-1" aria-label="Moins">−</button><button data-act="h-freq" data-v="1" aria-label="Plus">+</button></span></div>
    <div class="sheet-actions"><button class="danger" data-act="h-del">Supprimer</button><button class="cta" data-act="close-sheet">Terminé</button></div>`);
}
function closeSheet() {
  clearInterval(breathT);
  const h = S.habits.find(x => x.id === ui.sheet);
  if (h && !h.name.trim()) S.habits = S.habits.filter(x => x !== h);   // habitude sans nom : on l'oublie
  ui.sheet = null; $('#sheet').hidden = true; save(); ui.noAnim = true; render();
}

/* ---------- Toast ---------- */
let toastT;
/* =====================================================
   L'île Metrön : une pilule en haut de l'écran, comme la Dynamic Island.
   Repliée : le poussin et la prochaine habitude. Touchée : elle s'ouvre (prochaine habitude + « C'est fait »).
   Quand on coche : elle s'élargit un instant pour fêter. Pas sur iPhone, qui a déjà la sienne.
   ===================================================== */
const IPHONE = /iPhone|iPod/.test(navigator.userAgent);
let islandTimer = 0, islandMsg = null;
function islandFlash(h) {
  islandMsg = h; ui.islandOpen = false; clearTimeout(islandTimer);
  islandTimer = setTimeout(() => { islandMsg = null; renderIsland(); }, 2200);
}
function renderIsland() {
  const el = $('#island'); if (!el) return;
  const off = ui.onboarding || (IPHONE && matchMedia('(max-width: 500px)').matches);   // sur un vrai iPhone : on laisse la sienne
  el.classList.toggle('isl-off', off);
  if (off) { el.innerHTML = ''; return; }
  const left = S.habits.filter(h => !doneOn(h.id, today())), nxt = left[0];
  const total = S.habits.length, frac = total ? (total - left.length) / total : 0, C = 2 * Math.PI * 9;
  const ring = `<svg class="isl-ring" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="3"/><circle cx="12" cy="12" r="9" fill="none" stroke="var(--brand-yellow)" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 12 12)"/></svg>`;
  const face = `<span class="isl-face">${miniChick({ mood: islandMsg || !nxt ? 'happy' : 'open' })}</span>`;
  let mode, html;
  if (islandMsg) {
    mode = 'flash';
    html = `${face}<span class="isl-txt"><b>C’est fait</b><small>${esc(islandMsg.name)}</small></span><span class="isl-ok" aria-hidden="true">✓</span>`;
  } else if (ui.islandOpen) {
    mode = 'open';
    html = `<button class="isl-hit" data-act="island" aria-label="Replier"></button>${face}<span class="isl-txt"><small>${nxt ? 'Prochaine' : 'Aujourd’hui'}</small><b>${nxt ? esc(nxt.name) : 'Tout est fait.'}</b>${nxt ? `<small>${fmtDur(nxt.h)} · ${esc(dname(nxt.domain))}</small>` : `<small>Profite de ta journée.</small>`}</span>
      ${nxt ? `<button class="isl-btn" data-act="toggle" data-v="${nxt.id}">C’est fait</button>` : ``}`;
  } else {
    mode = 'mini';
    html = `<button class="isl-hit" data-act="island" aria-label="Ouvrir l’île Metrön"></button>${face}<span class="isl-txt"><b>${nxt ? esc(nxt.name) : 'Tout est fait'}</b></span>${ring}`;
  }
  el.dataset.mode = mode; el.innerHTML = html;
}

function toast(msg, ms = 2400) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms);
}

/* =====================================================
   Événements
   ===================================================== */

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (ui.periodOpen && (!el || !el.dataset.act.startsWith('period'))) { ui.periodOpen = false; ui.noAnim = true; render(); }
  if (!el) return;
  const act = el.dataset.act, v = el.dataset.v;
  const sheetHabit = () => S.habits.find(x => x.id === ui.sheet);
  const redraw = () => { ui.noAnim = true; render(); };

  switch (act) {
    // Questionnaire (facultatif)
    case 'start-ob': ui = { ...ui, onboarding: true, step: 2, obMin: 2, dir: 'fwd', draft: emptyDraft() }; render(); $('#screen').scrollTop = 0; break;
    case 'skip-ob': ui.onboarding = false; save(); redraw(); break;
    case 'pick-status': ui.draft.status = v; keepScroll(); break;
    case 'pick-rhythm': ui.draft.rhythm = v; keepScroll(); break;
    case 'pick-domain': case 'pick-habit': {
      const a = act === 'pick-domain' ? ui.draft.domains : ui.draft.habits, i = a.indexOf(v);
      i < 0 ? a.push(v) : a.splice(i, 1);
      if (act === 'pick-habit' && !ui.draft.touched.includes(v)) ui.draft.touched.push(v);   // une suggestion touchée n'en est plus une
      keepScroll(); break;
    }
    case 'next':
      if (ui.step === STEPS - 1) startGenerating();
      else { ui.step++; ui.dir = 'fwd'; render(); $('#screen').scrollTop = 0; }
      break;
    case 'back':
      if (ui.step <= ui.obMin) { ui.onboarding = false; redraw(); }
      else { ui.step--; ui.dir = 'bck'; render(); $('#screen').scrollTop = 0; }
      break;
    case 'dismiss-banner': S.profile.dismissed = true; save(); redraw(); break;

    // Période de l'équilibre
    case 'period-toggle': ui.periodOpen = !ui.periodOpen; redraw(); break;
    case 'period': ui.period = +v; ui.periodOpen = false; ui.animCurve = true; redraw(); break;

    // Filtres et jour
    case 'filter': ui.filter = v; if (el.closest('.chip') || el.closest('.cta-card') || el.closest('.afil')) ui.slide = 0; redraw(); if (ui.sheet === 'filters') renderSheet(); break;
    case 'all-doms': ui.allDoms = !ui.allDoms; redraw(); break;
    case 'show': ui.show = v; redraw(); if (ui.sheet === 'filters') renderSheet(); break;
    case 'open-filters': openSheet('filters'); break;
    case 'goto': { const el = $('#habits-blk'); if (el) scrollScreen(topOf(el)); break; }
    case 'focus': ui.filter = v; ui.show = 'all'; redraw(); { const el = $('#habits-blk'); if (el) scrollScreen(topOf(el)); } break;
    case 'slide-name': { const c = $('#carousel'); const k = [...document.querySelectorAll('.sdots button')].findIndex(b => b.getAttribute('aria-label') === v); if (c && k >= 0) { ui.slide = k; goSlide(c, k); document.querySelectorAll('.sdots button').forEach((b, i) => b.setAttribute('aria-selected', i === k)); } break; }
    case 'show-cycle': ui.show = { all: 'todo', todo: 'done', done: 'all' }[ui.show]; redraw(); break;
    case 'slide': { const c = $('#carousel'); ui.slide = +v; if (c) goSlide(c, +v); document.querySelectorAll('.sdots button').forEach((b, i) => b.setAttribute('aria-selected', i === +v)); break; }
    case 'day': ui.day = v; redraw(); break;

    // Cocher : fait ou pas fait, pour le jour choisi
    case 'toggle': {
      const h = S.habits.find(x => x.id === v), d = ui.day;
      const i = S.logs.findIndex(l => l.habit === v && l.day === d);
      if (i >= 0) { S.logs.splice(i, 1); ui.pop = null; }
      else { S.logs.push({ habit: v, day: d, h: h.h, domain: h.domain }); ui.pop = v; if (d === today()) islandFlash(h); }
      // Les cases faites descendent : on anime le déplacement (FLIP)
      const before = {};
      document.querySelectorAll('.hrow').forEach(r => before[r.querySelector('.habit').dataset.v] = r.getBoundingClientRect().top);
      save(); redraw(); ui.pop = null;
      document.querySelectorAll('.hrow').forEach(r => {
        const id = r.querySelector('.habit').dataset.v, dy = before[id] - r.getBoundingClientRect().top;
        if (dy) r.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
      break;
    }

    // Modifier
    case 'island': ui.islandOpen = !ui.islandOpen; renderIsland(); break;
    case 'edit': openSheet(v); break;
    case 'add': {
      const dom = ui.filter !== 'all' ? ui.filter : (S.habits.length ? S.habits[S.habits.length - 1].domain : 'etudes');
      const h = { id: uid(), domain: dom, name: ``, h: .5, w: 3 };
      S.habits.push(h); openSheet(h.id);
      setTimeout(() => $('#h-name')?.focus(), 520); break;
    }
    case 'close-sheet': closeSheet(); break;
    case 'h-domain': sheetHabit().domain = v; save(); renderSheet(); break;
    case 'h-dur': { const h = sheetHabit(); h.h = Math.min(9, Math.max(.25, h.h + (+v) * (h.h >= 2 ? .5 : .25))); save(); renderSheet(); break; }
    case 'h-freq': { const h = sheetHabit(); h.w = Math.min(7, Math.max(1, h.w + (+v))); save(); renderSheet(); break; }
    case 'h-del': {
      S.habits = S.habits.filter(x => x !== sheetHabit());
      ui.sheet = null; $('#sheet').hidden = true; save(); redraw();
      toast(`Habitude supprimée. Ton historique reste.`); break;
    }


    // Durée réelle : ce que tu as vraiment fait ce jour-là
    case 'log-dur': {
      const lg = S.logs.find(l => l.habit === ui.sheet && l.day === ui.day);
      if (lg) { lg.h = Math.min(12, Math.max(.25, lg.h + (+v) * (lg.h >= 2 ? .5 : .25))); save(); renderSheet(); ui.noAnim = true; render(); }
      break;
    }


    // Accessibilité
    case 'night-off': ui.nightOff = true; ui.noAnim = true; render(); break;
    case 'night-toggle': S.night = S.night === false; save(); renderSheet(); break;
    case 'open-breathe': openSheet('breathe'); startBreath(); break;
    case 'a11y-text': S.a11y = { ...a11y(), text: +v }; save(); renderSheet(); ui.noAnim = true; render(); break;
    case 'a11y-toggle': S.a11y = { ...a11y(), [v]: !a11y()[v] }; save(); renderSheet(); ui.noAnim = true; render(); break;
    // Rappel doux
    case 'rem-toggle': toggleReminder(); break;

    // Données : sauvegarde, tableau, import
    case 'export-json': exportJson(); break;
    case 'export-csv': exportCsv(); break;
    case 'import': $('#import-file').click(); break;
    case 'install': if (installEvt) { installEvt.prompt(); installEvt = null; renderSheet(); } break;

    // Repartir d'aujourd'hui : on garde les habitudes, l'historique est rangé de côté
    case 'restart-today':
      if (confirm(`Repartir d'aujourd'hui ? Tes habitudes restent. L'historique est rangé de côté (il reste dans tes exports).`)) {
        S.archive = (S.archive || []).concat(S.logs.filter(l => l.day < today()));
        S.logs = S.logs.filter(l => l.day >= today());
        S.start = Date.now(); prevShape = []; prevMark = {};
        save(); closeSheet(); toast(`On repart d'aujourd'hui. Sans pression.`);
      }
      break;
    // Réglages
    case 'open-settings': openSheet('settings'); break;
    case 'rhythm': S.rhythm = v; save(); renderSheet(); redraw(); break;
    case 'retake':
      ui.sheet = null; $('#sheet').hidden = true;
      ui = { ...ui, onboarding: true, step: 2, obMin: 2, dir: 'fwd', draft: emptyDraft() }; render(); $('#screen').scrollTop = 0; break;
    case 'wipe':
      if (confirm(`Tout remettre à zéro ? Tes habitudes et ton historique seront effacés.`)) {
        if (confirm(`Télécharger une sauvegarde avant ?`)) exportJson();
        S = starter(); save(); ui.sheet = null; $('#sheet').hidden = true; ui.filter = 'all'; ui.day = today(); prevShape = []; prevMark = {}; redraw();
      }
      break;

    // Démo : un mois d'historique réaliste pour voir une vraie courbe
    case 'demo-month': {
      clearInterval(genTimer);
      seedMonth();
      save(); $('#sheet').hidden = true; $('#toast').hidden = true; prevShape = []; prevMark = {};
      ui = { onboarding: false, generating: false, filter: 'all', show: 'all', day: today(), period: 30, periodOpen: false, animCurve: true, step: 0, obMin: 0, dir: 'fwd', sheet: null, draft: emptyDraft() };
      render(); $('#screen').scrollTop = 0; break;
    }

    // Outils de démo, hors de l'écran du téléphone
    case 'demo-reset': case 'demo-onboarding':
      clearInterval(genTimer);
      S = starter(); save(); $('#sheet').hidden = true; $('#toast').hidden = true;
      prevShape = []; prevMark = {};
      ui = { onboarding: act === 'demo-onboarding', generating: false, filter: 'all', show: 'all', day: today(), period: 7, periodOpen: false, animCurve: true, step: 0, obMin: 0, dir: 'fwd', sheet: null, draft: emptyDraft() };
      render(); $('#screen').scrollTop = 0; break;
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'h-name') {
    const h = S.habits.find(x => x.id === ui.sheet);
    if (h) { h.name = e.target.value; save(); }
  }
});

// Re-rendu d'une page de questionnaire sans la rejouer ni perdre le défilement
function keepScroll() {
  const sc = $('#screen'), st = sc.scrollTop;
  ui.dir = ''; render(); sc.scrollTop = st;
}


/* ---------- Carrousel de graphiques : glisser au doigt, à la souris, ou toucher un point ---------- */

// Fait défiler l'écran en douceur vers une position (animé à la main, comme le carrousel)
// Position d'un bloc dans l'écran défilant (juste, même quand le texte est agrandi)
const topOf = el => { const sc = $('#screen'); return el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 8; };
let screenRaf = 0;
function scrollScreen(top) {
  const sc = $('#screen'); cancelAnimationFrame(screenRaf);
  const from = sc.scrollTop, t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / (reduced() ? 1 : 520));
    sc.scrollTop = from + (top - from) * EASE(k);
    if (k < 1) screenRaf = requestAnimationFrame(step);
  };
  screenRaf = requestAnimationFrame(step);
}

// Glisse vers un graphique (animé à la main : plus fiable que le défilement fluide du navigateur avec l'aimantation)
// Distance entre deux cartes (la carte suivante dépasse un peu : on voit qu'on peut glisser)
const slideStep = c => c.children.length > 1 ? c.children[1].offsetLeft - c.children[0].offsetLeft : c.clientWidth;
let slideRaf = 0;
function goSlide(c, i) {
  cancelAnimationFrame(slideRaf);
  const from = c.scrollLeft, to = Math.min(i * slideStep(c), c.scrollWidth - c.clientWidth), t0 = performance.now();
  c.classList.add('tween');
  const step = now => {
    const k = Math.min(1, (now - t0) / (reduced() ? 1 : 480));
    c.scrollLeft = from + (to - from) * EASE(k);
    if (k < 1) slideRaf = requestAnimationFrame(step); else c.classList.remove('tween');
  };
  slideRaf = requestAnimationFrame(step);
}
document.addEventListener('scroll', e => {
  const c = e.target;
  if (!c || c.id !== 'carousel') return;
  const i = Math.round(c.scrollLeft / slideStep(c));
  if (i !== ui.slide) {
    ui.slide = i;
    document.querySelectorAll('.sdots button').forEach((b, k) => b.setAttribute('aria-selected', k === i));
  }
}, true);

let suppressClick = false;
document.addEventListener('click', e => { if (suppressClick) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
let drag = null;                                           // glisser à la souris (le doigt le fait déjà tout seul)
document.addEventListener('pointerdown', e => {
  const c = e.target.closest && e.target.closest('#carousel');
  if (!c || e.pointerType !== 'mouse' || e.target.closest('.info')) return;
  drag = { c, x: e.clientX, left: c.scrollLeft, moved: false };
});
window.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (Math.abs(dx) > 4) { drag.moved = true; drag.c.classList.add('dragging'); }
  if (drag.moved) drag.c.scrollLeft = drag.left - dx;
});
window.addEventListener('pointerup', () => {
  if (!drag) return;
  const { c, moved } = drag; drag = null;
  if (moved) { suppressClick = true; setTimeout(() => suppressClick = false, 0); }   // un glissé ne doit pas compter comme un clic
  c.classList.remove('dragging');
  goSlide(c, Math.max(0, Math.min(c.children.length - 1, Math.round(c.scrollLeft / slideStep(c)))));
});
/* Horloge du cadre téléphone */
function tick() { $('#clock').textContent = new Date().toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }); }
tick(); setInterval(tick, 20000);


/* ---------- Les yeux suivent le doigt ou la souris ---------- */
const look = { x: null, y: null };
let lookTimer;
const lookAt = e => { look.x = e.clientX; look.y = e.clientY; clearTimeout(lookTimer); };
window.addEventListener('pointermove', lookAt);
window.addEventListener('pointerdown', lookAt);
window.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') lookTimer = setTimeout(() => look.x = null, 1400); });
document.addEventListener('mouseleave', () => look.x = null);

const eyeState = new WeakMap();
function eyes() {
  document.querySelectorAll('.char, .tile, .uml, .set-eyes, svg.mc:not([data-static])').forEach(el => {
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    let tx = 0, ty = 0;                                   // regard cible, de -1 à 1
    if (look.x != null) {
      const dx = look.x - (r.left + r.width / 2), dy = look.y - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 160);
      tx = dx / d * k; ty = dy / d * k;
    }
    const s = eyeState.get(el) || { x: 0, y: 0 };
    s.x += (tx - s.x) * .14; s.y += (ty - s.y) * .14;     // glisse sans à-coup
    eyeState.set(el, s);
    if (el.classList.contains('uml')) {                   // les deux points du ö
      el.style.setProperty('--ux', (s.x * .03).toFixed(4));
      el.style.setProperty('--uy', (s.y * .03).toFixed(4));
      return;
    }
    if (el.classList.contains('set-eyes')) {              // petits yeux du bouton réglages
      el.querySelectorAll('.pupil').forEach(n => n.style.transform = `translate(${(s.x * .75).toFixed(2)}px, ${(s.y * .75).toFixed(2)}px)`);
      return;
    }
    const move = (sel, m) => el.querySelectorAll(sel).forEach(n =>
      n.style.transform = `translate(${(s.x * m).toFixed(2)}px, ${(s.y * m).toFixed(2)}px)`);
    const z = el.classList.contains('mc') ? 1.3 : 1;
    move('.eye', 26 * z); move('.face', 6 * z); move('.beak', 12 * z);  // les yeux bougent le plus, le visage un peu
  });
  requestAnimationFrame(eyes);
}
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(eyes);

/* Un mois d'historique réaliste (démo et aperçus) */
function seedMonth() {
    S = starter(); S.profile.dismissed = true; S.start = Date.now() - 30 * DAY;
    let seed = 7;                                              // aléatoire fixe : la même courbe à chaque fois
    const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    for (let i = 30; i >= 0; i--) {
      const date = new Date(Date.now() - i * DAY), weekend = [0, 6].includes(date.getDay());
      const progress = 1 - i / 30;                             // on s'installe peu à peu : 0 → 1
      S.habits.forEach(h => {
        let p = h.w / 7 * (.45 + .75 * progress);             // de 45 % à 120 % de ce qui était prévu
        if (weekend && h.domain === 'etudes') p *= .35;
        if (weekend && ['social', 'repos'].includes(h.domain)) p *= 1.5;
        if (i > 14 && i < 21 && ['sport', 'etudes'].includes(h.domain)) p *= .3;   // une semaine creuse, comme dans la vraie vie
        if (rnd() < Math.min(.95, p)) S.logs.push({ habit: h.id, day: dayKey(date), h: h.h, domain: h.domain });
      });
    }
}

/* Un mois où tout est pile dans la mesure (aperçu « équilibré ») : chaque habitude cochée autant de fois que prévu */
function seedBalanced() {
  S = starter(); S.profile.dismissed = true; S.start = Date.now() - 30 * DAY;
  S.habits.forEach(h => {
    for (let i = 30; i >= 0; i--) {
      const date = new Date(Date.now() - i * DAY);
      if (Math.floor((i + 1) * h.w / 7) !== Math.floor(i * h.w / 7)) S.logs.push({ habit: h.id, day: dayKey(date), h: h.h, domain: h.domain });
    }
  });
}

/* ---------- Aperçus pour le labo des couleurs (app.html?screen=…) ---------- */
// Le labo charge l'app dans des cadres, chacun sur un écran précis, sans rien enregistrer,
// et lui envoie les couleurs par message : tout se met à jour partout, en direct.
function previewScreen(n) {
  document.body.classList.add('preview');
  const ob = (step, draft = {}) => { ui.onboarding = true; ui.step = step; ui.draft = { ...emptyDraft(), ...draft }; };
  ui.onboarding = false;
  const std = { status: 'etudiant', domains: ['etudes', 'sport', 'sommeil', 'repos'] };
  switch (n) {
    case 'welcome': ob(0); break;
    case 'explain': ob(1); break;
    case 'status': ob(2, { status: 'etudiant' }); break;
    case 'domains': ob(3, std); break;
    case 'rythme': ob(4, std); break;
    case 'habits': ob(5, { ...std, domains: ['etudes', 'sport', 'sommeil'], habits: ['etudes:1', 'sport:1'], touched: ['etudes:1', 'sport:1'] }); break;
    case 'generating': ob(5); ui.generating = true; break;
    case 'start': ui.slideName = 'Pour toi'; break;                        // tracker de départ : carte « fais-le à ta mesure »
    case 'focus-cta': seedMonth(); ui.slideName = 'À regarder'; break;
    case 'radar-focus': seedMonth(); ui.filter = 'sport'; ui.slideName = 'Équilibre'; break;
    case 'radar-ok': seedBalanced(); ui.slideName = 'Équilibre'; break;
    case 'courbe-ok': seedBalanced(); ui.slideName = 'Évolution'; ui.period = 30; break;
    case 'equilibre': seedMonth(); ui.slideName = 'Équilibre'; break;
    case 'evolution': seedMonth(); ui.slideName = 'Évolution'; ui.period = 30; break;
    case 'month': seedMonth(); ui.period = 30; break;
    case 'regularite': seedMonth(); ui.slideName = 'Régularité'; break;
    case 'repartition': seedMonth(); ui.slideName = 'Répartition'; break;
    case 'filtre': seedMonth(); ui.filter = 'sport'; ui.show = 'todo'; break;
    case 'nuit': ui.forceNight = true; break;
    case 'semaine': seedMonth(); ui.forceWeek = true; ui.slideName = 'Ta semaine'; break;
    case 'envers': seedMonth(); ui.fakeStatus = { etudes: 'in', sport: 'high', sommeil: 'in', social: 'in', repos: 'in', projets: 'in' }; ui.slideName = 'À regarder'; break;
    case 'envers-domaine': seedMonth(); ui.fakeStatus = { etudes: 'in', sport: 'high', sommeil: 'in', social: 'in', repos: 'in', projets: 'in' }; ui.filter = 'sport'; break;
    case 'pause': seedMonth(); ui.sheet = 'breathe'; break;
    case 'domaine-etudes': case 'domaine-sport': case 'domaine-sommeil': case 'domaine-social': case 'domaine-repos': case 'domaine-projets':
      seedMonth(); ui.filter = n.slice(8); break;
    case 'edit': seedMonth(); ui.sheet = S.habits[0].id; break;
    case 'settings': seedMonth(); ui.sheet = 'settings'; break;
  }
}

window.addEventListener('message', e => {                                  // couleurs envoyées par le labo
  const m = e.data;
  if (!m || m.type !== 'metron-tokens') return;
  const root = document.documentElement;
  (m.clear || []).forEach(k => root.style.removeProperty(k));
  Object.entries(m.vars || {}).forEach(([k, v]) => root.style.setProperty(k, v));
  if (m.theme) root.dataset.theme = m.theme; else delete root.dataset.theme;
  ui.noAnim = true; render();                                              // l'écran recalcule ses couleurs d'accent
});

/* =====================================================
   Données : sauvegarde, tableau, import
   ===================================================== */

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
function exportJson() {
  download(`metron-${today()}.json`, JSON.stringify({ app: 'metron', version: 2, exported: new Date().toISOString(), data: S }, null, 2), 'application/json');
  toast(`Sauvegarde téléchargée.`);
}
function exportCsv() {
  const q = v => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [['jour', 'habitude', 'domaine', 'heures']];
  (S.archive || []).concat(S.logs).sort((a, b) => a.day < b.day ? -1 : a.day > b.day ? 1 : 0).forEach(l => {
    const h = S.habits.find(x => x.id === l.habit);
    rows.push([l.day, h ? h.name : '(habitude supprimée)', dname(l.domain), String(l.h).replace('.', ',')]);
  });
  download(`metron-${today()}.csv`, '﻿' + rows.map(r => r.map(q).join(';')).join('\n'), 'text/csv;charset=utf-8');
  toast(`Tableau téléchargé.`);
}
$('#import-file').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try {
    const obj = JSON.parse(await f.text()), d = obj.data || obj;
    if (!d || !Array.isArray(d.habits) || !Array.isArray(d.logs) || !d.profile) throw new Error('format');
    if (!confirm(`Importer cette sauvegarde ? Elle remplace tes données actuelles (${d.habits.length} habitudes, ${d.logs.length} jours cochés).`)) return;
    S = { rhythm: 'normal', labels: {}, start: Date.now(), ...d };
    save(); prevShape = []; prevMark = {}; ui.filter = 'all'; ui.sheet = null; $('#sheet').hidden = true;
    ui.noAnim = true; render(); toast(`Sauvegarde importée.`);
  } catch (err) { toast(`Ce fichier n'est pas une sauvegarde Metrön.`, 3200); }
});

/* =====================================================
   Rappel doux et installation
   ===================================================== */

let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
window.addEventListener('appinstalled', () => { installEvt = null; });

async function toggleReminder() {
  S.reminder = S.reminder || { on: false, time: '19:00', last: '' };
  if (!S.reminder.on) {
    if (typeof Notification === 'undefined') { toast(`Ce navigateur ne gère pas les notifications.`, 3200); return; }
    const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (p !== 'granted') { toast(`Autorise les notifications pour recevoir le rappel.`, 3200); renderSheet(); return; }
    S.reminder.on = true; S.reminder.last = ''; toast(`Rappel activé à ${S.reminder.time}.`);
  } else { S.reminder.on = false; toast(`Rappel désactivé.`); }
  save(); renderSheet();
}
document.addEventListener('change', e => {
  if (e.target.id !== 'rem-time') return;
  S.reminder = S.reminder || { on: false, time: '19:00', last: '' };
  S.reminder.time = e.target.value || '19:00'; S.reminder.last = ''; save();
});
async function notify(title, body) {
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg) return reg.showNotification(title, { body, icon: 'icon.svg', badge: 'icon.svg', tag: 'metron-rappel', data: { url: 'app.html?quick=today' } });
    new Notification(title, { body, icon: 'icon.svg' });
  } catch (e) {}
}
// Toutes les 30 secondes : si c'est l'heure, qu'il reste des habitudes et qu'on n'a pas déjà prévenu aujourd'hui
setInterval(() => {
  const r = S.reminder;
  if (PREVIEW || !r || !r.on || typeof Notification === 'undefined' || Notification.permission !== 'granted' || r.last === today()) return;
  const now = new Date(), hhmm = now.toTimeString().slice(0, 5);
  if (hhmm < r.time) return;
  const left = S.habits.filter(h => !doneOn(h.id, today()));
  r.last = today(); save();
  if (left.length) notify(`Metrön`, `Une petite chose aujourd'hui ? ${left[0].name}.`);
}, 30000);

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !PREVIEW) navigator.serviceWorker.register('sw.js').catch(() => {});

/* Raccourcis de l'icône (appui long sur l'écran d'accueil) : ?quick=check coche la prochaine habitude, ?quick=balance ouvre l'équilibre */
function runQuick() {
  const q = new URLSearchParams(location.search).get('quick');
  if (!q || PREVIEW || ui.onboarding) return;
  history.replaceState(null, '', location.pathname);
  if (q === 'check') {
    const h = nextHabit();
    if (h) { S.logs.push({ habit: h.id, day: today(), h: h.h, domain: h.domain }); save(); toast(`✓ ${h.name}`, 2600); }
    else toast(`Tout est déjà fait pour aujourd'hui.`);
  }
  if (q === 'balance') ui.slideName = 'Équilibre';
}

/* Appui long sur une habitude : régler sa durée réelle */
let lpTimer = 0, lpFired = false;
document.addEventListener('pointerdown', e => {
  const h = e.target.closest && e.target.closest('.habit');
  if (!h) return;
  lpFired = false;
  lpTimer = setTimeout(() => { lpFired = true; ui.day = ui.day || today(); openSheet(h.dataset.v); }, 520);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => document.addEventListener(t, () => {
  clearTimeout(lpTimer);
  if (t === 'pointerup' && lpFired) { suppressClick = true; setTimeout(() => { suppressClick = false; lpFired = false; }, 0); }
}));
document.addEventListener('scroll', () => clearTimeout(lpTimer), true);


/* =====================================================
   Le poussin dans l'app : usages décalés
   ===================================================== */

/* Il s'endort à 23 h : le tableau de bord se réduit à lui et à une phrase */
function viewNight() {
  return `<section class="night-screen sl" ${slStyle('regular')}>
    <div class="night-art">${chick({ acc: ['lune'], pal: 'sommeil', deco: true })}</div>
    <h1>Bonne nuit.</h1>
    <p>On s'y remet demain. Rien ne presse.</p>
    <button class="night-link" data-act="night-off">Ouvrir quand même</button>
  </section>`;
}
const isNight = () => { const h = new Date().getHours(); return !ui.nightOff && (ui.forceNight || ((h >= 23 || h < 5) && S.night !== false)); };

/* Le bilan du dimanche : il lit le journal de ta semaine */
const isWeekCard = () => ui.forceWeek || (new Date().getDay() === 0 && new Date().getHours() >= 17);
function viewWeekCta() {
  const m7 = measure(Date.now(), 7), days = lastDays();
  const active = days.filter(d => S.logs.some(l => l.day === d)).length, done = S.logs.filter(l => inWindow(l.day, 7)).length;
  const inN = m7.filter(x => x.s === 'in').length;
  return `<div class="card slide-card cta-card cta-week sl" ${slStyle('week')}>
    <p class="cta-eyebrow">Dimanche soir</p>
    <h3 class="cta-title">Ta semaine</h3>
    <p class="cta-sub">${active} jour${plural(active)} actif${plural(active)} · ${done} case${plural(done)} cochée${plural(done)}<br>${inN} domaine${plural(inN)} sur ${m7.length} dans ta mesure</p>
    <div class="cta-row"><button class="cta-btn" data-act="slide-name" data-v="Équilibre">Voir l'équilibre</button></div>
    <div class="cta-char">${chick({ acc: ['livre'], mood: 'focus', deco: true })}</div>
  </div>`;
}

/* Au centre du radar, il regarde le domaine qui a besoin d'attention */
function radarChick(m, ang) {
  const off = m.filter(x => x.s !== 'in' && x.s !== 'obs').sort((a, b) => Math.abs(b.p - .55) - Math.abs(a.p - .55))[0];
  const i = off ? m.indexOf(off) : -1;
  const look = i >= 0 ? [Math.cos(ang(i)) * .95, Math.sin(ang(i)) * .95] : [0, 0];
  const mood = !off ? 'happy' : off.s === 'high' ? 'wide' : 'open';
  return `<g class="rcenter" transform="translate(0 -1) scale(.088) translate(-350 -330)" aria-hidden="true">${chickInner({ mood, look, deco: true })}</g>`;
}

/* L'icône de l'onglet (et la couleur du navigateur) prennent le poussin du domaine ouvert */
let iconKey = '';
function updateIcon() {
  if (PREVIEW) return;
  const f = ui.onboarding ? 'all' : ui.filter;
  if (f === iconKey) return;
  iconKey = f;
  const link = document.querySelector('link[rel="icon"]'), meta = document.querySelector('meta[name="theme-color"]');
  // Les icônes PNG de secours (onglet) se mettent de côté pendant qu'un domaine a son icône, pour que le navigateur prenne celle-ci
  document.querySelectorAll('link[data-png-icon], link[rel="icon"][type="image/png"], link[rel="alternate icon"]').forEach(l => {
    if (!l.dataset.pngIcon) l.dataset.pngIcon = l.rel;
    l.rel = f === 'all' ? l.dataset.pngIcon : 'x-icon-off';
  });
  if (f === 'all') { link.href = 'icon.svg'; meta.content = '#F8F7F0'; return; }
  try {
    const bg = resolveColor(`var(--dom-${f}-focus)`);
    const inner = chickInner({ acc: [DOM_ACC[f]], pal: f, mood: 'happy', look: [0, 0], deco: true });
    const svg = standaloneSvg(`<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="26" fill="${bg}"/><g transform="translate(50 56) scale(.1) translate(-350 -330)">${inner}</g></svg>`, f);
    link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    meta.content = bg;
  } catch (e) {}
}

/* Pause de 5 minutes : il gonfle et se dégonfle avec toi */
let breathT = 0;
function startBreath() {
  clearInterval(breathT);
  const end = Date.now() + 300000;
  breathT = setInterval(() => {
    const left = Math.max(0, Math.round((end - Date.now()) / 1000)), el = $('#bcount');
    if (el) el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (!left) { clearInterval(breathT); closeSheet(); toast(`Bien joué. Une vraie pause.`, 3000); }
  }, 500);
}
let lpB = 0;                                           // appui long sur le poussin de l'en-tête
document.addEventListener('pointerdown', e => {
  const b = e.target.closest && e.target.closest('.brand');
  if (b) lpB = setTimeout(() => { suppressClick = true; setTimeout(() => suppressClick = false, 700); openSheet('breathe'); startBreath(); }, 600);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => document.addEventListener(t, () => clearTimeout(lpB)));
document.addEventListener('scroll', () => clearTimeout(lpB), true);

/* Hors ligne : une tasse de thé, pas une erreur */
function toastHtml(html, ms = 3400) {
  const t = $('#toast'); t.innerHTML = html; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms);
}
window.addEventListener('offline', () => toastHtml(`<span class="tchick">${miniChick({ acc: ['the'], pal: 'repos', mood: 'happy' })}</span><span>Hors ligne : Metrön marche quand même.</span>`));
window.addEventListener('online', () => toast(`De retour en ligne.`));

if (PREVIEW) previewScreen(PREVIEW);
if (!ui.onboarding && !PREVIEW) save();      // à la première ouverture, rien n'est gardé tant que l'accueil n'est pas passé
runQuick();
render();
if (ui.sheet) renderSheet();

/* Échap ferme la feuille ouverte ; la feuille prend le focus pour les lecteurs d'écran */
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.sheet) closeSheet(); });
new MutationObserver(() => { const sh = $('#sheet'); if (!sh.hidden && !sh.dataset.focused) { sh.dataset.focused = '1'; const p = $('#sheet-panel'); p.tabIndex = -1; p.focus({ preventScroll: true }); } if (sh.hidden) delete sh.dataset.focused; }).observe($('#sheet'), { attributes: true, attributeFilter: ['hidden'] });
