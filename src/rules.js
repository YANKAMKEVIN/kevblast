// @ts-check
/** Règles de KEVBLAST : arène, pétards, flammes, bonus, malédictions, manches.
 * Aucune dépendance au DOM : testé sous Node par tests/unit/*.test.mjs. */
import { COLS, ROWS, FUSE, FLAME, ROUND, HEROES, SPAWN, ARENAS, THEMES, CURSES, POWTXT, POW_CHANCE, POW_TABLE, CAPS, CHARGE } from './config.js';
import { S, hooks, touch, key, cell, bombAt, powAt, flameAt, blocked } from './state.js';
import { rnd } from './rng.js';
import { sfx } from './audio.js';
import { botUpdate } from './ai.js';

/** @typedef {import('./state.js').Player} Player */

const DV = /** @type {Record<string,number[]>} */ ({ u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] });

/**
 * Réplique d'un héros, choisie par un compteur (jamais par le hasard de la partie,
 * pour qu'une graine rejoue toujours la même partie).
 * @param {string[]} lines @param {number} n
 */
export function line(lines, n) { return lines[((n % lines.length) + lines.length) % lines.length]; }

/** Niveau de Surcharge pour un temps de charge (0 normal, 1 portée +2, 2 flamme perçante).
 * @param {number} t */
export function chargeLevel(t) { return t >= CHARGE.full ? 2 : t >= CHARGE.half ? 1 : 0; }

/** Bonus tiré au hasard dans POW_TABLE. @param {number} r nombre dans [0,1[ */
export function drawPow(r) { for (const [p, type] of POW_TABLE) if (r < /** @type {number} */ (p)) return /** @type {string} */ (type); return 'max'; }

export function genMap(kind){
 /** @type {number[][]} */ const g=[];for(let y=0;y<ROWS;y++){g.push([]);for(let x=0;x<COLS;x++){let v=0;
  if(x===0||y===0||x===COLS-1||y===ROWS-1)v=1;
  else if(x%2===0&&y%2===0){
   if(kind===0)v=1;
   else if(kind===1)v=([[4,4],[10,4],[4,8],[10,8],[6,6],[8,6]].some(([a,b])=>a===x&&b===y))?0:1;
   else v=((x/2+y/2)%2===0)?1:0;}
  g[y].push(v)}}
 if(kind===1)g[6][7]=1;
 if(kind===2){g[6][7]=1;g[3][7]=1;g[9][7]=1}
 const safe=new Set();SPAWN.forEach(([sx,sy])=>{const dx=sx<7?1:-1,dy=sy<6?1:-1;[[0,0],[dx,0],[0,dy],[dx*2,0],[0,dy*2]].forEach(([a,b])=>safe.add(key(sx+a,sy+b)))});
 const dens=kind===2?.78:.7;
 for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)if(g[y][x]===0&&!safe.has(key(x,y))&&rnd()<dens)g[y][x]=2;
 return g}

export function newPlayer(i,hi,human){const h=HEROES[hi];return{id:i,hero:h,human,x:0,y:0,alive:true,speed:3.4,bombs:1,range:2,shield:false,inv:0,charge:-1,chargeLvl:0,dir:{x:0,y:1},walk:0,active:0,wins:0,deadT:0,dirs:[],ai:{path:[],t:0,stuck:0,lx:0,ly:0,chargeT:0}}}

/** Lance une partie (demo : 4 bots qui jouent derrière le menu).
 * @param {boolean} demo */
export function startMatch(demo){
 S.mode=demo?'demo':'countdown';
 const st=demo?{humans:0,bots:4,diff:1,goal:99,h1:0,h2:1}:{...S.settings};S.cur=st;
 S.players=[];const n=st.humans+st.bots;
 const order=demo?[0,1,2,3]:[st.h1,...(st.humans>1?[st.h2]:[])];for(let h=0;h<4;h++)if(!order.includes(h))order.push(h);
 for(let i=0;i<n;i++)S.players.push(newPlayer(i,order[i],i<st.humans?i:-1));
 S.round=0;S.arena=Math.floor(rnd()*5);startRound()}
