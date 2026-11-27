// @ts-check
/** Interface : menu, barre des joueurs, écrans de manche, de victoire et de pause. */
import { VERSION, HEROES, COLS, ROWS } from './config.js';
import { S, hooks } from './state.js';
import { clamp } from './rng.js';
import { startMatch, startRound, part } from './rules.js';
import { audio, music, startMusic } from './audio.js';
import { heroPortrait } from './render.js';
import * as Save from './save.js';

/** @typedef {import('./state.js').Player} Player */
/** @param {string} id */
const $ = id => /** @type {HTMLElement} */ (document.getElementById(id));
const ov = $('ov'), hud = $('hud'), clockEl = $('clock');
const store = Save.browserStore();
let data = Save.load(store);
/** Délai entre deux manches (ms) ; réduit par ?turbo pour le robot de la CI. */
export const timing = { between: 2300 };

/** Réglages et palmarès sauvegardés -> état du jeu. */
export function applySave() {
  S.settings = { ...data.settings };
  music.on = data.music;
  $('bMusic').textContent = music.on ? '♪ On' : '♪ Off';
}
function persist() {
  data.settings = { ...S.settings }; data.music = music.on;
  Save.save(store, data);
}

/** Démarre une vraie partie depuis l'interface. */
function play() {
  persist();
  document.activeElement instanceof HTMLElement && document.activeElement.blur();
  clockEl.hidden = false; ov.hidden = true;
  startMatch(false); buildHud(); startMusic();
}

hooks.hud = updateHud;
hooks.roundEnd = w => {
  data.stats.rounds++; Save.save(store, data);
  ov.hidden = false; ov.classList.remove('menu');
  ov.innerHTML = `<div class="panel"><h2 style="color:${w ? w.hero.col : '#fff'}">${w ? w.hero.name + ' remporte la manche !' : 'Égalité, tout le monde a sauté !'}</h2>${scoreHtml()}<p class="sub">Manche suivante…</p></div>`;
  setTimeout(() => { if (S.mode === 'roundEnd') { ov.hidden = true; startRound(); } }, timing.between);
};
hooks.champion = c => {
  data.stats.rounds++; data.stats.matches++; data.stats.titles[HEROES.indexOf(c.hero)]++; Save.save(store, data);
  showEnd(c);
};

/** Horloge de la manche (au-dessus de l'arène). */
export function updateClock() {
  clockEl.textContent = S.time > 0 ? `${Math.floor(S.time / 60)}:${String(Math.floor(S.time % 60)).padStart(2, '0')}` : 'FINALE !';
  clockEl.classList.toggle('final', S.time <= 0);
}

function scoreHtml(){return `<div class="score">${S.players.map(p=>`<div style="color:${p.hero.col}">${p.hero.name} ${'★'.repeat(p.wins)}${'☆'.repeat(Math.max(0,(S.cur?.goal??3)-p.wins))}</div>`).join('')}</div>`}
export function buildHud(){hud.innerHTML=S.players.map(p=>`<div class="card" id="c${p.id}"><canvas width="76" height="76"></canvas><div><b style="color:${p.hero.col}">${p.hero.name}</b><small></small></div><div class="stars"></div></div>`).join('');
 S.players.forEach(p=>heroPortrait(/** @type {HTMLCanvasElement} */(hud.querySelector(`#c${p.id} canvas`)),HEROES.indexOf(p.hero),76))}
export function updateHud(){if(S.mode==='demo'||!S.cur)return;S.players.forEach(p=>{const el=document.getElementById('c'+p.id);if(!el)return;const sm=/** @type {HTMLElement} */(el.querySelector('small')),st=/** @type {HTMLElement} */(el.querySelector('.stars'));el.classList.toggle('dead',!p.alive);
 sm.textContent=`${p.human>=0?'J'+(p.human+1):'Bot'} · ●${p.bombs} ✦${p.range} »${Math.round((p.speed-3.4)/.45)}${p.shield?' ◈':''}${p.kick?' pied':''}${p.curse?' · maudit':''}`;
 st.textContent='★'.repeat(p.wins)})}

/** @param {Player} c */
function showEnd(c){S.mode='over';ov.hidden=false;ov.classList.remove('menu');
 ov.innerHTML=`<div class="panel"><p class="sub" style="margin:0">Champion du festival</p><canvas id="champ" width="200" height="200" style="width:120px;height:120px;display:block;margin:4px auto -6px"></canvas><h1 style="color:${c.hero.col};text-shadow:0 5px 0 ${c.hero.dk},0 10px 24px #000a">${c.hero.name}</h1><p class="sub">${c.human>=0?'Joueur '+(c.human+1)+', le roi des pétards.':'Un bot a gagné… revanche ?'}</p>${scoreHtml()}
 <button class="go" id="again">Revanche</button><br><button class="go alt" id="tomenu">Menu</button></div>`;
 heroPortrait(/** @type {HTMLCanvasElement} */($('champ')),HEROES.indexOf(c.hero),200);
 $('again').onclick=play;$('tomenu').onclick=showMenu;
 for(let k=0;k<80;k++)part(COLS/2,ROWS/2,'confetti')}

