// @ts-check
/**
 * Décor des arènes du « Grand Festival » : sol peint, piliers et caisses en trois quarts,
 * clôture de bornes reliées par des guirlandes, décor peint autour du plateau et ambiance
 * animée (confettis, pétales, braises, lanternes célestes, neige).
 * Purement visuel : ne modifie jamais l'état du jeu et n'utilise jamais son hasard
 * (une graine rejoue toujours la même partie).
 * Tant qu'un visuel peint n'est pas chargé, un dessin procédural prend le relais.
 */
import { COLS, ROWS, T } from './config.js';
import { art, arenaArt } from './art.js';

/** @typedef {import('./config.js').Theme} Theme */
/** @typedef {import('./lumiere.js').Light} Light */

/** Case de la clôture (bord du plateau). @param {number} x @param {number} y */
export const isRim = (x, y) => x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1;
/** Sur la clôture, une case sur deux porte une borne ; les autres portent la guirlande. */
export const isPost = (x, y) => isRim(x, y) && (x + y) % 2 === 0;

/** Hauteurs d'affichage (en cases) des objets peints, posés au bas de leur case. */
export const SIZES = { pilier: 1.08, caisse: 1.0, borne: 1.45 };

/** Hasard décoratif à part (ne touche jamais celui de la partie). */
const deco = Math.random;

function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}

/* ───────────── Sol ───────────── */

/**
 * Sol de l'arène, peint une fois dans un canvas : le visuel peint (ou le damier de secours),
 * un quadrillage très discret pour lire les cases, et la bande sombre de la clôture.
 * @param {Theme} th @param {number} dpr
 */
export function buildFloor(th, dpr) {
  const W = COLS * T, H = ROWS * T;
  const f = document.createElement('canvas'); f.width = W * dpr; f.height = H * dpr;
  const c = /** @type {CanvasRenderingContext2D} */ (f.getContext('2d')); c.scale(dpr, dpr);
  const sol = art(arenaArt('sol', th.id)), pal = th.floor;
  if (sol) {
    const r = Math.max(W / sol.width, H / sol.height), sw = W / r, sh = H / r;
    c.drawImage(sol, (sol.width - sw) / 2, (sol.height - sh) / 2, sw, sh, 0, 0, W, H);
  } else {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      c.fillStyle = (x + y) % 2 ? pal[0] : pal[1]; c.fillRect(x * T, y * T, T, T);
      c.fillStyle = pal[2]; c.globalAlpha = .35; c.fillRect(x * T, y * T + T - 2, T, 2); c.fillRect(x * T + T - 2, y * T, 2, T); c.globalAlpha = 1;
    }
  }
  // damier et joints très légers : on lit les cases sans abîmer la peinture
  c.fillStyle = '#000'; c.globalAlpha = .045;
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) if ((x + y) % 2) c.fillRect(x * T, y * T, T, T);
  c.globalAlpha = .07; c.strokeStyle = '#000'; c.lineWidth = 1; c.beginPath();
  for (let x = 1; x < COLS; x++) { c.moveTo(x * T + .5, T); c.lineTo(x * T + .5, H - T); }
  for (let y = 1; y < ROWS; y++) { c.moveTo(T, y * T + .5); c.lineTo(W - T, y * T + .5); }
  c.stroke(); c.globalAlpha = 1;
  // la clôture repose sur une bande plus sombre, et l'aire de jeu a un léger liseré de lumière
  const band = (x0, y0, x1, y1, vx, vy) => { const g = c.createLinearGradient(x0, y0, x0 + vx, y0 + vy); g.addColorStop(0, '#0009'); g.addColorStop(1, '#0000'); c.fillStyle = g; c.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) || T * 1.4, Math.abs(y1 - y0) || T * 1.4); };
  band(0, 0, W, 0, 0, T * 1.4); band(0, H, W, H - T * 1.4, 0, -T * 1.4);
  band(0, 0, 0, H, T * 1.4, 0); band(W, 0, W - T * 1.4, H, -T * 1.4, 0);
  c.strokeStyle = '#ffffff'; c.globalAlpha = .12; c.lineWidth = 2; c.strokeRect(T + 1, T + 1, W - 2 * T - 2, H - 2 * T - 2); c.globalAlpha = 1;
  return f;
}

/* ───────────── Ombres et objets peints ───────────── */

/** @type {HTMLCanvasElement|null} */ let shadowSpr = null;
/** Ombre douce (dégradé précalculé). */
function shadow() {
  if (shadowSpr) return shadowSpr;
  const s = document.createElement('canvas'); s.width = 64; s.height = 32;
  const c = /** @type {CanvasRenderingContext2D} */ (s.getContext('2d'));
  const g = c.createRadialGradient(32, 16, 2, 32, 16, 32); g.addColorStop(0, 'rgba(10,6,30,.55)'); g.addColorStop(1, 'rgba(10,6,30,0)');
  c.setTransform(1, 0, 0, .5, 0, 8); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return (shadowSpr = s);
}
/** Ombre au sol, sous un objet de largeur w (pixels), pieds en (px, py). */
export function dropShadow(c, px, py, w) { c.drawImage(shadow(), px - w * .62 + w * .08, py - w * .24, w * 1.24, w * .48); }

