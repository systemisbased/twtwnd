import {CFG,PRESETS} from './data.js';
const DEF={device:null,preset:'High',sens:1,...PRESETS.High};
export const S={saved:null,cur:null,best:{runs:0,rooms:0,region:0,kills:0}};
export function load(){let j={};try{j=JSON.parse(localStorage.getItem(CFG.saveKey))||{}}catch(e){}
 S.saved={...DEF,...(j.settings||{})};S.best={...S.best,...(j.best||{})};S.cur={...S.saved}}
export function persist(){try{localStorage.setItem(CFG.saveKey,JSON.stringify({settings:S.saved,best:S.best}))}catch(e){}}
export const applyPreset=n=>Object.assign(S.cur,PRESETS[n],{preset:n});
export const dirty=()=>Object.keys(S.cur).some(k=>S.cur[k]!==S.saved[k]);
export const commit=()=>{S.saved={...S.cur};persist()};
export const revert=()=>{S.cur={...S.saved}};
