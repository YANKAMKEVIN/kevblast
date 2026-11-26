// @ts-check
/** Bots : carte du danger (quand chaque case va brûler), recherche de chemin, choix de la cible.
 * Pur (aucun DOM) : testé sous Node. */
import { COLS, ROWS, FUSE, FLAME, DIFF } from './config.js';
import { S, key, blocked, powAt } from './state.js';
import { rnd } from './rng.js';
import { blastCells, canPlace, placeBomb, move, spd } from './rules.js';

/** @typedef {import('./state.js').Player} Player */

export function computeDanger(extra){
 const D=new Float32Array(COLS*ROWS).fill(Infinity);const list=S.bombs.map(b=>({x:b.x,y:b.y,t:b.t,range:b.range,pierce:b.pierce}));if(extra)list.push(extra);
 const blasts=list.map(b=>blastCells(b.x,b.y,b.range,b.pierce,S.grid));
 for(let it=0,ch=true;ch&&it<6;it++){ch=false;list.forEach((a,ai)=>blasts[ai].forEach(c=>list.forEach(b=>{if(b!==a&&b.x===c.x&&b.y===c.y&&b.t>a.t){b.t=a.t;ch=true}})))}
 list.forEach((b,i)=>blasts[i].forEach(c=>{const k=key(c.x,c.y);D[k]=Math.min(D[k],b.t)}));
 S.flames.forEach(f=>{if(f.t>0)D[key(f.x,f.y)]=0});
 S.falls.forEach(f=>D[key(f.x,f.y)]=0);
 if(S.sdQueue.length)S.sdQueue.slice(0,6).forEach(c=>D[key(c.x,c.y)]=Math.min(D[key(c.x,c.y)],.5));
 return D}
export function bfs(p,D,goal,safeOnly){
 const sx=Math.floor(p.x),sy=Math.floor(p.y),prev=new Int16Array(COLS*ROWS).fill(-1),dist=new Int16Array(COLS*ROWS).fill(-1);
 const q=[key(sx,sy)];dist[q[0]]=0;let best=null,bestS=-Infinity;
 for(let qi=0;qi<q.length;qi++){const k=q[qi],x=k%COLS,y=(k/COLS)|0,d=dist[k];
  const s=goal(x,y,d);if(s>bestS){bestS=s;best=k}
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,nk=key(nx,ny);if(dist[nk]>=0||blocked(nx,ny))continue;
   const arr=(d+1)/spd(p)+.15;
   if(safeOnly){if(D[nk]!==Infinity)continue}else if(!(D[nk]===Infinity||arr<D[nk]-.35||arr>D[nk]+FLAME+.1))continue;
   dist[nk]=d+1;prev[nk]=k;q.push(nk)}}
 if(best===null||bestS===-Infinity)return null;
 const path=[];let k=best;while(k!==key(sx,sy)&&k>=0){path.unshift({x:k%COLS,y:(k/COLS)|0});k=prev[k]}return{path,score:bestS}}
export function blastValue(x,y,range,pierce,me){let v=0;for(const c of blastCells(x,y,range,pierce,S.grid)){if(c.soft)v+=2;
 for(const e of S.players)if(e!==me&&e.alive&&Math.floor(e.x)===c.x&&Math.floor(e.y)===c.y)v+=7}return v}
export function think(p){
 const df=DIFF[S.mode==='demo'||!S.cur?1:S.cur.diff],ai=p.ai,x=Math.floor(p.x),y=Math.floor(p.y),D=computeDanger();
 ai.path=[];ai.flee=false;
 if(D[key(x,y)]!==Infinity){ai.flee=true;const r=bfs(p,D,(cx,cy,d)=>D[key(cx,cy)]===Infinity?100-d:-d*2,false);if(r)ai.path=r.path;return}
 if(canPlace(p)){
  const v=blastValue(x,y,p.range,0,p);
  let lvl=0;
  if(rnd()<df.charge){const v1=blastValue(x,y,p.range+2,0,p);if(v1>=v+7)lvl=1}
  if((v>0||lvl)&&rnd()<df.aggr){const D2=computeDanger({x,y,t:FUSE+(lvl?.6:0),range:p.range+(lvl?2:0),pierce:0});
   const r=bfs(p,D2,(cx,cy,d)=>D2[key(cx,cy)]===Infinity?100-d:-999,false);
   if(r&&r.score>0&&r.path.length){if(lvl){ai.chargeT=.6;p.charge=0;ai.esc=r.path;return}placeBomb(p,0);ai.path=r.path;ai.flee=true;return}}}
 const enemies=S.players.filter(e=>e!==p&&e.alive);
 const r=bfs(p,D,(cx,cy,d)=>{let s=-d*.6;const pw=powAt(cx,cy);if(pw&&pw.type!=='curse')s=Math.max(s,14-d);
  const bv=blastValue(cx,cy,p.range,0,p);if(bv>0)s=Math.max(s,bv*1.2-d*.8);
  if(enemies.length){let md=99;for(const e of enemies)md=Math.min(md,Math.abs(Math.floor(e.x)-cx)+Math.abs(Math.floor(e.y)-cy));s=Math.max(s,(6-md)*df.hunt-d*.3)}
  return s+rnd()*.5},true);
 if(r&&r.path.length)ai.path=r.path.slice(0,6)}
export function botUpdate(p,dt){
 const ai=p.ai;
 if(ai.chargeT>0){ai.chargeT-=dt;p.charge+=dt;if(ai.chargeT<=0){p.charge=-1;if(placeBomb(p,1)){ai.path=ai.esc||[];ai.flee=true}}return}
 if(!ai.path.length){ai.t-=dt;if(ai.t<=0){think(p);ai.t=DIFF[S.mode==='demo'||!S.cur?1:S.cur.diff].delay+(ai.path.length?0:.12)}return}
 const n=ai.path[0],tx=n.x+.5,ty=n.y+.5,dx=tx-p.x,dy=ty-p.y;
 if(Math.abs(dx)<.02&&Math.abs(dy)<.02){p.x=tx;p.y=ty;ai.path.shift();
  const D=computeDanger(),here=D[key(n.x,n.y)];
  if(!ai.path.length)return;
  if(ai.flee){if(here===Infinity)ai.path=[];return}
  const nn=ai.path[0];if(here!==Infinity||D[key(nn.x,nn.y)]!==Infinity)ai.path=[];return}
 if(blocked(n.x,n.y)){ai.path=[];return}
 const bx=p.x,by=p.y;
 if(Math.abs(dx)>Math.abs(dy))move(p,Math.sign(dx),0,dt,Math.abs(dx));else move(p,0,Math.sign(dy),dt,Math.abs(dy));
 if(Math.abs(p.x-bx)+Math.abs(p.y-by)<1e-4){ai.stuck+=dt;if(ai.stuck>.4){ai.path=[];ai.stuck=0}}else ai.stuck=0}

