// SupGalaxy Wallet / Crypto Module
// Derived from SupSpace

const WALLET_KEY = 'sup_iw_v1';
const INTERNAL_WALLET_STORAGE_KEY = WALLET_KEY;
const WALLET_MIN_PASS = 12;
const WALLET_PBKDF2 = 600000;
const CHANGE_PREFIX = 'sup:testnet3:change:';
const DUST = 546;
const FEE_DEFAULT = 10;
const FEE_MIN = 2;
const P2FK_VER = 0x6f;
const P2FK_CHUNK = 20;
const P2FK_PAD = '#';
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const DELIMITERS = ['\\', '/', ':', '*', '?', '"', '<', '>', '|'];
const MEMPOOL_API = 'https://mempool.space/testnet/api';

window.S = window.S || {};
S.addr = '';
S.priv = null;
S.keyring = null;

function norm(s) {
    if (!s) return '';
    return s.normalize('NFKC').trim();
}

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showStatus(el, msg, kind) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'f-status ' + (kind ? kind : '');
    el.classList.remove('hidden');
}

// Ensure fetchJ is available locally if not globally
async function fetchJ(url, timeout=10000) {
  const c=new AbortController();
  const id=setTimeout(()=>c.abort(), timeout);
  try{
    const r=await fetch(url, {signal:c.signal});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }finally{clearTimeout(id);}
}

/* ═══════════════════════════════════════════════════
   SECP256k1 / CRYPTO
═══════════════════════════════════════════════════ */
function b2bi(b) { let v=0n; for(const x of b) v=(v<<8n)|BigInt(x); return v; }
function bi2b32(n) { const o=new Uint8Array(32); for(let i=31;i>=0;i--){o[i]=Number(n&0xffn);n>>=8n;} return o; }
function b2h(b) { return Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join(''); }
function h2b(h) { const o=new Uint8Array(h.length/2); for(let i=0;i<o.length;i++) o[i]=parseInt(h.slice(i*2,i*2+2),16); return o; }
async function sha256(b) { return new Uint8Array(await crypto.subtle.digest('SHA-256',b)); }
async function sha256hex(t) { return b2h(await sha256(new TextEncoder().encode(t))); }

function encVI(n) { if(n<0xfd) return new Uint8Array([n]); if(n<=0xffff) return new Uint8Array([0xfd,n&0xff,(n>>8)&0xff]); return new Uint8Array([0xfe,n&0xff,(n>>8)&0xff,(n>>16)&0xff,(n>>>24)&0xff]); }
async function msgHash(text) {
  const magic=new TextEncoder().encode('Bitcoin Signed Message:\n');
  const msg=new TextEncoder().encode(text);
  const ml=encVI(msg.length);
  const env=new Uint8Array(1+magic.length+ml.length+msg.length);
  env[0]=magic.length; env.set(magic,1); env.set(ml,1+magic.length); env.set(msg,1+magic.length+ml.length);
  return sha256(await sha256(env));
}

function encB58(b) {
  if(!(b instanceof Uint8Array)) b=new Uint8Array(b);
  let z=0; while(z<b.length&&b[z]===0) z++;
  let v=0n; for(const x of b) v=(v<<8n)+BigInt(x);
  let s=''; while(v>0n){const r=Number(v%58n);v/=58n;s=B58[r]+s;}
  return B58[0].repeat(z)+(s||(z?'':B58[0]));
}
async function encB58C(b) {
  const p=b instanceof Uint8Array?b:new Uint8Array(b);
  const h=await sha256(await sha256(p));
  const o=new Uint8Array(p.length+4); o.set(p); o.set(h.slice(0,4),p.length);
  return encB58(o);
}
function decB58(s) {
  let n=0n; for(const c of s){const i=B58.indexOf(c);if(i<0)throw new Error('Invalid B58');n=n*58n+BigInt(i);}
  let z=0; for(const c of s){if(c!==B58[0])break;z++;}
  const o=[]; while(n>0n){o.unshift(Number(n&0xffn));n>>=8n;}
  return new Uint8Array([...new Array(z).fill(0),...o]);
}
async function decB58C(s) {
  const r=decB58(s); if(r.length<5) throw new Error('B58C too short');
  const p=r.slice(0,-4),c=r.slice(-4);
  const h=await sha256(await sha256(p));
  for(let i=0;i<4;i++) if(c[i]!==h[i]) throw new Error('Invalid checksum');
  return p;
}

const P=0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
const N=0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
const Gx=0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n;
const Gy=0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n;
const sP=n=>((n%P)+P)%P;
const sN=n=>((n%N)+N)%N;
function sInv(a,m){let[r,s,rr,ss]=[m,0n,((a%m)+m)%m,1n];while(rr!==0n){const q=r/rr;[r,s,rr,ss]=[rr,ss,r-q*rr,s-q*ss];}return((s%m)+m)%m;}
function jDbl(X,Y,Z){if(Y===0n)return[0n,1n,0n];const Y2=sP(Y*Y),S=sP(4n*X*Y2),M=sP(3n*X*X),X2=sP(M*M-2n*S);return[X2,sP(M*(S-X2)-8n*Y2*Y2),sP(2n*Y*Z)];}
function jAdd(X1,Y1,Z1,X2,Y2,Z2){if(Z1===0n)return[X2,Y2,Z2];if(Z2===0n)return[X1,Y1,Z1];const z1s=sP(Z1*Z1),z2s=sP(Z2*Z2),U1=sP(X1*z2s),U2=sP(X2*z1s),S1=sP(Y1*z2s*Z2),S2=sP(Y2*z1s*Z1),H=sP(U2-U1),R=sP(S2-S1);if(H===0n)return R===0n?jDbl(X1,Y1,Z1):[0n,1n,0n];const Hs=sP(H*H),Hc=sP(H*Hs),X3=sP(R*R-Hc-2n*U1*Hs);return[X3,sP(R*(U1*Hs-X3)-S1*Hc),sP(H*Z1*Z2)];}
function jAff(X,Y,Z){const zi=sInv(Z,P),zi2=sP(zi*zi);return[sP(X*zi2),sP(Y*sP(zi2*zi))];}
function sMul(k){let[rx,ry,rz]=[0n,1n,0n],[ax,ay,az]=[Gx,Gy,1n],sc=((k%N)+N)%N;while(sc>0n){if(sc&1n)[rx,ry,rz]=jAdd(rx,ry,rz,ax,ay,az);[ax,ay,az]=jDbl(ax,ay,az);sc>>=1n;}return[rx,ry,rz];}
function priv2pub(pb){const[jx,jy,jz]=sMul(b2bi(pb));const[x,y]=jAff(jx,jy,jz);return new Uint8Array([(y&1n)?0x03:0x02,...bi2b32(x)]);}
function priv2pt(pb){const[jx,jy,jz]=sMul(b2bi(pb));const[x,y]=jAff(jx,jy,jz);return{x,y};}