export function startRound(){
 S.round++;S.arena=(S.arena+1)%5;S.texts=[];S.slow=0;S.grid=genMap(S.arena);S.bombs=[];S.flames=[];S.pows=[];S.parts=[];S.breaks=[];S.falls=[];S.time=ROUND;S.ff=0;S.sdQueue=[];S.sdT=0;S.endT=0;
 S.players.forEach((p,i)=>{const h=HEROES.indexOf(p.hero);Object.assign(p,{x:SPAWN[i][0]+.5,y:SPAWN[i][1]+.5,alive:true,speed:h===1?CAPS.turboSpeed:CAPS.baseSpeed,bombs:h===2?2:1,range:h===0?3:2,shield:h===3,inv:0,charge:-1,active:0,deadT:0,dirs:[],dir:{x:0,y:1},kick:false,curse:null,curseCd:0,prevB:false,moving:false});p.ai={path:[],t:0,stuck:0,lx:0,ly:0,chargeT:0}});
 S.floor=null;S.banner={text:ARENAS[S.arena],t:2.2};
 if(S.mode!=='demo'){S.mode='countdown';S.cd=3.2;S.lastBeep=4}
 hooks.hud()}

/* ---------- movement ---------- */
export function spd(p){return p.speed*(p.charge>=0?.45:1)*(p.curse&&p.curse.type==='slow'?.5:1)}
function tryKick(p,x,y,dx,dy,atLim){if(!p.kick||!atLim)return;const b=bombAt(x,y);if(b&&!b.vx&&!b.vy){b.vx=dx;b.vy=dy;b.off=0;sfx.kick()}}
export function move(p,dx,dy,dt,cap=99){
 let d=Math.min(spd(p)*dt,cap);if(d<=0)return;
 const cx=Math.floor(p.x),cy=Math.floor(p.y);p.dir={x:dx,y:dy};p.walk+=dt*10;
 if(dx){const off=p.y-(cy+.5);
  if(Math.abs(off)>.01){
   if(!blocked(cx+dx,cy)){const s=Math.min(Math.abs(off),d);p.y-=Math.sign(off)*s;d-=s;if(d<=0)return}
   else{const ny=cy+Math.sign(off);if(Math.abs(off)>.12&&!blocked(cx+dx,ny)&&!blocked(cx,ny)){p.y+=Math.sign(off)*d;return}}}
  let nx=p.x+dx*d;if(blocked(cx+dx,cy)){const lim=cx+.5;nx=dx>0?Math.min(nx,Math.max(lim,p.x)):Math.max(nx,Math.min(lim,p.x));tryKick(p,cx+dx,cy,dx,0,Math.abs(nx-lim)<.03&&Math.abs(p.y-(cy+.5))<.05)}p.x=nx}
 else if(dy){const off=p.x-(cx+.5);
  if(Math.abs(off)>.01){
   if(!blocked(cx,cy+dy)){const s=Math.min(Math.abs(off),d);p.x-=Math.sign(off)*s;d-=s;if(d<=0)return}
   else{const nx=cx+Math.sign(off);if(Math.abs(off)>.12&&!blocked(nx,cy+dy)&&!blocked(nx,cy)){p.x+=Math.sign(off)*d;return}}}
  let ny=p.y+dy*d;if(blocked(cx,cy+dy)){const lim=cy+.5;ny=dy>0?Math.min(ny,Math.max(lim,p.y)):Math.max(ny,Math.min(lim,p.y));tryKick(p,cx,cy+dy,0,dy,Math.abs(ny-lim)<.03&&Math.abs(p.x-(cx+.5))<.05)}p.y=ny}}

/* ---------- bombs & blasts ---------- */
export function canPlace(p){const x=Math.floor(p.x),y=Math.floor(p.y);return p.alive&&p.active<p.bombs&&!bombAt(x,y)&&cell(x,y)===0}
export function placeBomb(p,lvl){if(!canPlace(p))return false;const x=Math.floor(p.x),y=Math.floor(p.y);
 S.bombs.push({x,y,t:FUSE,owner:p,lvl,range:(p.curse&&p.curse.type==='tiny'?1:p.range)+(lvl>=1?2:0),pierce:lvl>=2?2:0,age:0,vx:0,vy:0,off:0});p.active++;sfx.place(lvl);return true}
export function blastCells(x,y,range,pierce,grid){const out=[{x,y,o:'c'}];
 for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){let pc=pierce;
  for(let i=1;i<=range;i++){const cx=x+dx*i,cy=y+dy*i,v=(cx<0||cy<0||cx>=COLS||cy>=ROWS)?1:grid[cy][cx];if(v===1)break;
   out.push({x:cx,y:cy,o:dx?'h':'v',end:i===range,soft:v===2});if(v===2){if(pc>0){pc--;continue}break}}}return out}
