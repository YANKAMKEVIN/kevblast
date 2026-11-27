// @ts-check
/** Dessin de l'arène sur le canvas. Lit l'état, ne le modifie pas (hormis le cache du sol). */
import { COLS, ROWS, T, FUSE, FLAME, HEROES, THEMES, ICON } from './config.js';
import { S } from './state.js';
import { clamp } from './rng.js';
import { art, heroView, HERO_ART, HERO_WIN, HERO_SPRITES } from './art.js';

/** @type {HTMLCanvasElement} */ let cv;
/** @type {CanvasRenderingContext2D} */ let ctx;
/** @type {HTMLCanvasElement} */ let nightC;
/** @type {CanvasRenderingContext2D} */ let nctx;
const DPR = Math.min(2, window.devicePixelRatio || 1);
/** Horloge des animations (secondes). */
let now = 0;
/** @param {number} t */
export function setNow(t) { now = t; }

/** @param {HTMLCanvasElement} canvas */
export function initRender(canvas) {
  cv = canvas; ctx = /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'));
  cv.width = COLS * T * DPR; cv.height = ROWS * T * DPR;
  nightC = document.createElement('canvas'); nightC.width = cv.width; nightC.height = cv.height;
  nctx = /** @type {CanvasRenderingContext2D} */ (nightC.getContext('2d'));
}

function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function buildFloor(){const f=document.createElement('canvas');f.width=COLS*T*DPR;f.height=ROWS*T*DPR;const c=/** @type {CanvasRenderingContext2D} */(f.getContext('2d'));c.scale(DPR,DPR);
 const pal=THEMES[S.arena].floor,sol=art('sol');
 if(sol){paintFloor(c,sol,pal);S.floor=f;return}
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){c.fillStyle=(x+y)%2?pal[0]:pal[1];c.fillRect(x*T,y*T,T,T);c.fillStyle=pal[2];c.globalAlpha=.35;c.fillRect(x*T,y*T+T-2,T,2);c.fillRect(x*T+T-2,y*T,2,T);c.globalAlpha=1;
  if(((x*7+y*13)%11)===0){c.fillStyle=pal[2];c.globalAlpha=.5;c.beginPath();c.arc(x*T+T*.3,y*T+T*.65,2,0,7);c.arc(x*T+T*.7,y*T+T*.3,1.5,0,7);c.fill();c.globalAlpha=1}}
 const cx=7*T+T/2,cy=6*T+T/2;c.strokeStyle=pal[2];c.globalAlpha=.4;c.lineWidth=3;c.setLineDash([6,8]);c.beginPath();c.arc(cx,cy,T*2.6,0,7);c.stroke();c.setLineDash([]);c.globalAlpha=1;
 S.floor=f}
/** Sol peint : la texture Codex (un motif toutes les 2 cases), teintée aux couleurs de l'arène.
 * @param {CanvasRenderingContext2D} c @param {HTMLImageElement} sol @param {string[]} pal */
function paintFloor(c,sol,pal){const W=COLS*T,H=ROWS*T;
 for(let y=0;y<H;y+=T*2)for(let x=0;x<W;x+=T*2)c.drawImage(sol,x,y,T*2,T*2);
 c.globalCompositeOperation='multiply';c.fillStyle=pal[0];c.globalAlpha=.55;c.fillRect(0,0,W,H);
 c.globalCompositeOperation='source-over';c.globalAlpha=.18;
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if((x+y)%2){c.fillStyle=pal[2];c.fillRect(x*T,y*T,T,T)}
 c.globalAlpha=1;const cx=7*T+T/2,cy=6*T+T/2;c.strokeStyle=pal[2];c.globalAlpha=.5;c.lineWidth=3;c.setLineDash([6,8]);c.beginPath();c.arc(cx,cy,T*2.6,0,7);c.stroke();c.setLineDash([]);c.globalAlpha=1}