async function rfc6979k(priv,mh) {
  const hmac=async(key,...parts)=>{const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);const sz=parts.reduce((s,p)=>s+p.length,0),m=new Uint8Array(sz);let o=0;for(const p of parts){m.set(p,o);o+=p.length;}return new Uint8Array(await crypto.subtle.sign('HMAC',k,m));};
  let V=new Uint8Array(32).fill(1),K=new Uint8Array(32).fill(0);
  K=await hmac(K,V,new Uint8Array([0]),priv,mh); V=await hmac(K,V);
  K=await hmac(K,V,new Uint8Array([1]),priv,mh); V=await hmac(K,V);
  for(;;){V=await hmac(K,V);const k=b2bi(V);if(k>=1n&&k<N)return k;K=await hmac(K,V,new Uint8Array([0]));V=await hmac(K,V);}
}
async function ecSign(priv,mhb){const d=b2bi(priv),z=b2bi(mhb),k=await rfc6979k(priv,mhb);const[rx,ry]=jAff(...sMul(k));const r=sN(rx);let s=sN(sInv(k,N)*(z+r*d));let rid=Number(ry&1n)|(rx>=N?2:0);if(s>N/2n){s=N-s;rid^=1;}return{r,s,recoveryId:rid};}
function derEnc(r,s){const mb=n=>{const b=[];let t=n;while(t>0n){b.unshift(Number(t&0xffn));t>>=8n;}if(b[0]&0x80)b.unshift(0);return b;};const rb=mb(r),sb=mb(s);return new Uint8Array([0x30,rb.length+sb.length+4,0x02,rb.length,...rb,0x02,sb.length,...sb]);}

function ripemd160(data) {
  const bytes=data instanceof Uint8Array?data:new TextEncoder().encode(data);
  const rl32=(x,n)=>(x<<n)|(x>>>(32-n));
  const ff=(j,x,y,z)=>j<16?x^y^z:j<32?(x&y)|(~x&z):j<48?(x|~y)^z:j<64?(x&z)|(y&~z):x^(y|~z);
  const KL=[0,0x5A827999,0x6ED9EBA1,0x8F1BBCDC,0xA953FD4E];
  const KR=[0x50A28BE6,0x5C4DD124,0x6D703EF3,0x7A6D76E9,0];
  const RL=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,7,4,13,1,10,6,15,3,12,0,9,5,2,14,11,8,3,10,14,4,9,15,8,1,2,7,0,6,13,11,5,12,1,9,11,10,0,8,12,4,13,3,7,15,14,5,6,2,4,0,5,9,7,12,2,10,14,1,3,8,11,6,15,13];
  const RR=[5,14,7,0,9,2,11,4,13,6,15,8,1,10,3,12,6,11,3,7,0,13,5,10,14,15,8,12,4,9,1,2,15,5,1,3,7,14,6,9,11,8,12,2,10,0,4,13,8,6,4,1,3,11,15,0,5,12,2,13,9,7,10,14,12,15,10,4,1,5,8,7,6,2,13,14,0,3,9,11];
  const SL=[11,14,15,12,5,8,7,9,11,13,14,15,6,7,9,8,7,6,8,13,11,9,7,15,7,12,15,9,11,7,13,12,11,13,6,7,14,9,13,15,14,8,13,6,5,12,7,5,11,12,14,15,14,15,9,8,9,14,5,6,8,6,5,12,9,15,5,11,6,8,13,12,5,12,13,14,11,8,5,6];
  const SR=[8,9,9,11,13,15,15,5,7,7,8,11,14,14,12,6,9,13,15,7,12,8,9,11,7,7,12,7,6,15,13,11,9,7,15,11,8,6,6,14,12,13,5,14,13,13,7,5,15,5,8,11,14,14,6,14,6,9,12,9,12,5,15,8,8,5,12,9,12,5,14,6,8,13,6,5,15,13,11,11];
  const ml=bytes.length,pl=ml%64<56?56-(ml%64):120-(ml%64);
  const pd=new Uint8Array(ml+pl+8); pd.set(bytes); pd[ml]=0x80;
  const bl=ml*8; for(let i=0;i<4;i++) pd[ml+pl+i]=(bl>>>(i*8))&0xff;
  const view=new DataView(pd.buffer);
  let h0=0x67452301,h1=0xEFCDAB89,h2=0x98BADCFE,h3=0x10325476,h4=0xC3D2E1F0;
  for(let off=0;off<pd.length;off+=64){
    const X=Array.from({length:16},(_,i)=>view.getUint32(off+i*4,true));
    let al=h0,bl_=h1,cl=h2,dl=h3,el=h4,ar=h0,br=h1,cr=h2,dr=h3,er=h4;
    for(let j=0;j<80;j++){
      const qi=j>>4;
      let t=(rl32((al+ff(j,bl_,cl,dl)+X[RL[j]]+KL[qi])|0,SL[j])+el)|0;
      al=el;el=dl;dl=rl32(cl,10);cl=bl_;bl_=t;
      t=(rl32((ar+ff(79-j,br,cr,dr)+X[RR[j]]+KR[qi])|0,SR[j])+er)|0;
      ar=er;er=dr;dr=rl32(cr,10);cr=br;br=t;
    }
    const t=(h1+cl+dr)|0;
    h1=(h2+dl+er)|0;h2=(h3+el+ar)|0;h3=(h4+al+br)|0;h4=(h0+bl_+cr)|0;h0=t;
  }
  const out=new Uint8Array(20),dv=new DataView(out.buffer);
  [h0,h1,h2,h3,h4].forEach((v,i)=>dv.setUint32(i*4,v,true));
  return out;
}

