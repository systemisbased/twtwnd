import {CFG,STATS,STAT_RULES,ENEMIES,REGIONS,CARDS,statCost} from './data.js';
import {rng32,genRegion} from './world.js';
import {S,persist} from './settings.js';
const W=CFG.w,H=CFG.h,WL=CFG.wall,TAU=Math.PI*2;
export const G={on:{},run:null,paused:true,mobile:false,god:false,keys:{},mouse:{x:W/2,y:H/2,down:false},touch:{mx:0,my:0,att:false}};
let cv,ctx,ac,lastK=0;
// ---------- audio (placeholder synth) ----------
export function beep(f=440,d=.08,t='square',v=.04){try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain(),n=ac.currentTime;o.type=t;o.frequency.value=f;g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.001,n+d);o.connect(g);g.connect(ac.destination);o.start(n);o.stop(n+d)}catch(e){}}
export const toast=m=>G.on.toast&&G.on.toast(m);
// ---------- stats ----------
export function statv(k){const r=G.run,d=STATS[k],m=r.mods;let v=d.base+d.per*r.levels[k];
 if(k==='maxHp')v+=m.hp;else if(k==='speed')v*=1+m.spd;else if(k==='atkSpeed')v*=1+m.atk;else if(k==='critChance')v+=m.crit;else if(k==='critDmg')v+=m.cdm;else if(k==='dodgeCd')v*=1-m.dcd;
 return d.min!=null?Math.max(d.min,v):v}
export function upgrade(k){const r=G.run,d=STATS[k],l=r.levels[k],c=statCost(l);if(l>=d.max||r.points<c)return false;r.points-=c;r.spent+=c;r.levels[k]++;if(k==='maxHp')r.player.hp+=d.per;return true}
// refund=true: points spent come back (normal use). Forced final-boss reset will call resetStats(false). Refund rule awaits approval.
export function resetStats(refund=true){const r=G.run;if(r.resetUsed)return false;r.resetUsed=true;for(const k in r.levels)r.levels[k]=0;if(refund)r.points+=r.spent;r.spent=0;r.player.hp=Math.min(r.player.hp,statv('maxHp'));return true}
// ---------- cards ----------
export function giveCard(id){const r=G.run;if(r.cards.some(c=>c.id===id))return false;r.cards.push({id,used:false});return true}
export function useCard(i){const r=G.run,c=r&&r.cards[i];if(!c||c.used||r.over)return;const d=CARDS.find(x=>x.id===c.id),m=d.m,p=r.player;c.used=true;
 for(const k in m){if(k==='heal')p.hp=Math.min(statv('maxHp'),p.hp+m.heal);else if(k==='gold')r.gold+=m.gold;else r.mods[k]+=m[k]}
 if(m.hp)p.hp+=m.hp;beep(880,.12,'sine');toast(d.n+': '+d.d)}
// ---------- run / rooms ----------
export function newRun(seed=Date.now()){
 const r=G.run={seed:seed>>>0,region:0,rng:rng32(seed),kills:0,roomsCleared:0,gold:0,points:0,spent:0,resetUsed:false,cards:[],time:0,over:false,shake:0,levels:{},mods:{spd:0,atk:0,crit:0,dcd:0,cdm:0,hp:0},en:[],pb:[],eb:[],fx:[],pk:[],doors:[]};
 for(const k in STATS)r.levels[k]=0;
 r.player={x:W/2,y:H-60,hp:statv('maxHp'),aim:-Math.PI/2,atkT:0,dodgeT:0,dodgeCd:0,inv:0,mx:0,my:0,dd:[0,1]};
 enterRegion(0)}
