// Echo Expedition — Hades-style Reactive Narrative, Sanctuary Lounge, Keepsakes & Multi-Run Chronicle
// Self-contained module that hooks cleanly into expedition runtime without modifying core combat files.

const NARRATIVE_KEY='aberrant-echo-narrative';
const narrative={
 runs:0,
 wins:0,
 chronicle:0,
 seen:[],
 bonds:{ember:0,frost:0,shade:0,bastion:0,reaper:0},
 keepsake:null,
 talkedThisReturn:[],
 lastRun:null
};
try{
 const saved=JSON.parse(localStorage.getItem(NARRATIVE_KEY)||'{}');
 if(Number.isFinite(saved.runs)&&saved.runs>=0)narrative.runs=Math.trunc(saved.runs);
 if(Number.isFinite(saved.wins)&&saved.wins>=0)narrative.wins=Math.trunc(saved.wins);
 if(Number.isFinite(saved.chronicle)&&saved.chronicle>=0)narrative.chronicle=Math.min(5,Math.trunc(saved.chronicle));
 if(Array.isArray(saved.seen))narrative.seen=saved.seen;
 if(saved.bonds&&typeof saved.bonds==='object')Object.assign(narrative.bonds,saved.bonds);
 if(typeof saved.keepsake==='string'||saved.keepsake===null)narrative.keepsake=saved.keepsake;
 if(Array.isArray(saved.talkedThisReturn))narrative.talkedThisReturn=saved.talkedThisReturn;
 if(saved.lastRun&&typeof saved.lastRun==='object')narrative.lastRun=saved.lastRun;
}catch{}
function saveNarrative(){try{localStorage.setItem(NARRATIVE_KEY,JSON.stringify(narrative));}catch{}}

const COMPANION_PROFILES={
 ember:{
  id:'ember',name:'烬刃',role:'前末班车护轨安保',color:'#f59b65',
  bio:'失电夜把最后三节车厢的乘客护下高架，右臂却留在了过载火弧里。嘴硬爱扛事，最见不得同伴自己硬撑。',
  keepsake:{id:'ember',name:'焦边末班车票',en:'SCORCHED TICKET',desc:'开局自带 2 格职业资源，且每幕第一间战斗房直接伤害 +15%。'},
  giftLine:'「还给我带残片？行吧，下回你卡在断轨那儿，我替你多烧两条路出来。」'
 },
 frost:{
  id:'frost',name:'霜序',role:'前观测站晶网记录员',color:'#8de2e8',
  bio:'习惯用冷冰冰的统计数字给所有人泼冷水，但圣所急救包永远是她半夜默默补齐的。左臂晶化后体温常年偏低。',
  keepsake:{id:'frost',name:'冰裂怀表',en:'FROSTED POCKETWATCH',desc:'每进入一座房间额外回复 6 点生命，且每局前两次陷阱伤害减半。'},
  giftLine:'「别误会，我收下残片只是为了校准观测镜的误差……算了，谢谢。活着回来。」'
 },
 shade:{
  id:'shade',name:'岚影',role:'前港区夜班信使',color:'#c4a6ff',
  bio:'失电夜差点被相位脉动扯碎在街头，醒来后就学会了用轻佻的玩笑掩盖心慌。对晴湾每一条近道都熟得像自家客厅。',
  keepsake:{id:'shade',name:'双面港徽',en:'TWIN HARBOR CREST',desc:'冲刺斩直接伤害 +20%，闪避充能回复速度提升 15%。'},
  giftLine:'「哟，大方啊！这枚港徽给你别胸口——闪快点，别把我的招牌摔刮花了。」'
 },
 bastion:{
  id:'bastion',name:'玄岩',role:'前干船坞老工头',color:'#e8c882',
  bio:'半副身躯覆满骨甲，说话像敲钢板。那晚他硬扛着三号干船坞的泄压阀没松手，现在把圣所这几个年轻人当自家徒弟看。',
  keepsake:{id:'bastion',name:'铆钉铜哨',en:'RIVETED WHISTLE',desc:'最大生命永久 +20（进局生效），完美反制蓝光攻击额外回复 12 点生命。'},
  giftLine:'「拿稳了。以前在船坞吹响这哨子，意思是弟兄们靠拢——现在意思是，别给我倒在半道上。」'
 },
 reaper:{
  id:'reaper',name:'裂爪',role:'旧港兽舍看护 / 完全异变体',color:'#b8e08e',
  bio:'最彻底失去人形的远征者，却比谁都记得晴湾失电前的气味。台词简短，喜欢用鼻子嗅你从沿线带回来的硝烟和海盐味。',
  keepsake:{id:'reaper',name:'染盐兽牙',en:'SALT-STAINED FANG',desc:'击败精英、试炼与首领房时，额外获得 +20% 晶片与 +2 枚回响残片。'},
  giftLine:'「……暖的。你身上的盐味，和那晚温室吹下来的风很像。拿着牙，去咬穿它们。」'
 }
};

const ECHO_PERSONAS={
 ember:{
  id:'ember',name:'「老灶」周燃',title:'烬火回响 · 船坞主锅炉长',mark:'炎',color:'#f39a78',
  generic:[
   '火候还差得远呢！手再狠点，把这帮铁疙瘩全烧出火星子！',
   '躲什么躲？锅炉房里只有把压力顶回去的道理，拿好我的火！',
   '回响又怎样？再硬的壳子，烧到发红都一样软！'
  ],
  byHero:{
   ember:'哟，同道中人！你右臂这股焦味我闻着就亲切，再来把旺火！',
   frost:'小苏的徒弟？别整天端着那副冷脸，加点炭火才带劲！',
   shade:'窜得跟泥鳅似的！给你的影子点上火，看谁抓得住你！',
   bastion:'老玄头！当年船坞里就属你最耐烤，这回借我炉火砸个痛快！',
   reaper:'好家伙，你这爪子蘸上余烬，连钢板都得给扒穿！'
  },
  trialLead:'选我老周算你识货！晾着旁边那个冰块脸，咱们先烧它个天翻地覆！',
  trialSnub:'好啊，敢先挑别人不挑我？！行，这屋子里的火药味我顺手给你们加倍！'
 },
 frost:{
  id:'frost',name:'「静潮」苏泠',title:'潮霜回响 · 温室冷凝总工',mark:'霜',color:'#91dce3',
  generic:[
   '躁动只会让你犯错。先冻住它们的动作，再谈收割。',
   '脉动过载最怕的不是硬碰，而是降温。接住这份冷凝回路。',
   '别学周燃那样乱挥一气，精准一点，让冰晶替你说话。'
  ],
  byHero:{
   ember:'火气太重容易失控。收下这道霜脉，免得把自己先烧干了。',
   frost:'你的晶化频率很稳。用我的冷凝参数，把整片走廊都封死吧。',
   shade:'速度快是好事，但敌人慢下来的时候，你才算真正掌控节奏。',
   bastion:'玄工头，你还是那么爱硬扛。给你的盾面镀一层霜，省点力气。',
   reaper:'别靠太近……算了，寒气能压住你身上的躁动，拿去吧。'
  },
  trialLead:'明智的选择。至于旁边那位噪音制造者，就让他自己生闷气吧。',
  trialSnub:'宁可听信鲁莽的蛮力？也罢，正好让你体验一下失温的滋味。'
 },
 arc:{
  id:'arc',name:'「跳闸」阿电',title:'脉电回响 · 末班车调度员',mark:'雷',color:'#cfb3ed',
  generic:[
   '滋啦——全线绿灯！这波高压脉冲我偷偷给你并上去了，爽不爽？',
   '别停脚！只要你比电弧窜得快，断轨的警报就追不上你！',
   '欢迎收听晴湾午夜频道！下一站：把对面全电成焦炭！'
  ],
  byHero:{
   ember:'烬刃哥！你当年在车厢里嫌我广播太吵，现在知道我信号好使了吧？',
   frost:'霜序姐别关我频道啊！你的冰导电可好使了，真的！',
   shade:'岚影！咱俩最搭了，闪一下劈一道雷，帅呆了有没有！',
   bastion:'玄叔！我这次没乱拉闸，真的！这电流全是帮你蓄势用的！',
   reaper:'哇，你跑起来静电劈啪响！来来来，再多挂两根引雷针！'
  },
  trialLead:'耶！我就知道你会切到我这个频道！全功率输出，冲！',
  trialSnub:'喂喂喂，把我调静音了是吧？！那可别怪站台突然跳闸咯！'
 },
 forge:{
  id:'forge',name:'「铁砧」老陈',title:'锻锋回响 · 旧城首席铸匠',mark:'锋',color:'#f0cb86',
  generic:[
   '花里胡哨的脉冲靠不住，真正能带你回家的，还是手里这口刃。',
   '刀口钝了就别怪对手甲厚。拿去，刚淬完火的新刃口。',
   '少废话。挥稳第三下，把它们的架势连根敲碎。'
  ],
  byHero:{
   ember:'火候不错，但刀身发飘。我帮你压一压配重，砍下去更有劲。',
   frost:'冰晶脆，武器不能脆。这道锻纹能保你远程近战都不失准头。',
   shade:'轻刃讲究收放。多加一层回锋，擦过去就能带走半条命。',
   bastion:'老伙计，这回别光顾着挡。借我的锻劲，一锤给它掀翻。',
   reaper:'连你都学会握柄了……不错，比有些手抖的新兵强多了。'
  },
  hammerByWeapon:{
   katana:'余烬长刀的脊线还能再拔一截。挑个改造，让它真正出鞘。',
   spear:'脊骨长枪吃的是寸劲与距离。改完这手，三步之外无人近身。',
   dual:'蝶影双刃讲究连绵不断。再磨亮些，快到连回响都录不下你的影子。',
   hammer:'断层重锤就该有掀翻甲板的动静！挑一个，敲碎它们的壳。',
   crossbow:'猎隼连弩的弦张力还留着余量。改完这一发，对面连掩体都躲不住。',
   rifle:'蚀能长铳的聚能管我重新车过一圈。瞄准点，一枪穿它个透心凉。'
  },
  trialLead:'懂行。先把家伙什磨利了，比什么花哨玩意都管用。',
  trialSnub:'嫌我老头子打铁慢？哼，那你先接接这几记重锤试试骨头硬不硬。'
 }
};

