// Developer tools. Disable by setting CFG.admin=false in data.js.
import {STATS,CARDS,REGIONS,ENEMIES} from './data.js';
import {genRegion} from './world.js';
import {G,statv,enterRegion,enterRoom,spawnEnemy,giveCard,toast} from './game.js';
let tR,tM;const r=()=>G.run;
const fill=()=>{const q=r(),ri=+tR.value,m=ri===q.region?q.map:genRegion(q.seed,ri);tM.innerHTML=m.rooms.map(x=>`<option value="${x.id}">#${x.id+1} layer ${x.layer} - ${x.type}</option>`).join('')};
export function refreshAdmin(){tR.innerHTML=REGIONS.map((g,i)=>`<option value="${i}">${g.name}</option>`).join('');tR.value=r().region;fill();tM.value=r().cur}
export function initAdmin(go){
 const el=document.getElementById('adm');
 el.innerHTML=`<div class="grid">
 <button data-a="cards">Get ALL cards</button><button data-a="refill">Refill used cards (buffs stack)</button>
 <button data-a="max">Max level: all stats</button><button data-a="pts">+100 Stat Points</button>
 <button data-a="gold">+1000 Gold</button><button data-a="heal">Full heal</button>
 <button data-a="god">God mode: <b>OFF</b></button><button data-a="rst">Re-arm Stat Reset</button>
 <button data-a="kill">Kill all / clear room</button><button data-a="boss">Respawn boss here</button>
 <button data-a="tpb">Teleport to boss room</button>
 ${Object.keys(ENEMIES).filter(k=>k!=='boss').map(k=>`<button data-a="spawn" data-k="${k}">Spawn ${k}</button>`).join('')}</div>
 <div class="row"><select id="tR"></select><select id="tM"></select><button data-a="tp">Teleport</button></div>`;
 tR=el.querySelector('#tR');tM=el.querySelector('#tM');tR.onchange=fill;
 const reopen=()=>{const q=r();q.clear=false;q.doors=[]};
 const A={
  cards(){CARDS.forEach(c=>giveCard(c.id))},refill(){r().cards.forEach(c=>c.used=false)},
  max(){for(const k in STATS)r().levels[k]=STATS[k].max;r().player.hp=statv('maxHp')},
  pts(){r().points+=100},gold(){r().gold+=1000},heal(){r().player.hp=statv('maxHp')},
  god(b){G.god=!G.god;b.querySelector('b').textContent=G.god?'ON':'OFF'},rst(){r().resetUsed=false},
  kill(){r().en.length=0},boss(){reopen();spawnEnemy('boss',320,90)},
  spawn(b){reopen();spawnEnemy(b.dataset.k,320,100)},
  tpb(){enterRoom(r().map.rooms.length-1);go()},
  tp(){const ri=+tR.value;if(ri===r().region)enterRoom(+tM.value);else enterRegion(ri,+tM.value);go()}};
 el.onclick=e=>{const b=e.target.closest('button[data-a]');if(!b||!r())return;A[b.dataset.a](b);toast('Admin: '+b.textContent.trim())}}