export function enterRegion(i,id=0){const r=G.run;r.region=i;r.map=genRegion(r.seed,i);enterRoom(id)}
export function enterRoom(id){const r=G.run,rm=r.map.rooms[id],p=r.player;r.cur=id;r.room=rm;r.en=[];r.pb=[];r.eb=[];r.doors=[];r.clear=false;rm.pk=rm.pk||[];r.pk=rm.pk;p.x=W/2;p.y=H-WL-28;p.inv=1;p.dodgeT=0;
 if(!rm.spawned){rm.spawned=true;spawnRoom(rm)}beep(300,.1,'triangle')}
export function spawnEnemy(k,x,y,m=1){const d=ENEMIES[k],hp=d.hp*(1+.35*G.run.region)*m,e={k,d,x,y,hp,mhp:hp,r:d.r*(m>1?1.3:1),cd:1+Math.random(),fl:0,ph:0,wind:0,t0:0,pat:0,boss:k==='boss'};G.run.en.push(e);return e}
function spawnRoom(rm){const r=G.run,g=r.rng,ri=r.region,t=rm.type;
 const add=(k,n,m)=>{for(let i=0;i<n;i++)spawnEnemy(k,40+g()*(W-80),WL+30+g()*(H/2-WL-30),m)};
 if(t==='fight'){add('grunt',2+ri+(g()*2|0));add('shooter',1+(ri>>1)+(g()*2|0))}
 else if(t==='elite'){add('brute',1+(ri>1?1:0),1.5);add('shooter',2+ri)}
 else if(t==='miniboss')add('brute',1,3);
 else if(t==='boss')spawnEnemy('boss',W/2,90);
 else if(t==='treasure')rm.pk.push({x:W/2,y:H/2,k:'chest'});
 else if(t==='rest')rm.pk.push({x:W/2,y:H/2,k:'fountain'})}
function openDoors(){const r=G.run,n=r.room.next;r.doors=n.length?n.map((id,i)=>({x:W*(i+1)/(n.length+1),to:id,t:r.map.rooms[id].type})):[{x:W/2,to:-1,t:'exit'}]}
function clearRoom(){const r=G.run,rm=r.room;r.clear=true;if(!rm.cleared){rm.cleared=true;r.roomsCleared++;if(rm.type==='elite'||rm.type==='miniboss')rm.pk.push({x:W/2,y:H/2,k:'chest'})}openDoors()}
function openChest(){const r=G.run,left=CARDS.filter(c=>!r.cards.some(o=>o.id===c.id));
 if(left.length&&Math.random()<.6){const c=left[Math.random()*left.length|0];giveCard(c.id);toast('Card found: '+c.n)}else{const g=20+(Math.random()*30|0);r.gold+=g;toast('+'+g+' gold')}beep(660,.15,'triangle')}
export function endRun(title='You died',silent=false,note=''){const r=G.run;if(!r||r.over)return;r.over=true;G.paused=true;const b=S.best;b.runs++;b.kills=Math.max(b.kills,r.kills);b.rooms=Math.max(b.rooms,r.roomsCleared);b.region=Math.max(b.region,r.region);persist();if(!silent&&G.on.end)G.on.end(title,note)}
// ---------- combat ----------
const eb=(x,y,a,s,dmg)=>G.run.eb.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:4,dmg});
function burst(x,y,c,n){n=Math.round(n*S.cur.effects/100);for(let i=0;i<n;i++){const a=Math.random()*TAU,s=30+Math.random()*90;G.run.fx.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:.4+Math.random()*.3,c})}}
const dtxt=(x,y,t,c)=>{if(S.cur.effects>15)G.run.fx.push({x,y:y-10,vx:0,vy:-30,l:.6,c,tx:t})};
function hurt(d){const r=G.run,p=r.player;if(G.god||p.inv>0||r.over)return;p.hp-=d;p.inv=.7;r.shake=6;beep(90,.2,'sawtooth',.08);burst(p.x,p.y,'#f66',8);if(p.hp<=0){p.hp=0;endRun()}}
export function dodge(){const r=G.run;if(!r||r.over||G.paused)return;const p=r.player;if(p.dodgeCd>0||p.dodgeT>0)return;let dx=p.mx,dy=p.my;if(!dx&&!dy){dx=Math.cos(p.aim);dy=Math.sin(p.aim)}const l=Math.hypot(dx,dy);p.dd=[dx/l,dy/l];p.dodgeT=.22;p.inv=Math.max(p.inv,.3);p.dodgeCd=statv('dodgeCd');beep(200,.1,'sawtooth')}
function shoot(p){const r=G.run,c=Math.random()<statv('critChance'),dm=statv('damage')*(c?statv('critDmg'):1),ca=Math.cos(p.aim),sa=Math.sin(p.aim);
 r.pb.push({x:p.x+ca*10,y:p.y+sa*10,vx:ca*340,vy:sa*340,r:4,dmg:dm,crit:c,l:.9});p.atkT=1/statv('atkSpeed');beep(c?700:520,.04,'square',.02)}
