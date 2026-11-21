/* 第二阶段：页面及状态预览。音频、拖动、CRUD 和生成逻辑留待后续阶段。 */
const icon = (name, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const initialSuggestions = [
  { id: 'g1', type: 'global', text: '整体偏舒缓，建议加快节奏，营造轻快氛围。' },
  { id: 'g2', type: 'global', text: '歌词缺少专属感，建议融入共同回忆。' },
  { id: 'l1', type: 'local', text: '这段描述较泛，建议加入操场夜聊的画面。', start: 18, end: 38 },
  { id: 'l2', type: 'local', text: '副歌情绪偏平，建议增强演唱力度，突出祝福。', start: 55, end: 75 },
  { id: 'l3', type: 'local', text: '结尾祝福不明确，建议以“新的一岁，继续一起向前”收尾。', start: 178, end: 198 },
];
const pageInfo = {
  detail: ['从一首生日歌开始', '第一版已经生成。用户想为朋友送上专属祝福，却还不知道该怎么改。'],
  feedback: ['让建议成为下一步', '全局与局部分开展示。点击局部卡片可预览对应范围；选中查看与勾选采纳是两种状态。'],
  generating: ['一次再创作', '沿用 Muse AI 的创作等待界面。进入后等待五秒，自动展示两首新作品；切换到其他页面会取消等待。'],
  result: ['两首新的作品', '参照 Muse AI 的创作完成页呈现两首结果；不增加原版对比或修改要求回看入口。'],
};
const pageHost = document.getElementById('page');
const screen = document.getElementById('app-screen');
const modalHost = document.getElementById('modal-host');
let currentPage = 'detail';
let selectedLocal = null;
let modalReturnFocus = null;
let generationTimer = null;

function time(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function header(title, target = 'detail') {
  return `<header class="app-header"><button class="icon-button" data-page="${target}" aria-label="返回">${icon('back')}</button><h2>${title}</h2><span class="header-spacer"></span></header>`;
}
function previewNotice(text) {
  document.getElementById('preview-notice').textContent = text;
}
function detailPage() {
  return `<header class="app-header detail-header">
    <button class="icon-button" data-stage-only aria-label="收起歌曲">${icon('down')}</button>
    <div class="right-icons"><button class="icon-button" data-stage-only aria-label="发行">${icon('music')}</button><button class="icon-button" data-stage-only aria-label="更多">${icon('more')}</button></div>
  </header>
  <section class="detail-content"><img class="cover-art" src="assets/birthday-original.jpg" alt="生日主题封面，阳光下漂浮着彩色纸屑气球"><h2>波恢生日快乐</h2><p class="song-subtitle">轻快流行 / 原声吉他</p><div class="detail-blank"></div></section>
  <footer class="detail-footer">
    <div class="detail-actions"><button class="small-action" data-stage-only>${icon('star')}收藏</button><button class="small-action" data-stage-only>${icon('share')}转发</button><button class="outline-button" data-stage-only>去公开</button><button class="light-button" data-stage-only>重新编辑</button></div>
    <button class="feedback-entry" data-page="feedback">${icon('edit')}评分与修改建议</button>
    <div class="simple-progress"><span>00:00</span><div class="progress-line"></div><span>03:41</span></div>
    <div class="detail-controls"><button class="icon-button" data-stage-only aria-label="播放模式">${icon('repeat')}</button><button class="large-play" data-audio-preview aria-label="播放歌曲">${icon('play')}</button><button class="icon-button" data-stage-only aria-label="歌曲列表">${icon('list')}</button></div>
    <p class="ai-disclaimer">内容由 Muse AI 生成</p>
  </footer>`;
}
function waveform(suggestion) {
  const bars = Array.from({ length: 78 }, (_, i) => {
    const height = 15 + ((i * 19 + (i % 7) * 11) % 39);
    return `<rect class="bar" x="${5 + i * 4}" y="${(66 - height) / 2}" width="1.7" height="${height}"/>`;
  }).join('');
  const left = suggestion ? 26 : 0;
  const right = suggestion ? 247 : 0;
  const range = suggestion ? `<rect class="range-frame" x="${left}" y="4" width="${right - left}" height="58" rx="7"/><rect class="handle" x="${left}" y="4" width="11" height="58" rx="5"/><rect class="handle" x="${right - 11}" y="4" width="11" height="58" rx="5"/><path class="handle-notch" d="M${left + 5.5} 28v11M${right - 5.5} 28v11"/>` : '';
  const cursor = suggestion ? left + 12 : 5;
  return `<div class="waveform-wrap"><svg class="waveform" viewBox="0 0 320 66" role="img" aria-label="${suggestion ? '选中建议的波形与范围，当前为静态示意' : '歌曲波形，尚未选中局部建议'}">${bars}${range}<path class="playhead" d="M${cursor} 1v64"/><path class="playhead-head" d="M${cursor - 3} 0h6v6l-3 3-3-3Z"/></svg></div>
    <div class="timeline-control"><button data-audio-preview aria-label="播放片段">${icon('play')}</button><div class="time-values" aria-label="范围起点、游标时间、范围终点"><span title="范围起点">${suggestion ? time(suggestion.start) : '--:--'}</span><i>|</i><span title="游标时间">${suggestion ? time(suggestion.start) : '00:00'}</span><i>|</i><span title="范围终点">${suggestion ? time(suggestion.end) : '--:--'}</span></div><button class="zoom-button" data-stage-only aria-label="放大时间轴">${icon('zoom')}</button></div>`;
}
function suggestionCard(item) {
  return `<article class="suggestion-card ${item.type === 'local' ? 'local' : ''} ${selectedLocal === item.id ? 'is-selected' : ''}" ${item.type === 'local' ? `data-segment="${item.id}" tabindex="0" aria-label="查看片段 ${time(item.start)} 至 ${time(item.end)}"` : ''}>
    ${item.type === 'local' ? `<span class="segment-time">${icon('play')}${time(item.start)}–${time(item.end)}</span>` : ''}
    <p class="suggestion-text">${item.text}</p>
    <div class="suggestion-actions"><button class="icon-button" data-edit="${item.id}" aria-label="修改建议">${icon('edit')}</button><label class="check-control"><input type="checkbox" data-check="${item.id}" aria-label="采纳这条建议">${icon('check')}</label><button class="icon-button" data-stage-only aria-label="删除建议">${icon('trash')}</button></div>
  </article>`;
}
function feedbackPage() {
  return `${header('评分与建议')}
    <section class="feedback-top"><div class="song-context"><img src="assets/birthday-original.jpg" alt="歌曲封面"><div><h3>波恢生日快乐</h3><p>轻快流行 / 原声吉他</p></div><div class="match-score"><strong>76</strong><span>分</span></div></div><div id="timeline">${waveform(null)}</div></section>
    <div class="suggestions-scroll"><section><div class="section-header"><h3>全局建议</h3><button data-stage-only>${icon('plus')}新增</button></div>${initialSuggestions.filter(x => x.type === 'global').map(suggestionCard).join('')}</section>
    <section class="local-section"><div class="section-header"><h3>局部建议</h3><button data-stage-only>${icon('plus')}新增</button></div>${initialSuggestions.filter(x => x.type === 'local').map(suggestionCard).join('')}</section></div>
    <footer class="feedback-footer"><button class="primary-button" id="regenerate" disabled data-page="generating">重新生成</button></footer>`;
}
function generatingPage() {
  return `<header class="app-header"><button class="icon-button" data-page="feedback" aria-label="退出生成等待">${icon('close')}</button><h2>音乐创作</h2><span class="header-spacer"></span></header>
    <div class="result-scroll"><section class="generation-panel" role="status"><h3>创作中..</h3><p>稍等片刻，等待几秒即可试听</p></section>${resultExtras()}</div>`;
}
function resultExtras() {
  return `<div class="result-actions"><button data-stage-only>${icon('restart')}再次编辑</button><button data-stage-only>${icon('music')}创作新歌</button></div>
    <h3 class="inspiration-title">灵感参考</h3><div class="inspiration-grid"><article><img src="assets/inspiration-train.jpg" alt="红色列车主题音乐封面"><h4>火车（司风第一版）</h4><p class="inspiration-author">我是金条哥哥<span>${icon('heart')}3</span></p></article><article><img src="assets/inspiration-song.jpg" alt="草帽主题音乐封面"><h4>给昭昭的一首歌</h4><p class="inspiration-author">浪屿夜曲拾音者<span>${icon('heart')}1</span></p></article></div>`;
}
function resultPage() {
  return `${header('音乐创作')}
    <div class="result-scroll"><section class="result-complete"><h3>音乐创作完成!</h3><div class="result-songs">${['a','b'].map((version) => `<button class="result-song" data-audio-preview aria-label="播放第${version === 'a' ? '一' : '二'}首新歌曲"><span class="record-cover"><img src="assets/birthday-${version}.jpg" alt="生日歌${version === 'a' ? '一' : '二'}封面"></span><strong>波恢生日快乐</strong></button>`).join('')}</div></section>
    ${resultExtras()}</div>`;
}
function render(page) {
  clearTimeout(generationTimer);
  generationTimer = null;
  currentPage = Object.hasOwn(pageInfo, page) ? page : 'detail';
  selectedLocal = null;
  modalHost.replaceChildren();
  screen.classList.toggle('detail-theme', currentPage === 'detail');
  pageHost.innerHTML = ({ detail: detailPage, feedback: feedbackPage, generating: generatingPage, result: resultPage })[currentPage]();
  document.querySelectorAll('.nav-item').forEach(button => {
    button.classList.toggle('active', button.dataset.page === currentPage);
    if (button.dataset.page === currentPage) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const [title, copy] = pageInfo[currentPage];
  document.getElementById('explanation-title').textContent = title;
  document.getElementById('explanation-copy').textContent = copy;
  previewNotice('');
  if (currentPage === 'generating') {
    generationTimer = setTimeout(() => render('result'), 5000);
  }
}
function openEditor(item) {
  modalReturnFocus = document.activeElement;
  modalHost.innerHTML = `<div class="modal-layer"><section class="edit-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-title"><h2 id="edit-title">修改建议</h2><textarea id="edit-text" aria-label="建议内容"></textarea><div class="dialog-actions"><button class="dialog-cancel" data-close-modal>取消</button><button class="dialog-save" data-close-modal>保存</button></div></section></div>`;
  const input = document.getElementById('edit-text');
  input.value = item.text;
  input.focus();
}
function closeEditor() {
  modalHost.replaceChildren();
  if (modalReturnFocus?.isConnected) modalReturnFocus.focus();
}
function selectSegment(id) {
  const item = initialSuggestions.find(x => x.id === id);
  if (!item) return;
  selectedLocal = id;
  document.querySelectorAll('[data-segment]').forEach(card => card.classList.toggle('is-selected', card.dataset.segment === id));
  document.getElementById('timeline').innerHTML = waveform(item);
  previewNotice('已切换局部片段的选中样式；当前不播放音频。');
}
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button?.disabled) return;
  if (button?.dataset.page) { render(button.dataset.page); return; }
  if (button?.hasAttribute('data-preview-edit')) {
    if (currentPage !== 'feedback') render('feedback');
    openEditor(initialSuggestions.find(x => x.type === button.dataset.previewEdit));
    return;
  }
  if (button?.dataset.edit) { openEditor(initialSuggestions.find(x => x.id === button.dataset.edit)); return; }
  if (button?.hasAttribute('data-close-modal')) {
    closeEditor();
    previewNotice('当前仅预览弹窗样式，文字修改暂不写回建议。');
    return;
  }
  if (button?.hasAttribute('data-audio-preview')) { previewNotice('真实音频将在后续阶段接入，当前展示播放入口。'); return; }
  if (button?.hasAttribute('data-stage-only')) { previewNotice('此处先展示控件样式，完整操作留到后续阶段。'); return; }
  if (event.target.closest('.suggestion-actions')) return;
  const segment = event.target.closest('[data-segment]');
  if (segment) selectSegment(segment.dataset.segment);
});
document.addEventListener('change', event => {
  if (!event.target.matches('[data-check]')) return;
  const count = document.querySelectorAll('[data-check]:checked').length;
  document.getElementById('regenerate').disabled = count === 0;
});
document.addEventListener('keydown', event => {
  const dialog = modalHost.querySelector('[role="dialog"]');
  if (dialog) {
    if (event.key === 'Escape') { event.preventDefault(); closeEditor(); return; }
    if (event.key === 'Tab') {
      const focusables = [...dialog.querySelectorAll('textarea,button')];
      const first = focusables[0], last = focusables.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    return;
  }
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-segment]')) {
    event.preventDefault(); selectSegment(event.target.dataset.segment);
  }
});
render('detail');