const CHRONICLE_CHAPTERS=[
 {
  step:1,code:'ECHO RECORD 01 / 05',title:'23:47 末班车',
  summary:'你穿过镜冠穹庭的紫光，晶床里渗出一段夹杂着暴雨声的站台广播——',
  quote:'「……紧急制动已触发！高架东段绝缘子炸裂，潮汐电网正在倒灌！乘客不要靠近车门——温室！沈工！能听见吗？把应急回流切到山顶，不然整列末班车都要被烧穿！」',
  after:'原来那晚高架断口后面的末班车里坐满了人。紫光亮起的那一秒，救下了整列车厢。'
 },
 {
  step:2,code:'ECHO RECORD 02 / 05',title:'三号闸门',
  summary:'第二次剥离镜冠结晶时，紫光深处传来干船坞粗哑的对讲机杂音与泄压巨响——',
  quote:'「玄岩，放手！三号泄压闸已经超压了！」「放你娘的屁！老子松手，蒸汽直接把桥下撤离通道冲塌！沈工，你那边的紫晶还能扛多久？」「够你们把人全带出旧城街。别回头。」',
  after:'玄岩至今不肯提自己半身骨甲是怎么来的。现在你终于听见了那晚的另一半对话。'
 },
 {
  step:3,code:'ECHO RECORD 03 / 05',title:'幸存者名单',
  summary:'第三重回响散开，温室的折光幕墙映出五份焦黑的应急手环编号——',
  quote:'「车厢护轨员、观测站记录员、夜班信使、船坞工头、兽舍看护……你们五个离过载弧最近，晶床把多余的脉冲分流到了你们体内。活下来了，但也再也回不去普通人的生活了。对不起。」',
  after:'圣所里的五位异变者并非偶然相聚。你们全都是沈岚从失电夜里硬生生抢回来的幸存者。'
 },
 {
  step:4,code:'ECHO RECORD 04 / 05',title:'不肯熄灭的灯',
  summary:'第四次站在紫光之下，声音不再断续。沈岚仿佛就站在晶床玻璃的对面看着你——',
  quote:'「我不是关不掉晶床……只是每次想松手，就会想起末班车拐过弯道时，旧城人说只要看见山上的灯亮着，就知道还能回家。如果我把灯关了，你们五个……真的能靠彼此走下去吗？」',
  after:'回响之所以日复一日重放，不是因为机器坏了，而是留守在光里的人，还在等一个放心的答案。'
 },
 {
  step:5,code:'ECHO RECORD 05 / 05 · 真结局',title:'晴湾黎明',
  summary:'第五次击碎镜冠结晶，圣所同伴的信号同时汇入你的腕表。你替沈岚合上了最后一道校准闸门——',
  quote:'「听见了吗？你们在圣所吵架的声音、打赌的声音、互相留药的声音，全顺着校准镜传上来了。原来早就不需要我替你们守着灯了……晚安，晴湾。天亮了，好好过下去。」',
  after:'紫色光柱化作温柔的晨雾拂过三座街区。回响归于平静，而你随时可以透过回响之镜，重温这段属于晴湾的远征记忆。'
 }
];

