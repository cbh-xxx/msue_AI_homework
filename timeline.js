/* 无声音的时间轴模拟。真实音频接入留至第四阶段。 */
class SongTimeline {
  constructor(host, { duration, state, getSelection, onRangeChange }) {
    this.host = host;
    this.duration = duration;
    this.state = state;
    this.getSelection = getSelection;
    this.onRangeChange = onRangeChange;
    this.playing = false;
    this.stopAt = null;
    this.frame = null;
    this.drag = null;
    this.events = new AbortController();
    this.mount();
  }

  mount() {
    this.host.innerHTML = `<div class="waveform-wrap"><svg class="waveform interactive-waveform" viewBox="0 0 320 74" preserveAspectRatio="none" aria-label="歌曲时间轴">
      <g class="wave-bars" aria-hidden="true"></g>
      <g class="selection-range">
        <rect class="range-frame" y="8" height="58" rx="5" pointer-events="none"/>
        ${['start', 'end'].map(edge => `<g class="range-handle" data-handle="${edge}" role="slider" tabindex="0" aria-label="${edge === 'start' ? '范围起点' : '范围终点'}"><rect class="handle-hit" x="-10" y="7" width="20" height="61"/><rect class="handle" x="-5" y="8" width="10" height="58" rx="4"/><path class="handle-notch" d="M0 31v12"/></g>`).join('')}
      </g>
      <g class="cursor-handle" data-handle="cursor" role="slider" tabindex="0" aria-label="播放游标" aria-valuemin="0" aria-valuemax="${this.duration}">
        <path class="playhead" d="M0 4v65" pointer-events="none"/>
        <path class="playhead-head" d="M-3 1h6v7l-3 4-3-4Z" pointer-events="none"/>
        <rect class="cursor-hit" x="-10" y="0" width="20" height="17"/>
      </g>
    </svg></div>
    <div class="timeline-control"><button data-timeline="play" aria-label="播放片段"><svg aria-hidden="true"><use href="#i-play"/></svg></button>
      <div class="time-values" aria-label="范围起点、游标时间、范围终点"><span data-time="start" title="范围起点">--:--</span><i>|</i><span data-time="cursor" title="游标时间">00:00</span><i>|</i><span data-time="end" title="范围终点">--:--</span></div>
      <div class="zoom-controls"><button data-timeline="out" aria-label="缩小时间轴" title="缩小时间轴"><svg aria-hidden="true"><use href="#i-zoom-out"/></svg></button><button data-timeline="in" aria-label="放大时间轴" title="放大时间轴"><svg aria-hidden="true"><use href="#i-zoom"/></svg></button></div>
    </div>
    <input class="timeline-pan" type="range" min="0" step="0.1" aria-label="平移时间轴视窗">
    <span class="sr-only">拖动白色游标可以自由定位，拖动两端灰色手柄可以修改片段范围。方向键调整一秒，Shift 加方向键调整五秒。</span>`;
    const signal = this.events.signal;
    this.host.addEventListener('pointerdown', event => this.pointerDown(event), { signal });
    this.host.addEventListener('pointermove', event => this.pointerMove(event), { signal });
    this.host.addEventListener('pointerup', event => this.finishDrag(event), { signal });
    this.host.addEventListener('pointercancel', event => this.finishDrag(event, true), { signal });
    this.host.addEventListener('lostpointercapture', event => this.finishDrag(event, true), { signal });
    this.host.addEventListener('keydown', event => this.keyDown(event), { signal });
    this.host.addEventListener('click', event => {
      const action = event.target.closest('[data-timeline]')?.dataset.timeline;
      if (action === 'play') this.toggle();
      if (action === 'in') this.zoom(0.5);
      if (action === 'out') this.zoom(2);
    }, { signal });
    this.host.querySelector('.timeline-pan').addEventListener('input', event => {
      this.state.viewStart = Number(event.target.value);
      this.paintBars();
      this.paint();
    }, { signal });
    this.paintBars();
    this.paint();
  }

  clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  format(value) {
    const seconds = Math.floor(value);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  get range() {
    const selection = this.getSelection();
    if (selection && this.drag?.id === selection.id && this.drag.type !== 'cursor') {
      return { ...selection, start: this.drag.start, end: this.drag.end };
    }
    return selection;
  }
  toX(seconds) { return 9 + (seconds - this.state.viewStart) / this.state.viewSpan * 302; }
  toTime(clientX) {
    const rect = this.host.querySelector('svg.waveform').getBoundingClientRect();
    const fraction = this.clamp(((clientX - rect.left) / rect.width * 320 - 9) / 302, 0, 1);
    return this.clamp(this.state.viewStart + fraction * this.state.viewSpan, 0, this.duration);
  }
  paintBars() {
    this.host.querySelector('.wave-bars').innerHTML = Array.from({ length: 98 }, (_, i) => {
      const position = this.state.viewStart + i / 97 * this.state.viewSpan;
      const height = 17 + Math.abs(Math.sin(position * 1.8) * Math.cos(position * 0.31)) * 35;
      return `<rect class="bar" x="${9 + i / 97 * 302}" y="${37 - height / 2}" width="1.6" height="${height}"/>`;
    }).join('');
  }
  paint() {
    const range = this.range;
    const group = this.host.querySelector('.selection-range');
    group.style.display = range ? '' : 'none';
    if (range) {
      const left = this.toX(range.start), right = this.toX(range.end);
      const frame = group.querySelector('.range-frame');
      frame.setAttribute('x', this.clamp(left, 9, 311));
      const width = Math.max(0, this.clamp(right, 9, 311) - this.clamp(left, 9, 311));
      frame.setAttribute('width', width);
      frame.style.display = width > 0 ? '' : 'none';
      for (const edge of ['start', 'end']) {
        const node = group.querySelector(`[data-handle="${edge}"]`);
        const x = this.toX(range[edge]);
        node.style.display = x < 8 || x > 312 ? 'none' : '';
        node.setAttribute('transform', `translate(${x},0)`);
        node.setAttribute('aria-valuemin', edge === 'start' ? 0 : range.start + 1);
        node.setAttribute('aria-valuemax', edge === 'start' ? range.end - 1 : this.duration);
        node.setAttribute('aria-valuenow', range[edge]);
        node.setAttribute('aria-valuetext', this.format(range[edge]));
      }
    }
    const cursor = this.host.querySelector('.cursor-handle');
    const cursorX = this.toX(this.state.current);
    cursor.style.display = cursorX < 8 || cursorX > 312 ? 'none' : '';
    cursor.setAttribute('transform', `translate(${cursorX},0)`);
    cursor.setAttribute('aria-valuenow', Math.floor(this.state.current));
    cursor.setAttribute('aria-valuetext', this.format(this.state.current));
    this.host.querySelector('[data-time="start"]').textContent = range ? this.format(range.start) : '--:--';
    this.host.querySelector('[data-time="cursor"]').textContent = this.format(this.state.current);
    this.host.querySelector('[data-time="end"]').textContent = range ? this.format(range.end) : '--:--';
    const play = this.host.querySelector('[data-timeline="play"]');
    play.setAttribute('aria-label', this.playing ? '暂停' : '播放');
    play.querySelector('use').setAttribute('href', this.playing ? '#i-pause' : '#i-play');
    this.host.querySelector('[data-timeline="out"]').disabled = this.state.viewSpan >= this.duration;
    this.host.querySelector('[data-timeline="in"]').disabled = this.state.viewSpan <= this.duration / 16;
    const pan = this.host.querySelector('.timeline-pan');
    pan.max = Math.max(0, this.duration - this.state.viewSpan);
    pan.value = this.state.viewStart;
    pan.hidden = this.state.viewSpan >= this.duration;
  }
  fitSelection() {
    const range = this.getSelection();
    if (!range) return;
    this.state.viewSpan = this.clamp((range.end - range.start) * 2, 20, this.duration);
    this.state.viewStart = this.clamp(range.start - this.state.viewSpan * 0.25, 0, this.duration - this.state.viewSpan);
    this.paintBars();
  }
  select({ autoplay = true } = {}) {
    const range = this.getSelection();
    if (!range) return;
    this.pause();
    this.state.current = range.start;
    this.stopAt = range.end;
    this.fitSelection();
    this.paint();
    if (autoplay) this.play();
  }
  clearSelection() { this.pause(); this.stopAt = null; this.paint(); }
  ensureCursorVisible() {
    if (this.state.current < this.state.viewStart || this.state.current > this.state.viewStart + this.state.viewSpan) {
      this.state.viewStart = this.clamp(this.state.current - this.state.viewSpan * 0.25, 0, this.duration - this.state.viewSpan);
      this.paintBars();
    }
  }
  seek(seconds) {
    this.state.current = this.clamp(seconds, 0, this.duration);
    this.stopAt = null;
    this.ensureCursorVisible();
    this.paint();
  }
  play() {
    if (this.playing) return;
    if (this.stopAt !== null && this.state.current >= this.stopAt) this.state.current = this.getSelection()?.start ?? 0;
    if (this.state.current >= this.duration) this.state.current = 0;
    this.playing = true;
    this.lastFrame = performance.now();
    this.paint();
    this.frame = requestAnimationFrame(now => this.tick(now));
  }
  tick(now) {
    if (!this.playing) return;
    const delta = Math.min((now - this.lastFrame) / 1000, 0.25);
    this.lastFrame = now;
    const limit = this.stopAt ?? this.duration;
    this.state.current = Math.min(limit, this.state.current + delta);
    this.ensureCursorVisible();
    this.paint();
    if (this.state.current >= limit) { this.pause(); return; }
    this.frame = requestAnimationFrame(next => this.tick(next));
  }
  pause() { this.playing = false; cancelAnimationFrame(this.frame); this.frame = null; this.paint(); }
  toggle() { if (this.playing) this.pause(); else this.play(); }
  zoom(factor) {
    const center = this.state.viewStart + this.state.viewSpan / 2;
    this.state.viewSpan = this.clamp(this.state.viewSpan * factor, this.duration / 16, this.duration);
    this.state.viewStart = this.clamp(center - this.state.viewSpan / 2, 0, this.duration - this.state.viewSpan);
    this.paintBars();
    this.paint();
  }

  pointerDown(event) {
    if (event.button !== 0 || this.drag || !event.target.closest('svg.waveform')) return;
    const type = event.target.closest('[data-handle]')?.dataset.handle ?? 'cursor';
    const range = this.getSelection();
    if (type !== 'cursor' && !range) return;
    event.preventDefault();
    const wasPlaying = this.playing;
    this.pause();
    this.drag = { type, pointerId: event.pointerId, id: range?.id, start: range?.start, end: range?.end, current: this.state.current, wasPlaying };
    this.host.setPointerCapture(event.pointerId);
    this.pointerMove(event);
  }
  pointerMove(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const seconds = this.toTime(event.clientX);
    if (this.drag.type === 'cursor') { this.state.current = seconds; this.stopAt = null; }
    if (this.drag.type === 'start') this.drag.start = this.clamp(Math.round(seconds), 0, this.drag.end - 1);
    if (this.drag.type === 'end') this.drag.end = this.clamp(Math.round(seconds), this.drag.start + 1, this.duration);
    this.paint();
  }
  finishDrag(event, cancelled = false) {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    const drag = this.drag;
    this.drag = null;
    if (this.host.hasPointerCapture(event.pointerId)) this.host.releasePointerCapture(event.pointerId);
    if (cancelled) this.state.current = drag.current;
    else if (drag.type !== 'cursor') {
      this.onRangeChange(drag.id, drag.start, drag.end);
      this.stopAt = null;
    }
    this.paint();
    if (drag.type === 'cursor' && drag.wasPlaying) this.play();
  }
  keyDown(event) {
    const type = event.target.closest('[data-handle]')?.dataset.handle;
    if (!type || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const step = (event.shiftKey ? 5 : 1) * (['ArrowLeft', 'ArrowDown'].includes(event.key) ? -1 : 1);
    if (type === 'cursor') {
      this.seek(event.key === 'Home' ? 0 : event.key === 'End' ? this.duration : this.state.current + step);
      return;
    }
    const range = this.getSelection();
    if (!range) return;
    this.pause();
    const min = type === 'start' ? 0 : range.start + 1;
    const max = type === 'start' ? range.end - 1 : this.duration;
    const value = event.key === 'Home' ? min : event.key === 'End' ? max : this.clamp(range[type] + step, min, max);
    this.onRangeChange(range.id, type === 'start' ? value : range.start, type === 'end' ? value : range.end);
    this.stopAt = null;
    this.paint();
  }
  destroy() {
    cancelAnimationFrame(this.frame);
    this.playing = false;
    this.events.abort();
  }
}
