// Seeded identities exercise server authorization, not live email delivery or real charges.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import WebSocket from 'ws';
import {WorldStore} from '../dist/storage.js';
import {createPlayer,profileOf} from '../dist/shared/world.js';
const origin='http://127.0.0.1:3054';
await mkdir('artifacts',{recursive:true});const dir=await mkdtemp(resolve('artifacts/account-test-'));
const store=new WorldStore(dir,'sqlite','accounts-test');await store.open();
const a=store.accounts.register('verified-fixture','fixture@example.test','ChosenName','old-fixture-key');
const cookie='scape_session='+store.accounts.session(a.id);
store.accounts.db.prepare("INSERT INTO store_orders (id,account,sku,amount,currency,session,status) VALUES ('paid-test',?,'sunset-name',499,'usd','cs_test','paid')").run(a.id);
store.accounts.select(a.id,'sunset-name');
store.accounts.db.prepare("INSERT INTO store_orders (id,account,sku,amount,currency,session,status) VALUES ('paid-aura',?,'astral-aura',499,'usd','cs_test_aura','paid')").run(a.id);
store.accounts.select(a.id,'astral-aura');
await store.write(JSON.stringify({version:5,profiles:{[a.character]:profileOf(createPlayer('public-test',{name:a.name,coins:73,combatXp:99}))},escrows:[],marketListings:[]}));store.close();
let child;const sockets=[];
async function until(check,ms=10000){const end=Date.now()+ms;while(!check()){assert.ok(Date.now()<end,'Account check timed out');await new Promise(r=>setTimeout(r,30));}}
async function boot(){let out='';child=spawn(process.execPath,['dist/server.js'],{env:{...process.env,APP_ENV:'test',HOST:'127.0.0.1',PORT:'3054',PUBLIC_ORIGIN:origin,DATA_DIR:dir,WORLD_ID:'accounts-test',STORAGE:'sqlite',ACCOUNTS_REQUIRED:'1',SUPABASE_URL:'https://unused-auth.example.test',SUPABASE_ANON_KEY:'fixture',STRIPE_SECRET_KEY:'',STRIPE_WEBHOOK_SECRET:''},windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>out+=d);await until(()=>{if(child.exitCode!==null)throw Error(out);return out.includes('Scape is ready');});}
async function stop(){if(!child||child.exitCode!==null)return;const done=new Promise(r=>child.once('exit',r));child.kill('SIGKILL');await done;}
async function join(session='', token=''){const c={id:'',state:null,error:'',welcome:null,ws:new WebSocket(origin.replace('http','ws')+'/live',{origin,headers:{Cookie:session}})};sockets.push(c.ws);c.ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome'){c.id=m.id;c.welcome=m;}if(m.type==='state')c.state=m;if(m.type==='joinError')c.error=m.message;});await new Promise((r,j)=>{c.ws.once('open',r);c.ws.once('error',j);});c.ws.send(JSON.stringify({type:'join',token,name:'Impersonated'}));await until(()=>c.error||c.id&&c.state);return c;}
const me=c=>c.state.players.find(p=>p.id===c.id);
try{
 await boot();assert.ok((await join()).error);assert.ok((await join('',a.character)).error);
 let c=await join(cookie);assert.equal(me(c).name,'ChosenName');assert.equal(me(c).coins,73);assert.equal(me(c).appearance,'sunset-name');assert.equal(me(c).aura,'astral-aura');assert.equal(c.welcome.token,undefined);
 const data=JSON.stringify(c.state);assert.ok(!data.includes('fixture@example.test'));assert.ok(!data.includes('old-fixture-key'));
 assert.ok((await join(cookie)).error,'one active character session');
 const before=c.state.time;c.ws.send(JSON.stringify({type:'input',appearance:'glacier-name',aura:'forged-free-aura',coins:999999,name:'Hacked'}));
 await until(()=>c.state.time>before);assert.equal(me(c).name,'ChosenName');assert.equal(me(c).appearance,'sunset-name');assert.equal(me(c).aura,'astral-aura');assert.equal(me(c).coins,73);
 assert.equal((await fetch(origin+'/data/world.sqlite')).status,404);
 await stop();await boot();c=await join(cookie);
 assert.equal(me(c).coins,73);assert.equal(me(c).combatXp,99);assert.equal(me(c).name,'ChosenName');assert.equal(me(c).appearance,'sunset-name');assert.equal(me(c).aura,'astral-aura');
 const result=await fetch(origin+'/api/account/logout',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'});assert.equal(result.status,200);
 await until(()=>c.ws.readyState===WebSocket.CLOSED);assert.ok((await join(cookie)).error);
 console.log('PASS: required accounts reject guests and retired access keys; verified-cookie joins lock names, hide email/key, preserve wallet/nameplate/aura across crash, and revoke sessions on logout (seeded disposable identities, no external email or charges).');
}finally{for(const ws of sockets)ws.close();await stop();}
