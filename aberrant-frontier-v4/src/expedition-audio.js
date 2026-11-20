// Original arrangements, synthesized locally so the offline build has no media dependencies.
const arrangements=[
 {tempo:112,root:50,chords:[0,-2,-5,-7],riff:[0,7,12,3,7,10,5,2],bass:[0,0,0,7,0,12,0,5]},
 {tempo:128,root:43,chords:[0,3,-2,-5],riff:[0,3,7,0,10,7,5,2],bass:[0,0,7,0,0,3,0,-2]},
 {tempo:102,root:47,chords:[0,-4,3,-2],riff:[0,7,14,12,3,10,15,5],bass:[0,0,0,12,0,7,0,5]}
];
const cueLayers={
 swing:[[.11,3400,.11,.8,'bandpass'],[.09,210,.009,.22,'triangle']],
 shot:[[.10,2600,.22,.5,'bandpass'],[.13,147,.20,.24,'triangle']],
 light:[[.08,1400,.16,.45,'bandpass'],[.11,93,.20,.42,'sine'],[.05,740,.06,.39,'triangle']],
 heavy:[[.16,680,.25,.47,'lowpass'],[.22,83,.35,.26,'sine'],[.095,516,.11,.27,'triangle']],
 hurt:[[.16,440,.25,.4,'lowpass'],[.16,124,.27,.56,'triangle']],
 break:[[.19,3200,.24,.3,'bandpass'],[.29,336,.18,.59,'triangle'],[.33,61,.22,.41,'sine']],
 parry:[[.17,3800,.26,.85,'bandpass'],[.35,860,.14,.54,'triangle'],[.34,1303,.10,.67,'sine']],
 dodge:[[.17,1550,.14,.34,'bandpass']],
 deploy:[[.30,174,.10,.67,'triangle'],[.43,261,.10,1,'sine',.07]],
 warning:[[.26,204,.17,1.8,'triangle'],[.14,840,.075,1.3,'sine']],
 pounce:[[.32,940,.23,.32,'bandpass'],[.23,103,.24,.42,'triangle']],
 rail:[[.29,870,.30,.37,'lowpass'],[.27,108,.24,.38,'sawtooth']],
 slam:[[.38,500,.32,.36,'lowpass'],[.31,68,.36,.48,'sine']],
 laser:[[.28,970,.17,.33,'sawtooth'],[.19,2800,.16,.62,'bandpass']],
 crystal:[[.26,710,.10,1.48,'sine'],[.28,1120,.12,.81,'triangle'],[.14,3850,.10,.75,'highpass']],
 fire:[[.31,950,.27,.52,'bandpass'],[.43,153,.16,.53,'triangle']],
 ice:[[.33,1300,.17,.74,'triangle'],[.21,4600,.16,.85,'highpass'],[.5,512,.12,1.4,'sine']],
 clear:[[.45,392,.13,1,'triangle'],[.56,587,.12,1,'sine',.10],[.62,784,.11,1,'sine',.21]],
 dashStrike:[[.13,2600,.20,.62,'bandpass'],[.16,520,.16,1.65,'triangle'],[.12,980,.10,.88,'sine',.03]],
 coin:[[.11,1046,.08,1.25,'sine'],[.14,1568,.07,1.05,'triangle',.045]],
 revive:[[.45,220,.26,1.9,'sawtooth'],[.55,440,.20,1.5,'triangle',.08],[.70,660,.16,1.2,'sine',.18],[.40,1200,.18,.4,'bandpass',.05]],
 prophecy:[[.38,523,.13,1,'triangle'],[.44,659,.13,1,'sine',.09],[.52,784,.14,1,'triangle',.18],[.72,1046,.15,1.02,'sine',.28]],
 slowmo:[[.52,180,.28,.32,'sine'],[.42,900,.22,.22,'lowpass'],[.38,620,.12,.45,'triangle',.06]],
 hammer:[[.26,420,.30,.38,'lowpass'],[.34,64,.38,.25,'sine'],[.18,880,.14,.42,'triangle',.02]],
 thunder:[[.20,2400,.24,.35,'highpass'],[.24,340,.18,.28,'sawtooth'],[.16,1400,.14,.6,'bandpass',.04]],
 cinematic:[[1.8,261.6,.11,1,'sine'],[1.9,392,.10,1,'sine',.12],[2.1,523.2,.11,1.01,'triangle',.28],[2.4,659.2,.09,1.01,'sine',.46],[2.6,784,.08,1,'sine',.65]]
};
let echoSound=null,echoTrack=null;
function echoAudio(){
 if(echoSound)return echoSound;
 const Context=window.AudioContext||window.webkitAudioContext;
 if(!Context)return null;
 audio??=new Context();
 const master=audio.createDynamicsCompressor(),score=audio.createGain(),foley=audio.createGain();
 master.threshold.value=-14;master.ratio.value=4;master.connect(audio.destination);
 score.gain.value=0;foley.gain.value=.44;score.connect(master);foley.connect(master);
 const noise=audio.createBuffer(1,audio.sampleRate,audio.sampleRate),data=noise.getChannelData(0);
 let seed=0x92ee44;
 for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
 echoSound={score,foley,noise,muted:false};return echoSound;
}
function voice(out,at,length,freq,volume,slide,type,attack=.006){
 const osc=audio.createOscillator(),envelope=audio.createGain();
 osc.type=type;osc.frequency.setValueAtTime(freq,at);
 osc.frequency.exponentialRampToValueAtTime(Math.max(22,freq*slide),at+length);
 envelope.gain.setValueAtTime(.0001,at);envelope.gain.exponentialRampToValueAtTime(volume,at+Math.min(attack,length*.35));
 envelope.gain.exponentialRampToValueAtTime(.0001,at+length);
 osc.connect(envelope);envelope.connect(out);osc.start(at);osc.stop(at+length+.01);
}
function texture(out,at,length,freq,volume,slide,type){
 const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),envelope=audio.createGain();
 source.buffer=echoSound.noise;filter.type=type;filter.Q.value=.76;filter.frequency.setValueAtTime(freq,at);
 filter.frequency.exponentialRampToValueAtTime(freq*slide,at+length);
 envelope.gain.setValueAtTime(volume,at);envelope.gain.exponentialRampToValueAtTime(.0001,at+length);
 source.connect(filter);filter.connect(envelope);envelope.connect(out);source.start(at);source.stop(at+length);
}
function cue(id,position=null){
 if(!sound)return;
 try{
  const bus=echoAudio();if(!bus)return;
  if(audio.state==='suspended')audio.resume().catch(()=>{});
  const at=audio.currentTime+.008;
  let out=bus.foley;
  if(position&&audio.createStereoPanner){
   const offset=position.clone().sub(player.group.position);
   const pan=audio.createStereoPanner(),level=audio.createGain();
   const distance=Math.hypot(offset.x,offset.z);
   pan.pan.value=clamp((offset.x*Math.cos(yaw)+offset.z*Math.sin(yaw))/11,-.85,.85);
   level.gain.value=1/(1+distance*.045);
   pan.connect(level);level.connect(out);out=pan;
   setTimeout(()=>{pan.disconnect();level.disconnect();},950);
  }
  for(const [length,freq,volume,slide,type,delay=0] of cueLayers[id]){
   if(type.endsWith('pass'))texture(out,at+delay,length,freq,volume,slide,type);
   else voice(out,at+delay,length,freq,volume,slide,type);
  }
 }catch{}
}
const pitchHz=note=>440*2**((note-69)/12);
function scoreStep(track,at){
 const {tempo,root,chords,riff,bass}=arrangements[track.act],step=track.step++;
 const beat=60/tempo,bar=Math.floor(step/16)%8,slot=step%16;
 const key=root+chords[Math.floor(bar/2)],out=echoSound.score;
 const combat=run.status==='combat',boss=combat&&roomNow()?.type==='boss';
 const enraged=boss&&enemies.some(e=>e.boss&&e.phaseShift);
 if(slot===0){
  for(const tone of [0,bar%4<2?7:3,12])voice(out,at,beat*3.7,pitchHz(key-12+tone),.055,1,'sine',beat*.55);
 }
 if(slot%2===0&&(combat||slot%4===0)){
  const note=pitchHz(key-12+bass[slot/2]);
  voice(out,at,beat*.42,note,combat?(enraged?.28:.23):.13,.99,enraged?'sawtooth':'triangle',.021);
 }
 if([0,3,6,8,10,13].includes(slot)||(enraged&&[2,12,15].includes(slot))){
  const note=pitchHz(key+12+riff[(slot+bar)%riff.length]);
  voice(out,at,beat*(combat?.54:.83),note,enraged?.13:.10,.999,enraged?'sawtooth':track.act===1?'triangle':'sine');
  voice(out,at+.009,beat*.22,note*2.011,.046,.96,'triangle');
  voice(out,at+beat*.69,beat*.33,note,.031,1,'sine');
 }
 if(combat){
  if(slot===0||slot===7||slot===10||(boss&&slot===14)||(enraged&&slot===4))voice(out,at,.22,125,boss?.44:.30,.34,'sine');
  if(slot===4||slot===12)texture(out,at,.16,1800,boss?.25:.17,.62,'bandpass');
  if(slot%2===1||boss)texture(out,at,.055,5600,slot%4===1?.088:.048,.8,'highpass');
  if(boss&&slot%8===0)voice(out,at,beat*1.49,pitchHz(key-12),enraged?.15:.115,.997,'sawtooth',.12);
 }
}
function syncAmbience(){
 const act=sound&&state==='playing'?run.act:null;
 if(act==null&&!echoSound)return;
 try{
  const bus=echoAudio();if(!bus)return;
  if(audio.state!=='running')return;
  const now=audio.currentTime;
  if(bus.muted===sound){bus.muted=!sound;bus.foley.gain.setTargetAtTime(sound?.44:0,now,.025);}
  if(act==null){
   if(echoTrack){bus.score.gain.setTargetAtTime(0,now,.04);echoTrack=null;}
   return;
  }
  if(!echoTrack||echoTrack.act!==act){
   echoTrack={act,step:0,next:now+.05};
   bus.score.gain.setTargetAtTime(.26,now,.26);bus.foley.gain.setTargetAtTime(.44,now,.05);
  }
  if(echoTrack.next<now-.10)echoTrack.next=now+.03;
  while(echoTrack.next<now+.16){scoreStep(echoTrack,echoTrack.next);echoTrack.next+=15/arrangements[act].tempo;}
 }catch{}
}