/**
 * Objet peint posé au bas de sa case (trois quarts : il déborde vers le haut).
 * @param {CanvasRenderingContext2D} c @param {HTMLImageElement} im @param {number} x @param {number} y
 * @param {number} h hauteur en cases @param {number} [squash] écrasement (sursaut des caisses)
 * @returns {number} y du haut de l'objet (pixels)
 */
function standing(c, im, x, y, h, squash = 0) {
  const H = h * T * (1 - squash), W = Math.min(T * 1.12, H * im.width / im.height) * (1 + squash * .5);
  const px = (x + .5) * T, foot = (y + 1) * T + T * .04;
  dropShadow(c, px, foot - T * .06, W * .95);
  c.drawImage(im, px - W / 2, foot - H, W, H);
  return foot - H;
}

/**
 * Pilier indestructible (intérieur du plateau).
 * @param {CanvasRenderingContext2D} c @param {Theme} th @param {number} x @param {number} y
 * @returns {boolean} faux si le visuel peint n'est pas prêt
 */
export function drawPillar(c, th, x, y) {
  const im = art(arenaArt('pilier', th.id)); if (!im) return false;
  standing(c, im, x, y, SIZES.pilier); return true;
}

/**
 * Caisse (destructible). `squash` anime le sursaut quand elle saute.
 * @param {CanvasRenderingContext2D} c @param {Theme} th @param {number} x @param {number} y @param {number} [squash]
 */
export function drawCrate(c, th, x, y, squash = 0) {
  const im = art(arenaArt('caisse', th.id)); if (!im) return false;
  standing(c, im, x, y, SIZES.caisse, squash); return true;
}

/**
 * Case de clôture : une borne une case sur deux (les autres ne portent que la guirlande).
 * @param {CanvasRenderingContext2D} c @param {Theme} th @param {number} x @param {number} y
 */
export function drawRim(c, th, x, y) {
  const im = art(arenaArt('borne', th.id)); if (!im) return false;
  if (isPost(x, y)) standing(c, im, x, y, SIZES.borne);
  return true;
}

/** Point d'accroche de la guirlande en haut d'une borne (pixels). @param {number} x @param {number} y */
const hook = (x, y) => ({ x: (x + .5) * T, y: (y + 1) * T - SIZES.borne * T * .78 });

/**
 * Guirlandes de la rangée y de la clôture (fanions, lampions ou ampoules), qui se balancent.
 * Dessinées juste après les bornes de leur rangée, pour rester dans le bon ordre de profondeur.
 * @param {CanvasRenderingContext2D} c @param {Theme} th @param {number} y @param {number} now
 */
export function drawGarlands(c, th, y, now) {
  if (!art(arenaArt('borne', th.id))) return;
  if (y === 0 || y === ROWS - 1) for (let x = 0; x + 2 < COLS; x += 2) garland(c, th, hook(x, y), hook(x + 2, y), now, x + y * 3);
  else if (y % 2 === 0) for (const x of [0, COLS - 1]) garland(c, th, hook(x, y - 2), hook(x, y), now, x + y * 3);
}