export function explode(b){
 const i=S.bombs.indexOf(b);if(i<0)return;S.bombs.splice(i,1);b.owner.active=Math.max(0,b.owner.active-1);
 const cells=blastCells(b.x,b.y,b.range,b.pierce,S.grid);
 S.shake=Math.min(14,S.shake+5+b.lvl*3);sfx.boom(b.lvl);
 for(const c of cells){
  const ex=S.flames.find(f=>f.x===c.x&&f.y===c.y);if(ex){ex.t=FLAME;if(c.o==='c')ex.o='c';else if(ex.o!==c.o&&ex.o!=='c')ex.o='c';ex.lvl=Math.max(ex.lvl,b.lvl)}
  else S.flames.push({x:c.x,y:c.y,o:c.o,t:FLAME,lvl:b.lvl});
  if(c.soft){S.grid[c.y][c.x]=0;S.breaks.push({x:c.x,y:c.y,t:0});for(let k=0;k<10;k++)part(c.x+.5,c.y+.5,'chip')}
  const bb=bombAt(c.x,c.y);if(bb&&bb.t>.08)bb.t=.08;
  const pw=powAt(c.x,c.y);if(pw&&!c.soft){S.pows.splice(S.pows.indexOf(pw),1);for(let k=0;k<6;k++)part(c.x+.5,c.y+.5,'spark')}
  for(let k=0;k<(c.o==='c'?14:4);k++)part(c.x+.5,c.y+.5,rnd()<.5?'spark':'confetti')}}

export function part(x,y,kind,col){const a=rnd()*6.283,s=kind==='chip'?2+rnd()*3:kind==='confetti'?1+rnd()*4:2+rnd()*5;
 const cols=kind==='chip'?['#ff7a59','#ffe0b8','#c9452b']:kind==='confetti'?['#ffc63a','#ff5a3c','#14b8a6','#8b6cff','#fff']:['#fff3b0','#ffc63a','#ff8a3d'];
 S.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(kind==='confetti'?2:0),life:0,max:kind==='spark'?.35+rnd()*.3:.7+rnd()*.6,col:col||cols[Math.floor(rnd()*cols.length)],kind,r:rnd()*6})}


/* ---------- entrées (état -> direction) ---------- */
export function inputDir(p){let d=null;const a=p.dirs[p.dirs.length-1];if(a)d=DV[a];else if(p.padDir)d=p.padDir;else if(p.human===0&&touch.dir)d=touch.dir;
 if(d&&p.curse&&p.curse.type==='reverse')d=[-d[0],-d[1]];return d}
export function pressBomb(p){if(S.mode!=='play'||S.paused||!p.alive)return;if(canPlace(p)&&p.charge<0){p.charge=0;p.chargeLvl=0}}
export function releaseBomb(p){if(p.charge>=0){const l=chargeLevel(p.charge);p.charge=-1;if(S.mode==='play')placeBomb(p,l)}}

/* ---------- mise à jour ---------- */
export function floatText(x,y,text,col){if(S.mode!=='demo')S.texts.push({x,y,text,col,t:0})}
export function giveCurse(p,type){const ks=Object.keys(CURSES);type=type||ks[Math.floor(rnd()*ks.length)];if(type==='reverse'&&p.human<0)type='slow';
 p.curse={type,t:10};floatText(p.x,p.y-.6,CURSES[type],'#d9a8ff');hooks.hud()}
export function kill(p){if(!p.alive)return;if(p.inv>0)return;
 if(p.shield){p.shield=false;p.inv=1.4;sfx.shield();for(let k=0;k<14;k++)part(p.x,p.y,'spark','#9ff');return}
 floatText(p.x,p.y-1.1,line(p.hero.ko,S.round+p.id),p.hero.lt);
 p.alive=false;p.deadT=0;p.charge=-1;p.curse=null;sfx.die();
 if(S.mode==='play'&&S.players.filter(q=>q.alive).length<=1&&S.slow<=0){S.slow=1.5;S.focus={x:p.x,y:p.y};floatText(p.x,p.y-.8,'K.O. !','#ffc63a')}S.shake+=6;for(let k=0;k<30;k++)part(p.x,p.y,'confetti');for(let k=0;k<12;k++)part(p.x,p.y,'spark',p.hero.col);hooks.hud()}