async function wif2priv(wif) {
  const p=await decB58C(norm(wif));
  if(p[0]!==0xef) throw new Error('Only testnet3 WIF supported');
  if(p.length===34) return p.slice(1,33);
  if(p.length===33) return p.slice(1);
  throw new Error('Unexpected WIF length');
}
async function priv2wif(pb) {
  const w=new Uint8Array(34); w[0]=0xef; w.set(pb,1); w[33]=0x01;
  return encB58C(w);
}
async function priv2addr(pb) {
  const pub=priv2pub(pb),h=ripemd160(await sha256(pub));
  return encB58C(new Uint8Array([P2FK_VER,...h]));
}
async function decryptPriv(stored,pass) {
  const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
  const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:new Uint8Array(stored.salt),iterations:WALLET_PBKDF2,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
  return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(stored.iv)},k,new Uint8Array(stored.data)));
}
async function encryptPriv(pb,pass) {
  const salt=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12));
  const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
  const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:WALLET_PBKDF2,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt']);
  const enc=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,pb);
  return{salt:Array.from(salt),iv:Array.from(iv),data:Array.from(new Uint8Array(enc))};
}
async function deriveChangeKey(base,label) {
  const seedPfx=new TextEncoder().encode(`${CHANGE_PREFIX}${norm(label)}:`);
  const bsc=b2bi(base);
  const ctr=new Uint8Array(4);
  for(let c=0;c<=0xffffffff;c++){
    ctr[0]=(c>>>24)&0xff;ctr[1]=(c>>>16)&0xff;ctr[2]=(c>>>8)&0xff;ctr[3]=c&0xff;
    const seed=new Uint8Array(seedPfx.length+base.length+4);
    seed.set(seedPfx);seed.set(base,seedPfx.length);seed.set(ctr,seedPfx.length+base.length);
    const tw=sN(b2bi(await sha256(seed)));
    if(tw===0n) continue;
    const d=sN(bsc+tw);
    if(d===0n) continue;
    return bi2b32(d);
  }
  throw new Error('Could not derive change key');
}
function buildP2PKH(h160){return new Uint8Array([0x76,0xa9,0x14,...h160,0x88,0xac]);}
async function addrPayout(addr) {
  const p=await decB58C(norm(addr));
  if(p.length!==21||p[0]!==0x6f) throw new Error(`Not a testnet3 legacy address: ${addr}`);
  return buildP2PKH(p.slice(1));
}
async function buildSignerEntry(pb,lbl){const pub=priv2pub(pb),h=ripemd160(await sha256(pub)),a=await encB58C(new Uint8Array([P2FK_VER,...h]));return{label:lbl,pb,pub,script:buildP2PKH(h),addr:a};}
async function buildKeyring(base){
  const main=await buildSignerEntry(base,'main');
  const changes=[];
  for(let i=0;i<200;i++){
    const d=await deriveChangeKey(base,`slot-${i+1}`);
    const entry=await buildSignerEntry(d,`change-${i+1}`);
    const bal=await getBalance(entry.addr).catch(()=>({confirmed:0,unconfirmed:0,tx_count:0,utxo_count:0}));
    entry.utxoCount=bal.utxo_count;
    changes.push(entry);
    if(i>=1 && bal.tx_count===0) break;
  }
  return{main,changes,all:[main,...changes]};
}

