export const rng32=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
// Layered branching graph. Every room has >=1 exit and >=1 entrance, so no dead ends or orphans.
export function genRegion(seed,ri){
 const g=rng32((seed^Math.imul(ri+1,2654435761))>>>0),rooms=[],layers=[],n=10+(g()*3|0);
 const mk=(layer,type)=>{const r={id:rooms.length,layer,type,next:[],cleared:false};rooms.push(r);return r};
 layers.push([mk(0,'fight')]);
 const sizes=[];for(let rem=n-2;rem>0;){const s=Math.min(rem,1+(g()*3|0));sizes.push(s);rem-=s}
 const T=[['fight',40],['elite',14],['treasure',12],['shop',10],['event',12],['rest',12]];
 const roll=()=>{let t=T.reduce((a,b)=>a+b[1],0)*g();for(const[w,v]of T)if((t-=v)<0)return w;return'fight'};
 sizes.forEach((s,i)=>{const L=[];for(let j=0;j<s;j++)L.push(mk(i+1,roll()));layers.push(L)});
 const mid=layers[layers.length>>1];mid[g()*mid.length|0].type='miniboss';
 const pre=layers[layers.length-1];pre[pre.length-1].type='rest';
 layers.push([mk(layers.length,'boss')]);
 for(let i=0;i<layers.length-1;i++){const A=layers[i],B=layers[i+1];
  A.forEach(a=>{const c=1+(g()<.4&&B.length>1?1:0),pool=[...B];for(let k=0;k<c&&pool.length;k++)a.next.push(pool.splice(g()*pool.length|0,1)[0].id)});
  B.forEach(b=>{if(!A.some(a=>a.next.includes(b.id)))A[g()*A.length|0].next.push(b.id)})}
 return{rooms,layers:layers.map(L=>L.map(r=>r.id))};}