function kill(e){const r=G.run;r.en.splice(r.en.indexOf(e),1);r.kills++;r.gold+=(2+(Math.random()*4|0))*(e.boss?10:1);burst(e.x,e.y,e.d.color,e.boss?40:10);beep(120,.12,'sawtooth');
 if(r.kills%STAT_RULES.killsPerPoint===0){r.points++;toast('+1 Stat Point')}
 if(e.boss){r.points+=STAT_RULES.bossPoints;r.eb=[];toast('Boss defeated: +'+STAT_RULES.bossPoints+' Stat Points')}}
function fire(e,sc){const r=G.run,p=r.player,ph=e.ph,sp=90+15*ph,dm=e.d.dmg*sc;
 if(e.pat%2){const n=14+4*ph,o=Math.random()*TAU;for(let i=0;i<n;i++)eb(e.x,e.y,o+i/n*TAU,sp,dm)}
 else{const n=3+2*ph,a=Math.atan2(p.y-e.y,p.x-e.x);for(let i=0;i<n;i++)eb(e.x,e.y,a+(i-(n-1)/2)*.22,sp+30,dm)}}
function bossAI(e,dt,sc){const f=e.hp/e.mhp,ph=f>.66?0:f>.33?1:2;if(ph!==e.ph){e.ph=ph;e.cd=1.2;e.wind=0;toast('Boss phase '+(ph+1))}
 e.t0+=dt;e.x=W/2+Math.sin(e.t0*(.5+.2*ph))*150;e.y=90+Math.sin(e.t0*.7)*18;
 if(e.wind>0){e.wind-=dt;if(e.wind<=0){fire(e,sc);e.cd=1.7-.3*ph}}else{e.cd-=dt;if(e.cd<=0){e.wind=.6;e.pat++}}}
// ---------- simulation (fixed 60 Hz step) ----------
function updatePlayer(dt){const r=G.run,p=r.player,K=G.keys,T=G.touch;
 let ix=G.mobile?T.mx:(K.d?1:0)-(K.a?1:0),iy=G.mobile?T.my:(K.s?1:0)-(K.w?1:0);const l=Math.hypot(ix,iy);if(l>1){ix/=l;iy/=l}p.mx=ix;p.my=iy;
 p.dodgeCd=Math.max(0,p.dodgeCd-dt);p.inv=Math.max(0,p.inv-dt);p.atkT=Math.max(0,p.atkT-dt);
 if(p.dodgeT>0){p.dodgeT-=dt;p.x+=p.dd[0]*300*dt;p.y+=p.dd[1]*300*dt}else{const s=statv('speed');p.x+=ix*s*dt;p.y+=iy*s*dt}
 p.x=Math.max(WL+7,Math.min(W-WL-7,p.x));p.y=Math.max(WL+8,Math.min(H-WL-8,p.y));
 let ta=p.aim;
 if(G.mobile){let b=null,bd=1e9;for(const e of r.en){const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<bd){bd=d;b=e}}if(b)ta=Math.atan2(b.y-p.y,b.x-p.x);else if(l>.1)ta=Math.atan2(iy,ix)}
 else ta=Math.atan2(G.mouse.y-p.y,G.mouse.x-p.x);
 p.aim+=Math.atan2(Math.sin(ta-p.aim),Math.cos(ta-p.aim))*Math.min(1,dt*10*S.cur.sens);
 if((G.mobile?T.att:G.mouse.down)&&p.atkT<=0&&p.dodgeT<=0)shoot(p)}