export function update(dt){
 if(S.banner){S.banner.t-=dt;if(S.banner.t<=0)S.banner=null}
 S.shake=Math.max(0,S.shake-dt*30);
 for(const q of S.parts){q.life+=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.r+=dt*8;
  if(q.kind==='snow'){q.x+=Math.sin(q.r*.3)*dt*.4;continue}if(q.kind==='rocket'){q.vy+=7*dt;if(rnd()<.6)S.parts.push({x:q.x,y:q.y,vx:(rnd()-.5),vy:1,life:0,max:.35,col:'#ffe27a',kind:'spark',r:0});continue}
  if(q.kind==='burst'){q.vx*=.96;q.vy=q.vy*.96+2.5*dt;continue}
  q.vx*=.92;q.vy=q.vy*.92+(q.kind==='spark'?0:6*dt)}
 for(const q of S.parts)if(q.kind==='rocket'&&q.life>=q.max){if(S.mode==='over')sfx.pop();for(let k=0;k<46;k++){const a=rnd()*6.283,v=3+rnd()*5;S.parts.push({x:q.x,y:q.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:0,max:.9+rnd()*.6,col:rnd()<.2?'#fff':q.col,kind:'burst',r:0})}}
 S.parts=S.parts.filter(q=>q.life<q.max&&q.y<ROWS+1);
 for(const t of S.texts)t.t+=dt;S.texts=S.texts.filter(t=>t.t<1.3);
 if(THEMES[S.arena].snow&&rnd()<dt*30)S.parts.push({x:rnd()*COLS,y:-.2,vx:.3+rnd()*.3,vy:.7+rnd()*.6,life:0,max:30,col:'#fff',kind:'snow',r:rnd()*6});
 if(S.mode==='over'){S.fwT=(S.fwT||0)-dt;if(S.fwT<=0){S.fwT=.3+rnd()*.35;const cols=['#ffc63a','#ff5a3c','#14b8a6','#8b6cff','#ff4fc3','#9ff6ff'];S.parts.push({x:1.5+rnd()*(COLS-3),y:ROWS+.3,vx:(rnd()-.5)*1.5,vy:-(10+rnd()*3),life:0,max:.8+rnd()*.35,col:cols[Math.floor(rnd()*cols.length)],kind:'rocket',r:0})}}
 for(const b of S.breaks)b.t+=dt;
 S.breaks=S.breaks.filter(b=>{if(b.t<.6)return true;if(!S.cur||rnd()<POW_CHANCE){const type=drawPow(rnd());if(!S.grid[b.y][b.x]&&!bombAt(b.x,b.y))S.pows.push({x:b.x,y:b.y,type,t:0})}return false});
 if(S.mode==='countdown'){S.cd-=dt;const n=Math.ceil(S.cd);if(n<S.lastBeep&&n>0){S.lastBeep=n;sfx.beep(false)}if(S.cd<=0){S.mode='play';sfx.beep(true);S.banner={text:'BOUM !',t:.8}}return}
 if(S.mode!=='play'&&S.mode!=='demo'&&S.mode!=='roundEnd')return;
 S.time-=dt;
 if(S.time<=0){S.sdT-=dt;if(!S.sdQueue.length&&!S.sdBuilt){S.sdBuilt=true;S.sdQueue=spiral()}
  if(S.sdT<=0&&S.sdQueue.length){S.sdT=.2;const c=/** @type {{x:number,y:number}} */(S.sdQueue.shift());S.falls.push({x:c.x,y:c.y,t:0})}}else S.sdBuilt=false;
 for(const f of S.falls){f.t+=dt;if(f.t>=.35&&!f.done){f.done=true;S.grid[f.y][f.x]=1;sfx.slam();S.shake+=2;
  const b=bombAt(f.x,f.y);if(b){S.bombs.splice(S.bombs.indexOf(b),1);b.owner.active=Math.max(0,b.owner.active-1)}
  const pw=powAt(f.x,f.y);if(pw)S.pows.splice(S.pows.indexOf(pw),1);
  for(const p of S.players)if(p.alive&&Math.floor(p.x)===f.x&&Math.floor(p.y)===f.y){p.inv=0;p.shield=false;kill(p)}
  for(let k=0;k<8;k++)part(f.x+.5,f.y+.9,'chip','#2f8a80')}}
 S.falls=S.falls.filter(f=>f.t<.6);
 for(const b of S.bombs){if(b.vx||b.vy){if(b.off===0){const nx=b.x+b.vx,ny=b.y+b.vy;if(cell(nx,ny)!==0||bombAt(nx,ny)||powAt(nx,ny)||S.players.some(q=>q.alive&&Math.floor(q.x)===nx&&Math.floor(q.y)===ny)){b.vx=b.vy=0}}
  if(b.vx||b.vy){b.off+=9*dt;if(b.off>=1){b.x+=b.vx;b.y+=b.vy;b.off=0;if(flameAt(b.x,b.y))b.t=Math.min(b.t,.05)}}}
  b.t-=dt;b.age+=dt;if(rnd()<.5)S.parts.push({x:b.x+b.vx*b.off+.5+.16,y:b.y+b.vy*b.off+.5-.36,vx:(rnd()-.5)*2,vy:-1-rnd()*2,life:0,max:.25,col:'#ffe27a',kind:'spark',r:0})}
 for(const b of [...S.bombs])if(b.t<=0)explode(b);
 for(const f of S.flames)f.t-=dt;S.flames=S.flames.filter(f=>f.t>0);
 for(const pw of S.pows){pw.t+=dt;if(flameAt(pw.x,pw.y)&&pw.t>.1){S.pows.splice(S.pows.indexOf(pw),1);break}}
 for(const p of S.players){if(!p.alive){p.deadT+=dt;continue}
  p.inv=Math.max(0,p.inv-dt);
  if(p.curse){p.curse.t-=dt;if(p.curse.t<=0){p.curse=null;floatText(p.x,p.y-.6,'Libéré !','#9ff6ff');hooks.hud()}
   else if(p.curse.type==='dropper'&&p.charge<0&&(S.mode==='play'||S.mode==='demo')&&canPlace(p))placeBomb(p,0)}
  p.curseCd=Math.max(0,(p.curseCd||0)-dt);
  if(p.curse&&p.curseCd<=0)for(const q of S.players)if(q!==p&&q.alive&&!q.curse&&Math.hypot(q.x-p.x,q.y-p.y)<.75){const t=p.curse.type;p.curse=null;giveCurse(q,t);q.curseCd=p.curseCd=1.2;floatText(p.x,p.y-.6,'Refilé !','#9ff6ff');break}
  if(p.human>=0){p.moving=false;if(S.mode==='play'){const a=inputDir(p);if(a){move(p,a[0],a[1],dt);p.moving=true}
   if(p.charge>=0){p.charge+=dt;const l=chargeLevel(p.charge);if(l>p.chargeLvl){p.chargeLvl=l;sfx.charge(l)}}}}
  else{botUpdate(p,dt);p.moving=p.ai.path.length>0}
  const cx=Math.floor(p.x),cy=Math.floor(p.y);
  if(flameAt(cx,cy))kill(p);
  const pw=powAt(cx,cy);if(pw&&p.alive){S.pows.splice(S.pows.indexOf(pw),1);
   if(pw.type==='bomb')p.bombs=Math.min(CAPS.bombs,p.bombs+1);else if(pw.type==='fire')p.range=Math.min(CAPS.range,p.range+1);else if(pw.type==='speed')p.speed=Math.min(CAPS.speed,p.speed+CAPS.speedStep);
   else if(pw.type==='shield')p.shield=true;else if(pw.type==='kick')p.kick=true;else if(pw.type==='max')p.range=CAPS.range;
   if(pw.type==='curse'){giveCurse(p,null);sfx.curse()}else floatText(p.x,p.y-.6,POWTXT[pw.type],'#fff3b0');
   sfx.pick();for(let k=0;k<10;k++)part(p.x,p.y,'spark','#fff3b0');hooks.hud()}}
 const alive=S.players.filter(p=>p.alive);
 if((S.mode==='play'||S.mode==='demo')&&alive.length<=1){S.endT+=dt;if(S.endT>1.3)endRound(alive[0])}}