/** @param {CanvasRenderingContext2D} c @param {Theme} th @param {{x:number,y:number}} a @param {{x:number,y:number}} b @param {number} now @param {number} seed */
function garland(c, th, a, b, now, seed) {
  const vertical = Math.abs(b.x - a.x) < 1, sway = Math.sin(now * 1.3 + seed * .7) * 3;
  const sag = vertical ? 0 : T * .32 + sway, side = vertical ? (a.x < COLS * T / 2 ? -1 : 1) * (T * .22 + sway) : 0;
  const mx = (a.x + b.x) / 2 + side, my = (a.y + b.y) / 2 + sag;
  const at = (/** @type {number} */ t) => ({ x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x, y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * my + t * t * b.y });
  c.strokeStyle = '#1a0f1f'; c.globalAlpha = .75; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(mx, my, b.x, b.y); c.stroke(); c.globalAlpha = 1;
  const { kind, cols } = th.garland, n = kind === 'fanions' ? 6 : 4;
  for (let i = 1; i < n; i++) {
    const t = i / n, p = at(t), col = cols[(i + seed) % cols.length];
    if (kind === 'fanions') {
      const w = T * .13, flap = Math.sin(now * 3 + i + seed) * 2;
      c.fillStyle = col; c.beginPath(); c.moveTo(p.x - w, p.y); c.lineTo(p.x + w, p.y); c.lineTo(p.x + flap, p.y + T * .24); c.closePath(); c.fill();
      c.fillStyle = '#0003'; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + w, p.y); c.lineTo(p.x + flap, p.y + T * .24); c.closePath(); c.fill();
    } else if (kind === 'lampions') {
      const r = T * .1, flick = .85 + .15 * Math.sin(now * 7 + i * 3 + seed);
      c.fillStyle = col; c.globalAlpha = flick; c.beginPath(); c.ellipse(p.x, p.y + r, r, r * 1.2, 0, 0, 7); c.fill();
      c.globalAlpha = 1; c.fillStyle = '#2a1408'; c.fillRect(p.x - r * .5, p.y - 1, r, 2.5); c.fillRect(p.x - r * .5, p.y + r * 2.1, r, 2);
      c.fillStyle = '#fff6d0'; c.globalAlpha = .55 * flick; c.beginPath(); c.ellipse(p.x - r * .3, p.y + r * .7, r * .3, r * .5, 0, 0, 7); c.fill(); c.globalAlpha = 1;
    } else {
      const on = .6 + .4 * Math.sin(now * 2.2 + i * 1.9 + seed);
      c.fillStyle = col; c.globalAlpha = .5 + .5 * on; c.beginPath(); c.arc(p.x, p.y + 3, 3.2, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.globalAlpha = .6 * on; c.beginPath(); c.arc(p.x - 1, p.y + 2, 1.2, 0, 7); c.fill(); c.globalAlpha = 1;
    }
  }
}

/**
 * Lumières fixes du décor : lanternes des bornes et des piliers (si le thème en porte).
 * @param {Theme} th @param {number[][]} grid @param {number} now @returns {Light[]}
 */
export function decorLights(th, grid, now) {
  /** @type {Light[]} */ const out = [];
  if (!art(arenaArt('borne', th.id)) && !th.night) return out;
  const fl = (/** @type {number} */ i) => .9 + .1 * Math.sin(now * 6.3 + i * 2.7) * Math.sin(now * 3.1 + i);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (isPost(x, y) && (x + y) % 4 === 0) out.push({ x: x + .5, y: y + 1 - SIZES.borne * .7, r: th.night ? 1.4 : 1.6, a: .8 * fl(x + y * 15), col: th.glow, g: .55 });
    else if (th.lamps && grid[y]?.[x] === 1 && !isRim(x, y) && x % 4 === 2 && y % 4 === 2) out.push({ x: x + .5, y: y + 1 - SIZES.pilier * .75, r: th.night ? 1.2 : 1.5, a: .75 * fl(x * 7 + y), col: th.glow, g: .5 });
  }
  return out;
}

/* ───────────── Décor peint autour du plateau ───────────── */

let backdropId = '';
/**
 * Pose le décor peint de l'arène derrière le plateau (fond de page), une fois chargé.
 * @param {Theme} th
 */
export function setBackdrop(th) {
  if (backdropId === th.id) return;
  const im = art(arenaArt('fond', th.id));
  const st = document.documentElement.style;
  st.setProperty('--ciel-a', th.sky[0]); st.setProperty('--ciel-b', th.sky[1]);
  if (!im) { st.setProperty('--fond', 'none'); return; }
  backdropId = th.id;
  st.setProperty('--fond', `url("${im.src}")`);
}

/* ───────────── Ambiance animée ───────────── */

/** @typedef {{x:number,y:number,vx:number,vy:number,r:number,vr:number,s:number,col:string,life:number,ph:number,glow?:boolean}} Mote */
/** @type {Mote[]} */
let motes = [];
let motesFor = '';
const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
/** Moins de particules sur téléphone. */
export const MOTES_MAX = coarse ? 22 : 40;