function updateEnemies(dt){const r=G.run,p=r.player,sc=1+.2*r.region;
 for(const e of r.en){e.fl=Math.max(0,e.fl-dt);const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1,a=e.d.ai;
  if(a==='chase'){e.x+=dx/d*e.d.spd*dt;e.y+=dy/d*e.d.spd*dt}
  else if(a==='shoot'){const w=d>140?1:d<90?-1:0;e.x+=dx/d*e.d.spd*w*dt;e.y+=dy/d*e.d.spd*w*dt;e.cd-=dt;if(e.cd<=0){e.cd=e.d.rate;eb(e.x,e.y,Math.atan2(dy,dx),e.d.bs,e.d.dmg*sc)}}
  else bossAI(e,dt,sc);
  e.x=Math.max(WL+e.r,Math.min(W-WL-e.r,e.x));e.y=Math.max(WL+e.r,Math.min(H-WL-e.r,e.y));
  if(d<e.r+7)hurt(e.d.dmg*sc)}
 for(let i=0;i<r.en.length;i++)for(let j=i+1;j<r.en.length;j++){const a=r.en[i],b=r.en[j];if(a.boss||b.boss)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,m=a.r+b.r;if(d<m){const o=(m-d)/2;a.x-=dx/d*o;a.y-=dy/d*o;b.x+=dx/d*o;b.y+=dy/d*o}}}