function serializeTx(inputs,outputs,sigIdx=-1,sigScript=null){
  const u32=v=>[v&0xff,(v>>8)&0xff,(v>>16)&0xff,(v>>>24)&0xff];
  const u64=v=>{const n=BigInt(Math.round(v));return[...u32(Number(n&0xffffffffn)),...u32(Number((n>>32n)&0xffffffffn))];};
  const vi=n=>n<0xfd?[n]:n<=0xffff?[0xfd,n&0xff,(n>>8)&0xff]:[0xfe,n&0xff,(n>>8)&0xff,(n>>16)&0xff,(n>>>24)&0xff];
  const out=[...u32(1),...vi(inputs.length)];
  for(let i=0;i<inputs.length;i++){
    out.push(...Array.from(h2b(inputs[i].txid)).reverse(),...u32(inputs[i].vout));
    const sc=sigIdx>=0?(i===sigIdx?sigScript:new Uint8Array([])):inputs[i].scriptSig||new Uint8Array([]);
    out.push(...vi(sc.length),...sc,...u32(0xffffffff));
  }
  out.push(...vi(outputs.length));
  for(const o of outputs) out.push(...u64(o.sat),...vi(o.script.length),...o.script);
  out.push(...u32(0));
  return new Uint8Array(out);
}
async function buildTx(utxos,outputs){
  const inputs=utxos.map(u=>({txid:u.txid,vout:u.vout,signer:u.signer,scriptSig:new Uint8Array([])}));
  const finalOuts=await Promise.all(outputs.map(async o=>({sat:o.sat,script:await addrPayout(o.addr)})));
  for(let i=0;i<inputs.length;i++){
    const sg=inputs[i].signer;
    const pre=new Uint8Array([...serializeTx(inputs,finalOuts,i,sg.script),1,0,0,0]);
    const sh=await sha256(await sha256(pre));
    const{r,s}=await ecSign(sg.pb,sh);
    const der=derEnc(r,s);
    inputs[i].scriptSig=new Uint8Array([der.length+1,...der,0x01,sg.pub.length,...sg.pub]);
  }
  return b2h(serializeTx(inputs,finalOuts));
}
async function broadcastTx(outputs) {
  if(!S.priv) throw new Error('Wallet is locked');
  const kr=S.keyring||await buildKeyring(S.priv);
  if(!S.keyring) S.keyring=kr;

  let feeRate=FEE_DEFAULT;
  try{const fr=await fetch(`${MEMPOOL_API}/v1/fees/recommended`);const fp=await fr.json();feeRate=Math.max(Number(fp?.halfHourFee||FEE_DEFAULT),FEE_MIN);}catch{}
  const estFee=(ic,oc)=>Math.ceil((10+148*ic+34*oc)*feeRate);
  const outSats=outputs.map(o=>({addr:o.addr,sat:Math.round(o.amount*1e8)}));
  const totalOut=outSats.reduce((s,o)=>s+o.sat,0);

  // 1. Fetch balances to find candidate addresses
  const totByAddr=new Map();
  const utxoCountByAddr=new Map();
  const balancePromises = kr.all.map(async sg => {
    const bal = await getBalance(sg.addr).catch(() => ({confirmed: 0, unconfirmed: 0, utxo_count: 0}));
    totByAddr.set(sg.addr, bal.confirmed);
    utxoCountByAddr.set(sg.addr, bal.utxo_count);
    sg.utxoCount = bal.utxo_count;
  });
  await Promise.all(balancePromises);

  // Select the address with the most funds as the primary candidate
  const candidates=[kr.main, ...kr.changes].sort((a,b)=>(totByAddr.get(b.addr)||0)-(totByAddr.get(a.addr)||0));

  let selSourceLabel='single-source',sel=null,selUtxos=[],selTotal=0;

  const fetchedUtxos = new Map();

  // Helper to fetch utxos for a specific signer
  const fetchUtxosForSigner = async (sg) => {
    if (fetchedUtxos.has(sg.addr)) return fetchedUtxos.get(sg.addr);
    const r=await fetch(`${MEMPOOL_API}/address/${encodeURIComponent(sg.addr)}/utxo`);
    if(!r.ok) throw new Error(`UTXO fetch failed for ${sg.label}`);
    const j=await r.json();
    const utxos = j.filter(u=>u.status?.confirmed).map(u=>({...u,srcAddr:sg.addr,signer:sg}));
    fetchedUtxos.set(sg.addr, utxos);
    return utxos;
  };

  // 2. Try to satisfy the transaction with a single address
  for(const src of candidates){
    if ((totByAddr.get(src.addr) || 0) < totalOut + estFee(1, outSats.length + 1)) continue; // Not enough balance even theoretically

    let pool = [];
    try {
      pool = await fetchUtxosForSigner(src);
    } catch(e) {
      continue; // Skip if utxo fetch fails
    }
    pool.sort((a,b)=>b.value-a.value);

    let lo=[],lt=0;
    for(const u of pool){
      lo.push(u);
      lt+=u.value;
      if(lt>=totalOut+estFee(lo.length,outSats.length+1)){
        sel=src;
        selUtxos=lo;
        selTotal=lt;
        break;
      }
    }
    if (selUtxos.length) break;
  }

  // 3. fallback: combine UTXOs across all wallet addresses (main + both changes)
  if(!selUtxos.length){
    let allUtxos = [];
    for (const sg of kr.all) {
      if ((totByAddr.get(sg.addr) || 0) > 0) {
         try {
           const pool = await fetchUtxosForSigner(sg);
           allUtxos.push(...pool);
         } catch(e) {}
      }
    }
    if(!allUtxos.length) throw new Error('No confirmed UTXOs found');

    const mixPool=allUtxos.sort((a,b)=>b.value-a.value);
    let lo=[],lt=0;
    for(const u of mixPool){
      lo.push(u);
      lt+=u.value;
      if(lt>=totalOut+estFee(lo.length,outSats.length+1)){
        selUtxos=lo;
        selTotal=lt;
        selSourceLabel='mixed-sources';
        break;
      }
    }
  }
  if(!selUtxos.length) throw new Error('Insufficient funds across main + change addresses (including fee estimation)');
  const fee=estFee(selUtxos.length,outSats.length+1);
  const change=selTotal-totalOut-fee;
  if(change<0) throw new Error('Insufficient balance after fee');

  // Pick a change address: alternate among valid change addresses based on input used
  let validChanges = kr.changes.filter(c => utxoCountByAddr.get(c.addr) < 420);

  if (validChanges.length === 0) {
    const nextIdx = kr.changes.length;
    if (nextIdx < 200) {
      const d = await deriveChangeKey(kr.main.pb, `slot-${nextIdx+1}`);
      const newChange = await buildSignerEntry(d, `change-${nextIdx+1}`);
      newChange.utxoCount = 0;
      kr.changes.push(newChange);
      kr.all.push(newChange);
      validChanges.push(newChange);
    } else {
      throw new Error('All 200 change addresses have >= 420 UTXOs. Cannot create more change outputs.');
    }
  }

  let changeAddr = validChanges[0].addr;
  if (validChanges.length > 1) {
    const lastIdx = validChanges.findIndex(c => c.addr === S.lastChangeOutputAddr);
    if (lastIdx >= 0) {
      changeAddr = validChanges[(lastIdx + 1) % validChanges.length].addr;
    } else if (sel) {
      const selIdx = validChanges.findIndex(c => c.addr === sel.addr);
      if (selIdx >= 0) {
        changeAddr = validChanges[(selIdx + 1) % validChanges.length].addr;
      }
    }
  }
  S.lastChangeOutputAddr = changeAddr;
  const finalOuts=[...outSats];
  if(change>=DUST) finalOuts.push({addr:changeAddr,sat:change});
  const rawHex=await buildTx(selUtxos,finalOuts);
  const res=await fetch(`${MEMPOOL_API}/tx`,{method:'POST',headers:{'Content-Type':'text/plain'},body:rawHex});
  if(!res.ok) throw new Error(`Broadcast failed: ${await res.text()}`);
  return (await res.text()).trim();
}
async function consolidateForMessagingFunds() {
  if(!S.priv) throw new Error('Unlock wallet first');
  const kr=S.keyring||await buildKeyring(S.priv);
  if(!S.keyring) S.keyring=kr;

  const allUtxos = [];
  const validChanges = [];

  await Promise.all(kr.all.map(async sg => {
    const bal = await getBalance(sg.addr).catch(() => ({confirmed: 0, unconfirmed: 0, utxo_count: 0}));
    if (kr.changes.includes(sg)) {
      sg.utxoCount = bal.utxo_count;
      if (sg.utxoCount < 420) {
        validChanges.push(sg);
      }
    }
    if (bal.confirmed <= 0) return;
    try {
      const r=await fetch(`${MEMPOOL_API}/address/${encodeURIComponent(sg.addr)}/utxo`);
      if(!r.ok) throw new Error(`UTXO fetch failed for ${sg.label}`);
      const j=await r.json();
      const utxos = j.filter(u=>u.status?.confirmed).map(u=>({...u,srcAddr:sg.addr,signer:sg}));
      allUtxos.push(...utxos);
    } catch(e) {}
  }));

  if(!allUtxos.length) throw new Error('No confirmed funds to consolidate');

  if (validChanges.length === 0) {
     const nextIdx = kr.changes.length;
     if (nextIdx < 200) {
        const d = await deriveChangeKey(kr.main.pb, `slot-${nextIdx+1}`);
        const newChange = await buildSignerEntry(d, `change-${nextIdx+1}`);
        newChange.utxoCount = 0;
        kr.changes.push(newChange);
        kr.all.push(newChange);
        validChanges.push(newChange);
     } else {
        throw new Error('No valid change addresses to consolidate to');
     }
  }

  validChanges.sort((a,b) => a.utxoCount - b.utxoCount);
  const targetChange = validChanges[0];

  let feeRate=FEE_DEFAULT;
  try{const fr=await fetch(`${MEMPOOL_API}/v1/fees/recommended`);const fp=await fr.json();feeRate=Math.max(Number(fp?.halfHourFee||FEE_DEFAULT),FEE_MIN);}catch{}
  const fee=Math.ceil((10+148*allUtxos.length+34)*feeRate);
  const total=allUtxos.reduce((s,u)=>s+Number(u.value||0),0);
  const send=total-fee;
  if(send<DUST) throw new Error(`Consolidation output too small after fee (${send} sat)`);

  const rawHex=await buildTx(allUtxos,[{addr:targetChange.addr,sat:send}]);
  const res=await fetch(`${MEMPOOL_API}/tx`,{method:'POST',headers:{'Content-Type':'text/plain'},body:rawHex});
  if(!res.ok) throw new Error(`Consolidation broadcast failed: ${await res.text()}`);
  return(await res.text()).trim();
}

