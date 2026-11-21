const openingStoryPages = [
  {
    image: 'echo-prologue-01.webp', title: '山上的灯',
    alt: '黄昏的末班车里，一名归家的工人抱着饭盒，望向海湾对岸亮着暖紫微光的山顶温室与船坞。',
    text: '从前，晴湾的潮水替船坞供着电，山顶温室则用紫晶把光存进夜里。每晚坐末班车拐过海湾，只要看见山上的灯还亮着，归家的人就知道快到站了。'
  },
  {
    image: 'echo-prologue-02.webp', title: '失电之夜',
    alt: '暴雨夜里，末班车急刹在崩塌的高架断口前，远处山顶的紫晶温室骤然爆亮，将一道紫色过载脉冲拉向山顶。',
    text: '直到那个暴雨夜，倒灌的潮水冲垮了港区电网。末班车急刹在高架断口前，就在过载电弧即将吞没车厢的一瞬，山顶的紫光骤然亮起，将整片海湾拉进了失控的脉动。'
  },
  {
    image: 'echo-prologue-03.webp', title: '潮水与畸变',
    alt: '清晨涨潮的空船坞喷出白汽，墙缝渗出淡紫晶纹，铁壳畸变体与浮空母舰在雾中苏醒，远处山顶温室泛起紫光。',
    text: '天亮了，那晚却没有结束。每次涨潮重新推起电网，山顶的紫晶便把失电夜的脉冲再放一遍——人们叫它「回响」。盘踞在断轨与船坞里的畸变体，也随之一次次醒来。'
  },
  {
    image: 'echo-prologue-04.webp', title: '圣所与远征',
    alt: '半山观测站的石门外，校准镜映出一抹紫光。远征者沿海岸盘山路向断轨、船坞与山顶温室出发。',
    text: '半山观测站成了我们的圣所——五个被那一夜改写命运的幸存者，守着能铭刻残片的回响之镜。穿过断轨、船坞与重重畸变，你再次踏上山路：那晚早已过去，山上的灯为什么还不肯熄灭？'
  }
];
const openingStoryReadKey = 'aberrant-echo-prologue-read-v1';
let openingStoryPage = 0;
let openingStoryDialog;

function hasReadOpeningStory() {
  try { return localStorage.getItem(openingStoryReadKey) === '1'; }
  catch { return false; }
}

function showOpeningStoryPage(index) {
  openingStoryPage = index;
  const page = openingStoryPages[index];
  const dialog = openingStoryDialog;
  const picture = dialog.querySelector('img');
  picture.alt = page.alt;
  picture.src = assetURL(page.image);
  dialog.querySelector('h2').textContent = page.title;
  dialog.querySelector('.rg-story-text').textContent = page.text;
  dialog.querySelector('.rg-story-page').textContent = '序章　' + (index + 1) + ' / ' + openingStoryPages.length;
  dialog.querySelector('[data-story="back"]').disabled = index === 0;
  dialog.querySelector('[data-story="next"]').textContent = index === openingStoryPages.length - 1 ? '前往圣所' : '下一幅';
}

function leaveOpeningStory(skipCinematic) {
  if (state !== 'opening-story') return;
  try { localStorage.setItem(openingStoryReadKey, '1'); } catch {}
  openingStoryDialog.close();
  startOpeningCinematic();
  if (skipCinematic) finishOpeningCinematic();
}

function advanceOpeningStory() {
  if (openingStoryPage === openingStoryPages.length - 1) leaveOpeningStory(false);
  else showOpeningStoryPage(openingStoryPage + 1);
}

function createOpeningStoryDialog() {
  const dialog = document.createElement('dialog');
  dialog.id = 'rg-opening-story';
  dialog.setAttribute('aria-labelledby', 'rg-story-title');
  dialog.innerHTML = `<div class="rg-story-picture"><img alt="" draggable="false"></div>
    <footer class="rg-story-footer">
      <div class="rg-story-caption" aria-live="polite" aria-atomic="true">
        <span class="rg-story-page"></span><h2 id="rg-story-title"></h2><p class="rg-story-text"></p>
      </div>
      <nav aria-label="序章翻页"><button type="button" data-story="back">上一幅</button>
        <button type="button" data-story="next" autofocus>下一幅</button></nav>
    </footer><button type="button" class="rg-story-skip" data-story="skip">跳过开场</button>`;
  dialog.addEventListener('click', e => {
    const action = e.target.closest('button')?.dataset.story;
    if (action === 'next') advanceOpeningStory();
    else if (action === 'back' && openingStoryPage > 0) showOpeningStoryPage(openingStoryPage - 1);
    else if (action === 'skip') leaveOpeningStory(true);
  });
  dialog.addEventListener('cancel', e => { e.preventDefault(); leaveOpeningStory(true); });
  dialog.addEventListener('keydown', e => {
    // Leave Tab, Enter and Space to the native dialog and its focused button.
    e.stopPropagation();
    if (e.repeat && ['Space','Enter','ArrowRight','ArrowLeft'].includes(e.code)) { e.preventDefault(); return; }
    if (e.code === 'ArrowRight') { e.preventDefault(); advanceOpeningStory(); }
    if (e.code === 'ArrowLeft' && openingStoryPage > 0) { e.preventDefault(); showOpeningStoryPage(openingStoryPage - 1); }
  });
  document.body.appendChild(dialog);
  return dialog;
}

function startOpeningStory() {
  if (!rogueMode || state !== 'menu') return;
  if (!openingStoryDialog) openingStoryDialog = createOpeningStoryDialog();
  state = 'opening-story';
  showOpeningStoryPage(0);
  openingStoryDialog.showModal();
  openingStoryDialog.querySelector('[data-story="next"]').focus();
}
