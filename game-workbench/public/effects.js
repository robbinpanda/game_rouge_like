function el(tag,text,cls){
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=text;
 if(cls)node.className=cls;
 return node;
}
function assetLink(asset,title){
 const link=el('a',title,'button small');
 link.href='/asset/'+asset.id;
 link.target='_blank';link.rel='noopener';
 return link;
}
export async function showEffectLibrary(main,assets){
 const panel=el('section',undefined,'fx-library');
 main.replaceChildren(panel);
 const asset=name=>assets.find(a=>a.path.endsWith('/echo-effects/'+name));
 const index=asset('回响远征-特效索引.json');
 if(!index){panel.append(el('p','点击右上角「同步资产」以载入回响远征特效索引。','empty'));return;}
 let book;
 try{
  const response=await fetch('/asset/'+index.id,{cache:'no-cache'});
  if(!response.ok)throw Error(response.status);
  book=await response.json();
 }catch{panel.append(el('p','读取特效索引失败，请同步资产后重试。','empty'));return;}
 if(!panel.isConnected)return;
 const heading=el('div',undefined,'page-title'),titles=el('div');
 titles.append(el('div',book.version,'eyebrow'),el('h1','天赋与特效'),el('p','查天赋的触发条件与升阶表现，或从特效反查关联天赋。'));
 heading.append(titles);
 const manual=asset('天赋与特效手册.md');
 if(manual)heading.append(assetLink(manual,'完整手册 ↗'));
 const toolbar=el('div',undefined,'toolbar'),searchWrap=el('div',undefined,'search-wrap'),search=el('input');
 search.type='search';search.placeholder='搜索名称、武器、按键或编号';search.setAttribute('aria-label','搜索天赋与特效');
 const kind=el('select'),grade=el('select');
 function options(select,label,options){
  select.setAttribute('aria-label',label);
  for(const [key,name] of options){const o=el('option',name);o.value=key;select.append(o);}
 }
 options(kind,'条目类别',[['talent','全部天赋'],['all','全部特效'],...['普攻','技能','天赋触发','通用反馈'].map(x=>[x,x])]);
 options(grade,'天赋稀有度',[['','全部稀有度'],...['普通','进阶','稀有','传说'].map(x=>[x,x])]);
 searchWrap.append(search);toolbar.append(searchWrap,kind,grade);
 const count=el('p',undefined,'results-meta'),list=el('div',undefined,'fx-list');
 count.setAttribute('aria-live','polite');
 panel.append(heading);
 const previews=['十二招对照.jpg','技能天赋对照.jpg','十二招实机.webp','立体技能实机.webp'].map(name=>assets.find(a=>a.path.endsWith('/回响远征-'+name))).filter(Boolean);
 if(previews.length){
  const nav=el('div',undefined,'fx-previews');
  for(const a of previews)nav.append(assetLink(a,a.name.replace('回响远征-','')+' ↗'));
  panel.append(nav);
 }
 panel.append(toolbar,count,list);
 const talents=new Map(book.talents.map(t=>[t.id,t])),effects=new Map(book.effects.map(f=>[f.id,f]));
 function detail(card,label,text){
  const p=el('p');p.append(el('strong',label+'　'),document.createTextNode(text));card.append(p);
 }
 function refs(card,ids,map,toTalents){
  if(!ids.length)return;
  const group=el('div',undefined,'fx-refs');
  group.append(el('strong',toTalents?'关联天赋':'关联特效'));
  for(const id of ids){
   const b=el('button',map.get(id).name,'chip');
   b.onclick=()=>{kind.value=toTalents?'talent':'all';grade.value='';search.value=id;render(id);list.scrollIntoView({block:'start'});};
   group.append(b);
  }
  card.append(group);
 }
 function render(exact=''){
  const isTalent=kind.value==='talent',rows=isTalent?book.talents:book.effects;
  grade.hidden=!isTalent;
  const query=search.value.trim().toLowerCase();
  const found=rows.filter(r=>{
   if(exact)return r.id===exact;
   if(isTalent&&grade.value&&r.rarity!==grade.value||!isTalent&&kind.value!=='all'&&kind.value!==r.kind)return false;
   const related=isTalent?r.effects.map(id=>effects.get(id).name):r.talents.map(id=>talents.get(id).name);
   return [r.id,r.name,r.owner,r.school,r.rule,r.handling,r.detail,r.source,...(r.keys||[]),...related].join(' ').toLowerCase().includes(query);
  });
  count.textContent=found.length+' 项'+(isTalent?'天赋':'特效');
  list.replaceChildren();
  for(const row of found){
   const card=el('details',undefined,'fx-card');
   const summary=el('summary');
   summary.append(el('span',row.name),el('small',isTalent?row.owner+' · '+row.rarity+' · '+row.max+' 阶':row.kind));
   card.append(summary);
   if(isTalent){
    detail(card,'触发与数值',row.rule);detail(card,'画面处理',row.handling);detail(card,'前置天赋',row.requires);
    refs(card,row.effects,effects,false);
   }else{
    detail(card,'画面处理',row.detail);detail(card,'实现入口',row.source);
    if(row.keys?.length)detail(card,'运行时编号',row.keys.join('、'));
    refs(card,row.talents,talents,true);
    const file=asset(row.source.split(' · ')[0]);
    if(file)card.append(assetLink(file,'查看特效源码 ↗'));
   }
   card.append(el('small',row.id,'path-text'));
   if(found.length===1)card.open=true;
   list.append(card);
  }
  if(!found.length)list.append(el('p','没有匹配的条目，可更换关键词或筛选条件。','empty'));
 }
 search.oninput=()=>render();kind.onchange=()=>render();grade.onchange=()=>render();
 render();
}