/** Bloc peint (mur ou caisse) avec son ombre ; faux si l'image n'est pas prête. */
function paintBlock(name,px,py,tint){const im=art(name);if(!im)return false;
 ctx.fillStyle='#0004';ctx.fillRect(px+4,py+T-3,T-2,5);
 ctx.drawImage(im,px,py,T,T);
 if(tint){ctx.globalCompositeOperation='multiply';ctx.fillStyle=tint;ctx.globalAlpha=.45;ctx.fillRect(px,py,T,T);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1}
 return true}
function drawHard(x,y){const px=x*T,py=y*T,border=x===0||y===0||x===COLS-1||y===ROWS-1;
 if(paintBlock('mur',px,py,border?THEMES[S.arena].border[1]:null))return;
 ctx.fillStyle='#0003';ctx.fillRect(px+4,py+T-4,T,6);
 const hc=border?THEMES[S.arena].border:THEMES[S.arena].hard;ctx.fillStyle=hc[2];rr(ctx,px+1,py+T*.2,T-2,T*.8-1,6);ctx.fill();
 const g=ctx.createLinearGradient(0,py,0,py+T*.72);g.addColorStop(0,hc[0]);g.addColorStop(1,hc[1]);
 ctx.fillStyle=g;rr(ctx,px+1,py+1,T-2,T*.72,7);ctx.fill();
 ctx.fillStyle='#ffffff30';rr(ctx,px+5,py+4,T-10,5,3);ctx.fill();
 if(!border){ctx.strokeStyle='#ffffff22';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px+T*.3,py+T*.25);ctx.lineTo(px+T*.5,py+T*.45);ctx.lineTo(px+T*.7,py+T*.25);ctx.stroke()}
 else if((x+y)%3===0){ctx.fillStyle='#ffc63a';ctx.globalAlpha=(THEMES[S.arena].night?.8:.25)+.15*Math.sin(now*3+x+y);ctx.beginPath();ctx.arc(px+T/2,py+T*.36,5,0,7);ctx.fill();ctx.globalAlpha=1}}
function drawSoft(x,y){const px=x*T,py=y*T;
 if(paintBlock('caisse',px+1,py+1,null))return;
 ctx.fillStyle='#0003';ctx.fillRect(px+5,py+T-5,T-4,6);
 ctx.fillStyle='#b8341f';rr(ctx,px+3,py+T*.24,T-6,T*.72,6);ctx.fill();
 const g=ctx.createLinearGradient(0,py+3,0,py+T*.75);g.addColorStop(0,'#ff8a66');g.addColorStop(1,'#ff5a3c');ctx.fillStyle=g;rr(ctx,px+3,py+3,T-6,T*.7,7);ctx.fill();
 ctx.fillStyle='#fff1d6';ctx.fillRect(px+3,py+T*.3,T-6,T*.14);
 ctx.fillStyle='#ffc63a';ctx.beginPath();const sx=px+T/2,sy=py+T*.37;for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?3:7;ctx.lineTo(sx+Math.cos(a)*r,sy+Math.sin(a)*r)}ctx.fill();
 ctx.fillStyle='#ffffff40';rr(ctx,px+7,py+6,T-14,4,2);ctx.fill()}