// Context-sensitive Sanctuary Conversations (Hades priority queue: highest matching unseen conversation plays first)
const SANCTUARY_DIALOGUES=[
 // === VICTORY REACTIONS ===
 {
  id:'win_first_ember',speaker:'ember',priority:110,
  when:ctx=>ctx.lastRun?.won&&narrative.chronicle>=1,
  lines:ctx=>[
   [ctx.speaker,'真让你一路杀到紫晶温室顶上了？行啊，我在圣所栏杆这儿都看见那道紫光晃了一下。'],
   [ctx.hero,'镜冠花王底下藏着失电夜的广播残响。那晚末班车里的人，是温室强行引走脉冲才活下来的。'],
   [ctx.speaker,'……怪不得。那晚我只记得车厢外头紫得睁不开眼，一眨眼火就烧上了胳膊。歇口气，下次再去听听后半段。']
  ]
 },
 {
  id:'win_first_frost',speaker:'frost',priority:108,
  when:ctx=>ctx.lastRun?.won&&narrative.chronicle>=1,
  lines:ctx=>[
   [ctx.speaker,'校准镜刚才的读数跌了 12%。你真的打穿镜冠穹庭了。'],
   [ctx.hero,'紫光里还有人说话的声音。像是失电夜留守在温室里的总工。'],
   [ctx.speaker,'……沈岚老师。我就知道她当晚根本没上撤离船。拿着我的怀表，下次别在半路上浪费血量。']
  ]
 },
 {
  id:'win_second_bastion',speaker:'bastion',priority:112,
  when:ctx=>ctx.lastRun?.won&&narrative.chronicle>=2,
  lines:ctx=>[
   [ctx.speaker,'看你这眼神……你在山顶听见三号干船坞的对讲录音了？'],
   [ctx.hero,'你那晚一直死按着泄压闸没松手，对吧？'],
   [ctx.speaker,'哼，干工头的不护着后头撤离的人，算什么工头？别到处宣扬。拿好铜哨，下回把剩下的话听完。']
  ]
 },
 {
  id:'win_third_shade',speaker:'shade',priority:114,
  when:ctx=>ctx.lastRun?.won&&narrative.chronicle>=3,
  lines:ctx=>[
   [ctx.speaker,'喂喂，刚从温室回来怎么一脸严肃？难道花王临死前还讲了冷笑话？'],
   [ctx.hero,'我们五个的异变不是意外——是失电夜温室分流脉冲时，为了保住我们命留下的烙印。'],
   [ctx.speaker,'……呵，难怪我总觉得每次相位闪现，耳边都像有人推了我一把。谢了，伙计，这下更不能半途而废了。']
  ]
 },
 {
  id:'win_fifth_true_frost',speaker:'frost',priority:120,
  when:ctx=>narrative.chronicle>=5,
  lines:ctx=>[
   [ctx.speaker,'山顶的光柱散了。晴湾的海风里，第一次没有过载晶体的焦味。'],
   [ctx.hero,'她听见我们平时在圣所吵架和互相留药的声音了。她说，天亮了。'],
   [ctx.speaker,'……嗯。观测站的灯以后由我们轮流守吧。要是手痒想再练练，回响之镜随时还能重放旧脉冲。']
  ]
 },
 {
  id:'win_fifth_true_ember',speaker:'ember',priority:119,
  when:ctx=>narrative.chronicle>=5,
  lines:ctx=>[
   [ctx.speaker,'干得漂亮！晴湾总算迎来一个不用听警报声的清晨了。'],
   [ctx.hero,'以后圣所不用再整天绷着弦了。'],
   [ctx.speaker,'那可不一定——裂爪刚又把我的干粮叼走了。不过说真的，能和你们一起走到天亮，值了。']
  ]
 },

 // === SPECIFIC DEFEAT / LAST-RUN REACTIONS ===
 {
  id:'die_act1_frost',speaker:'frost',priority:95,
  when:ctx=>ctx.lastRun&&!ctx.lastRun.won&&ctx.lastRun.act===0,
  lines:ctx=>[
   [ctx.speaker,'折在晴湾断轨了？让我猜猜——是不是盯着怪砍太上头，踩进通电轨道了？'],
   [ctx.hero,'那截高架又窄，断轨镇守者的甲壳还硬得离谱。'],
   [ctx.speaker,'看见橙色预警就用冲刺斩侧滑，别硬扛。给，刚换的冰裂怀表，下次进门记得稳住血线。']
  ]
 },
 {
  id:'die_act1_ember',speaker:'ember',priority:94,
  when:ctx=>ctx.lastRun&&!ctx.lastRun.won&&ctx.lastRun.act===0,
  lines:ctx=>[
   [ctx.speaker,'没事，头几趟栽在断轨上不丢人。那条高架我闭着眼都能走，但带着电可就两说了。'],
   [ctx.hero,'下次我直接贴脸抢节奏，不让它把战线拖长。'],
   [ctx.speaker,'这就对了！顺手在回响之镜里把残片花了，下趟把那铁壳子掀翻。']
  ]
 },
 {
  id:'die_act2_bastion',speaker:'bastion',priority:96,
  when:ctx=>ctx.lastRun&&!ctx.lastRun.won&&ctx.lastRun.act===1,
  lines:ctx=>[
   [ctx.speaker,'一身海盐和白汽味……你在鸣潮船坞吃亏了吧？'],
   [ctx.hero,'三号干船坞的泄压喷口配合母舰激光，一不留神就被封死了走位。'],
   [ctx.speaker,'听好了：喷口起雾前有半拍低鸣，激光抬手泛蓝光就按 C 反制！记住了，别给船坞丢脸。']
  ]
 },
 {
  id:'die_act2_shade',speaker:'shade',priority:93,
  when:ctx=>ctx.lastRun&&!ctx.lastRun.won&&ctx.lastRun.act===1,
  lines:ctx=>[
   [ctx.speaker,'哈哈哈，你头发全让船坞的蒸汽吹炸毛了！被潮鸣母舰追着满场跑了吧？'],
   [ctx.hero,'有本事下回你上去接它那三道折光锁线。'],
   [ctx.speaker,'别急呀，戴上我的双面港徽，冲刺斩甩得比它转身还快，包你溜得它找不着北。']
  ]
 },
 {
  id:'die_act3_frost',speaker:'frost',priority:98,
  when:ctx=>ctx.lastRun&&!ctx.lastRun.won&&ctx.lastRun.act===2,
  lines:ctx=>[
   [ctx.speaker,'已经摸到紫晶温室了……就差最后一口气，真可惜。'],
   [ctx.hero,'镜冠花王转阶段的时候，整座穹顶的晶床都在炸。'],
   [ctx.speaker,'花王半血转阶段天色一变，立刻停手拉开等第一波晶环落完。你已经离那束紫光很近了。']
  ]
 },
 {
  id:'die_act3_reaper',speaker:'reaper',priority:97,
  when:ctx=>ctx.lastRun&&!ctx.lastRun.won&&ctx.lastRun.act===2,
  lines:ctx=>[
   [ctx.speaker,'……紫晶的味道。很甜。很危险。'],
   [ctx.hero,'你闻过温室里的花？'],
   [ctx.speaker,'失电夜，风从山顶吹下来，全是这个味。下次，把它的花冠咬碎。']
  ]
 },
 {
  id:'react_revive_ember',speaker:'ember',priority:92,
  when:ctx=>ctx.lastRun?.usedRevive,
  lines:ctx=>[
   [ctx.speaker,'听说你刚才在沿线把「残火续命」都烧出来了？够拼的啊！'],
   [ctx.hero,'差点就交待在半路了，硬是靠那一口余火撑了回来。'],
   [ctx.speaker,'只要灯还没灭，半条命也能翻盘。我就喜欢你这股不服输的劲儿。']
  ]
 },
 {
  id:'react_trial_shade',speaker:'shade',priority:91,
  when:ctx=>ctx.lastRun?.wonTrial,
  lines:ctx=>[
   [ctx.speaker,'你刚才居然敢接「双系试炼房」？老灶和苏工在脉冲里吵起来的时候，我在这边耳麦都快震聋了！'],
   [ctx.hero,'嘴上骂得凶，给的双倍回响倒是真香。'],
   [ctx.speaker,'也是，富贵险中求嘛。下回看到双系门，继续让他们互相吃醋！']
  ]
 },
 {
  id:'react_weapon_hammer_bastion',speaker:'bastion',priority:86,
  when:ctx=>ctx.lastRun?.weapon==='hammer',
  lines:ctx=>[
   [ctx.speaker,'刚才拎着「断层重锤」出去的？好眼光！'],
   [ctx.hero,'挥起来沉了点，但破甲和震地的手感真解气。'],
   [ctx.speaker,'重锤不怕慢，怕的是心虚。遇到锻炉质变优先拿「陨星跳砸」，一锤清场！']
  ]
 },
 {
  id:'react_weapon_dual_shade',speaker:'shade',priority:85,
  when:ctx=>ctx.lastRun?.weapon==='dual',
  lines:ctx=>[
   [ctx.speaker,'用「蝶影双刃」手感上瘾了吧？快得像在风里切纸一样。'],
   [ctx.hero,'就是太容易贴脸贪刀，一不留神就被反拍。'],
   [ctx.speaker,'所以要配冲刺斩呀！打两下就闪，让残像替你挨打。']
  ]
 },
 {
  id:'react_weapon_rifle_frost',speaker:'frost',priority:85,
  when:ctx=>ctx.lastRun?.weapon==='rifle',
  lines:ctx=>[
   [ctx.speaker,'「蚀能长铳」的射程优势，你用得还算顺手。'],
   [ctx.hero,'拉远蓄力穿成一串的时候确实痛快。'],
   [ctx.speaker,'记得配合潮霜减速控距离。敌人走不到你面前，就已经输了一半。']
  ]
 },

 // === FIRST GREETINGS & WORLD-BUILDING ===
 {
  id:'intro_ember',speaker:'ember',priority:80,
  when:()=>true,
  lines:ctx=>[
   [ctx.speaker,'准备出发了？站在圣所高台往下看，断轨、船坞、紫晶温室全在眼皮底下。'],
   [ctx.hero,'每次潮汐发电，底下那三片街区都会重演失电夜的回响。'],
   [ctx.speaker,'管它重演几遍，带回来的残片都能刻进回响之镜。拿着我的焦边车票，回头请我喝热茶。']
  ]
 },
 {
  id:'intro_frost',speaker:'frost',priority:79,
  when:()=>true,
  lines:ctx=>[
   [ctx.speaker,'出发前先看一眼共鸣预言碑和回响之镜，别空手往脉冲里撞。'],
   [ctx.hero,'你总是把每一步算得这么细。'],
   [ctx.speaker,'因为我想让每个走出去的人，都能完完整整走回来。这枚冰裂怀表你先带着。']
  ]
 },
 {
  id:'intro_shade',speaker:'shade',priority:78,
  when:()=>true,
  lines:ctx=>[
   [ctx.speaker,'哟，真打算一个人走完晴湾三幕？那我就在高台给你当啦啦队咯。'],
   [ctx.hero,'少贫嘴，沿线哪扇奖励门划算你倒是给我透个底。'],
   [ctx.speaker,'看见「武器质变锻炉」闭眼进！还有，别忘了闪避接左键的冲刺斩，帅还管用。']
  ]
 },
 {
  id:'intro_bastion',speaker:'bastion',priority:77,
  when:()=>true,
  lines:ctx=>[
   [ctx.speaker,'外头风大，把护具扣紧了。断轨和船坞那些铁家伙，最喜欢欺负站桩的人。'],
   [ctx.hero,'明白，看到蓝光蓄力我就按 C 反制回去。'],
   [ctx.speaker,'好小子，记性不错。这只铆钉铜哨留着防身，撑不住了就回来歇脚。']
  ]
 },
 {
  id:'intro_reaper',speaker:'reaper',priority:76,
  when:()=>true,
  lines:ctx=>[
   [ctx.speaker,'……你醒了。风里有海盐、铁锈，还有山上的紫光。'],
   [ctx.hero,'裂爪，你今天没跟我一起下坡吗？'],
   [ctx.speaker,'留守。看门。这颗兽牙给你——猎物倒下时，它会替你多叼回几块闪亮的晶片。']
  ]
 },

 // === SECOND-LAYER PERSONAL STORIES ===
 {
  id:'lore_ember_train',speaker:'ember',priority:65,
  when:()=>narrative.runs>=2,
  lines:ctx=>[
   [ctx.speaker,'以前晴湾末班车经过弯道时，车窗里总能看见山顶温室亮着，大家管它叫「山上的灯」。'],
   [ctx.hero,'现在那盏灯还在亮，只是谁也不敢靠近了。'],
   [ctx.speaker,'所以才轮到我们上去瞧瞧嘛。总不能让整座港口永远停在失电那一晚。']
  ]
 },
 {
  id:'lore_frost_mirror',speaker:'frost',priority:64,
  when:()=>narrative.runs>=2,
  lines:ctx=>[
   [ctx.speaker,'左面那面「回响之镜」，原本只是观测站用来校准海岸灯塔折光的普通棱镜。'],
   [ctx.hero,'现在却能把我们从沿线带回来的残片变成永久能力。'],
   [ctx.speaker,'或许它记住的不是电力，而是我们一次次折返又不肯放弃的惯性。']
  ]
 },
 {
  id:'lore_shade_echoes',speaker:'shade',priority:63,
  when:()=>narrative.runs>=2,
  lines:ctx=>[
   [ctx.speaker,'你发现没？沿线那些回响里藏着四个熟人的声音——老灶、苏工、阿电，还有打铁的老陈。'],
   [ctx.hero,'他们把自己的执念留在应急电网里了。'],
   [ctx.speaker,'嘴一个比一个碎，但每次关键时刻借的力量可一点没缩水。']
  ]
 },
 {
  id:'lore_bastion_reaper',speaker:'bastion',priority:62,
  when:()=>narrative.runs>=3,
  lines:ctx=>[
   [ctx.speaker,'别看裂爪现在这副模样，失电夜前它是港务局最心细的兽舍看护。'],
   [ctx.hero,'它好像一直守在圣所栏杆边，盯着温室方向。'],
   [ctx.speaker,'它比我们鼻子都灵。它知道山顶上还有个熟人没回家。']
  ]
 },
 {
  id:'lore_reaper_smell',speaker:'reaper',priority:61,
  when:()=>narrative.runs>=3,
  lines:ctx=>[
   [ctx.speaker,'霜序的药，苦。烬刃的火，呛。老工头的哨子，咸。'],
   [ctx.hero,'那你觉得圣所闻起来像什么？'],
   [ctx.speaker,'……像风暴停了以后的港湾。暖的。不想离开。']
  ]
 }
];

