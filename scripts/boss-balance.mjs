// Deterministic simulation check: a solo player must be able to beat the boss
// using normal server inputs, dodging telegraphed attacks rather than tanking.
import assert from 'node:assert/strict';
import {World,createPlayer,cleanInput,MAP,distance} from '../dist/shared/world.js';
const world=new World();world.raiders=world.raiders.filter(r=>r.kind==='boss');
const boss=world.raiders[0],p=createPlayer('solo');p.x=MAP.bossX-100;p.y=MAP.bossY;p.weapon='spear';world.players.set(p.id,p);
let dodges=0;
for(let now=1000;now<61000&&boss.hp>0&&p.hp>0;now+=50){
 const dx=boss.x-p.x,dy=boss.y-p.y,d=Math.max(1,distance(p,boss));
 let x=d>110?dx/d:0,y=d>110?dy/d:0;
 const imminent=world.warnings.some(w=>w.at-now>0&&w.at-now<=150);
 const projectile=world.projectiles.some(b=>distance(b,p)<65);
 const dodge=(imminent||projectile)&&now>=p.dodgeAt&&p.stamina>=32;
 if(dodge){x=-dy/d;y=dx/d;dodges++;}
 p.input=cleanInput({x,y,attack:true,dodge});p.lastInput=now;world.tick(.05,now);
}
console.log(JSON.stringify({bossHp:boss.hp,playerHp:p.hp,combatXp:p.combatXp,dodges}));
assert.equal(boss.hp,0,'a solo spear user with timed dodges should be able to win');
assert.equal(p.combatXp,300);