function drawBomb(b){const px=(b.x+b.vx*b.off+.5)*T,py=(b.y+b.vy*b.off+.5)*T,u=1-b.t/FUSE,pul=1+Math.sin(b.age*(8+u*22))*.06*(.5+u);
 const R=T*.33*pul*(1+b.lvl*.08);
 ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(px,py+T*.3,R*.9,R*.32,0,0,7);ctx.fill();
 if(b.lvl){ctx.globalCompositeOperation='lighter';const gg=ctx.createRadialGradient(px,py,R*.5,px,py,R*1.9);gg.addColorStop(0,b.lvl>1?'#ff6ad5aa':'#ffc63a99');gg.addColorStop(1,'#0000');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(px,py,R*1.9,0,7);ctx.fill();ctx.globalCompositeOperation='source-over'}
 const g=ctx.createRadialGradient(px-R*.35,py-R*.4,R*.1,px,py,R);g.addColorStop(0,b.lvl>1?'#a26bff':'#5a5fd6');g.addColorStop(1,b.lvl>1?'#3a106e':'#1d1f5c');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,R,0,7);ctx.fill();
 ctx.strokeStyle=b.lvl?'#ffc63a':b.owner.hero.col;ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(px,py,R,R*.32,0,0,7);ctx.stroke();
 if(u>.65&&Math.floor(b.age*16)%2){ctx.fillStyle='#ffffff55';ctx.beginPath();ctx.arc(px,py,R,0,7);ctx.fill()}
 ctx.strokeStyle='#e8d2a0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px+R*.3,py-R*.85);ctx.quadraticCurveTo(px+R*.6,py-R*1.3,px+T*.16,py-T*.36);ctx.stroke();
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px+T*.16,py-T*.36,2.5+Math.random()*1.5,0,7);ctx.fill()}
function drawFlame(f){const px=f.x*T,py=f.y*T,a=clamp(f.t/FLAME,0,1),w=T*(.42+.3*a)*(1+f.lvl*.08);
 const cols=f.lvl>1?['#ff4fc3','#ffb0f0','#fff']:['#ff5a3c','#ffc63a','#fffbe0'];
 ctx.globalAlpha=Math.min(1,a*1.6);
 for(let i=0;i<3;i++){const ww=w*(1-i*.3);ctx.fillStyle=cols[i];
  if(f.o==='c'){ctx.beginPath();ctx.arc(px+T/2,py+T/2,ww*.62,0,7);ctx.fill();ctx.fillRect(px,py+T/2-ww/2,T,ww);ctx.fillRect(px+T/2-ww/2,py,ww,T)}
  else if(f.o==='h')rr(ctx,px-1,py+T/2-ww/2,T+2,ww,ww/2),ctx.fill();else rr(ctx,px+T/2-ww/2,py-1,ww,T+2,ww/2),ctx.fill()}
 ctx.globalAlpha=1}
function drawPow(p){const px=(p.x+.5)*T,py=(p.y+.5)*T+Math.sin(now*4+p.x)*3,s=Math.min(1,p.t*4);
 ctx.save();ctx.translate(px,py);ctx.scale(s,s);
 ctx.fillStyle='#0003';ctx.beginPath();ctx.ellipse(0,T*.33,T*.25,T*.08,0,0,7);ctx.fill();
 const ic=art('bonus_'+p.type);
 if(ic){if(p.type==='curse')ctx.rotate(Math.sin(now*5)*.15);ctx.drawImage(ic,-T*.48,-T*.5,T*.96,T*.96);ctx.restore();return}
 ctx.fillStyle='#ffc63a';ctx.beginPath();ctx.arc(0,0,T*.34,0,7);ctx.fill();ctx.fillStyle='#c4840a';ctx.beginPath();ctx.arc(0,2,T*.28,0,7);ctx.fill();
 ctx.fillStyle=ICON[p.type];ctx.beginPath();ctx.arc(0,0,T*.27,0,7);ctx.fill();
 ctx.fillStyle='#fff';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';
 if(p.type==='bomb'){ctx.beginPath();ctx.arc(-1,3,7,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(3,-3);ctx.lineTo(7,-8);ctx.stroke()}
 else if(p.type==='fire'){ctx.beginPath();ctx.moveTo(0,-10);ctx.quadraticCurveTo(9,0,6,6);ctx.quadraticCurveTo(0,11,-6,6);ctx.quadraticCurveTo(-9,0,0,-10);ctx.fill();ctx.fillStyle='#ffc63a';ctx.beginPath();ctx.arc(0,4,3,0,7);ctx.fill()}
 else if(p.type==='speed'){ctx.beginPath();ctx.moveTo(-8,-7);ctx.lineTo(-1,0);ctx.lineTo(-8,7);ctx.moveTo(1,-7);ctx.lineTo(8,0);ctx.lineTo(1,7);ctx.stroke()}
 else if(p.type==='kick'){ctx.beginPath();ctx.moveTo(-8,-8);ctx.lineTo(-2,-8);ctx.lineTo(-2,2);ctx.lineTo(8,2);ctx.quadraticCurveTo(9,8,4,8);ctx.lineTo(-8,8);ctx.closePath();ctx.fill();ctx.strokeStyle='#1f9d55';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,4);ctx.lineTo(8,4);ctx.stroke()}
 else if(p.type==='curse'){ctx.strokeStyle='#d9a8ff';ctx.beginPath();for(let a=0;a<12;a+=.3){const r=a*.85;ctx.lineTo(Math.cos(a+now*4)*r,Math.sin(a+now*4)*r)}ctx.stroke()}
 else if(p.type==='max'){ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?4.5:10;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.fill()}
 else{ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(8,-5);ctx.quadraticCurveTo(7,6,0,10);ctx.quadraticCurveTo(-7,6,-8,-5);ctx.closePath();ctx.fill()}
 ctx.fillStyle='#ffffff55';ctx.beginPath();ctx.ellipse(-5,-8,6,3,-.5,0,7);ctx.fill();ctx.restore()}