function updateBullets(dt){const r=G.run,p=r.player;
 for(let i=r.pb.length-1;i>=0;i--){const b=r.pb[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.l-=dt;let dead=b.l<=0||b.x<WL||b.x>W-WL||b.y<WL||b.y>H-WL;
  if(!dead)for(const e of r.en)if(Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r){e.hp-=b.dmg;e.fl=.08;dtxt(e.x,e.y,Math.round(b.dmg)+(b.crit?'!':''),b.crit?'#ff5':'#fff');beep(300,.04,'triangle',.03);dead=true;if(e.hp<=0)kill(e);break}
  if(dead)r.pb.splice(i,1)}
 for(let i=r.eb.length-1;i>=0;i--){const b=r.eb[i];b.x+=b.vx*dt;b.y+=b.vy*dt;let dead=b.x<0||b.x>W||b.y<0||b.y>H;
  if(!dead&&p.inv<=0&&Math.hypot(b.x-p.x,b.y-p.y)<b.r+5){hurt(b.dmg);dead=true}
  if(dead)r.eb.splice(i,1)}}
function updateRoom(){const r=G.run,p=r.player;
 if(!r.clear&&!r.en.length)clearRoom();
 for(let i=r.pk.length-1;i>=0;i--){const k=r.pk[i];if(Math.hypot(p.x-k.x,p.y-k.y)<18){r.pk.splice(i,1);if(k.k==='chest')openChest();else{p.hp=statv('maxHp');toast('Fully healed');beep(700,.15,'sine')}}}
 if(r.clear)for(const d of r.doors)if(Math.abs(p.x-d.x)<16&&p.y<WL+14){
  if(d.to>=0)enterRoom(d.to);
  else if(r.region<REGIONS.length-1){enterRegion(r.region+1);beep(500,.2)}
  else endRun('Region 4 cleared','Final boss arrives in Phase 4 (not built yet).');
  break}}
function step(dt){const r=G.run;if(!r||G.paused||r.over)return;r.time+=dt;r.shake=Math.max(0,r.shake-dt*30);
 updatePlayer(dt);updateEnemies(dt);updateBullets(dt);
 for(let i=r.fx.length-1;i>=0;i--){const f=r.fx[i];f.l-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;if(f.l<=0)r.fx.splice(i,1)}
 if(!r.over)updateRoom()}
// ---------- rendering ----------
function render(){const r=G.run,sc=cv.width/W;ctx.setTransform(sc,0,0,sc,0,0);ctx.fillStyle='#0a0812';ctx.fillRect(0,0,W,H);if(!r)return;
 const fx=S.cur.effects/100,bl=S.cur.bloom/100,rg=REGIONS[r.region],p=r.player;
 if(r.shake>0)ctx.translate((Math.random()-.5)*r.shake*fx,(Math.random()-.5)*r.shake*fx);
 for(let y=0;y<H;y+=24)for(let x=0;x<W;x+=24){ctx.fillStyle=((x+y)/24&1)?rg.a:rg.b;ctx.fillRect(x,y,24,24)}
 ctx.fillStyle=rg.wall;ctx.fillRect(0,0,W,WL);ctx.fillRect(0,H-WL,W,WL);ctx.fillRect(0,0,WL,H);ctx.fillRect(W-WL,0,WL,H);
 ctx.textAlign='center';ctx.font='10px monospace';
 for(const d of r.doors){ctx.fillStyle='#ffe27a';ctx.fillRect(d.x-16,4,32,WL-8);ctx.fillStyle='#000';ctx.fillText(d.t==='exit'?'NEXT':d.t.slice(0,5).toUpperCase(),d.x,WL/2+3)}
 const T=r.room.type;if(T==='shop'||T==='event'){ctx.fillStyle='#b8a9ff';ctx.fillText(T.toUpperCase()+' room: placeholder (Phase 2)',W/2,H/2)}
 const shd=(x,y,w)=>{const s=S.cur.shadows;if(!s)return;ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(x,y+10,w,w*.4,0,0,TAU);ctx.fill();if(s>1){ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(x,y+10,w*1.4,w*.55,0,0,TAU);ctx.fill()}};
 for(const k of r.pk){shd(k.x,k.y,9);if(k.k==='chest'){ctx.fillStyle='#e8b84a';ctx.fillRect(k.x-8,k.y-6,16,12)}else{ctx.fillStyle='#6fe0e0';ctx.beginPath();ctx.arc(k.x,k.y,8,0,TAU);ctx.fill()}}
 for(const e of r.en){shd(e.x,e.y,e.r);ctx.fillStyle=e.fl>0?'#fff':e.d.color;ctx.fillRect(e.x-e.r,e.y-e.r,e.r*2,e.r*2);ctx.fillStyle='#000';ctx.fillRect(e.x-e.r/2-1,e.y-3,3,3);ctx.fillRect(e.x+e.r/2-2,e.y-3,3,3);
  if(e.wind>0){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,e.r+(.6-e.wind)*50,0,TAU);ctx.stroke()}
  if(!e.boss&&e.hp<e.mhp){ctx.fillStyle='#300';ctx.fillRect(e.x-e.r,e.y-e.r-6,e.r*2,3);ctx.fillStyle='#e44';ctx.fillRect(e.x-e.r,e.y-e.r-6,e.r*2*e.hp/e.mhp,3)}}
 shd(p.x,p.y,8);if(!(p.inv>0&&((r.time*20)|0)%2)){ctx.fillStyle=p.dodgeT>0?'#8ff':'#cfc8ff';ctx.fillRect(p.x-6,p.y-4,12,14);ctx.fillStyle='#14102a';ctx.fillRect(p.x-6,p.y-10,12,8)}
 ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x+Math.cos(p.aim)*12,p.y+Math.sin(p.aim)*12);ctx.lineTo(p.x+Math.cos(p.aim)*18,p.y+Math.sin(p.aim)*18);ctx.stroke();
 const glow=c=>{ctx.shadowColor=c;ctx.shadowBlur=bl*12*sc};
 ctx.fillStyle='#8ff';glow('#8ff');for(const b of r.pb){ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill()}
 ctx.fillStyle='#ff4f86';ctx.strokeStyle='#fff';ctx.lineWidth=1;glow('#ff4f86');for(const b of r.eb){ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();ctx.stroke()}
 ctx.shadowBlur=0;
 for(const f of r.fx){ctx.globalAlpha=Math.min(1,f.l*2.5);ctx.fillStyle=f.c;if(f.tx)ctx.fillText(f.tx,f.x,f.y);else ctx.fillRect(f.x,f.y,3,3)}ctx.globalAlpha=1;
 const B=r.en.find(e=>e.boss);if(B){const x=120,w=400,y=H-16;ctx.fillStyle='#200';ctx.fillRect(x,y,w,8);ctx.fillStyle='#e33';ctx.fillRect(x,y,w*B.hp/B.mhp,8);ctx.fillStyle='#fff';ctx.fillRect(x+w/3,y,1,8);ctx.fillRect(x+w*2/3,y,1,8);ctx.fillText('BOSS - PHASE '+(B.ph+1),W/2,y-3)}}