/** @param {Theme} th @returns {Mote} */
function spawn(th, anywhere = false) {
  const col = th.garland.cols[Math.floor(deco() * th.garland.cols.length)];
  const m = { x: deco() * COLS, y: anywhere ? deco() * ROWS : -.5, vx: 0, vy: 0, r: deco() * 6, vr: 0, s: 1, col, life: 0, ph: deco() * 6 };
  switch (th.fx) {
    case 'confetti': Object.assign(m, { vx: .15 + deco() * .25, vy: .35 + deco() * .35, vr: 2 + deco() * 4, s: .8 + deco() * .6, col: ['#ff5a3c', '#ffc02e', '#14b8a6', '#8b6cff', '#fff1d6'][Math.floor(deco() * 5)] }); break;
    case 'petales':
      if (deco() < .35) Object.assign(m, { y: anywhere ? m.y : 1 + deco() * (ROWS - 2), vx: (deco() - .5) * .3, vy: (deco() - .5) * .3, s: .7 + deco() * .5, col: '#d8ff7a', glow: true });
      else Object.assign(m, { vx: .45 + deco() * .35, vy: .25 + deco() * .3, vr: 1 + deco() * 2, s: .8 + deco() * .5, col: deco() < .5 ? '#ffd6c8' : '#fff3ea' });
      break;
    case 'braises': Object.assign(m, { y: anywhere ? m.y : ROWS + .3, vx: (deco() - .5) * .25, vy: -(.5 + deco() * .7), s: .5 + deco() * .7, col: deco() < .5 ? '#ffb347' : '#ffe27a', glow: true }); break;
    case 'lanternes': Object.assign(m, { y: anywhere ? m.y : ROWS + .4, vx: (deco() - .5) * .12, vy: -(.22 + deco() * .2), s: .7 + deco() * .5, col: '#ff8a3a', glow: true }); break;
    case 'neige': Object.assign(m, { vx: .2 + deco() * .3, vy: .6 + deco() * .6, s: .6 + deco() * .8, col: '#ffffff' }); break;
  }
  return m;
}

/**
 * Fait vivre l'ambiance (appelé à chaque image, hors pause comprise : c'est du décor).
 * @param {Theme} th @param {number} dt secondes
 */
export function updateAmbience(th, dt) {
  if (motesFor !== th.id) { motesFor = th.id; motes = []; for (let i = 0; i < MOTES_MAX * (th.fx === 'lanternes' ? .35 : 1); i++) motes.push(spawn(th, true)); }
  const want = MOTES_MAX * (th.fx === 'lanternes' ? .35 : 1);
  for (const m of motes) {
    m.life += dt; m.r += m.vr * dt;
    const wob = Math.sin(m.life * 1.7 + m.ph);
    m.x += (m.vx + (th.fx === 'braises' || th.fx === 'lanternes' ? wob * .15 : wob * .1)) * dt;
    m.y += (m.vy + (m.glow && th.fx === 'petales' ? Math.cos(m.life * 1.3 + m.ph) * .2 : 0)) * dt;
  }
  motes = motes.filter(m => m.y > -1 && m.y < ROWS + 1 && m.x > -1 && m.x < COLS + 1 && m.life < 40);
  while (motes.length < want) motes.push(spawn(th));
}

/**
 * Dessine l'ambiance par-dessus la scène (les particules lumineuses en mode additif).
 * @param {CanvasRenderingContext2D} c @param {Theme} th @param {number} now
 */
export function drawAmbience(c, th, now) {
  for (const m of motes) {
    const px = m.x * T, py = m.y * T;
    if (m.glow) {
      c.globalCompositeOperation = 'lighter';
      if (th.fx === 'lanternes') {
        const fl = .8 + .2 * Math.sin(now * 5 + m.ph), s = 6 * m.s;
        c.globalAlpha = .35 * fl; c.fillStyle = '#ff7a2a'; c.beginPath(); c.arc(px, py, s * 2.6, 0, 7); c.fill();
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = .95;
        c.fillStyle = '#ffb347'; rr(c, px - s * .7, py - s, s * 1.4, s * 1.8, s * .35); c.fill();
        c.fillStyle = '#fff1b0'; c.globalAlpha = .7 * fl; c.fillRect(px - s * .3, py - s * .2, s * .6, s * .7);
      } else {
        const tw = th.fx === 'petales' ? .5 + .5 * Math.sin(now * 3 + m.ph * 3) : 1 - Math.min(1, m.life / 6);
        c.globalAlpha = .9 * tw; c.fillStyle = m.col; c.beginPath(); c.arc(px, py, 1.6 * m.s + .6, 0, 7); c.fill();
        c.globalAlpha = .25 * tw; c.beginPath(); c.arc(px, py, 5 * m.s + 2, 0, 7); c.fill();
      }
      c.globalCompositeOperation = 'source-over';
    } else if (th.fx === 'neige') {
      c.globalAlpha = .85; c.fillStyle = m.col; c.beginPath(); c.arc(px, py, 1.4 + m.s * 1.3, 0, 7); c.fill();
    } else {
      c.save(); c.translate(px, py); c.rotate(m.r); c.scale(1, Math.abs(Math.cos(m.r * 1.3)) * .8 + .2);
      c.globalAlpha = .9; c.fillStyle = m.col;
      if (th.fx === 'petales') { c.beginPath(); c.ellipse(0, 0, 3.6 * m.s, 2 * m.s, 0, 0, 7); c.fill(); }
      else c.fillRect(-3 * m.s, -1.6 * m.s, 6 * m.s, 3.2 * m.s);
      c.restore();
    }
  }
  c.globalAlpha = 1;
}

/** Pour les tests : nombre de particules d'ambiance en vie. */
export const ambienceCount = () => motes.length;