// Ambient fallback lines when all high-priority stories are seen
const AMBIENT_LINES={
 ember:['热身好了就出发吧，断轨那帮家伙可不会自己散架。','打累了就回来歇着，圣所的灯一直给你留着。','残片攒够了记得去照回响之镜，别舍不得花。'],
 frost:['潮位又涨了，这次脉冲波动比上一轮略稳，是个突破的好时机。','如果抽到双系共鸣，战力会质变——按 M 随时可以追踪路线。','你的脉搏比前几次稳多了。保持这个节奏。'],
 shade:['赌一把？这趟你肯定能把区域首领按在地上摩擦！','别光顾着赶路，行商营地和锻炉质变经常藏着翻盘神卡。','冲刺斩接技能，谁用谁知道——回头记得请我吃烤鱼。'],
 bastion:['稳住下盘，该躲就躲，该反制就果断按 C。','晴湾这三块地界我修了一辈子，每道缺口都记得清清楚楚。','不管带回多少残片，只要人活着回来，这一趟就不亏。'],
 reaper:['……风向变了。去吧。','爪子磨利了。这次会走得更远。','带着我的牙，把亮晶晶的晶片全抢回来。']
};

// In-combat floating barks (zero pause, punchy 1-liners)
const HERO_BARKS={
 actStart:{
  0:{
   ember:'末班车还停在断口后头……老规矩，先清出一条路！',
   frost:'晴湾断轨，脉冲周期稳定。开始逐段清理。',
   shade:'又回高架了！看看今晚站台给咱们准备了什么欢迎礼。',
   bastion:'断裂的桥架又通电了……走吧，别踩在轨面上。',
   reaper:'……铁锈，焦味。猎场开了。'
  },
  1:{
   ember:'鸣潮船坞的蒸汽喷口又响了，这次别想把我困在货场！',
   frost:'进入潮汐港池，空气湿度上升——电系与冰系会格外有效。',
   shade:'哈，三号干船坞的吊机还在嘎吱响，老熟人一样！',
   bastion:'回到船坞了……弟兄们当年干活的地方，绝不让畸变体占着。',
   reaper:'……海盐味浓了。大铁壳就在前面。'
  },
  2:{
   ember:'紫晶温室……抬头就能看见那道紫光了，最后一幕！',
   frost:'晶床脉动就在正前方。沈老师，我马上到了。',
   shade:'哇，满穹顶的紫晶花，漂亮是漂亮，就是个个都想炸我。',
   bastion:'盘山路走到头了。把镜冠花王放倒，听清山上的回响。',
   reaper:'……花香。还有那晚的味道。近了。'
  }
 },
 bossIntro:{
  0:{
   ember:'「断轨镇守者」——让开换乘台，这班车今晚必须过站！',
   frost:'甲壳嵌合了高架轨件……找准蓄力蓝光反制它的重击。',
   shade:'大螃蟹又堵门啦？看我绕到你背后拆零件！',
   bastion:'披着钢轨的硬壳怪！来，比比谁更耐砸！',
   reaper:'……硬壳。敲碎，撕开。'
  },
  1:{
   ember:'「潮鸣母舰」终于露头了！把船坞的火气全撒你身上！',
   frost:'高频折光雷达已锁定……横向位移，别站在光束线上。',
   shade:'这么大一艘浮空舰，躲进干船坞里可真够挤的！',
   bastion:'三号船坞是老子的地盘，轮不到你在这儿耀武扬威！',
   reaper:'……吵死了。打落下来。'
  },
  2:{
   ember:'「镜冠花王」——把被你缠住的晶床和声音，全还给晴湾！',
   frost:'它包裹着最早过载的核心晶床……准备终局决战。',
   shade:'好大一朵发光紫花！赢了这局，圣所今天加菜！',
   bastion:'最后一道坎。来吧，看看你的花冠扛不扛得住！',
   reaper:'……就在花下面。咬断它！'
  }
 },
 revive:{
  ember:'想熄我的火？还早着呢！',
  frost:'心跳恢复……绝不会倒在这里！',
  shade:'差点翻车！还好留了一手相位替身！',
  bastion:'这点冲击就想放倒老子？再来！',
  reaper:'……还没完！继续猎！'
 },
 parry:{
  ember:'破绽太大了！吃我反手一刀！',
  frost:'时机精确，反制成立。',
  shade:'嘿，猜到你要砸这一下了！',
  bastion:'就这点力道？给我弹回去！',
  reaper:'……抓住了！'
 },
 dashStrike:{
  ember:'炎风掠过，连人带刃一起劈开！',
  frost:'位移切入，节奏在我手里。',
  shade:'影步接斩——眼睛跟得上吗？',
  bastion:'突进抢位，不留空当！',
  reaper:'……扑咬！'
 },
 lowHpClear:{
  ember:'呼……差点把命搭在这屋里，赶紧找补给！',
  frost:'生命体征跌破警戒线，下一扇门必须优先稳血。',
  shade:'妈呀，刚才那下擦着鼻尖飞过去的！',
  bastion:'骨甲裂了两道口子……还能顶，继续走。',
  reaper:'……流血了。还站得住。'
 }
};

