import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import WebSocket from 'ws';
import {createPlayer,profileOf}from '../dist/shared/world.js';
const port=3032,origin=`http://127.0.0.1:${port}`;
await mkdir('artifacts',{recursive:true});const dataDir=await mkdtemp(resolve('artifacts/market-test-'));
const seller=profileOf(createPlayer('seller-public',{name:'Market seller',coins:200,combatXp:50,pvpScore:25}));seller.items.warSpear=1;seller.items.tonic=4;
const buyer=profileOf(createPlayer('buyer-public',{name:'Market buyer',coins:500,combatXp:75}));
await writeFile(resolve(dataDir,'profiles.json'),JSON.stringify({version:2,profiles:{'seller-secret':seller,'buyer-secret':buyer},escrows:[]}));
let child;const sockets=[];
async function until(check,ms=15000){const end=Date.now()+ms;while(!await check()){assert.ok(Date.now()<end,'Timed out waiting for market state');await new Promise(r=>setTimeout(r,40));}}
async function boot(){let output='';child=spawn(process.execPath,['dist/server.js'],{cwd:process.cwd(),env:{...process.env,STORAGE:'json',APP_ENV:'test',HOST:'127.0.0.1',PORT:String(port),DATA_DIR:dataDir},windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);await until(()=>{if(child.exitCode!==null)throw new Error(output);return output.includes('Scape is ready:');});}
async function kill(){if(!child||child.exitCode!==null)return;const closed=new Promise(r=>child.once('exit',r));child.kill('SIGKILL');await closed;}
async function join(name,token){const c={ws:new WebSocket(origin.replace('http','ws')+'/live',{origin}),id:'',token:'',state:null};sockets.push(c.ws);c.ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome'){c.id=m.id;c.token=m.token;}if(m.type==='state')c.state=m;});await new Promise((r,j)=>{c.ws.once('open',r);c.ws.once('error',j);});c.ws.send(JSON.stringify({type:'join',name,token}));await until(()=>c.id&&c.state);return c;}
const me=c=>c.state.players.find(p=>p.id===c.id),send=(c,m)=>c.ws.send(JSON.stringify(m));
const market=(c,action,item,quantity=1,extra={})=>send(c,{type:'market',action,item,quantity,...extra});
async function bank(c){const drive=()=>{const p=me(c),dx=800-p.x,dy=550-p.y,d=Math.hypot(dx,dy);send(c,{type:'input',x:d>8?dx/d:0,y:d>8?dy/d:0,weapon:'spear'});};drive();const t=setInterval(drive,50);try{await until(()=>Math.hypot(me(c).x-800,me(c).y-550)<12);}finally{clearInterval(t);send(c,{type:'input',x:0,y:0});}}
async function saved(check){await until(async()=>{try{return check(JSON.parse(await readFile(resolve(dataDir,'profiles.json'),'utf8')));}catch{return false;}});}
try{
 await boot();let a=await join('Market seller','seller-secret'),b=await join('Market buyer','buyer-secret');
 await Promise.all([bank(a),bank(b)]);
 market(b,'buy','tonic',2,{price:0});await until(()=>me(b).items.tonic===2);assert.equal(me(b).coins,440);market(b,'sell','tonic');await until(()=>me(b).items.tonic===1);assert.equal(me(b).coins,452);
 market(a,'list','warSpear',1,{unitPrice:80});market(a,'list','tonic',4,{unitPrice:11});await until(()=>a.state.marketListings.length===2);const spear=a.state.marketListings.find(l=>l.item==='warSpear'),tonic=a.state.marketListings.find(l=>l.item==='tonic');
 a.ws.close();await until(()=>!b.state.players.some(p=>p.id===a.id));
 market(b,'buyListing','wood',1,{listingId:spear.id,unitPrice:0,cost:0});await until(()=>me(b).items.warSpear===1);assert.equal(me(b).coins,372);
 market(b,'buyListing','wood',2,{listingId:tonic.id,unitPrice:0,cost:0});await until(()=>me(b).items.tonic===3);assert.equal(me(b).coins,350);market(b,'equip','warSpear');await until(()=>me(b).weapon==='warSpear');
 market(b,'buy','ration');await until(()=>me(b).items.ration===1);send(b,{type:'input',x:0,y:0,dodge:true});await until(()=>me(b).stamina<90);send(b,{type:'input',x:0,y:0});send(b,{type:'supply',item:'ration'});await until(()=>me(b).items.ration===0);assert.ok(me(b).stamina>90);
 await saved(s=>s.version===5&&s.profiles['seller-secret'].coins===302&&s.profiles['buyer-secret'].coins===332&&s.marketListings.length===1&&s.marketListings[0].quantity===2);
 await until(()=>b.state.leaderboards.pve.length===2&&b.state.leaderboards.pvp[0]?.online===false);assert.equal(b.state.leaderboards.pve[0].name,'Market buyer');assert.equal(b.state.leaderboards.pvp[0].name,'Market seller');assert.equal(b.state.leaderboards.pvp[0].online,false);assert.ok(!JSON.stringify(b.state.leaderboards).includes('seller-secret'));
 console.log('PASS: live shop trades, escrow listings, offline seller payment, partial fill, stored pricing, owned weapon equip, consumable use, and independent saved/live boards (seeded test balances).');
 await kill();await boot();a=await join('Market seller','seller-secret');b=await join('Market buyer','buyer-secret');assert.equal(me(a).coins,302);assert.equal(me(b).coins,332);assert.equal(me(b).items.warSpear,1);assert.equal(me(b).weapon,'warSpear');assert.equal(me(b).items.tonic,3);assert.equal(a.state.marketListings[0].quantity,2);
 await bank(a);market(a,'cancel','tonic',1,{listingId:tonic.id});await until(()=>me(a).items.tonic===2&&a.state.marketListings.length===0);await saved(s=>s.marketListings.length===0&&s.profiles['seller-secret'].items.tonic===2);
 console.log('PASS: forced restart retained wallets, gear, partial listing, scores and seller identity; cancellation returned only unsold goods.');
}finally{for(const ws of sockets)ws.close();await kill();}