/** Ordre dans lequel la Finale referme l'arène : anneaux de l'extérieur vers le centre,
 * jusqu'à la dernière case (sinon deux survivants au centre faisaient durer la manche sans fin). */
export function spiral(){const out=[];
 for(let r=1;;r++){const x0=r,y0=r,x1=COLS-1-r,y1=ROWS-1-r;if(x0>x1||y0>y1)break;
  for(let x=x0;x<=x1;x++)out.push({x,y:y0});
  for(let y=y0+1;y<=y1;y++)out.push({x:x1,y});
  if(y1>y0)for(let x=x1-1;x>=x0;x--)out.push({x,y:y1});
  if(x1>x0)for(let y=y1-1;y>y0;y--)out.push({x:x0,y})}
 return out.filter(c=>S.grid[c.y][c.x]!==1)}


/** Fin de manche : le gagnant marque une étoile ; la partie s'arrête à S.cur.goal.
 * @param {Player|undefined} w */
export function endRound(w){
 if(S.mode==='demo'){startRound();return}
 S.mode='roundEnd';if(w)w.wins++;hooks.hud();
 const champ=S.players.find(p=>p.wins>=(S.cur?.goal??3));
 if(champ){S.mode='over';sfx.win();hooks.champion(champ);return}
 hooks.roundEnd(w)}
