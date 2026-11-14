import {PRESETS,STATS,statCost,REGIONS,CARDS} from './data.js';
import {S,applyPreset,dirty,commit,revert,persist} from './settings.js';
import {G,newRun,upgrade,resetStats,useCard,dodge,applySettings,beep,statv,endRun} from './game.js';
import {initAdmin,refreshAdmin} from './admin.js';
const $=i=>document.getElementById(i);
let scr='platform',ret=null,cache={},confirmReset=false,tt=0;
const SYS=['platform','menu','death'];
const inRun=()=>G.run&&!G.run.over&&!SYS.includes(scr);
const live=()=>G.run&&!G.run.over&&scr===null;
const sync=()=>{document.body.classList.toggle('mob',G.mobile);$('hud').classList.toggle('hid',!inRun());$('touch').classList.toggle('hid',!(inRun()&&G.mobile))};
const hideAll=()=>document.querySelectorAll('.scr').forEach(s=>s.classList.add('hid'));
const open=i=>{hideAll();scr=i;$(i).classList.remove('hid');sync()};
const resume=()=>{hideAll();scr=null;G.paused=false;sync()};
const toMenu=()=>{G.paused=true;const b=S.best;$('best').textContent=`Runs ${b.runs} | Furthest region ${b.region+1} | Most rooms cleared ${b.rooms} | Most kills ${b.kills}`;open('menu')};
const sub=(i,r)=>{ret=r;G.paused=true;open(i)};
const back=()=>ret==='pause'?open('pause'):ret==='menu'?toMenu():resume();
const play=()=>{cache={};newRun();resume()};
const pauseKey=()=>{if(live())sub('pause',null);else if(scr==='pause')resume();else if(['settings','stats','admin'].includes(scr))back()};
const openStats=r=>{confirmReset=false;statsUI();sub('stats',r)};
const statsKey=()=>{if(live())openStats(null);else if(scr==='stats')back()};
const openAdmin=r=>{refreshAdmin();sub('admin',r)};
// ----- settings -----
const FIELDS=[['device','Device','sel',[['computer','Computer'],['mobile','Mobile']]],['preset','Preset','sel',Object.keys(PRESETS).map(k=>[k,k])],
 ['aa','Anti-aliasing','sel',[[0,'Off'],[2,'2x'],[4,'4x']]],['af','Anisotropic filtering','sel',[1,2,4,8,16].map(v=>[v,v+'x'])],
 ['effects','Effects','rng',[0,100,5]],['sens','Sensitivity','rng',[.3,2,.1]],['shadows','Shadows','sel',[[0,'Off'],[1,'Low'],[2,'High']]],['bloom','Bloom','rng',[0,100,5]]];
function buildSettings(){const f=$('fields');f.innerHTML='';
 for(const[k,label,type,o]of FIELDS){const row=document.createElement('label');row.className='row';const s=document.createElement('span');s.textContent=label;let c;
  if(type==='sel'){c=document.createElement('select');o.forEach(([v,t])=>c.add(new Option(t,v)))}else{c=document.createElement('input');c.type='range';[c.min,c.max,c.step]=o}
  c.id='f_'+k;c.oninput=()=>{const v=(k==='device'||k==='preset')?c.value:+c.value;if(k==='preset')applyPreset(v);else S.cur[k]=v;syncSettings();applySettings()};
  const out=document.createElement('em');out.id='o_'+k;row.append(s,c,out);f.append(row)}}
function syncSettings(){for(const[k,,type]of FIELDS){$('f_'+k).value=S.cur[k]??'';$('o_'+k).textContent=type==='rng'?(k==='sens'?S.cur[k].toFixed(1)+'x':S.cur[k]+'%'):''}$('saveBtn').disabled=!dirty()}
// ----- stats menu -----
const fmt=k=>{const d=STATS[k],v=statv(k);return d.pct?Math.round(v*100)+'%':d.unit?v.toFixed(2)+d.unit:Math.round(v*10)/10+''};
function statsUI(){const r=G.run,box=$('srows');$('sp').textContent='Stat Points: '+r.points;box.innerHTML='';
 for(const k in STATS){const d=STATS[k],l=r.levels[k],c=statCost(l),mx=l>=d.max,row=document.createElement('div');row.className='row st';
  row.innerHTML=`<span>${d.n}</span><span>${fmt(k)}</span><span>Lv ${l}/${d.max}</span>`;
  const b=document.createElement('button');b.textContent=mx?'MAX':'+ ('+c+')';b.disabled=mx||r.points<c;b.onclick=()=>{if(upgrade(k)){beep(660,.06);statsUI()}};row.append(b);box.append(row)}
 const b=$('sReset');b.disabled=r.resetUsed;b.textContent=r.resetUsed?'Stat Reset used':confirmReset?'Click again to confirm':'Stat Reset (once per run)'}
