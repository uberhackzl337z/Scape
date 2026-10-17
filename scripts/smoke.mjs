import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { zone } from '../dist/shared/world.js';
const base=process.env.GAME_URL??'http://127.0.0.1:3000';
const origin=new URL(base).origin;
const sockets=[];
async function join(name){
  const ws=new WebSocket(base.replace(/^http/,'ws')+'/live',{origin});sockets.push(ws);
  const client={ws,id:'',state:null};
  ws.on('message',data=>{const message=JSON.parse(data);if(message.type==='welcome')client.id=message.id;if(message.type==='state')client.state=message;});
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
  ws.send(JSON.stringify({type:'join',name}));await until(()=>client.id&&client.state);return client;
}
async function until(check){const deadline=Date.now()+5000;while(!check()){assert.ok(Date.now()<deadline,'Timed out waiting for server');await new Promise(r=>setTimeout(r,30));}}
try{
  for(const path of ['/','/style.css','/game/main.js','/game/gear-view.js','/game/element-view.js','/game/terrain-view.js','/shared/equipment.js','/shared/shop.js','/api/world','/api/shop','/game/combat-view.js','/game/gather-view.js','/game/duel-view.js','/game/town-view.js','/game/score-view.js','/game/skill-view.js','/shared/skills.js','/shared/crafting.js','/shared/leaderboards.js','/shared/world.js','/shared/combat.js','/shared/duels.js','/shared/items.js','/shared/market.js','/health']){const response=await fetch(base+path);assert.equal(response.status,200,path);}
  assert.equal((await fetch(base+'/server.ts')).status,404);
  assert.equal((await fetch(base+'/data/profiles.json')).status,404);
  const a=await join('ProtocolTest A'),b=await join('ProtocolTest B');
  await until(()=>a.state.players.some(p=>p.id===b.id)&&b.state.players.some(p=>p.id===a.id));
  const start=a.state.players.find(p=>p.id===a.id).x;
  const timer=setInterval(()=>a.ws.send(JSON.stringify({type:'input',x:1,y:0,interact:false,attack:false,xp:{wood:999999},coins:999999})),50);
  await until(()=>a.state.players.find(p=>p.id===a.id).x>start+50);clearInterval(timer);
  assert.equal(a.state.players.find(p=>p.id===a.id).xp.wood,0,'client cannot set XP');
  assert.equal(a.state.players.find(p=>p.id===a.id).coins,0,'client cannot set coin balance');
  await until(()=>b.state.players.find(p=>p.id===a.id).x>start+50);
  a.ws.send(JSON.stringify({type:'input',x:0,y:0,weapon:'axe',dodge:true,combatXp:999999}));
  await until(()=>a.state.players.find(p=>p.id===a.id).weapon==='axe'&&a.state.players.find(p=>p.id===a.id).stamina<100);
  assert.equal(a.state.players.find(p=>p.id===a.id).combatXp,0,'client cannot set combat XP');
  const player=()=>a.state.players.find(p=>p.id===a.id);
  await until(()=>player().dodgeUntil<=a.state.time);
  const node=a.state.nodes.filter(n=>n.stock>0&&zone(n)==='grove')
    .sort((x,y)=>Math.hypot(x.x-player().x,x.y-player().y)-Math.hypot(y.x-player().x,y.y-player().y))[0];
  assert.ok(node,'safe gathering site exists');
  const approach=setInterval(()=>{const p=player(),dx=node.x-p.x,dy=node.y-p.y,d=Math.hypot(dx,dy);a.ws.send(JSON.stringify({type:'input',x:d>40?dx/Math.max(30,d):0,y:d>40?dy/Math.max(30,d):0}));},50);
  try{await until(()=>Math.hypot(player().x-node.x,player().y-node.y)<45);}finally{clearInterval(approach);a.ws.send(JSON.stringify({type:'input',x:0,y:0}));}
  const gathering=setInterval(()=>a.ws.send(JSON.stringify({type:'input',interact:true,gathering:{kind:'fake',until:9999999999999}})),50);
  try {
    try { await until(()=>b.state.players.find(p=>p.id===a.id)?.gathering); } catch(error) { const p=player(); throw new Error(`Gather replication failed: ${JSON.stringify({node,player:{x:p.x,y:p.y,hp:p.hp,message:p.message,bag:p.bag,gathering:p.gathering,gatherAt:p.gatherAt,swingAt:p.swingAt,dodgeUntil:p.dodgeUntil},time:a.state.time})}`,{cause:error}); }
    const observed=b.state.players.find(p=>p.id===a.id);
    assert.equal(observed.gathering.kind,node.kind);
    assert.ok(observed.bag[node.kind]>0,'remote animation accompanies real server gathering');
    assert.ok(observed.gathering.until>observed.gathering.at);
    assert.ok(observed.gathering.until-observed.gathering.at<=700,'client cannot forge animation duration');
  } finally {clearInterval(gathering);a.ws.send(JSON.stringify({type:'input',interact:false}));}
  await until(()=>!b.state.players.find(p=>p.id===a.id)?.gathering);
  console.log('PASS: successful gathering pose replicated to a second client, forged visual input ignored and release cancels it.');
  console.log('PASS: combat assets, private-file isolation, two-player state, movement replication, weapon selection, dodge stamina, XP forgery rejection.');
}finally{for(const ws of sockets)ws.close();}

