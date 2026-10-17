import assert from 'node:assert/strict';
import{spawn}from'node:child_process';
import{mkdir,mkdtemp,writeFile}from'node:fs/promises';
import{resolve}from'node:path';
import WebSocket from'ws';
import{createPlayer,profileOf}from'../dist/shared/world.js';
const port=3033,origin=`http://127.0.0.1:${port}`;await mkdir('artifacts',{recursive:true});const dataDir=await mkdtemp(resolve('artifacts/scores-test-'));
const profiles={};for(let i=1;i<=60;i++)profiles[`private-token-${i}`]=profileOf(createPlayer(`public-${i}`,{name:`Player ${String(i).padStart(2,'0')}`,combatXp:i*25,xp:{wood:i*10,ore:i*14},pvpScore:i*25}));
await writeFile(resolve(dataDir,'profiles.json'),JSON.stringify({version:3,profiles,escrows:[],marketListings:[]}));
let child,ws,id='',state,reply,requestId=0;async function until(check){const end=Date.now()+10000;while(!check()){assert.ok(Date.now()<end,'Timed out waiting for high scores');await new Promise(r=>setTimeout(r,30));}}
async function query(m){reply=undefined;const n=++requestId;ws.send(JSON.stringify({type:'scores',requestId:n,...m}));await until(()=>reply?.requestId===n);return reply;}
try{
 let output='';child=spawn(process.execPath,['dist/server.js'],{cwd:process.cwd(),env:{...process.env,STORAGE:'json',APP_ENV:'test',HOST:'127.0.0.1',PORT:String(port),DATA_DIR:dataDir},windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);await until(()=>{if(child.exitCode!==null)throw new Error(output);return output.includes('Scape is ready:');});
 ws=new WebSocket(origin.replace('http','ws')+'/live',{origin});ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome')id=m.id;if(m.type==='state')state=m;if(m.type==='scores')reply=m;});await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j);});ws.send(JSON.stringify({type:'join',name:'Rank explorer',token:'private-token-1'}));await until(()=>id&&state);
 const own=await query({board:'overall',view:'self'});assert.equal(own.self.rank,60);assert.equal(own.page,3);assert.equal(own.entries.length,10);assert.equal(own.highlightId,'public-1');
 const name=await query({board:'pve',view:'name',query:'PLAYER 44'});assert.equal(name.matches,1);assert.equal(name.entries[0].rank,17);
 const rank=await query({board:'pvp',view:'rank',rank:26});assert.equal(rank.page,2);assert.equal(rank.entries[0].rank,26);assert.equal(rank.entries.length,25);
 const skill=await query({board:'mining',page:1});assert.equal(skill.entries[0].oreXp,840);assert.equal(skill.entries[0].name,'Player 60');
 const invalid=await query({board:'__proto__',pvpScore:999999});assert.ok(invalid.error);assert.equal(invalid.entries.length,0);assert.equal(state.players.find(p=>p.id===id).pvpScore,25);
 assert.ok(!JSON.stringify([own,name,rank,skill,invalid]).includes('private-token'));
 console.log('PASS: live paginated high-score queries, self at rank 60/page 3, name/global-rank search, PvP/skill categories, invalid query rejection, no progress mutation or private tokens (isolated seeded roster).');
}finally{ws?.close();if(child&&child.exitCode===null){const closed=new Promise(r=>child.once('exit',r));child.kill('SIGKILL');await closed;}}