const BOSS_PHASE2_LINES=[
 {speaker:'晴湾站台残响广播',role:'23:47 过载警报',color:'#ff9d6c',mark:'轨',text:'「滋啦——警告！末班车断口重新带电！高压回流进入二阶段！」'},
 {speaker:'三号干船坞泄压塔',role:'潮汐超压播报',color:'#8ae0ee',mark:'潮',text:'「滋啦——坞底全部泄压闸强制开启！潮鸣母舰折光阵列全功率！」'},
 {speaker:'沈岚 · 镜冠残响',role:'紫晶穹顶微弱频段',color:'#e099ff',mark:'晶',text:'「……是你吗？小心晶床过载——再坚持一下，紫光就要松动了！」'}
];

// Runtime narrative state
const narrativeRuntime={
 barkUntil:0,
 lastBarkAt:-99,
 barkTimer:null,
 usedRevive:false,
 wonTrial:false,
 trapHalvesLeft:0,
 runParries:0,
 runDashStrikes:0,
 selectedCampHero:null
};

function companionOrder(){
 return Object.keys(COMPANION_PROFILES).filter(id=>id!==chosenClass);
}
function buildDialogueContext(speakerId){
 return {
  speaker:COMPANION_PROFILES[speakerId].name,
  hero:HEROES[chosenClass]?.name||'远征者',
  heroId:chosenClass,
  lastRun:narrative.lastRun
 };
}
function pickCompanionDialogue(speakerId){
 const ctx=buildDialogueContext(speakerId);
 const matches=SANCTUARY_DIALOGUES.filter(d=>d.speaker===speakerId&&!narrative.seen.includes(d.id)&&d.when(ctx));
 matches.sort((a,b)=>b.priority-a.priority);
 if(matches.length)return {entry:matches[0],isNew:true,lines:matches[0].lines(ctx)};
 const pool=AMBIENT_LINES[speakerId]||['祝你一路顺风。'];
 const idx=(narrative.runs+(narrative.bonds[speakerId]||0))%pool.length;
 return {entry:null,isNew:false,lines:[[ctx.speaker,pool[idx]]]};
}
function hasUnreadDialogue(speakerId){
 if(narrative.talkedThisReturn.includes(speakerId))return false;
 return pickCompanionDialogue(speakerId).isNew;
}
function countUnreadCompanions(){
 return companionOrder().filter(hasUnreadDialogue).length;
}
function activeKeepsake(){
 return narrative.keepsake&&COMPANION_PROFILES[narrative.keepsake]?COMPANION_PROFILES[narrative.keepsake].keepsake:null;
}
function equipKeepsake(id){
 if(id&&!(narrative.bonds[id]>=1))return false;
 narrative.keepsake=narrative.keepsake===id?null:id;
 saveNarrative();
 updateNarrativeHubUI();
 return true;
}
function talkToCompanion(speakerId){
 const picked=pickCompanionDialogue(speakerId);
 if(picked.entry&&!narrative.seen.includes(picked.entry.id)){
  narrative.seen.push(picked.entry.id);
 }
 if(!narrative.talkedThisReturn.includes(speakerId))narrative.talkedThisReturn.push(speakerId);
 const prevBond=narrative.bonds[speakerId]||0;
 if(prevBond===0){
  narrative.bonds[speakerId]=1;
  if(typeof cue==='function')cue('prophecy');
 }else if(picked.isNew&&prevBond<3){
  narrative.bonds[speakerId]=prevBond+1;
 }
 saveNarrative();
 updateNarrativeHubUI();
 return {picked,justUnlockedKeepsake:prevBond===0};
}
function giftCompanionShard(speakerId){
 const cost=10;
 if((narrative.bonds[speakerId]||0)>=3||meta.shards<cost)return false;
 meta.shards-=cost;
 narrative.bonds[speakerId]=Math.min(3,(narrative.bonds[speakerId]||0)+1);
 saveMeta();saveNarrative();
 if(typeof cue==='function')cue('prophecy');
 if(typeof updateRecord==='function')updateRecord();
 updateNarrativeHubUI();
 return true;
}

