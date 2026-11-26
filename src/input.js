// @ts-check
/** Clavier (2 joueurs), manettes et commandes tactiles -> état des joueurs. */
import { S, touch } from './state.js';
import { pressBomb, releaseBomb } from './rules.js';
import { audio } from './audio.js';

/** Actions de l'interface appelées par les touches (branchées par main.js). */
export const ui = { togglePause() {}, toggleMusic() {} };
/** @param {string} id */
const click = id => /** @type {HTMLElement|null} */ (document.getElementById(id))?.click();

const KEYMAP=/** @type {Record<string,string>[]} */([{KeyW:'u',KeyS:'d',KeyA:'l',KeyD:'r',Space:'b'},{ArrowUp:'u',ArrowDown:'d',ArrowLeft:'l',ArrowRight:'r',Enter:'b',NumpadEnter:'b',ShiftRight:'b'}]);
function pads(){try{return [...(navigator.getGamepads?navigator.getGamepads():[])].filter(Boolean)}catch(e){return[]}}
/** @param {Gamepad|null|undefined} g */
function padState(g){if(!g)return null;let dx=0,dy=0;const ax=g.axes[0]||0,ay=g.axes[1]||0;if(Math.abs(ax)>.45||Math.abs(ay)>.45){if(Math.abs(ax)>Math.abs(ay))dx=Math.sign(ax);else dy=Math.sign(ay)}
 const B=k=>g.buttons[k]&&g.buttons[k].pressed;if(B(12))dy=-1;else if(B(13))dy=1;else if(B(14))dx=-1;else if(B(15))dx=1;return{dx,dy,b:B(0)||B(1)||B(2)||B(3),start:B(9)}}
let padPrev={a:false,start:false};
export function pollInputs(){const ps=pads();
 for(const p of S.players){if(p.human<0)continue;const st=padState(ps[p.human]);p.padDir=st&&(st.dx||st.dy)?[st.dx,st.dy]:null;
  const b=!!(st&&st.b)||(p.human===0&&touch.b);if(b&&!p.prevB)pressBomb(p);if(!b&&p.prevB)releaseBomb(p);p.prevB=b}
 const g=padState(ps[0]);if(!g)return;
 if(g.start&&!padPrev.start){if(S.mode==='menu'||S.mode==='demo')click('play');else if(S.mode==='over')click('again');else ui.togglePause()}
 if(g.b&&!padPrev.a){if(S.paused)click('resume');else if(S.mode==='demo')click('play');else if(S.mode==='over')click('again')}
 padPrev={a:g.b,start:g.start}}

export function initInput(){
{const pad=/** @type {HTMLElement} */(document.getElementById('pad')),knob=/** @type {HTMLElement} */(document.getElementById('knob')),tb=/** @type {HTMLElement} */(document.getElementById('tb'));
 if(matchMedia('(pointer:coarse)').matches||('ontouchstart' in window))document.body.classList.add('touchy');
 const setPad=e=>{const r=pad.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,m=Math.hypot(x,y),k=Math.min(1,m/50);
  knob.style.transform=`translate(${x/(m||1)*k*40}px,${y/(m||1)*k*40}px)`;touch.dir=m<14?null:Math.abs(x)>Math.abs(y)?[Math.sign(x),0]:[0,Math.sign(y)]};
 pad.addEventListener('pointerdown',e=>{e.preventDefault();pad.setPointerCapture(e.pointerId);audio();setPad(e)});
 pad.addEventListener('pointermove',e=>{if(pad.hasPointerCapture(e.pointerId))setPad(e)});
 const up=()=>{touch.dir=null;knob.style.transform=''};pad.addEventListener('pointerup',up);pad.addEventListener('pointercancel',up);
 tb.addEventListener('pointerdown',e=>{e.preventDefault();audio();touch.b=true;tb.classList.add('on')});
 const tup=()=>{touch.b=false;tb.classList.remove('on')};tb.addEventListener('pointerup',tup);tb.addEventListener('pointercancel',tup);tb.addEventListener('pointerleave',tup);
 tb.addEventListener('contextmenu',e=>e.preventDefault())}
/** @param {number} i */
function humanOf(i){return S.players.find(p=>p.human===i)}
addEventListener('keydown',e=>{
 if(e.code==='Escape'||e.code==='KeyP'){ui.togglePause();return}
 if(e.code==='KeyM'){ui.toggleMusic();return}
 for(let i=0;i<2;i++){const a=KEYMAP[i][e.code];if(!a)continue;e.preventDefault();if(e.repeat)return;
  const p=humanOf(i);if(!p||S.mode!=='play'||S.paused)continue;
  if(a==='b')pressBomb(p);
  else{p.dirs=p.dirs.filter(d=>d!==a);p.dirs.push(a)}}});
addEventListener('keyup',e=>{for(let i=0;i<2;i++){const a=KEYMAP[i][e.code];if(!a)continue;const p=humanOf(i);if(!p)continue;
 if(a==='b')releaseBomb(p);
 else p.dirs=p.dirs.filter(d=>d!==a)}});
addEventListener('blur',()=>{S.players.forEach(p=>{p.dirs=[];if(p.human>=0)p.charge=-1});if(S.mode==='play'&&!S.paused)ui.togglePause()});

}