window.consolidateForMessaging=async function(){
  walletMsg('Consolidating for messaging…','info');
  try{
    const txid=await consolidateForMessagingFunds();
    walletMsg(`Consolidated to change address. txid: ${txid}`,'good');
    refreshBalance();
  }catch(e){walletMsg(e.message||'Consolidation failed','danger');}
};

async function consolidateChangeFunds(){
  if(!S.priv) throw new Error('Unlock wallet first');
  const kr=S.keyring||await buildKeyring(S.priv);
  if(!S.keyring) S.keyring=kr;
  const changeSigners=(kr.changes||[]).filter(Boolean);
  if(!changeSigners.length) throw new Error('Change keyring unavailable');
  const utxoGroups=await Promise.all(changeSigners.map(async sg=>{
    const bal = await getBalance(sg.addr).catch(() => ({confirmed: 0, unconfirmed: 0}));
    if (bal.confirmed <= 0) return [];
    try {
      const r=await fetch(`${MEMPOOL_API}/address/${encodeURIComponent(sg.addr)}/utxo`);
      if(!r.ok) throw new Error(`UTXO fetch failed for ${sg.label}`);
      const j=await r.json();
      return j.filter(u=>u.status?.confirmed).map(u=>({...u,srcAddr:sg.addr,signer:sg}));
    } catch(e) {
      return [];
    }
  }));
  const utxos=utxoGroups.flat();
  if(!utxos.length) throw new Error('No confirmed change funds to consolidate');
  let feeRate=FEE_DEFAULT;
  try{const fr=await fetch(`${MEMPOOL_API}/v1/fees/recommended`);const fp=await fr.json();feeRate=Math.max(Number(fp?.halfHourFee||FEE_DEFAULT),FEE_MIN);}catch{}
  const fee=Math.ceil((10+148*utxos.length+34)*feeRate);
  const total=utxos.reduce((s,u)=>s+Number(u.value||0),0);
  const send=total-fee;
  if(send<DUST) throw new Error(`Consolidation output too small after fee (${send} sat)`);
  const rawHex=await buildTx(utxos,[{addr:kr.main.addr,sat:send}]);
  const res=await fetch(`${MEMPOOL_API}/tx`,{method:'POST',headers:{'Content-Type':'text/plain'},body:rawHex});
  if(!res.ok) throw new Error(`Consolidation broadcast failed: ${await res.text()}`);
  return(await res.text()).trim();
}

function randDelim(){const b=new Uint8Array(1),lim=Math.floor(256/DELIMITERS.length)*DELIMITERS.length;let v=0;do{crypto.getRandomValues(b);v=b[0];}while(v>=lim);return DELIMITERS[v%DELIMITERS.length];}
function randSalt(){const b=new Uint32Array(1);crypto.getRandomValues(b);return-(b[0]%100000);}

async function signMsg(text){
  if(!S.priv) throw new Error('Wallet locked');
  const mh=await msgHash(text);
  const{r,s,recoveryId}=await ecSign(S.priv,mh);
  const c=new Uint8Array(65);c[0]=27+4+recoveryId;c.set(bi2b32(r),1);c.set(bi2b32(s),33);
  return btoa(String.fromCharCode.apply(null,c));
}