// ----- HUD -----
const sx=(k,v,f)=>{if(cache[k]!==v){cache[k]=v;f(v)}};
function hud(){const r=G.run;if(!r||r.over||$('hud').classList.contains('hid'))return;const p=r.player,mh=statv('maxHp');
 sx('hp',Math.round(p.hp/mh*100),v=>$('hp').style.width=v+'%');
 sx('hpt',Math.ceil(p.hp)+'/'+Math.round(mh),v=>$('hpt').textContent=v);
 sx('dg',Math.round(Math.max(0,Math.min(1,1-p.dodgeCd/statv('dodgeCd')))*100),v=>$('dg').style.width=v+'%');
 sx('sub','Gold '+r.gold+'   Stat Points '+r.points+(r.points?' [C]':''),v=>$('sub').textContent=v);
 sx('hr',REGIONS[r.region].name+' | Room '+(r.cur+1)+'/'+r.map.rooms.length+' | '+r.room.type+'\nKills '+r.kills,v=>$('hr').textContent=v);
 sx('bar',r.cards.map(c=>c.id+c.used).join(),()=>{const bar=$('bar');bar.innerHTML='';r.cards.forEach((c,i)=>{const d=CARDS.find(x=>x.id===c.id),b=document.createElement('button');b.textContent=(i<9?(i+1)+' ':'')+d.n;b.title=d.d;b.disabled=c.used;b.onclick=()=>useCard(i);bar.append(b)})})}
// ----- init -----
export function initUI(){
 buildSettings();syncSettings();
 document.querySelectorAll('.dev').forEach(b=>{if(S.saved.device===b.dataset.d)b.style.borderColor='#b8a9ff';b.onclick=()=>{S.saved.device=S.cur.device=b.dataset.d;persist();applySettings();syncSettings();beep(440,.08);toMenu()}});
 $('play').onclick=play;$('dNew').onclick=play;$('dMenu').onclick=toMenu;
 $('mSet').onclick=()=>{syncSettings();sub('settings','menu')};$('pSet').onclick=()=>{syncSettings();sub('settings','pause')};
 $('sBack').onclick=()=>{revert();applySettings();syncSettings();back()};$('saveBtn').onclick=()=>{commit();syncSettings();beep(660,.08)};
 $('pRes').onclick=resume;$('pSt').onclick=()=>openStats('pause');$('sBack2').onclick=back;$('pAdm').onclick=()=>openAdmin('pause');$('aClose').onclick=back;
 $('pAb').onclick=()=>{endRun('Abandoned',true);toMenu()};
 $('sReset').onclick=()=>{if(!confirmReset){confirmReset=true}else{resetStats();confirmReset=false;beep(300,.2,'sine')}statsUI()};
 initAdmin(resume);
 Object.assign(G.on,{pause:pauseKey,statsKey,adminKey:()=>{if(live())openAdmin(null);else if(scr==='admin')back()},apply:sync,hud,
  toast:m=>{const t=$('toast');t.textContent=m;clearTimeout(tt);tt=setTimeout(()=>t.textContent='',2200)},
  end:(t,note)=>{const r=G.run,d=$('dS');$('dT').textContent=t;d.style.whiteSpace='pre-line';d.textContent=(note?note+'\n':'')+`Region ${r.region+1} | ${r.roomsCleared} rooms cleared | ${r.kills} kills\nThis run is over.`;open('death')}});
 // mobile controls
 const st=$('stick'),kn=$('knob');let sid=null;
 const mv=e=>{const b=st.getBoundingClientRect(),h=b.width/2;let dx=(e.clientX-b.left-h)/h,dy=(e.clientY-b.top-h)/h;const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l}kn.style.transform=`translate(${dx*h*.7}px,${dy*h*.7}px)`;G.touch.mx=Math.max(-1,Math.min(1,dx*S.cur.sens));G.touch.my=Math.max(-1,Math.min(1,dy*S.cur.sens))};
 st.onpointerdown=e=>{sid=e.pointerId;st.setPointerCapture(sid);mv(e)};st.onpointermove=e=>{if(e.pointerId===sid)mv(e)};
 st.onpointerup=st.onpointercancel=()=>{sid=null;G.touch.mx=G.touch.my=0;kn.style.transform=''};
 const bA=$('bA');bA.onpointerdown=()=>G.touch.att=true;bA.onpointerup=bA.onpointercancel=bA.onpointerleave=()=>G.touch.att=false;
 $('bD').onpointerdown=dodge;$('bP').onclick=pauseKey;$('bS').onclick=statsKey;
 sync()}
