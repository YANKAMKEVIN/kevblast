// @ts-check
/** Sons et musique générés avec la Web Audio API (aucun fichier). Muets tant que audio() n'a pas été appelé. */
import { S } from './state.js';

/** @type {AudioContext|null} */ let AC = null;
/** @type {GainNode|null} */ let master = null;
let musicTimer = 0, step = 0;
export const music = { on: true };

/** Crée le contexte audio (au premier geste du joueur).
 * @param {boolean} [onlyResume] relance un contexte déjà créé sans en créer (retour au premier plan) */
export function audio(onlyResume = false) {
  if (AC) { if (AC.state === 'suspended') AC.resume().catch(() => {}); return; }
  if (onlyResume) return;
  try {
    const W = /** @type {any} */ (window);
    const ac = /** @type {AudioContext} */ (new (W.AudioContext || W.webkitAudioContext)());
    master = ac.createGain(); master.gain.value = .55; master.connect(ac.destination); AC = ac;
  } catch (e) { AC = null; }
}
/** Coupe le son (jeu passé en arrière-plan). */
export function suspendAudio() { if (AC && AC.state === 'running') AC.suspend().catch(() => {}); }
function quiet() { return !AC || S.mode === 'demo'; }
/** @param {number} f @param {number} d @param {OscillatorType} [type] @param {number} [v] @param {number|null} [f2] @param {number} [when] */
function tone(f,d,type='square',v=.12,f2=null,when=0){if(!AC)return;const t=AC.currentTime+when,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(/** @type {GainNode} */ (master));o.start(t);o.stop(t+d+.02)}
/** @type {AudioBuffer|null} */ let nbuf=null;
/** @param {number} d @param {number} [v] @param {number} [f1] @param {number} [f2] @param {number} [when] */
function noise(d,v=.3,f1=3000,f2=200,when=0){if(!AC)return;if(!nbuf){nbuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const a=nbuf.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}
 const t=AC.currentTime+when,s=AC.createBufferSource(),fl=AC.createBiquadFilter(),g=AC.createGain();s.buffer=nbuf;fl.type='lowpass';fl.frequency.setValueAtTime(f1,t);fl.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(fl);fl.connect(g);g.connect(/** @type {GainNode} */ (master));s.start(t);s.stop(t+d+.02)}
export const sfx={
 place(l){if(quiet())return;tone(220+l*80,.12,'triangle',.18,110)},
 boom(l){if(quiet())return;noise(.7+l*.15,.5,2600,120);tone(110,.45,'sine',.35,38);tone(660,.15,'square',.05,1320,.02)},
 pick(){if(quiet())return;[660,880,1320].forEach((f,i)=>tone(f,.09,'square',.07,null,i*.06))},
 die(){if(quiet())return;tone(700,.5,'sawtooth',.1,90);noise(.3,.2,4000,600,.05)},
 shield(){if(quiet())return;tone(1200,.25,'sine',.15,300)},
 beep(h){if(!AC)return;tone(h?988:494,h?.4:.15,'square',.1)},
 slam(){if(quiet())return;noise(.25,.35,900,80);tone(70,.2,'sine',.3,40)},
 kick(){if(quiet())return;tone(180,.1,'square',.12,360);noise(.08,.15,3000,800)},
 curse(){if(quiet())return;tone(500,.4,'sawtooth',.08,120);tone(530,.4,'sawtooth',.06,125,.03)},
 pop(){if(!AC)return;noise(.35,.18,5000,300);tone(900+Math.random()*600,.2,'triangle',.04,200)},
 charge(l){if(quiet())return;tone(400+l*300,.1,'triangle',.08,800+l*300)},
 win(){if(!AC)return;[523,659,784,1047,784,1047].forEach((f,i)=>tone(f,.18,'square',.08,null,i*.12))}};
const MEL=[0,4,7,9,7,4,2,4, 0,4,7,12,9,7,4,2, 5,9,12,9,7,4,7,9, 7,4,2,4,0,-3,0,2];
const BASS=[0,0,7,7,5,5,7,-5];
function musicStep(){if(!AC||!music.on||S.mode==='demo'||S.paused||S.mode==='menu')return;const r=261.6,s=step++;
 const m=MEL[s%32];if(s%2===0||m!==MEL[(s-1+32)%32])tone(r*2**(m/12)*1,.11,'square',.035);
 if(s%4===0)tone(r/2*2**(BASS[(s>>2)%8]/12),.22,'triangle',.11);
 if(s%4===2)noise(.04,.06,8000,4000);if(s%8===0)tone(120,.12,'sine',.18,45)}
export function startMusic() { if (!musicTimer) musicTimer = setInterval(musicStep, 135); }
