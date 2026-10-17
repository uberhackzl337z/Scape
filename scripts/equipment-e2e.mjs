import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import WebSocket from 'ws';
import { createPlayer, profileOf } from '../dist/shared/world.js';
const port=3036,origin=`http://127.0.0.1:${port}`;
await mkdir('artifacts',{recursive:true});const dataDir=await mkdtemp(resolve('artifacts/equipment-test-'));
const a=createPlayer('gear-public',{name:'Gear tester',coins:3000});
for(const id of ['emberMantle','emberGuard','emberSigil','stormGuard','frostSigil','emberStaff'])a.items[id]=1;
a.items.emberRune=0;a.items.focusRune=10;
await writeFile(resolve(dataDir,'profiles.json'),JSON.stringify({version:4,profiles:{'gear-test-key':profileOf(a),'buyer-test-key':profileOf(createPlayer('buyer-public',{coins:1000}))},escrows:[],marketListings:[]}));
let child;const sockets=[];
async function until(check,ms=12000){const end=Date.now()+ms;while(!await check()){assert.ok(Date.now()<end,'Timed out waiting for equipment test');await new Promise(r=>setTimeout(r,40));}}
async function boot(){let out='';child=spawn(process.execPath,['dist/server.js'],{cwd:process.cwd(),env:{...process.env,HOST:'127.0.0.1',APP_ENV:'test',STORAGE:'sqlite',PORT:String(port),DATA_DIR:dataDir,WORLD_ID:'equipment-test',PUBLIC_ORIGIN:origin},windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>out+=d);await until(()=>{if(child.exitCode!==null)throw Error(out);return out.includes('CodyScape is ready');});}
async function kill(){if(!child||child.exitCode!==null)return;const exit=new Promise(r=>child.once('exit',r));child.kill('SIGKILL');await exit;}
async function join(token){const c={ws:new WebSocket(origin.replace('http','ws')+'/live',{origin}),id:'',state:null,error:''};sockets.push(c.ws);c.ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome'){c.id=m.id;c.world=m.world;}if(m.type==='state')c.state=m;if(m.type==='joinError')c.error=m.message;});await new Promise((r,j)=>{c.ws.once('open',r);c.ws.once('error',j);});c.ws.send(JSON.stringify({type:'join',token,name:token==='buyer-test-key'?'Buyer':'Gear tester'}));await until(()=>c.error||c.id&&c.state);return c;}
const send=(c,m)=>c.ws.send(JSON.stringify(m)),me=c=>c.state.players.find(p=>p.id===c.id);
async function move(c,target){const timer=setInterval(()=>{const p=me(c),dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);send(c,{type:'input',x:d>5?dx/d:0,y:d>5?dy/d:0});},50);try{await until(()=>Math.hypot(me(c).x-target.x,me(c).y-target.y)<9,16000);}finally{clearInterval(timer);send(c,{type:'input',x:0,y:0});}}
function saved(){const db=new DatabaseSync(resolve(dataDir,'world.sqlite'),{readOnly:true});try{return JSON.parse(db.prepare('SELECT payload FROM world_state WHERE id=1').get().payload);}finally{db.close();}}
try{
 await boot();let c=await join('gear-test-key');const b=await join('buyer-test-key');assert.equal(c.world.id,b.world.id);
 const duplicate=await join('gear-test-key');assert.match(duplicate.error,/already online/);
 const unknown=await join('not-a-real-key');assert.match(unknown.error,/not recognized/);
 assert.equal((await(await fetch(origin+'/api/world')).json()).shared,true);assert.equal((await(await fetch(origin+'/api/shop')).json()).enabled,false);
 await move(c,{x:800,y:550});await move(b,{x:800,y:550});
 for(const [slot,item]of[['body','emberMantle'],['offhand','emberGuard'],['charm','emberSigil']]){send(c,{type:'equipment',slot,item,power:999999});await until(()=>me(c).equipment[slot]===item);}
 send(c,{type:'equipment',slot:'boots',item:'phoenixAegis'});send(c,{type:'purchase',item:'paid-coins',coins:999999});
 await until(()=>me(c).equipment.body==='emberMantle');assert.equal(me(c).equipment.boots,null);assert.equal(me(c).coins,3000);
 send(c,{type:'market',action:'list',item:'emberSigil',quantity:1,unitPrice:240});
 await until(()=>c.state.marketListings.length===1&&me(c).equipment.charm===null);
 const order=c.state.marketListings[0].id;c.ws.close();await until(()=>!b.state.players.some(p=>p.id===c.id));
 send(b,{type:'market',action:'buyListing',listingId:order,quantity:1,unitPrice:1});
 await until(()=>me(b).items.emberSigil===1);assert.equal(me(b).coins,760);
 await until(()=>saved().profiles['gear-test-key'].coins===3240);c=await join('gear-test-key');assert.equal(me(c).coins,3240);
 await move(c,{x:800,y:550});
 for(const[slot,item]of[['offhand','stormGuard'],['charm','frostSigil']]){send(c,{type:'equipment',slot,item});await until(()=>me(c).equipment[slot]===item);}
 send(c,{type:'market',action:'equip',item:'emberStaff'});await until(()=>me(c).weapon==='emberStaff');
 await move(c,{x:1000,y:550});await until(()=>c.state.raiders.some(e=>e.burnUntil>c.state.time),7000);
 await until(()=>me(c).attackAt<=c.state.time);const priorSwing=me(c).swingAt;
 send(c,{type:'input',x:0,y:0,attack:true,aim:-Math.PI/2});send(c,{type:'input',x:0,y:0,attack:false,aim:-Math.PI/2});
 await until(()=>me(c).swingAt>priorSwing);assert.equal(me(c).items.emberRune,0,'a quick basic shot works without runes');
 const attack=setInterval(()=>send(c,{type:'input',x:0,y:0,attack:true}),50);
 try{await until(()=>c.state.effects.some(e=>e.kind==='storm'),6000);assert.ok(c.state.raiders.some(e=>e.chillUntil>c.state.time));}finally{clearInterval(attack);send(c,{type:'input',x:0,y:0});}
 await until(()=>me(c).attackAt<=c.state.time,3000);
 const before=me(c).items.focusRune;send(c,{type:'ability',damage:999999});await until(()=>me(c).items.focusRune===before-1,6000);const next=me(c).abilityAt;
 send(c,{type:'ability',damage:999999});await until(()=>c.state.time>next-5500);assert.equal(me(c).items.focusRune,before-1);
 await until(()=>saved().profiles['gear-test-key'].equipment.charm==='frostSigil'&&saved().profiles['gear-test-key'].items.focusRune===before-1);
 const prior=saved().profiles['gear-test-key'];await kill();await boot();c=await join('gear-test-key');
 assert.deepEqual(me(c).equipment,prior.equipment);assert.equal(me(c).coins,prior.coins);assert.equal(me(c).items.focusRune,prior.items.focusRune);assert.deepEqual(me(c).skills,prior.skills);
 assert.equal(saved().version,5);assert.equal(saved().marketListings.length,0);
 for(const path of ['/data/world.sqlite','/data/profiles.json','/server-config.js'])assert.equal((await fetch(origin+path)).status,404);
 console.log('PASS: shared SQLite world, duplicate/invalid identity rejection, explicit gear/set equip, forged shop/gear rejection, auction escrow and offline seller payment, quick-tap free basic attack, real burn/lightning/chill and Frost nova, cooldown, forced-restart equipment/skills/wallet retention, private-file protection.');
}finally{for(const ws of sockets)ws.close();await kill();}
