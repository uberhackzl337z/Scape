import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import WebSocket from 'ws';
const storage=process.env.TEST_STORAGE??'json';
const port=Number(process.env.TEST_PORT??3031),origin=`http://127.0.0.1:${port}`;
await mkdir('artifacts',{recursive:true});const dataDir=await mkdtemp(resolve('artifacts/duel-test-'));
let child;const sockets=[];
async function until(check,ms=15000){const end=Date.now()+ms;while(!await check()){assert.ok(Date.now()<end,'Timed out waiting for game state');await new Promise(r=>setTimeout(r,40));}}
async function boot(){let output='';child=spawn(process.execPath,['dist/server.js'],{cwd:process.cwd(),env:{...process.env,STORAGE:storage,APP_ENV:'test',HOST:'127.0.0.1',PORT:String(port),DATA_DIR:dataDir},windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);await until(()=>{if(child.exitCode!==null)throw new Error(output);return output.includes('Scape is ready:');});}
async function kill(signal='SIGKILL'){if(!child||child.exitCode!==null)return;const closed=new Promise(r=>child.once('exit',r));child.kill(signal);await closed;}
async function join(name,token){const c={ws:new WebSocket(origin.replace('http','ws')+'/live',{origin}),id:'',token:'',state:null};sockets.push(c.ws);c.ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome'){c.id=m.id;c.token=m.token;}if(m.type==='state')c.state=m;});await new Promise((r,j)=>{c.ws.once('open',r);c.ws.once('error',j);});c.ws.send(JSON.stringify({type:'join',name,token}));await until(()=>c.id&&c.state);return c;}
const me=c=>c.state.players.find(p=>p.id===c.id);
const send=(c,data)=>{if(c.ws.readyState===WebSocket.OPEN)c.ws.send(JSON.stringify(data));};
const stop=c=>send(c,{type:'input',x:0,y:0});
async function drive(c,destination,done,extra={},limit=18000){let error;const step=()=>{try{const p=me(c),d=typeof destination==='function'?destination():destination,dx=d.x-p.x,dy=d.y-p.y,len=Math.hypot(dx,dy);const imminent=c.state.warnings.some(w=>w.at-c.state.time>0&&w.at-c.state.time<180&&Math.hypot(w.x-p.x,w.y-p.y)<w.radius);send(c,{type:'input',x:len>8?dx/len:0,y:len>8?dy/len:0,attack:true,weapon:'spear',dodge:imminent,...extra});}catch(e){error=e;}};step();const timer=setInterval(step,50);try{await until(()=>{if(error)throw error;return done();},limit);}finally{clearInterval(timer);stop(c);}}
async function move(c,point,extra={}){await drive(c,point,()=>Math.hypot(me(c).x-point.x,me(c).y-point.y)<13,extra);}
async function earn(c){const p=me(c),node=c.state.nodes.filter(n=>n.kind==='wood'&&n.stock>=2).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];await move(c,node);await drive(c,node,()=>me(c).bag.wood>=2,{interact:true,attack:false});await move(c,{x:800,y:550});await drive(c,{x:800,y:550},()=>me(c).bag.wood===0&&me(c).coins>=10,{interact:true});}
async function agree(a,b){await Promise.all([move(a,{x:630,y:550},{attack:false}),move(b,{x:650,y:550},{attack:false})]);send(a,{type:'duel',action:'offer',targetId:b.id,wager:10});await until(()=>b.state.duelOffers.some(o=>o.to===b.id)).catch(error=>{console.error('Consent checkpoint', {a:me(a),b:me(b),offers:b.state.duelOffers,duels:b.state.duels});throw error;});const offer=b.state.duelOffers.find(o=>o.to===b.id);send(b,{type:'duel',action:'accept',offerId:offer.id,wager:500,pot:99999});await until(()=>a.state.duels.some(d=>d.phase!=='finished'));return a.state.duels.find(d=>d.phase!=='finished');}
try{
 await boot();const a=await join('Duel test A'),b=await join('Duel test B');
 await Promise.all([earn(a),earn(b)]);const total=me(a).coins+me(b).coins;assert.ok(total>=20);console.log('PASS: two clients earned wager coins through gathering and banking.');
 const duel=await agree(a,b);assert.equal(duel.pot,20);await until(()=>a.state.duels.some(d=>d.id===duel.id&&d.phase==='active'));
 await drive(a,()=>({x:me(b).x,y:me(b).y}),()=>a.state.duels.some(d=>d.id===duel.id&&d.phase==='finished'),{weapon:'axe'},12000);
 // Each socket receives snapshots independently. Observe the same completed duel
 // on the loser before asserting its losses; coin totals alone can match an
 // older active snapshot whose stake was already escrowed.
 await until(()=>b.state.duels.some(d=>d.id===duel.id&&d.phase==='finished'));
 const result=a.state.duels.find(d=>d.id===duel.id);assert.equal(result.winnerId,a.id);await until(()=>me(a).coins+me(b).coins===total);assert.equal(me(a).duelWins,1);assert.equal(me(b).duelLosses,1);console.log('PASS: explicit consent, countdown, weapon knockout, single pot payout, and coin conservation.');
 await earn(b);
 // Carry a real gathered haul into escrow; a manually constructed recovery
 // profile would miss bugs in the server's capture path.
 const node=b.state.nodes.filter(n=>n.kind==='wood'&&n.stock>=2).sort((x,y)=>Math.hypot(x.x-me(b).x,x.y-me(b).y)-Math.hypot(y.x-me(b).x,y.y-me(b).y))[0];
 assert.ok(node);await move(b,node);await drive(b,node,()=>me(b).bag.wood>=2,{interact:true,attack:false});
 const bagBefore={...me(b).bag};
 const beforeA=me(a).coins,beforeB=me(b).coins;await agree(a,b);
 await until(async()=>{try{const saved=await readSave();return saved.escrows.length===1&&saved.profiles[a.token].coins===beforeA-10&&saved.profiles[b.token].coins===beforeB-10;}catch{return false;}}).catch(async error=>{const saved=await readSave();console.error('Escrow checkpoint', {beforeA,beforeB,wallets:Object.values(saved.profiles).map(p=>p.coins),escrowCount:saved.escrows.length,duels:a.state.duels,players:a.state.players.map(p=>({id:p.id,hp:p.hp,coins:p.coins,bag:p.bag}))});throw error;});
 await kill();await boot();const resumedA=await join('Duel test A',a.token),resumedB=await join('Duel test B',b.token);assert.equal(me(resumedA).coins,beforeA);assert.equal(me(resumedB).coins,beforeB);assert.equal(me(resumedA).duelWins,1);assert.deepEqual(me(resumedB).bag,bagBefore,'crash recovery preserves the escrowed duelist haul');
 const recovered=await readSave();assert.equal(recovered.escrows.length,0);console.log('PASS: forced server interruption refunded both saved stakes and retained the prior win and carried haul.');
 await agree(resumedA,resumedB);await kill('SIGTERM');await boot();
 const cleanA=await join('Duel test A',a.token),cleanB=await join('Duel test B',b.token);
 assert.equal(me(cleanA).coins,beforeA);assert.equal(me(cleanB).coins,beforeB);assert.deepEqual(me(cleanB).bag,bagBefore);
 console.log('PASS: graceful shutdown refunds duel stakes and preserves carried haul.');
}finally{for(const ws of sockets)ws.close();await kill();}

async function readSave(){if(storage==='json')return JSON.parse(await readFile(resolve(dataDir,'profiles.json'),'utf8'));const db=new DatabaseSync(resolve(dataDir,'world.sqlite'),{readOnly:true});try{return JSON.parse(db.prepare('SELECT payload FROM world_state WHERE id=1').get().payload);}finally{db.close();}}
