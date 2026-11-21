/* 第三阶段：建议编辑与时间轴交互，真实音频留至第四阶段。 */
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
  feedback: ['让建议成为下一步', '建议可自由增删和改写。选中局部卡片即可模拟片段播放，拖动两端调整范围；是否采纳由独立的复选框决定。'],
  generating: ['一次再创作', '沿用 Muse AI 的创作等待界面。进入后等待五秒，自动展示两首新作品；切换到其他页面会取消等待。'],
  result: ['两首新的作品', '参照 Muse AI 的创作完成页呈现两首结果；不增加原版对比或修改要求回看入口。'],
};
const pageHost = document.getElementById('page');
const screen = document.getElementById('app-screen');
const modalHost = document.getElementById('modal-host');
const suggestions = initialSuggestions.map(item => ({ ...item, checked: false }));
const timelineState = { current: 0, viewStart: 0, viewSpan: 221 };
const songDuration = 221;
let currentPage = 'detail';
let selectedLocal = null;
let editing = null;
let editorHistoryPending = false;
let generationTimer = null;
let timeline = null;
let nextId = 1;
// 第四阶段可消费此快照；当前固定结果不会按这些指令实际生成音乐。
let lastGenerationRequest = [];

const findSuggestion = id => suggestions.find(item => item.id === id);
const selectedSuggestion = () => findSuggestion(selectedLocal) ?? null;
const checkedSuggestions = () => suggestions.filter(item => item.checked && item.text.trim());
const escapeHTML = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function time(seconds) {
  seconds = Math.floor(seconds);
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
function suggestionCard(item) {
  return `<article class="suggestion-card ${item.type === 'local' ? 'local' : ''} ${selectedLocal === item.id ? 'is-selected' : ''}" ${item.type === 'local' ? `data-segment="${item.id}" tabindex="0" aria-label="查看片段 ${time(item.start)} 至 ${time(item.end)}"` : ''}>
    ${item.type === 'local' ? `<span class="segment-time">${icon('play')}<span>${time(item.start)}–${time(item.end)}</span></span>` : ''}
    <p class="suggestion-text">${escapeHTML(item.text)}</p>
    <div class="suggestion-actions"><button class="icon-button" data-edit="${item.id}" aria-label="修改建议">${icon('edit')}</button><label class="check-control"><input type="checkbox" data-check="${item.id}" aria-label="采纳这条建议" ${item.checked ? 'checked' : ''} ${item.text.trim() ? '' : 'disabled'}>${icon('check')}</label><button class="icon-button" data-delete="${item.id}" aria-label="删除建议">${icon('trash')}</button></div>
  </article>`;
}
function suggestionSections() {
  return ['global', 'local'].map(type => {
    const items = suggestions.filter(item => item.type === type);
    return `<section class="${type === 'local' ? 'local-section' : ''}"><div class="section-header"><h3>${type === 'local' ? '局部建议' : '全局建议'}</h3><button data-add="${type}">${icon('plus')}新增</button></div>${items.length ? items.map(suggestionCard).join('') : '<p class="empty-suggestions">暂无建议</p>'}</section>`;
  }).join('');
}
function feedbackPage() {
  return `${header('评分与建议')}
    <section class="feedback-top"><div class="song-context"><img src="assets/birthday-original.jpg" alt="歌曲封面"><div><h3>波恢生日快乐</h3><p>轻快流行 / 原声吉他</p></div><div class="match-score"><strong>76</strong><span>分</span></div></div><div id="timeline"></div></section>
    <div class="suggestions-scroll">${suggestionSections()}</div>
    <footer class="feedback-footer"><button class="primary-button" id="regenerate" ${checkedSuggestions().length ? '' : 'disabled'}>重新生成</button></footer>`;
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
  timeline?.destroy();
  timeline = null;
  clearTimeout(generationTimer);
  generationTimer = null;
  currentPage = Object.hasOwn(pageInfo, page) ? page : 'detail';
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
  if (currentPage === 'feedback') {
    timeline = new SongTimeline(document.getElementById('timeline'), {
      duration: songDuration, state: timelineState, getSelection: selectedSuggestion,
      onRangeChange: updateRange,
    });
  }
  if (currentPage === 'generating') {
    generationTimer = setTimeout(() => render('result'), 5000);
  }
}
function openEditor(item) {
  if (!item || editing || editorHistoryPending) return;
  timeline?.pause();
  editing = { id: item.id, trigger: document.activeElement };
  modalHost.innerHTML = `<div class="modal-layer"><section class="edit-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-title"><h2 id="edit-title">修改建议</h2><textarea id="edit-text" aria-label="建议内容"></textarea><div class="dialog-actions"><button class="dialog-cancel" data-close-modal>取消</button><button class="dialog-save" data-close-modal>保存</button></div></section></div>`;
  pageHost.inert = true;
  document.querySelector('.preview-navigation').inert = true;
  history.pushState({ ...history.state, museEditor: true }, '');
  const input = document.getElementById('edit-text');
  input.value = item.text;
  input.focus();
}
function closeEditor({ save = false, popHistory = true } = {}) {
  if (!editing) return;
  const previous = editing;
  const item = findSuggestion(previous.id);
  if (save && item) {
    const value = document.getElementById('edit-text').value;
    item.text = value.trim() ? value : '';
    if (!item.text) item.checked = false;
  }
  editing = null;
  modalHost.replaceChildren();
  pageHost.inert = false;
  document.querySelector('.preview-navigation').inert = false;
  if (save) refreshSuggestions();
  const target = previous.trigger?.isConnected ? previous.trigger : document.querySelector(`[data-edit="${previous.id}"]`);
  target?.focus();
  if (popHistory && history.state?.museEditor) {
    editorHistoryPending = true;
    history.back();
  }
}
function refreshSuggestions() {
  const list = document.querySelector('.suggestions-scroll');
  if (!list) return;
  const scroll = list.scrollTop;
  list.innerHTML = suggestionSections();
  list.scrollTop = scroll;
  document.getElementById('regenerate').disabled = checkedSuggestions().length === 0;
}
function updateRange(id, start, end) {
  const item = findSuggestion(id);
  if (!item || item.type !== 'local') return;
  item.start = start;
  item.end = end;
  const card = document.querySelector(`[data-segment="${id}"]`);
  if (card) {
    card.querySelector('.segment-time span').textContent = `${time(start)}–${time(end)}`;
    card.setAttribute('aria-label', `查看片段 ${time(start)} 至 ${time(end)}`);
  }
}
function selectSegment(id, { autoplay = true } = {}) {
  const item = findSuggestion(id);
  if (!item || item.type !== 'local') return;
  selectedLocal = id;
  document.querySelectorAll('[data-segment]').forEach(card => card.classList.toggle('is-selected', card.dataset.segment === id));
  timeline?.select({ autoplay });
}
function addSuggestion(type) {
  const item = { id: `new-${nextId++}`, type, text: '', checked: false };
  if (type === 'local') Object.assign(item, { start: 0, end: 5 });
  suggestions.push(item);
  refreshSuggestions();
  if (type === 'local') selectSegment(item.id, { autoplay: false });
  const button = document.querySelector(`[data-edit="${item.id}"]`);
  button?.scrollIntoView({ block: 'nearest' });
  button?.focus({ preventScroll: true });
}
function deleteSuggestion(id) {
  const index = suggestions.findIndex(item => item.id === id);
  if (index < 0) return;
  const type = suggestions[index].type;
  suggestions.splice(index, 1);
  if (selectedLocal === id) {
    selectedLocal = null;
    timeline?.clearSelection();
  }
  refreshSuggestions();
  document.querySelector(`[data-add="${type}"]`)?.focus({ preventScroll: true });
}
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button?.disabled) return;
  if (editing) {
    if (button?.hasAttribute('data-close-modal')) closeEditor({ save: button.classList.contains('dialog-save') });
    return;
  }
  if (button?.id === 'regenerate') {
    if (!checkedSuggestions().length) return;
    lastGenerationRequest = checkedSuggestions().map(item => ({ ...item }));
    render('generating');
    return;
  }
  if (button?.dataset.page) { render(button.dataset.page); return; }
  if (button?.hasAttribute('data-preview-edit')) {
    if (currentPage !== 'feedback') render('feedback');
    const type = button.dataset.previewEdit;
    const item = suggestions.find(x => x.type === type);
    if (item) openEditor(item);
    else previewNotice('这类建议已全部删除，可以使用列表中的“新增”按钮创建。');
    return;
  }
  if (button?.dataset.edit) { openEditor(findSuggestion(button.dataset.edit)); return; }
  if (button?.dataset.add) { addSuggestion(button.dataset.add); return; }
  if (button?.dataset.delete) { deleteSuggestion(button.dataset.delete); return; }
  if (button?.hasAttribute('data-audio-preview')) { previewNotice('真实音频将在后续阶段接入，当前展示播放入口。'); return; }
  if (button?.hasAttribute('data-stage-only')) { previewNotice('此处先展示控件样式，完整操作留到后续阶段。'); return; }
  if (event.target.closest('.suggestion-actions')) return;
  const segment = event.target.closest('[data-segment]');
  if (segment) selectSegment(segment.dataset.segment);
});
document.addEventListener('change', event => {
  if (!event.target.matches('[data-check]')) return;
  const item = findSuggestion(event.target.dataset.check);
  if (!item) return;
  item.checked = Boolean(item.text.trim()) && event.target.checked;
  document.getElementById('regenerate').disabled = checkedSuggestions().length === 0;
});
window.addEventListener('popstate', () => {
  editorHistoryPending = false;
  if (editing) closeEditor({ popHistory: false });
});
window.addEventListener('pagehide', () => {
  timeline?.destroy();
  clearTimeout(generationTimer);
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