/**
 * Héros peint (Pétards Vivants) : sprite de la vue courante, animé par le code.
 * Marche : petits bonds, dandinement et écrasement au contact du sol. Repos : respiration.
 * Surcharge : le pétard tremble et gonfle. Mox flotte, Nova laisse des traits de vitesse.
 * @param {CanvasRenderingContext2D} c @param {any} p @param {HTMLImageElement} im @param {number} flip
 * @param {{sc:number,rot:number,lift:number,moving:boolean}} o
 */
function drawSprite(c,p,im,flip,o){
 const hi=HEROES.indexOf(p.hero),px=p.x*T,feet=p.y*T+T*.36;
 let H=T*1.2,W=H*im.width/im.height;if(W>T*1.15){H*=T*1.15/W;W=T*1.15}
 const s=Math.abs(Math.sin(p.walk||0)),ph=now*2.6+p.id*1.7;
 let sx=1,sy=1,tilt=0,hop=0,shake=0;
 if(o.moving){hop=s*T*.08;tilt=Math.sin(p.walk||0)*.085;sy=1-.07*(1-s);sx=1+.06*(1-s)}
 else{sy=1+.025*Math.sin(ph);sx=1-.02*Math.sin(ph)}
 if(p.charge>=0&&p.alive){const k=Math.min(p.charge,1.2);shake=Math.sin(now*70)*k*1.6;sx*=1+.06*k;sy*=1+.06*k}
 const hover=hi===3?T*.06+Math.sin(now*2+p.id)*T*.035:0;
 c.fillStyle='#0005';c.beginPath();c.ellipse(px,feet-T*.02,T*.28*(1-hover/T),T*.09*(1-hover/T),0,0,7);c.fill();
 if(hi===1&&o.moving&&p.dir){c.save();c.strokeStyle=p.hero.lt;c.lineCap='round';for(let i=0;i<3;i++){const a=.55-i*.15,l=T*(.22+.06*Math.sin(now*20+i*2));c.globalAlpha*=a;c.lineWidth=3-i*.6;const ox=-p.dir.x*T*(.32+i*.1),oy=-p.dir.y*T*(.3+i*.1)-T*(.25+i*.12);c.beginPath();c.moveTo(px+ox+(p.dir.y?(i-1)*T*.12:0),feet+oy);c.lineTo(px+ox-p.dir.x*l+(p.dir.y?(i-1)*T*.12:0),feet+oy-p.dir.y*l);c.stroke();c.globalAlpha/=a}c.restore()}
 c.save();c.translate(px+shake,feet-hop-hover-o.lift);c.rotate(tilt+o.rot);c.scale(sx*o.sc*flip,sy*o.sc);
 c.drawImage(im,-W/2,-H,W,H);c.restore();
 return feet-H*.55-hop-hover-o.lift}