async function deriveKeywordAddress(keyword){
  const tok=norm(keyword).replace(/^#/,'');
  const b=new TextEncoder().encode(tok);
  const p=new Uint8Array(21);
  p[0]=P2FK_VER;
  p.fill(P2FK_PAD.charCodeAt(0),1);
  if(b.length) p.set(b.slice(0,P2FK_CHUNK),1);
  return encB58C(p);
}

async function kwAddr(keyword){
  const tok=norm(keyword).replace(/^#/,'');
  if(!tok) return '';
  if(S.kwCache.has(tok)) return S.kwCache.get(tok);
  const local=await deriveKeywordAddress(tok);
  S.kwCache.set(tok,local);
  return local;
}

async function encP2FK(payload,ver=P2FK_VER){
  const b=new TextEncoder().encode(payload);
  const addrs=[],seen=new Set();
  for(let i=0;i<b.length;i+=P2FK_CHUNK){
    const chunk=b.slice(i,i+P2FK_CHUNK);
    const padded=new Uint8Array(P2FK_CHUNK);
    padded.fill(P2FK_PAD.charCodeAt(0));
    padded.set(chunk);
    const ab=new Uint8Array(1+P2FK_CHUNK);ab[0]=ver;ab.set(padded,1);
    const enc=await encB58C(ab);
    if(!seen.has(enc)){seen.add(enc);addrs.push(enc);}
  }
  return addrs;
}



async function getBalance(addr){
  const r=await fetch(`${MEMPOOL_API}/address/${encodeURIComponent(addr)}`);
  if(!r.ok) throw new Error(`Balance lookup failed ${r.status}`);
  const p=await r.json();
  const cs=p?.chain_stats||{},ms=p?.mempool_stats||{};

  const confirmedAvailable = (Number(cs.funded_txo_sum||0)-Number(cs.spent_txo_sum||0)) - Number(ms.spent_txo_sum||0);
  const unconfirmedIncoming = Number(ms.funded_txo_sum||0);

  const tx_count = Number(cs.tx_count||0) + Number(ms.tx_count||0);
  const utxo_count = (Number(cs.funded_txo_count||0) - Number(cs.spent_txo_count||0)) + (Number(ms.funded_txo_count||0) - Number(ms.spent_txo_count||0));

  return{confirmed:confirmedAvailable,unconfirmed:unconfirmedIncoming, tx_count, utxo_count};
}



async function buildP2fkRecipientsAndCost(recipients, data, feerate) {
    if (!S.priv) throw new Error("Wallet locked");

    // Use encP2FK to encode the payload into addresses
    const dataAddrs = await encP2FK(data);

    // Combine regular recipients with data addresses
    const allRecipients = [...recipients, ...dataAddrs];

    const outputs = [];
    for (const r of allRecipients) {
        // broadcastTx expects `amount` in Bitcoin (e.g. 0.00000546 for 546 sats)
        outputs.push({ addr: r, amount: DUST / 1e8 });
    }

    // Estimation for UI display
    const cost = outputs.length * DUST + (feerate || FEE_DEFAULT) * 250;
    return { outputs, cost };
}

async function sendManyWithWallet(outputs) {
    if (!S.priv) throw new Error("Wallet locked");
    // Broadcast using the existing tx logic
    const txid = await broadcastTx(outputs);
    return txid;
}

async function signWithWallet(text) {
    if (!S.priv) throw new Error("Wallet locked");
    return await signMsg(text);
}

window.buildP2fkRecipientsAndCost = buildP2fkRecipientsAndCost;
window.sendManyWithWallet = sendManyWithWallet;
window.signWithWallet = signWithWallet;

function renderWalletUI(container, balance=null){
  const locked=!S.priv;
  let html='';
  if(!locked){
    html+=`<div class="wallet-address-card">
      <div class="wallet-addr-title">Wallet addresses (main + change)</div>
      <div class="wallet-addr-val mono">${esc(S.addr)}</div>
      <div class="wallet-balances" id="walletBalances">
        <span style="color:var(--muted);font-size:.82rem;">Loading balances…</span>
      </div>
    </div>
    <div class="f-status info" id="walletStatusMsg" style="margin-bottom:12px;">Wallet unlocked ✓ (main + ${S.keyring?.changes?.length || 0} change addresses)</div>
    <div class="btn-row" style="margin-bottom:16px;">
      <button class="btn btn-out btn-sm" onclick="exportWif()">Export WIF</button>
      <button class="btn btn-pri btn-sm" onclick="consolidateChange()">Consolidate</button>
      <button class="btn btn-pri btn-sm" onclick="consolidateForMessaging()">Consolidate for messaging</button>
      <button class="btn btn-out btn-sm" onclick="lockWallet()">Lock</button>
      <button class="btn btn-dng btn-sm" onclick="forgetWallet()">Forget key</button>
    </div>
    <div class="f-field hidden" id="wifExportFallback" style="margin-bottom:12px;">
      <label class="f-label">Clipboard blocked — copy your WIF manually</label>
      <textarea class="f-input mono" id="wifExportBox" rows="3" readonly autocapitalize="off" autocomplete="off" spellcheck="false"></textarea>
    </div>`;
  } else {
    const stored=localStorage.getItem(WALLET_KEY);
    if(stored){
      html+=`<div class="f-field"><label class="f-label">Unlock saved wallet</label><input class="f-input" id="wUnlockPass" type="password" autocomplete="current-password" placeholder="Unlock password"></div>
      <button class="btn btn-acc btn-sm" onclick="unlockWallet()">Unlock</button>
      <hr class="divider">
      <button type="button" class="btn btn-out btn-sm" style="margin-bottom:8px;" onclick="(function(btn){const sec=btn.closest('#walletModalBody,#walletViewBody').querySelector('#wImportSection');const open=sec.style.display!=='none';sec.style.display=open?'none':'block';btn.textContent=open?'Change accounts ▸':'Change accounts ▴';})(this)">Change accounts ▸</button>
      <div id="wImportSection" style="display:none;">
        <div class="f-field"><label class="f-label">WIF private key (testnet3)</label><input class="f-input" id="wWif" type="password" placeholder="c… or 9… testnet3 WIF" autocomplete="off"></div>
        <div class="f-field"><label class="f-label">Encryption password (min ${WALLET_MIN_PASS} chars)</label><input class="f-input" id="wPass" type="password" autocomplete="new-password"></div>
        <div class="btn-row" style="margin-bottom:16px;">
          <button class="btn btn-out btn-sm" onclick="generateKey()">Generate address</button>
          <button class="btn btn-acc btn-sm" onclick="importWallet()">Import + unlock</button>
        </div>
      </div>`;
    } else {
      html+=`<div class="f-field"><label class="f-label">WIF private key (testnet3)</label><input class="f-input" id="wWif" type="password" placeholder="c… or 9… testnet3 WIF" autocomplete="off"></div>
      <div class="f-field"><label class="f-label">Encryption password (min ${WALLET_MIN_PASS} chars)</label><input class="f-input" id="wPass" type="password" autocomplete="new-password"></div>
      <div class="btn-row" style="margin-bottom:16px;">
        <button class="btn btn-out btn-sm" onclick="generateKey()">Generate address</button>
        <button class="btn btn-acc btn-sm" onclick="importWallet()">Import + unlock</button>
      </div>`;
    }
  }
  html+=`<div id="walletMsg" class="f-status hidden" style="margin-top:10px;"></div>`;
  container.innerHTML=html;
  container.querySelector('#wWif')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();importWallet();}});
  container.querySelector('#wPass')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();importWallet();}});
  container.querySelector('#wUnlockPass')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();unlockWallet();}});
  if(!locked) refreshBalance();
}
async function refreshBalance(){
  if(!S.addr||!S.priv) return;
  try{
    // Use cached keyring (same derivation as SupTV/SupRadio)
    const kr=S.keyring||await buildKeyring(S.priv);
    if(!S.keyring) S.keyring=kr;
    // Fetch balances for main + all change addresses in parallel
    const bals=await Promise.all(kr.all.map(sg=>getBalance(sg.addr).catch(()=>({confirmed:0,unconfirmed:0}))));
    const total=bals.reduce((acc,b)=>({confirmed:acc.confirmed+(b.confirmed||0),unconfirmed:acc.unconfirmed+(b.unconfirmed||0)}),{confirmed:0,unconfirmed:0});
    // Build per-address detail
    const addrLines=kr.all.map((sg,i)=>{const b=bals[i];return b.confirmed||b.unconfirmed?`<div style="font-size:.75rem;color:var(--muted);margin-top:2px;">${esc(sg.label)}: ${(b.confirmed/1e8).toFixed(8)} confirmed</div>`:''}).join('');
    const bws=document.querySelectorAll('.wallet-balances, #walletBalances');
    bws.forEach(bw => {
      bw.innerHTML=`<span class="balance-chip balance-confirmed">✓ ${(total.confirmed/1e8).toFixed(8)} tBTC confirmed</span><span class="balance-chip balance-unconf">⏳ ${(total.unconfirmed/1e8).toFixed(8)} tBTC unconfirmed</span>${addrLines}`;
    });
  }catch{}
}
function activeWalletContainer(preferEl=null){
  if(preferEl){
    const parent=preferEl.closest('#walletModalBody, #walletViewBody');
    if(parent) return parent;
  }
  const wm=document.getElementById('modalWallet');
  if(wm&&!wm.classList.contains('hidden')){
    const body=document.getElementById('walletModalBody');
    if(body) return body;
  }
  return document.getElementById('walletViewBody')||document.getElementById('walletModalBody');
}
function walletField(id,preferEl=null){
  const container=activeWalletContainer(preferEl);
  return container?.querySelector(`#${id}`)||document.querySelector(`#${id}`);
}
function walletMsg(msg,kind='info',preferEl=null){
  const container=activeWalletContainer(preferEl);
  const el=container?.querySelector('#walletMsg')||document.getElementById('walletMsg');
  if(el) showStatus(el,msg,kind);
}
function walletWifFallback(wif='',preferEl=null){
  const container=activeWalletContainer(preferEl);
  const wrap=container?.querySelector('#wifExportFallback');
  const box=container?.querySelector('#wifExportBox');
  if(!wrap||!box) return;
  if(wif){
    box.value=wif;
    wrap.classList.remove('hidden');
    box.focus();
    box.select();
  }else{
    box.value='';
    wrap.classList.add('hidden');
  }
}