// === ZERO-INTERRUPT FLOATING COMBAT BARK ===
function ensureBarkElement(){
 let el=$('rg-bark');
 if(!el&&$('hud')){
  el=document.createElement('aside');
  el.id='rg-bark';
  el.setAttribute?.('aria-live','polite');
  el.innerHTML='<div class="rg-bark-face"></div><div class="rg-bark-text"><div class="rg-bark-head"><b></b><small></small></div><p></p></div>';
  $('hud').appendChild(el);
 }
 return el;
}
function showBark(speaker,role,text,{color='#f5a676',portrait=null,mark='✦',duration=3.5,force=false}={}){
 if(!text)return;
 const now=typeof time==='number'?time:0;
 if(!force&&now-narrativeRuntime.lastBarkAt<2.4)return;
 narrativeRuntime.lastBarkAt=now;
 narrativeRuntime.barkUntil=now+duration;
 const el=ensureBarkElement();
 if(!el)return;
 el.style.setProperty?.('--bark-ink',color);
 const face=el.querySelector('.rg-bark-face');
 if(face){
  face.innerHTML=portrait?'<img src="'+assetURL(portrait)+'" alt="">':mark;
 }
 const b=el.querySelector('.rg-bark-head b'),sm=el.querySelector('.rg-bark-head small'),p=el.querySelector('p');
 if(b)b.textContent=speaker;
 if(sm)sm.textContent=role;
 if(p)p.textContent=text;
 el.classList.add('show');
 if(narrativeRuntime.barkTimer)clearTimeout(narrativeRuntime.barkTimer);
 if(typeof setTimeout==='function'){
  narrativeRuntime.barkTimer=setTimeout(()=>el.classList.remove('show'),Math.round(duration*1000));
 }
}
function showHeroBark(text,force=false){
 const h=heroNow();
 showBark(h.name,h.tag,text,{color:'#'+h.color.toString(16).padStart(6,'0'),portrait:chosenClass+'.webp',force});
}

// === BOON / PANEL VOICE BANNER ===
function pickEchoVoice(schoolId,context='draft'){
 const p=ECHO_PERSONAS[schoolId]||ECHO_PERSONAS.forge;
 let text='';
 if(context==='hammer'&&p.hammerByWeapon?.[loadout[0]])text=p.hammerByWeapon[loadout[0]];
 else if(context==='trial')text=p.trialLead;
 else if(p.byHero?.[chosenClass]&&((run.roomsCleared||0)+(run.drawNumber||0))%2===0)text=p.byHero[chosenClass];
 else text=p.generic[((run.roomsCleared||0)+(run.act||0)+(run.drawNumber||0))%p.generic.length];
 return {persona:p,text};
}
function renderVoiceBannerHTML(speaker,role,mark,color,text){
 return '<div class="rg-voice-banner" style="--voice-ink:'+color+'"><div class="rg-voice-badge">'+mark+'</div><div class="rg-voice-copy"><div class="rg-voice-who"><b>'+speaker+'</b><small>'+role+'</small></div><p>「'+text+'」</p></div></div>';
}
function panelVoiceHTML(panel){
 if(panel==='draft'){
  const primarySchool=run.roomSchool||run.offers?.[0]?.school||run.focus||'ember';
  const mode=roomNow()?.type==='trial'?'trial':'draft';
  const {persona,text}=pickEchoVoice(primarySchool,mode);
  return renderVoiceBannerHTML(persona.name,persona.title,persona.mark,persona.color,text);
 }
 if(panel==='hammer'){
  const {persona,text}=pickEchoVoice('forge','hammer');
  return renderVoiceBannerHTML(persona.name,persona.title,persona.mark,persona.color,text);
 }
 if(panel==='shop'){
  const {persona}=pickEchoVoice('forge','draft');
  return renderVoiceBannerHTML('旧港行商 · 补给站',persona.name+' 留下的检修台','商','#e9bf82','前面就是区域首领了。晶片留在口袋里可带不进下辈子，趁现在把家伙什改利索！');
 }
 if(panel==='event'){
  return renderVoiceBannerHTML('回响祭坛 · 失电残影','晴湾旧电网分流点','✧','#cfa8f2','紫晶脉冲在祭坛表面轻轻震颤。你可以用血、晶片或风险，换取更锋利的回响。');
 }
 if(panel==='camp'){
  return renderVoiceBannerHTML('沿线行商营地','风暴前的临时检修棚','⛺','#98d5bd','棚灯还亮着。休整片刻，或听一段祭坛里封存的脉冲交易。');
 }
 return '';
}

// === SANCTUARY COMPANION LOUNGE & CHRONICLE MODALS ===
function renderSanctuaryChatter(){
 const card=$('rg-sanctuary-chatter');
 if(!card)return;
 const roster=companionOrder();
 const speakerId=roster.find(hasUnreadDialogue)||roster[narrative.runs%roster.length];
 if(!speakerId){card.classList.add('hidden');return;}
 const prof=COMPANION_PROFILES[speakerId];
 const picked=pickCompanionDialogue(speakerId);
 const unread=hasUnreadDialogue(speakerId);
 card.dataset.speaker=speakerId;
 card.style.setProperty?.('--speaker',prof.color);
 card.classList.remove('hidden');
 card.innerHTML='<img class="rg-chatter-avatar" src="'+assetURL(speakerId+'.webp')+'" alt="'+prof.name+'"><div class="rg-chatter-body"><div class="rg-chatter-meta"><strong>'+prof.name+'</strong><span>'+prof.role+'</span><em>'+(unread?'! 新对话':'点击畅聊')+'</em></div><p>「'+picked.lines[0][1]+'」</p></div>';
}
function renderKeepsakeStrip(){
 const strip=$('rg-keepsake-strip');
 if(!strip)return;
 const ks=activeKeepsake();
 strip.innerHTML=ks
  ?'<div><b>随身信物 · '+ks.name+'</b><span>　'+ks.desc+'</span></div><button id="rg-strip-camp">更换</button>'
  :'<div><b>随身信物 · 未佩戴</b><span>　在圣所与同伴对话即可解锁专属信物</span></div><button id="rg-strip-camp">前往营地</button>';
 $('rg-strip-camp')?.addEventListener('click',()=>showCompanionDialog());
}
function updateNarrativeHubUI(){
 const unread=countUnreadCompanions();
 const campBtn=$('rg-open-camp');
 if(campBtn){
  campBtn.innerHTML='💬 同伴与信物'+(unread?'<span class="rg-badge-hot">! '+unread+'</span>':'');
 }
 const chronBtn=$('rg-open-chronicle');
 if(chronBtn){
  chronBtn.innerHTML='📡 回响纪事 ('+narrative.chronicle+'/5)';
 }
 renderSanctuaryChatter();
 renderKeepsakeStrip();
}

