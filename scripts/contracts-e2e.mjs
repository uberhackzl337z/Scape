import assert from'node:assert/strict';import{spawn}from'node:child_process';import{mkdir,mkdtemp,writeFile,readFile}from'node:fs/promises';import{resolve}from'node:path';import WebSocket from'ws';import{DatabaseSync}from'node:sqlite';import{createPlayer,profileOf}from'../dist/shared/world.js';
const port=3039,origin=`http://127.0.0.1:${port}`;await mkdir('artifacts',{recursive:true});const dataDir=await mkdtemp(resolve('artifacts/contracts-test-'));await writeFile(resolve(dataDir,'profiles.json'),JSON.stringify({version:3,profiles:{'skill-secret':{...profileOf(createPlayer('skill-public',{name:'Contract tester',coins:0})),contracts:undefined}},escrows:[],marketListings:[]}));
let child;const sockets=[];async function until(check,ms=15000){const end=Date.now()+ms;while(!await check()){assert.ok(Date.now()<end,'Timed out waiting for skill activity');await new Promise(r=>setTimeout(r,40));}}
async function boot(){let output='';child=spawn(process.execPath,['dist/server.js'],{cwd:process.cwd(),env:{...process.env,STORAGE:'sqlite',APP_ENV:'test',HOST:'127.0.0.1',PORT:String(port),DATA_DIR:dataDir},windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);await until(()=>{if(child.exitCode!==null)throw new Error(output);return output.includes('Scape is ready:');});}
async function kill(){if(!child||child.exitCode!==null)return;const done=new Promise(r=>child.once('exit',r));child.kill('SIGKILL');await done;}
async function join(){const c={ws:new WebSocket(origin.replace('http','ws')+'/live',{origin}),id:'',state:null};sockets.push(c.ws);c.ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome')c.id=m.id;if(m.type==='state')c.state=m;});await new Promise((r,j)=>{c.ws.once('open',r);c.ws.once('error',j);});c.ws.send(JSON.stringify({type:'join',name:'Skill tester',token:'skill-secret'}));await until(()=>c.id&&c.state);return c;}
const me=c=>c.state.players.find(p=>p.id===c.id),send=(c,m)=>c.ws.send(JSON.stringify(m));
async function drive(c,to,done,extra={},limit=18000){const step=()=>{const p=me(c),d=typeof to==='function'?to():to,dx=d.x-p.x,dy=d.y-p.y,len=Math.hypot(dx,dy);send(c,{type:'input',x:len>8?dx/len:0,y:len>8?dy/len:0,...extra});};step();const t=setInterval(step,50);try{await until(done,limit);}finally{clearInterval(t);send(c,{type:'input',x:0,y:0});}}
const move=(c,p)=>drive(c,p,()=>Math.hypot(me(c).x-p.x,me(c).y-p.y)<13);
async function gather(c,item,quantity){const n=c.state.nodes.find(n=>n.kind===item);await move(c,n);await drive(c,n,()=>me(c).bag[item]>=quantity,{interact:true});}
async function buy(c,item,quantity){const stock=()=>item==='wood'||item==='ore'?me(c).banked[item]:me(c).items[item];const before=stock();send(c,{type:'market',action:'buy',item,quantity});await until(()=>stock()===before+quantity);}
async function craft(c,recipe,output,amount=1,quantity=1){await until(()=>me(c).craftAt<=c.state.time);const before=me(c).items[output];send(c,{type:'craft',recipe,quantity,xp:999999});await until(()=>me(c).items[output]===before+amount*quantity);}

function saved() { const db = new DatabaseSync(resolve(dataDir, 'world.sqlite'), { readOnly: true }); try { return JSON.parse(db.prepare('SELECT payload FROM world_state WHERE id=1').get().payload).profiles['skill-secret']; } finally { db.close(); } }
async function settled(c) { const time = c.state.time; await until(() => c.state.time > time + 250); }
try {
    await boot(); let c = await join();
    assert.deepEqual(me(c).contracts, { progress: {}, claimed: [] }, 'legacy profile starts with no invented progress');
    send(c, { type: 'contract', contract: 'first-haul', reward: 999999, progress: [4,4] });
    send(c, { type: 'input', contracts: { claimed: ['first-haul'] }, coins: 999999 });
    await settled(c); assert.equal(me(c).coins, 0); assert.deepEqual(me(c).contracts.claimed, []);
    await gather(c, 'wood', 4);
    await move(c, { x:800, y:550 });
    await drive(c, {x:800,y:550}, () => me(c).bag.wood === 0, { interact: true });
    assert.deepEqual(me(c).contracts.progress['first-haul'], [4,4]); assert.equal(me(c).coins, 20);
    send(c, { type:'contract', contract:'first-haul', reward:999999 });
    await until(() => me(c).coins === 50 && me(c).contracts.claimed.includes('first-haul'));
    for (let i=0;i<8;i++) send(c,{type:'contract',contract:'first-haul'});
    await settled(c); assert.equal(me(c).coins, 50);
    await craft(c,'planks','plank',1,2);
    assert.deepEqual(me(c).contracts.progress.workshop,[2]);
    send(c,{type:'contract',contract:'workshop'});
    await until(() => me(c).coins === 95);
    await until(() => saved().coins === 95 && saved().contracts.claimed.includes('workshop'));
    const prior = saved(); await kill(); await boot(); c = await join();
    assert.equal(me(c).coins,95); assert.deepEqual(me(c).contracts,prior.contracts); assert.equal(me(c).items.plank,2);
    await move(c,{x:800,y:550});
    send(c,{type:'contract',contract:'first-haul'});send(c,{type:'contract',contract:'workshop'});send(c,{type:'contract',contract:'warden',progress:[1],reward:999999});
    await settled(c);assert.equal(me(c).coins,95);assert.deepEqual(me(c).contracts.claimed,['first-haul','workshop']);
    console.log('PASS: legacy zero-progress migration, actual network gathering/banking/crafting, exact fixed rewards, forged and repeated claim rejection, SIGKILL/restart SQLite wallet/journal/item retention, no duplicate reward after reconnect.');
} finally { for(const ws of sockets) ws.close(); await kill(); }