// ---------- setup ----------
const fit=()=>{const s=Math.min(innerWidth/W,innerHeight/H);cv.style.width=W*s+'px';cv.style.height=H*s+'px'};
// "Anti-aliasing" = supersampling of the canvas (Off 1x, 2x, 4x -> 1x/2x/3x pixels). Anisotropic filtering is stored but has no effect until textured sprites exist.
export function applySettings(){G.mobile=S.cur.device==='mobile';const k={0:1,2:2,4:3}[S.cur.aa]||1;if(k!==lastK){lastK=k;cv.width=W*k;cv.height=H*k}cv.style.imageRendering=k>1?'auto':'pixelated';fit();if(G.on.apply)G.on.apply()}
const KM={KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d'};
export function initGame(canvas){cv=canvas;ctx=cv.getContext('2d');addEventListener('resize',fit);applySettings();
 addEventListener('keydown',e=>{const c=e.code,live=G.run&&!G.paused&&!G.run.over;
  if(KM[c]&&live){G.keys[KM[c]]=1;e.preventDefault()}
  else if(c==='Space'&&live){e.preventDefault();dodge()}
  else if(c==='KeyX'&&!e.repeat&&G.on.pause)G.on.pause();
  else if(c==='KeyC'&&!e.repeat&&G.on.statsKey)G.on.statsKey();
  else if(c==='Backquote'&&CFG.admin&&G.on.adminKey){e.preventDefault();G.on.adminKey()}
  else if(/^Digit[1-9]$/.test(c)&&live)useCard(+c[5]-1)});
 addEventListener('keyup',e=>{if(KM[e.code])G.keys[KM[e.code]]=0});
 addEventListener('blur',()=>{G.keys={};G.mouse.down=false;G.touch.att=false});
 const mp=e=>{const b=cv.getBoundingClientRect();G.mouse.x=(e.clientX-b.left)/b.width*W;G.mouse.y=(e.clientY-b.top)/b.height*H};
 addEventListener('mousemove',mp);cv.addEventListener('mousedown',e=>{if(e.button===0){mp(e);G.mouse.down=true}});addEventListener('mouseup',()=>G.mouse.down=false);cv.addEventListener('contextmenu',e=>e.preventDefault())}
export function startLoop(){let last=performance.now(),acc=0;const f=t=>{requestAnimationFrame(f);acc+=Math.max(0,Math.min(.1,(t-last)/1000));last=t;while(acc>=1/60){step(1/60);acc-=1/60}render();if(G.on.hud)G.on.hud()};requestAnimationFrame(f)}