function showCompanionDialog(focusId=null,justGifted=false,justUnlocked=false){
 sanctuaryView='hero';
 const roster=companionOrder();
 const activeId=roster.includes(focusId)?focusId:(roster.includes(narrativeRuntime.selectedCampHero)?narrativeRuntime.selectedCampHero:(roster.find(hasUnreadDialogue)||roster[0]));
 narrativeRuntime.selectedCampHero=activeId;
 const prof=COMPANION_PROFILES[activeId];
 const bond=narrative.bonds[activeId]||0;
 const picked=pickCompanionDialogue(activeId);
 const unread=hasUnreadDialogue(activeId);
 const equipped=narrative.keepsake===activeId;
 const hearts='♥'.repeat(bond)+'♡'.repeat(Math.max(0,3-bond));

 const rosterHTML=roster.map(id=>{
  const p=COMPANION_PROFILES[id],b=narrative.bonds[id]||0,u=hasUnreadDialogue(id);
  const ksTag=narrative.keepsake===id?' · 已佩戴信物':'';
  return '<button class="rg-camp-card '+(id===activeId?'active':'')+'" data-camp-hero="'+id+'" style="--ink:'+p.color+'"><img src="'+assetURL(id+'.webp')+'" alt="'+p.name+'"><div class="rg-camp-meta"><strong>'+p.name+(u?'<span class="rg-dot-new">NEW</span>':'')+'</strong><small>'+p.role+ksTag+'</small><span class="rg-hearts">'+'♥'.repeat(b)+'♡'.repeat(Math.max(0,3-b))+'</span></div></button>';
 }).join('');

 const linesToShow=justGifted?[[prof.name,prof.giftLine]]:picked.lines;
 const dialogueHTML=linesToShow.map(([who,txt])=>{
  const isHero=who===HEROES[chosenClass]?.name;
  const lineInk=isHero?'#9cf0cf':prof.color;
  return '<div class="rg-dialogue-line" style="--line-ink:'+lineInk+'"><b>'+who+'</b><p>「'+txt+'」</p></div>';
 }).join('');

 const unlockNotice=justUnlocked?'<div class="rg-dialogue-line" style="--line-ink:#ffe28a"><b>✦ 解锁随身信物</b><p>你获得了 '+prof.name+' 的随身信物「'+prof.keepsake.name+'」，现可立即佩戴出征！</p></div>':'';

 const ksBtn=bond>=1
  ?'<button data-equip-ks="'+activeId+'" class="'+(equipped?'equipped':'')+'">'+(equipped?'✓ 已佩戴（点击卸下）':'佩戴此信物')+'</button>'
  :'<button disabled>对话 1 次解锁</button>';

 const guide=$('rg-guide');
 guide.innerHTML='<section class="rg-sanctuary-modal"><header><div><small>SANCTUARY LOUNGE · 圣所同伴营地</small><h2>同伴与随身信物</h2></div><div class="rg-shard-pill">◈ 持有残片 <b>'+meta.shards+'</b></div><button data-close>返回圣所</button></header><p class="rg-modal-sub">每次从沿线归来，留守圣所的同伴都会记住你上一局的经历。对话可解锁专属随身信物，赠予回响残片可升温羁绊。</p><div class="rg-camp-grid"><div class="rg-camp-roster">'+rosterHTML+'</div><div class="rg-camp-stage" style="--ink:'+prof.color+'"><div class="rg-camp-hero"><img src="'+assetURL(activeId+'.webp')+'" alt="'+prof.name+'"><div><small>'+prof.role+' · 羁绊 '+hearts+'</small><h3>'+prof.name+'</h3><p>'+prof.bio+'</p></div></div><div class="rg-dialogue-box">'+dialogueHTML+unlockNotice+'<div class="rg-dialogue-actions"><button class="primary" data-camp-talk="'+activeId+'">'+(unread?'💬 倾听新话题':'💬 再聊几句')+'</button><button data-camp-gift="'+activeId+'" '+(bond>=3||meta.shards<10?'disabled':'')+'>'+(bond>=3?'♥ 羁绊已满':'🎁 赠予 10 残片升温')+'</button></div></div><div class="rg-keepsake-box"><div><small>KEEPSAKE · '+prof.keepsake.en+'</small><strong>'+prof.keepsake.name+'</strong><p>'+prof.keepsake.desc+'</p></div>'+ksBtn+'</div></div></div></section>';
 guide.classList.remove('hidden');
}

function showChronicleDialog(){
 sanctuaryView='panorama';
 const rows=CHRONICLE_CHAPTERS.map(ch=>{
  const unlocked=narrative.chronicle>=ch.step;
  if(!unlocked){
   return '<article class="rg-chronicle-item locked"><small>'+ch.code+' · 未解锁</small><h3>？？？</h3><p>第 '+ch.step+' 次击败紫晶温室「镜冠花王」后，即可从紫光中剥离这段失电夜记忆。</p></article>';
  }
  return '<article class="rg-chronicle-item"><small>'+ch.code+' · 已剥离</small><h3>'+ch.title+'</h3><p>'+ch.summary+'</p><blockquote>'+ch.quote+'</blockquote><p style="margin-top:8px;color:#cde4dc">'+ch.after+'</p></article>';
 }).join('');
 const guide=$('rg-guide');
 guide.innerHTML='<section class="rg-sanctuary-modal"><header><div><small>BLACKOUT CHRONICLE · 五重回响真结局</small><h2>失电夜回响纪事 ('+narrative.chronicle+' / 5)</h2></div><div class="rg-shard-pill">✦ 已通关 <b>'+narrative.wins+'</b> 次</div><button data-close>返回圣所</button></header><p class="rg-modal-sub">每次穿越晴湾三幕抵达紫晶温室，都能剥离一层过载结晶，拼凑出“山上的灯”彻夜不熄的真正秘密。</p><div class="rg-chronicle-list">'+rows+'</div></section>';
 guide.classList.remove('hidden');
}

// === RESULT SCREEN POST-RUN STORY TEASER ===
function updateResultStory(success,newlyUnlockedStep){
 let box=$('rg-result-story');
 if(!box&&$('raid-result')?.parentElement){
  box=document.createElement('div');
  box.id='rg-result-story';
  if(typeof $('raid-result').after==='function')$('raid-result').after(box);
  else $('raid-result').parentElement.appendChild(box);
 }
 if(!box)return;
 const unreadCount=countUnreadCompanions();
 const firstSpeakerId=companionOrder().find(hasUnreadDialogue);
 const speakerHint=firstSpeakerId
  ?'💬 返回圣所后，<b>'+COMPANION_PROFILES[firstSpeakerId].name+'</b> 等 '+unreadCount+' 位同伴正有关于刚才这一局的新话题想找你聊聊。'
  :'💬 回到圣所营地，与同伴聊聊刚才的远征或更换随身信物吧。';

 if(success&&newlyUnlockedStep){
  const ch=CHRONICLE_CHAPTERS[newlyUnlockedStep-1];
  box.innerHTML='<small>✦ 新解锁记忆 · '+ch.code+'</small><b>《'+ch.title+'》</b><p>'+ch.quote+'</p><div class="rg-result-hint">'+ch.after+'<br>'+speakerHint+'</div>';
  box.classList.remove('hidden');
 }else if(success){
  box.innerHTML='<small>✦ 晴湾黎明 · 回响重温</small><b>山上的灯已化作晨雾</b><p>你再次走完了整条晴湾远征线。圣所里的同伴已经记住了这次凯旋。</p><div class="rg-result-hint">'+speakerHint+'</div>';
  box.classList.remove('hidden');
 }else{
  const actName=acts[run.act]?.name||'沿线';
  box.innerHTML='<small>ECHO RETURN · 折返圣所</small><b>记忆随残片一同带回了高台</b><p>你在「'+actName+'」留下的战斗回响已同步至校准镜——每一次折返，都会让下一次出发走得更远。</p><div class="rg-result-hint">'+speakerHint+'</div>';
  box.classList.remove('hidden');
 }
}

// === CLEAN RUNTIME WRAPPERS (ZERO EDITS TO CORE FILES!) ===
const _baseInitializeExpedition=initializeExpedition;
initializeExpedition=function(){
 _baseInitializeExpedition();
 const hubBar=document.querySelector?.('.rg-hub-actions');
 if(hubBar){
  const campBtn=document.createElement('button');campBtn.id='rg-open-camp';campBtn.textContent='💬 同伴与信物';
  const chronBtn=document.createElement('button');chronBtn.id='rg-open-chronicle';chronBtn.textContent='📡 回响纪事';
  hubBar.appendChild(campBtn);hubBar.appendChild(chronBtn);
  campBtn.addEventListener('click',()=>showCompanionDialog());
  chronBtn.addEventListener('click',showChronicleDialog);
 }
 const menu=$('menu');
 if(menu){
  const chatter=document.createElement('button');
  chatter.id='rg-sanctuary-chatter';chatter.type='button';
  menu.appendChild(chatter);
  chatter.addEventListener('click',()=>showCompanionDialog(chatter.dataset.speaker||null));
 }
 const stashNote=$('stash-note');
 if(stashNote){
  const strip=document.createElement('div');strip.id='rg-keepsake-strip';
  if(typeof stashNote.after==='function')stashNote.after(strip);
 }
 $('guide')?.addEventListener?.('click',()=>{});
 $('rg-guide')?.addEventListener('click',e=>{
  const btn=e.target?.closest?.('button');
  if(!btn)return;
  if(btn.hasAttribute('data-camp-hero')){
   showCompanionDialog(btn.dataset.campHero);
  }else if(btn.hasAttribute('data-camp-talk')){
   const id=btn.dataset.campTalk;
   const {justUnlockedKeepsake}=talkToCompanion(id);
   showCompanionDialog(id,false,justUnlockedKeepsake);
  }else if(btn.hasAttribute('data-camp-gift')){
   const id=btn.dataset.campGift;
   if(giftCompanionShard(id))showCompanionDialog(id,true,false);
  }else if(btn.hasAttribute('data-equip-ks')){
   const id=btn.dataset.equipKs;
   equipKeepsake(id);
   showCompanionDialog(id);
  }
 });
 // Refresh sanctuary lounge when switching playable hero
 document.querySelectorAll?.('[data-hero]')?.forEach?.(el=>{
  el.addEventListener('click',()=>{
   narrativeRuntime.selectedCampHero=null;
   updateNarrativeHubUI();
  });
 });
 ensureBarkElement();
 updateNarrativeHubUI();
};