export function drawHero(c,p,still){
 const h=p.hero,px=p.x*T,py=p.y*T;let sc=1,rot=0,alpha=1,lift=0;
 if(!p.alive){const t=p.deadT;if(t>.7)return;sc=1+t*.8;rot=t*12;alpha=1-t/.7;lift=t*30}
 const moving=!still&&p.alive&&p.moving;const bob=moving?Math.abs(Math.sin(p.walk))*3:Math.sin(now*3+p.id)*1;
 c.save();c.globalAlpha=alpha;if(p.inv>0&&Math.floor(now*14)%2)c.globalAlpha=.35;
 const hv=heroView(p.dir),im=art(HERO_SPRITES[HEROES.indexOf(h)]?.[hv.view]);
 if(im){const cy=drawSprite(c,p,im,hv.flip,{sc,rot,lift,moving});c.translate(px,cy);drawAura(c,p,alpha);c.restore();drawCharge(c,p,px,py);return}
 c.fillStyle='#0004';c.beginPath();c.ellipse(px,py+T*.34,T*.27,T*.09,0,0,7);c.fill();
 c.translate(px,py-bob-lift);c.rotate(rot);c.scale(sc,sc);
 const ft=moving?Math.sin(p.walk):0;c.fillStyle=h.dk;c.beginPath();c.ellipse(-T*.13,T*.3+ft*2,T*.1,T*.065,0,0,7);c.ellipse(T*.13,T*.3-ft*2,T*.1,T*.065,0,0,7);c.fill();
 const fl=Math.sin(now*18+p.id*2)*2;c.fillStyle='#ffc63a';c.beginPath();c.moveTo(0,-T*.58-fl);c.quadraticCurveTo(T*.13,-T*.42,T*.07,-T*.32);c.lineTo(-T*.07,-T*.32);c.quadraticCurveTo(-T*.13,-T*.42,0,-T*.58-fl);c.fill();
 c.fillStyle='#fff3b0';c.beginPath();c.ellipse(0,-T*.38,T*.04,T*.07,0,0,7);c.fill();
 const g=c.createRadialGradient(-T*.1,-T*.15,T*.05,0,0,T*.38);g.addColorStop(0,h.lt);g.addColorStop(.45,h.col);g.addColorStop(1,h.dk);
 c.fillStyle=g;c.beginPath();c.ellipse(0,0,T*.34,T*.33,0,0,7);c.fill();
 c.fillStyle=h.dk;c.beginPath();c.ellipse(0,-T*.3,T*.14,T*.05,0,0,7);c.fill();
 c.fillStyle='#fff6e6';c.beginPath();c.ellipse(0,T*.08,T*.22,T*.17,0,0,7);c.fill();
 const ex=(p.dir?.x||0)*T*.06,ey=(p.dir?.y||0)*T*.05;
 for(const s of[-1,1]){c.fillStyle='#fff';c.beginPath();c.ellipse(s*T*.11+ex*.5,-T*.06+ey*.5,T*.075,T*.095,0,0,7);c.fill();
  c.fillStyle='#1b1b2f';c.beginPath();c.arc(s*T*.11+ex,-T*.05+ey,T*.045,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(s*T*.11+ex+2,-T*.07+ey,1.6,0,7);c.fill()}
 c.fillStyle=h.dk;c.beginPath();c.arc(ex*.5,T*.1+ey*.3,T*.05,0,Math.PI);c.fill();
 drawAura(c,p,alpha);
 c.restore();drawCharge(c,p,px,py)}
/** Malédiction (spirales) et bouclier (bulle), centrés sur le héros.
 * @param {CanvasRenderingContext2D} c @param {any} p @param {number} alpha */
function drawAura(c,p,alpha){
 if(p.curse){c.strokeStyle='#b46bff';c.lineWidth=2.5;c.globalAlpha*=.8;for(let i=0;i<3;i++){c.beginPath();c.arc(Math.cos(now*5+i*2.1)*T*.3,-T*.45+Math.sin(now*5+i*2.1)*T*.08,3,0,7);c.stroke()}c.globalAlpha=alpha}
 if(p.shield){c.strokeStyle='#9ff6ffaa';c.lineWidth=3;c.beginPath();c.arc(0,0,T*.5+Math.sin(now*6)*2,0,7);c.stroke();c.fillStyle='#9ff6ff22';c.fill()}}
/** Jauge de Surcharge autour du héros.
 * @param {CanvasRenderingContext2D} c @param {any} p @param {number} px @param {number} py */
function drawCharge(c,p,px,py){
 if(p.charge>=0&&p.alive){const l=p.charge>=1.1?2:p.charge>=.5?1:0,pr=l===2?1:l===1?(p.charge-.5)/.6:p.charge/.5;
  const col=['#fff6e6','#ffc63a','#ff4fc3'][l];c.strokeStyle='#0006';c.lineWidth=6;c.beginPath();c.arc(px,py,T*.5,0,7);c.stroke();
  c.strokeStyle=col;c.lineWidth=4;c.beginPath();c.arc(px,py,T*.5,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(pr,0,1));c.stroke();
  if(l>0){c.fillStyle=col;c.font='18px "Lilita One"';c.textAlign='center';c.fillText(l===2?'MAX!':'+2',px,py-T*.98)}}}
export function draw(){
 if(!S.floor)buildFloor();
 ctx.setTransform(DPR,0,0,DPR,0,0);
 const sh=S.shake;ctx.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh);
 if(S.slow>0&&S.focus){const z=1+.22*Math.min(1,S.slow*1.5),fx=S.focus.x*T,fy=S.focus.y*T;ctx.translate(fx,fy);ctx.scale(z,z);ctx.translate(-fx,-fy)}
 ctx.drawImage(/** @type {HTMLCanvasElement} */(S.floor),0,0,COLS*T,ROWS*T);
 for(const f of S.flames)drawFlame(f);
 for(let y=0;y<ROWS;y++){
  for(let x=0;x<COLS;x++){const v=S.grid[y][x];if(v===1)drawHard(x,y);else if(v===2)drawSoft(x,y)}
  for(const b of S.breaks)if(b.y===y){const k=b.t/.6;ctx.globalAlpha=1-k;ctx.save();ctx.translate((b.x+.5)*T,(b.y+.5)*T);ctx.scale(1+k*.4,1-k*.6);ctx.translate(-(b.x+.5)*T,-(b.y+.5)*T);drawSoft(b.x,b.y);ctx.restore();ctx.globalAlpha=1}
  for(const p of S.pows)if(p.y===y)drawPow(p);
  for(const b of S.bombs)if(b.y===y)drawBomb(b);
  for(const p of S.players)if(Math.floor(p.y)===y)drawHero(ctx,p)}
 ctx.globalCompositeOperation='lighter';
 for(const f of S.flames){const a=clamp(f.t/FLAME,0,1);ctx.globalAlpha=a*.5;const g=ctx.createRadialGradient((f.x+.5)*T,(f.y+.5)*T,0,(f.x+.5)*T,(f.y+.5)*T,T*.9);g.addColorStop(0,f.lvl>1?'#ff4fc3':'#ffb03a');g.addColorStop(1,'#0000');ctx.fillStyle=g;ctx.fillRect((f.x-.5)*T,(f.y-.5)*T,T*2,T*2)}
 ctx.globalAlpha=1;
 for(const q of S.parts){const a=1-q.life/q.max;ctx.globalAlpha=a;ctx.fillStyle=q.col;
  if(q.kind==='snow'){ctx.globalAlpha=.85;ctx.beginPath();ctx.arc(q.x*T,q.y*T,2+(q.r%2),0,7);ctx.fill()}
  else if(q.kind==='spark'||q.kind==='burst'||q.kind==='rocket'){ctx.beginPath();ctx.arc(q.x*T,q.y*T,q.kind==='rocket'?3.5:2+a*2.5,0,7);ctx.fill()}else{ctx.save();ctx.translate(q.x*T,q.y*T);ctx.rotate(q.r);ctx.fillRect(-3,-2,6,q.kind==='chip'?4:3);ctx.restore()}}
 ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
 for(const f of S.falls){const k=Math.min(1,f.t/.35);ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse((f.x+.5)*T,(f.y+.8)*T,T*.45*k,T*.15*k,0,0,7);ctx.fill();
  if(!f.done){ctx.save();ctx.translate(0,-(1-k)*T*5);drawHard(f.x,f.y);ctx.restore()}}
 if(THEMES[S.arena].night)drawNight();
 for(const t of S.texts){const a=1-t.t/1.3;ctx.globalAlpha=Math.min(1,a*2);ctx.font='17px "Lilita One",sans-serif';ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#0c2427';const yy=(t.y-t.t*.8)*T,hw=ctx.measureText(t.text).width/2+6,xx=clamp(t.x*T,hw,COLS*T-hw);ctx.strokeText(t.text,xx,yy);ctx.fillStyle=t.col;ctx.fillText(t.text,xx,yy)}
 ctx.globalAlpha=1;
 if(S.mode==='countdown'){const n=Math.ceil(S.cd),fr=S.cd-Math.floor(S.cd);bigText(n>0?String(n):'',1.4-fr*.4,'#fff')}
 if(S.banner&&S.mode!=='demo'){const a=clamp(S.banner.t*2,0,1);ctx.globalAlpha=a;bigText(S.banner.text,S.banner.text==='BOUM !'?1.3:.55,'#ffc63a',S.mode==='countdown'?-2.2:0);ctx.globalAlpha=1}}
function drawNight(){const n=nctx;n.setTransform(DPR,0,0,DPR,0,0);n.globalCompositeOperation='source-over';n.clearRect(0,0,COLS*T,ROWS*T);n.fillStyle='rgba(6,10,30,.74)';n.fillRect(0,0,COLS*T,ROWS*T);
 n.globalCompositeOperation='destination-out';const hole=(x,y,r,s=1)=>{const g=n.createRadialGradient(x*T,y*T,0,x*T,y*T,r*T);g.addColorStop(0,`rgba(0,0,0,${s})`);g.addColorStop(.55,`rgba(0,0,0,${s*.75})`);g.addColorStop(1,'rgba(0,0,0,0)');n.fillStyle=g;n.fillRect((x-r)*T,(y-r)*T,r*2*T,r*2*T)};
 for(const p of S.players)if(p.alive)hole(p.x,p.y,2.3+Math.sin(now*9+p.id)*.06);
 for(const b of S.bombs)hole(b.x+b.vx*b.off+.5,b.y+b.vy*b.off+.5,1.3+(1-b.t/FUSE)*.6);
 for(const f of S.flames)hole(f.x+.5,f.y+.5,1.6);
 for(const p of S.pows)hole(p.x+.5,p.y+.5,.9,.7);
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if((x===0||y===0||x===COLS-1||y===ROWS-1)&&(x+y)%3===0)hole(x+.5,y+.4,1.3,.8);
 n.globalCompositeOperation='source-over';ctx.drawImage(nightC,0,0,COLS*T,ROWS*T)}
function bigText(t,s,col,dy=0){if(!t)return;ctx.save();ctx.translate(COLS*T/2,ROWS*T/2+dy*T);ctx.scale(s,s);ctx.font='96px "Lilita One",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.lineWidth=14;ctx.strokeStyle='#0c2427';ctx.strokeText(t,0,0);ctx.fillStyle='#b8341f';ctx.fillText(t,0,6);ctx.fillStyle=col;ctx.fillText(t,0,0);ctx.restore()}

/** @param {HTMLCanvasElement} cnv @param {number} i @param {number} size */
/** Pose de victoire peinte, sinon le portrait.
 * @param {HTMLCanvasElement} cnv @param {number} i @param {number} size */
export function heroVictory(cnv,i,size){const im=art(HERO_WIN[i]);if(!im)return heroPortrait(cnv,i,size);const c=/** @type {CanvasRenderingContext2D} */(cnv.getContext('2d'));c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cnv.width,cnv.height);c.drawImage(im,0,0,cnv.width,cnv.height)}
export function heroPortrait(cnv,i,size){const c=/** @type {CanvasRenderingContext2D} */(cnv.getContext('2d'));c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cnv.width,cnv.height);const im=art(HERO_ART[i]);if(im){c.drawImage(im,0,0,cnv.width,cnv.height);return}c.scale(size/T,size/T);drawHero(c,/** @type {any} */({id:i,hero:HEROES[i],x:.5,y:.62,alive:true,walk:0,dir:{x:0,y:1},charge:-1,inv:0,shield:false,moving:false}),true)}
