function combatReadout(aim){
 const boss=rogueMode&&enemies.find(e=>e.boss&&!e.dead);
 const foe=boss||aim.enemy||nearestEnemy(14,.28);
 const visible=foe&&!foe.dead&&(boss||foe.avatar.group.position.distanceTo(player.group.position)<26);
 const panel=$('duel-target');panel.classList.toggle('hidden',!visible);
 $('hud').classList.toggle('engaged',!!visible);
 if(visible){
  if(rogueMode)updateFoePortrait(foe);
  $('duel-name').textContent=foe.name;
  $('duel-hp').style.width=100*Math.max(0,foe.hp/foe.maxHp)+'%';
  $('duel-poise').style.width=Math.max(0,foe.poise)+'%';
  $('duel-state').textContent=foe.transition>0?'转阶段 · 准备避招':foe.windup>0?(foe.attackHint||(foe.charge?'蓄力来袭 · C 反制':'即将出招')):foe.arcPinUntil>time?'引雷针 · 命中引爆':foe.stagger>.3?'失衡':foe.recovery>0?'收招 · 反击窗口':'架势';
  panel.dataset.threat=foe.windup>0?'windup':foe.stagger>.3?'stagger':'ready';
 }
 const follow=raid.opening&&time<raid.opening.until&&!raid.opening.enemy.dead&&weaponNow().type==='melee';
 $('follow-up').classList.toggle('hidden',!follow);
 if(follow)$('follow-up').textContent=raid.opening.label+'　·　左键追击';
 cooldownUI('skill-counter',parryCd,1.15);
}