function updateWalletMini(){
  const mini=document.getElementById('walletMini');
  if(!S.addr){if(mini)mini.classList.add('hidden');return;}
  if(mini){
    mini.classList.remove('hidden');
    const avi=document.getElementById('walletMiniAvi'),nm=document.getElementById('walletMiniName'),ad=document.getElementById('walletMiniAddr');
    if(S.myProfile&&avi){const cands=profileImgCandidates(S.myProfile.image);if(cands.length){avi.src=cands[0];avi.dataset.cands=JSON.stringify([...cands.slice(1),FALLBACK_AVI]);avi.onerror=()=>window.pi_err(avi);}else avi.src=FALLBACK_AVI;}
    else if(avi) avi.src=FALLBACK_AVI;
    let pendingBadge = '';
    if (S.myProfile?.isPending) {
      let pStatus = 'Confirming...';
      for (const [txid, pTx] of S.pendingTxs.entries()) {
        if (pTx.type === 'profile' && pTx.root && pTx.root.fromAddr === S.addr) {
          pStatus = pTx.status === 'broadcasting' ? 'Broadcasting...' : 'Confirming...';
          break;
        }
      }
      pendingBadge = ` <span class="badge-v badge-unoff" style="font-size:0.6rem;padding:2px 4px;">⏳ ${pStatus}</span>`;
    }
    if(nm) nm.innerHTML=(S.myProfile?.displayName?esc(S.myProfile.displayName):shortAddr(S.addr)) + pendingBadge;
    if(ad) ad.textContent=shortAddr(S.addr);
  }
  // also update inline compose avi with cascade
  const ica=document.getElementById('inlineComposeAvi'),cma=document.getElementById('cmAvi');
  const cands=S.myProfile?profileImgCandidates(S.myProfile.image):[];
  const src=cands.length?cands[0]:FALLBACK_AVI;
  const fb=JSON.stringify([...cands.slice(1),FALLBACK_AVI]);
  [ica,cma].forEach(el=>{if(!el)return;el.src=src;el.dataset.cands=fb;el.onerror=()=>window.pi_err(el);});
  // show inline compose
  const ic=document.getElementById('inlineCompose');
  if(ic) ic.classList.toggle('hidden',!S.addr);
}