const _baseStartExpedition=startExpedition;
startExpedition=function(){
 _baseStartExpedition();
 narrative.runs++;
 narrativeRuntime.usedRevive=false;
 narrativeRuntime.wonTrial=false;
 narrativeRuntime.runParries=0;
 narrativeRuntime.runDashStrikes=0;
 narrativeRuntime.trapHalvesLeft=narrative.keepsake==='frost'?2:0;
 narrativeRuntime.lastBarkAt=-99;
 // Apply equipped Keepsake start-of-run effects (no-op when keepsake is null!)
 if(narrative.keepsake==='bastion'){
  maxHp+=20;hp+=20;
 }else if(narrative.keepsake==='ember'&&expeditionRoles[chosenClass]){
  run.power=Math.min(expeditionRoles[chosenClass].max,(run.power||0)+2);
 }
 saveNarrative();
 expeditionHUD();
};

const _baseEnterChamber=enterChamber;
enterChamber=function(){
 _baseEnterChamber();
 if(narrative.keepsake==='frost'&&hp<maxHp){
  hp=Math.min(maxHp,hp+6);
 }
 const room=roomNow();
 if(!room)return;
 if(room.type==='boss'){
  const line=HERO_BARKS.bossIntro[run.act]?.[chosenClass];
  if(line)showHeroBark(line,true);
 }else if(room.type==='trial'){
  const keys=Object.keys(ECHO_PERSONAS);
  const s1=run.roomSchool||keys[run.act%keys.length];
  const s2=keys.find(k=>k!==s1)||'frost';
  const p2=ECHO_PERSONAS[s2];
  showBark(p2.name,'双系试炼 · 脉冲争锋',p2.trialSnub,{color:p2.color,mark:p2.mark,duration:4.0,force:true});
 }else if(run.index===0){
  const line=HERO_BARKS.actStart[run.act]?.[chosenClass];
  if(line)showHeroBark(line,true);
 }
};

const _baseAwakenBoss=awakenBoss;
awakenBoss=function(e){
 _baseAwakenBoss(e);
 const p2=BOSS_PHASE2_LINES[run.act];
 if(p2)showBark(p2.speaker,p2.role,p2.text,{color:p2.color,mark:p2.mark,duration:4.2,force:true});
};

const _baseCue=cue;
cue=function(name,pos){
 _baseCue(name,pos);
 if(name==='revive'&&rogueMode){
  narrativeRuntime.usedRevive=true;
  const line=HERO_BARKS.revive[chosenClass];
  if(line)showHeroBark(line,true);
 }
};

const _baseNoteProphecyMetric=noteProphecyMetric;
noteProphecyMetric=function(metric){
 _baseNoteProphecyMetric(metric);
 if(metric==='parry'){
  narrativeRuntime.runParries++;
  if(narrative.keepsake==='bastion'){
   hp=Math.min(maxHp,hp+12);
   if(typeof calloutAt==='function')calloutAt(player.group.position,'铜哨回气 +12','gold');
  }
  if(narrativeRuntime.runParries===1||narrativeRuntime.runParries%3===0){
   showHeroBark(HERO_BARKS.parry[chosenClass]);
  }
 }else if(metric==='dashStrike'){
  narrativeRuntime.runDashStrikes++;
  if(narrativeRuntime.runDashStrikes%5===1){
   showHeroBark(HERO_BARKS.dashStrike[chosenClass]);
  }
 }
};

const _baseCompleteChamber=completeChamber;
completeChamber=function(){
 const wasCombat=run.status==='combat';
 const room=roomNow();
 _baseCompleteChamber();
 if(!wasCombat||!room)return;
 if(room.type==='trial')narrativeRuntime.wonTrial=true;
 if(narrative.keepsake==='reaper'&&['elite','trial','boss'].includes(room.type)){
  const baseCoins=room.type==='boss'?45:32;
  run.coins+=Math.round(baseCoins*.2);
  awardShards(2);
 }
 if(hp>0&&hp<maxHp*.35&&room.type!=='boss'){
  showHeroBark(HERO_BARKS.lowHpClear[chosenClass]);
 }
};

const _basePresentPanel=presentPanel;
presentPanel=function(title,subtitle,content,panel){
 const banner=panelVoiceHTML(panel);
 _basePresentPanel(title,subtitle,banner+content,panel);
};

const _baseDamageEnemy=damageEnemy;
damageEnemy=function(e,amount,...rest){
 const options=rest[2]||{};
 let boosted=amount;
 if(rogueMode&&narrative.keepsake&&!options.echo){
  if(narrative.keepsake==='ember'&&run.index===0)boosted=Math.round(boosted*1.15);
  if(narrative.keepsake==='shade'&&(options.dashStrike||raid.strike?.dashStrike))boosted=Math.round(boosted*1.2);
 }
 return _baseDamageEnemy(e,boosted,...rest);
};

const _baseDamagePlayer=damagePlayer;
damagePlayer=function(amount,...rest){
 const attacker=rest[0]??null;
 let adjusted=amount;
 if(rogueMode&&narrative.keepsake==='frost'&&!attacker&&narrativeRuntime.trapHalvesLeft>0){
  narrativeRuntime.trapHalvesLeft--;
  adjusted=Math.max(1,Math.round(adjusted*.5));
 }
 return _baseDamagePlayer(adjusted,...rest);
};

const _baseDodge=dodge;
dodge=function(){
 _baseDodge();
 if(rogueMode&&narrative.keepsake==='shade'&&dashRecharge>0){
  dashRecharge*=0.85;
 }
};

const _baseFinishExpedition=finishExpedition;
finishExpedition=function(success,reason=''){
 const alreadyFinished=state==='result';
 _baseFinishExpedition(success,reason);
 if(alreadyFinished)return;
 let newlyUnlockedStep=0;
 if(success){
  narrative.wins++;
  if(narrative.chronicle<5){
   narrative.chronicle++;
   newlyUnlockedStep=narrative.chronicle;
  }
 }
 narrative.talkedThisReturn=[];
 narrative.lastRun={
  hero:chosenClass,
  weapon:loadout[0],
  won:!!success,
  act:run.act,
  roomName:roomNow()?.name||'',
  boss:roomNow()?.type==='boss',
  usedRevive:narrativeRuntime.usedRevive,
  wonTrial:narrativeRuntime.wonTrial,
  roomsCleared:run.roomsCleared,
  reason:reason||'',
  depth:run.depth||0
 };
 saveNarrative();
 updateNarrativeHubUI();
 updateResultStory(success,newlyUnlockedStep);
};
