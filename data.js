// All balance numbers live here. Values marked PLACEHOLDER await Game Director approval.
export const CFG={admin:true,w:640,h:360,wall:24,saveKey:'twtwnd_v1'}; // set admin:false before public release
export const STAT_RULES={killsPerPoint:10,bossPoints:10};
export const STATS={
 maxHp:{n:'Max HP',base:100,per:10,max:20},
 speed:{n:'Movement Speed',base:110,per:5,max:20},
 damage:{n:'Attack Damage',base:10,per:1.5,max:20},
 atkSpeed:{n:'Attack Speed',base:3,per:.2,max:20},
 critChance:{n:'Crit Chance',base:.05,per:.01,max:20,pct:1},
 critDmg:{n:'Crit Damage',base:1.5,per:.1,max:20,pct:1},
 dodgeCd:{n:'Dodge Cooldown',base:1.4,per:-.04,max:20,min:.4,unit:'s'}};
export const statCost=lvl=>1+Math.floor(lvl/5); // PLACEHOLDER cost curve
// Card mods: spd/atk/crit/dcd/cdm/hp persist for the run once used; heal/gold are instant. None deal damage.
export const CARDS=[
 {id:'swift',n:'Swift Step',d:'+8% move speed',m:{spd:.08}},{id:'quick',n:'Quick Hands',d:'+8% attack speed',m:{atk:.08}},
 {id:'keen',n:'Keen Eye',d:'+5% crit chance',m:{crit:.05}},{id:'mend',n:'Mending Draught',d:'Heal 25 HP',m:{heal:25}},
 {id:'purse',n:'Fat Purse',d:'+40 gold',m:{gold:40}},{id:'vital',n:'Vital Charm',d:'+15 max HP',m:{hp:15}},
 {id:'light',n:'Light Feet',d:'-15% dodge cooldown',m:{dcd:.15}},{id:'cruel',n:'Cruel Edge',d:'+0.2 crit damage',m:{cdm:.2}},
 {id:'focus',n:'Focus',d:'+6% move and attack speed',m:{spd:.06,atk:.06}},{id:'bless',n:'Blessing',d:'+10 max HP, heal 15',m:{hp:10,heal:15}},
 {id:'wind',n:'Tailwind',d:'+12% move speed',m:{spd:.12}},{id:'coin',n:'Lucky Coin',d:'+25 gold, heal 10',m:{gold:25,heal:10}}];
export const ENEMIES={
 grunt:{hp:30,spd:55,r:9,dmg:10,color:'#c55',ai:'chase'},
 shooter:{hp:24,spd:35,r:9,dmg:8,color:'#cb5',ai:'shoot',rate:1.6,bs:110},
 brute:{hp:90,spd:45,r:12,dmg:18,color:'#a4c',ai:'chase'},
 boss:{hp:600,spd:0,r:16,dmg:15,color:'#f55',ai:'boss'}};
// PLACEHOLDER themes: not approved
export const REGIONS=[
 {name:'Region 1',a:'#2a2438',b:'#262033',wall:'#4a3f66'},{name:'Region 2',a:'#1f3030',b:'#1b2b2b',wall:'#3a6666'},
 {name:'Region 3',a:'#38262a',b:'#332226',wall:'#6b3f4a'},{name:'Region 4',a:'#2c2c2c',b:'#282828',wall:'#666'}];
export const PRESETS={
 'Very Low':{aa:0,af:1,effects:10,shadows:0,bloom:0},Low:{aa:0,af:2,effects:30,shadows:0,bloom:0},
 Medium:{aa:2,af:4,effects:55,shadows:1,bloom:0},High:{aa:2,af:8,effects:80,shadows:1,bloom:30},
 'Very High':{aa:4,af:16,effects:100,shadows:2,bloom:60},Ultra:{aa:4,af:16,effects:100,shadows:2,bloom:100}};