async function afterUnlock(){
  try{ S.keyring=await buildKeyring(S.priv); }catch{}

  // load own profile
  try {
      if (typeof GetProfileByAddress !== 'undefined') {
          const profile = await GetProfileByAddress(S.addr);
          const userInput = document.getElementById('userInput');
          if (userInput) {
              if (profile && profile.URN) {
                  userInput.value = profile.URN;
              } else {
                  userInput.value = S.addr;
              }
          }
      } else {
          const userInput = document.getElementById('userInput');
          if (userInput) userInput.value = S.addr;
      }
  } catch(e) {
      console.warn("Failed to get profile by address", e);
      const userInput = document.getElementById('userInput');
      if (userInput && !userInput.value) userInput.value = S.addr;
  }

  // render wallet views
  const wmb=document.getElementById('walletModalBody');
  if(wmb) renderWalletUI(wmb);
}



async function generateKey(){
  walletMsg('Generating…');
  try{
    let pb,wif='',addr='';
    const hasBadPair=v=>/[\\/:*?"|<>][0-9]/.test(String(v||'').slice(0,120));
    let attempts=0;
    do{
      attempts++;
      pb=crypto.getRandomValues(new Uint8Array(32));
      if(b2bi(pb)===0n||b2bi(pb)>=N) continue;
      wif=await priv2wif(pb);addr=await priv2addr(pb);
    }while(attempts<64&&(!wif||!addr||hasBadPair(wif)||hasBadPair(addr)));
    if(!wif) throw new Error('Try again');
    const el=walletField('wWif');if(el) el.value=wif;
    walletMsg(`Generated ${addr}. Set a password and click Import + unlock.`,'good');
  }catch(e){walletMsg(e.message||'Failed','danger');}
}
async function importWallet(){
  const wifEl=walletField('wWif'),passEl=walletField('wPass');
  const wif=norm((wifEl||{}).value||''),pass=norm((passEl||{}).value||'');
  if(!wif) return walletMsg('Enter a testnet3 WIF key','warn');
  if(pass.length<WALLET_MIN_PASS) return walletMsg(`Password must be ≥ ${WALLET_MIN_PASS} chars`,'warn');
  walletMsg('Encrypting…');
  try{
    const pb=await wif2priv(wif);
    const addr=await priv2addr(pb);
    const enc=await encryptPriv(pb,pass);
    localStorage.setItem(WALLET_KEY,JSON.stringify(enc));
    S.priv=pb;S.addr=addr;
    if(wifEl)wifEl.value='';if(passEl)passEl.value='';
    walletMsg(`Unlocked: ${addr}`,'good');
    await afterUnlock();
  }catch(e){walletMsg(e.message||'Import failed','danger');}
}
async function unlockWallet(){
  const passEl=walletField('wUnlockPass');
  const pass=norm((passEl||{}).value||'');
  if(!pass) return walletMsg('Enter password','warn');
  walletMsg('Unlocking…');
  try{
    const stored=JSON.parse(localStorage.getItem(WALLET_KEY)||'null');
    if(!stored) throw new Error('No stored wallet — import first');
    const pb=await decryptPriv(stored,pass);
    const addr=await priv2addr(pb);
    S.priv=pb;S.addr=addr;
    if(passEl)passEl.value='';
    walletMsg(`Unlocked: ${addr}`,'good');
    await afterUnlock();
  }catch(e){walletMsg(e.message||'Unlock failed','danger');}
}
async function exportWif(){
  if(!S.priv) return walletMsg('Unlock wallet first','warn');
  let wif='';
  try{
    wif=await priv2wif(S.priv);
    if(!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(wif);
    walletWifFallback('');
    walletMsg('WIF copied to clipboard','good');
  }catch(e){
    if(wif){
      walletWifFallback(wif);
      walletMsg('Clipboard unavailable on this device — copy WIF from the box below.','warn');
      return;
    }
    walletMsg(e.message||'Copy failed','danger');
  }
}
function lockWallet(){
  S.priv=null;S.addr='';S.myProfile=null;S.keyring=null;
  updateWalletMini();
  const wvb=document.getElementById('walletViewBody');if(wvb) renderWalletUI(wvb);
  const wmb=document.getElementById('walletModalBody');if(wmb) renderWalletUI(wmb);
  const ic=document.getElementById('inlineCompose');if(ic)ic.classList.add('hidden');
}
function forgetWallet(){
  localStorage.removeItem(WALLET_KEY);
  lockWallet();
  walletMsg('Wallet forgotten','warn');
}
window.consolidateChange=async function(){
  walletMsg('Consolidating change funds…','info');
  try{
    const txid=await consolidateChangeFunds();
    walletMsg(`Consolidated to main address. txid: ${txid}`,'good');
    refreshBalance();
  }catch(e){walletMsg(e.message||'Consolidation failed','danger');}
};



window.S = S;
window.b2h = b2h;
window.h2b = h2b;
window.sha256 = sha256;
window.priv2addr = priv2addr;
window.deriveKeywordAddress = deriveKeywordAddress;
window.kwAddr = kwAddr;
window.renderWalletUI = renderWalletUI;
window.generateKey = generateKey;
window.importWallet = importWallet;
window.unlockWallet = unlockWallet;
window.exportWif = exportWif;
window.lockWallet = lockWallet;
window.forgetWallet = forgetWallet;
window.consolidateChange = consolidateChange;
window.WALLET_KEY = WALLET_KEY;
window.INTERNAL_WALLET_STORAGE_KEY = INTERNAL_WALLET_STORAGE_KEY;
window.signMsg = signMsg;
window.buildP2fkRecipientsAndCost = buildP2fkRecipientsAndCost;
window.sendManyWithWallet = sendManyWithWallet;
window.signWithWallet = signWithWallet;