/** @param {string} name @param {[number,string][]} opts @param {number} val @param {number[]} [dis] */
function seg(name,opts,val,dis=[]){return `<div class="seg" data-k="${name}">${opts.map(([v,l])=>`<button aria-pressed="${v===val}" data-v="${v}" ${dis.includes(v)?'disabled':''}>${l}</button>`).join('')}</div>`}
export function showMenu(){persist();S.paused=false;startMatch(true);clockEl.hidden=true;hud.innerHTML='';ov.hidden=false;renderMenu()}
/** @param {string} k @param {number} val @param {number} taken */
function heroPick(k,val,taken){return `<div class="heroes" data-k="${k}">${HEROES.map((h,i)=>`<button aria-pressed="${i===val}" data-v="${i}" ${i===taken?'disabled':''} style="color:${h.col}"><canvas data-h="${i}" width="88" height="88"></canvas>${h.name}</button>`).join('')}</div>`}
function renderMenu(){const s=S.settings;if(s.h2===s.h1)s.h2=(s.h1+1)%4;const maxB=4-s.humans,minB=s.humans===1?1:0;s.bots=clamp(s.bots,minB,maxB);
 const dis=[0,1,2,3].filter(v=>v<minB||v>maxB);
 ov.classList.add('menu');ov.innerHTML=`<div class="panel"><h1>KEV<span>BLAST</span></h1><p class="sub">Le festival des pétards. Fais sauter les caisses, ramasse les bonus, sois le dernier debout.</p>
 <div class="row"><span>Joueurs</span>${seg('humans',[[1,'1 joueur'],[2,'2 joueurs']],s.humans)}</div>
 <div class="row"><span>Héros joueur 1</span>${heroPick('h1',s.h1,-1)}</div><p class="pow"><b>${HEROES[s.h1].pw} :</b> ${HEROES[s.h1].pd}</p>
 ${s.humans>1?`<div class="row"><span>Héros joueur 2</span>${heroPick('h2',s.h2,s.h1)}</div><p class="pow"><b>${HEROES[s.h2].pw} :</b> ${HEROES[s.h2].pd}</p>`:''}
 <div class="row"><span>Bots</span>${seg('bots',[[0,'0'],[1,'1'],[2,'2'],[3,'3']],s.bots,dis)}</div>
 <div class="row"><span>Niveau des bots</span>${seg('diff',[[0,'Tranquille'],[1,'Malin'],[2,'Infernal']],s.diff)}</div>
 <div class="row"><span>Manches à gagner</span>${seg('goal',[[2,'2'],[3,'3'],[5,'5']],s.goal)}</div>
 <button class="go" id="play">Jouer</button>
 <div class="sig"><b>La Surcharge :</b> garde la touche bombe enfoncée pour charger ton pétard. À moitié : explosion +2 cases. À fond : flamme rose qui traverse 2 caisses. Mais tu ralentis pendant la charge !</div>
 <div class="keys"><div><b style="color:${HEROES[s.h1].col}">Joueur 1</b><br><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> (ou WASD) pour bouger<br><kbd>Espace</kbd> bombe</div>
 <div><b style="color:${HEROES[s.h2].col}">Joueur 2</b><br><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> pour bouger<br><kbd>Entrée</kbd> bombe</div></div>
 <p class="sub" style="margin:10px 0 0;font-size:13px">Manettes acceptées (bouton A pour poser, Start pour lancer). Sur téléphone, joystick et bouton BOUM sous l'arène.</p>
 <p class="sub" style="margin:12px 0 0;font-size:13px">Bonus : bombe en plus, portée, vitesse, bouclier, coup de pied (pousse les bombes), étoile (flamme max). Attention à la spirale violette : une malédiction que tu peux refiler en touchant un adversaire ! Après 2 minutes, la Finale referme l'arène.</p>${palmares()}<p class="ver">v${VERSION}</p></div>`;
 ov.querySelectorAll('canvas[data-h]').forEach(cn=>heroPortrait(/** @type {HTMLCanvasElement} */(cn),Number(/** @type {HTMLElement} */(cn).dataset.h),88));
 ov.querySelectorAll('.seg,.heroes').forEach(sg=>sg.addEventListener('click',e=>{const b=/** @type {HTMLButtonElement|null} */(/** @type {HTMLElement} */(e.target).closest('button'));if(!b||b.disabled)return;/** @type {any} */(s)[/** @type {string} */(/** @type {HTMLElement} */(sg).dataset.k)]=Number(b.dataset.v);persist();renderMenu()}));
 $('play').onclick=()=>{audio();play()}}
export function togglePause(){if(!['play','countdown'].includes(S.mode))return;S.paused=!S.paused;ov.hidden=!S.paused;
 if(S.paused){ov.classList.remove('menu');ov.innerHTML=`<div class="panel"><h2>Pause</h2>${scoreHtml()}<button class="go" id="resume">Reprendre</button><br><button class="go alt" id="quit">Quitter la partie</button></div>`;
  $('resume').onclick=togglePause;$('quit').onclick=showMenu}}
export function toggleMusic(){music.on=!music.on;$('bMusic').textContent=music.on?'♪ On':'♪ Off';persist()}


/** Palmarès sauvegardé, sous le menu (vide tant qu'aucune partie n'est finie). */
function palmares(){const st=data.stats;if(!st.matches)return '';
 return `<p class="sub palm">${st.matches} partie${st.matches>1?'s':''} jouée${st.matches>1?'s':''} · titres : ${HEROES.map((h,i)=>`<b style="color:${h.col}">${h.name} ${st.titles[i]}</b>`).join(' · ')}</p>`}

export function initUi(){
 applySave();
 $('bMusic').onclick=()=>{audio();toggleMusic()};
 $('bPause').onclick=togglePause;
}
