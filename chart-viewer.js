// Full-screen pinch-zoom / pan chart viewer, shared by every report page.
// Native pinch-zoom is deliberately disabled on the inline charts
// (touch-action: pan-y, see each report's <style>) so the OS never
// rasterizes them - this is the replacement: tapping an inline chart
// opens a true vector re-render that responds to pinch (zoom) and drag
// (pan through history), closed with the X or Escape.

const NS = 'http://www.w3.org/2000/svg';
let styleInjected = false;

function injectStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .chv-overlay {
      position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column;
      background: var(--page-base, #0b0e14);
      opacity: 0; pointer-events: none; transition: opacity 0.18s ease;
      --chart-surface: #e3e3e0; --chart-ink: #0b0b0b; --chart-muted: #6d6c66;
      --gridline: #cbcac5; --axis: #a8a79d;
    }
    .chv-overlay.active { opacity: 1; pointer-events: auto; }
    .chv-header {
      flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding: calc(14px + env(safe-area-inset-top)) 18px 12px;
    }
    .chv-title-wrap { min-width: 0; }
    .chv-title { font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0; }
    .chv-sub { font-size: 12.5px; color: var(--text-secondary); margin: 2px 0 0; }
    .chv-close {
      flex: 0 0 auto; width: 38px; height: 38px; border-radius: 12px; border: none;
      background: var(--ghost-btn-bg); color: var(--text-primary); display: flex;
      align-items: center; justify-content: center; cursor: pointer;
    }
    .chv-close svg { width: 18px; height: 18px; stroke: currentColor; }
    .chv-legend { flex: 0 0 auto; display: flex; gap: 14px; flex-wrap: wrap; padding: 0 20px 8px; }
    .chv-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-secondary); }
    .chv-legend-key { width: 14px; height: 3px; border-radius: 2px; flex: 0 0 auto; }
    .chv-body { flex: 1 1 auto; position: relative; overflow: hidden; padding: 0 8px 8px; min-height: 0; }
    .chv-svg { width: 100%; height: 100%; display: block; touch-action: none; }
    .chv-reset {
      position: absolute; top: 10px; right: 18px; z-index: 2;
      font-size: 12px; font-weight: 700; color: var(--accent-1); background: var(--surface-solid);
      border: 1px solid var(--border-hairline); border-radius: 999px; padding: 6px 13px;
      opacity: 0; pointer-events: none; transition: opacity 0.15s ease; cursor: pointer;
    }
    [dir="rtl"] .chv-reset { right: auto; left: 18px; }
    .chv-reset.show { opacity: 1; pointer-events: auto; }
    .chv-hint { flex: 0 0 auto; text-align: center; font-size: 12px; color: var(--text-muted); padding: 4px 20px calc(14px + env(safe-area-inset-bottom)); }
    .chv-tooltip {
      position: absolute; pointer-events: none; background: var(--chart-ink); color: #fff;
      border-radius: 10px; padding: 8px 12px; font-size: 13px; line-height: 1.6; display: none;
      white-space: nowrap; transform: translate(-50%, -112%); z-index: 3;
    }
    .chv-tooltip .chv-tt-date { color: #ccc; font-size: 11px; margin-bottom: 4px; }
    .chv-tooltip .chv-tt-row { display: flex; align-items: center; gap: 6px; }
    .chv-tooltip .chv-tt-key { width: 10px; height: 3px; display: inline-block; border-radius: 2px; }
    .chv-tooltip .chv-tt-value { font-weight: 700; margin-inline-start: auto; padding-inline-start: 10px; }
  `;
  document.head.appendChild(style);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// config = {
//   title, subtitle, unit, lang: 'en'|'he',
//   mode?: 'lines' (default) | 'bars',
//   -- lines mode --
//   series: [{ label, color, points: [{date:Date, value:number}], area?, dashed?, noLine? }],
//   formatValue?: (value, series) => string,
//   -- bars mode (one stacked bar per day) --
//   bars: [{ date: Date, segments: [{ key, color, label }] }],  // segments = active kinds that day, in stacking order
//   legendItems: [{ label, color }],
//   yMax?: number,          // fixed stack ceiling (defaults to the tallest bar present)
//   emptyDayLabel?: string, // tooltip text for a day with zero segments
//   -- shared --
//   initialStart?: Date, initialEnd?: Date,   // window to open on (defaults to full history)
//   hint?: string, onClose?: () => void
// }
export function openChartViewer(config) {
  injectStyle();

  const mode = config.mode === 'bars' ? 'bars' : 'lines';
  const {
    title, subtitle = '', series = [], bars = [], legendItems = null,
    lang = 'en', unit = '', yMax: fixedYMax = null,
    emptyDayLabel = lang === 'he' ? 'אין אימון' : 'No training',
    formatValue = (v) => (Math.round(v * 10) / 10) + (unit ? ' ' + unit : ''),
    hint = null, onClose = null
  } = config;

  let dataMinMs = Infinity, dataMaxMs = -Infinity;
  if (mode === 'bars') {
    bars.forEach(b => {
      const t = b.date.getTime();
      if (t < dataMinMs) dataMinMs = t;
      if (t > dataMaxMs) dataMaxMs = t;
    });
  } else {
    series.forEach(s => s.points.forEach(p => {
      const t = p.date.getTime();
      if (t < dataMinMs) dataMinMs = t;
      if (t > dataMaxMs) dataMaxMs = t;
    }));
  }
  if (!isFinite(dataMinMs)) return null; // nothing to show
  if (dataMinMs === dataMaxMs) { dataMinMs -= 86400000; dataMaxMs += 86400000; }
  const totalSpan = dataMaxMs - dataMinMs;
  const padSpan = Math.max(totalSpan * 0.04, 43200000);
  const boundMin = dataMinMs - padSpan;
  const boundMax = dataMaxMs + padSpan;
  const MIN_WINDOW_MS = Math.min(boundMax - boundMin, 3 * 86400000) || 86400000;
  const MAX_WINDOW_MS = boundMax - boundMin;

  let initStart = config.initialStart ? config.initialStart.getTime() : boundMin;
  let initEnd = config.initialEnd ? config.initialEnd.getTime() : boundMax;
  if (initEnd - initStart < MIN_WINDOW_MS) {
    const mid = (initStart + initEnd) / 2;
    initStart = mid - MIN_WINDOW_MS / 2;
    initEnd = mid + MIN_WINDOW_MS / 2;
  }
  let viewStart = clamp(initStart, boundMin, boundMax - (initEnd - initStart));
  let viewEnd = viewStart + (initEnd - initStart);
  const homeStart = viewStart, homeEnd = viewEnd;

  const overlay = document.createElement('div');
  overlay.className = 'chv-overlay';
  overlay.innerHTML = `
    <div class="chv-header">
      <div class="chv-title-wrap">
        <p class="chv-title"></p>
        <p class="chv-sub"></p>
      </div>
      <button type="button" class="chv-close" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <div class="chv-legend"></div>
    <div class="chv-body">
      <button type="button" class="chv-reset"></button>
      <svg class="chv-svg" preserveAspectRatio="none"></svg>
      <div class="chv-tooltip"></div>
    </div>
    <p class="chv-hint"></p>
  `;
  overlay.querySelector('.chv-title').textContent = title;
  overlay.querySelector('.chv-sub').textContent = subtitle;
  overlay.querySelector('.chv-reset').textContent = lang === 'he' ? 'איפוס תצוגה' : 'Reset view';
  overlay.querySelector('.chv-hint').textContent = hint || (lang === 'he'
    ? 'צביטה להתקרבות · גרירה לצדדים · הקשה לפרטים'
    : 'Pinch to zoom · Drag to pan through history · Tap for details');

  const legendEl = overlay.querySelector('.chv-legend');
  const legendSource = legendItems || series;
  if (legendSource.length > 1) {
    legendSource.forEach(s => {
      const item = document.createElement('div');
      item.className = 'chv-legend-item';
      const key = document.createElement('span');
      key.className = 'chv-legend-key';
      key.style.background = s.color;
      const label = document.createElement('span');
      label.textContent = s.label;
      item.appendChild(key);
      item.appendChild(label);
      legendEl.appendChild(item);
    });
  } else {
    legendEl.style.display = 'none';
  }

  const svg = overlay.querySelector('.chv-svg');
  const tooltip = overlay.querySelector('.chv-tooltip');
  const resetBtn = overlay.querySelector('.chv-reset');
  const closeBtn = overlay.querySelector('.chv-close');
  const body = overlay.querySelector('.chv-body');

  document.body.appendChild(overlay);
  const prevBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => overlay.classList.add('active'));

  function onKeydown(e) { if (e.key === 'Escape') close(); }
  function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 120); }
  let resizeTimer = null;

  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = prevBodyOverflow;
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', onResize);
    setTimeout(() => overlay.remove(), 200);
    if (onClose) onClose();
  }

  window.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', onResize);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  function locale() { return lang === 'he' ? 'he-IL' : undefined; }
  function fmtDate(d, opts) { return d.toLocaleDateString(locale(), opts || { month: 'short', day: 'numeric' }); }

  let W = 320, H = 400;
  let currentXOf = null, currentYOf = null, currentTOf = null, currentPlotW = 1, currentDays = null;

  function pointsInWindow(pts) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const t = pts[i].date.getTime();
      if (t < viewStart) continue;
      if (t > viewEnd) { out.push(pts[i]); break; }
      if (out.length === 0 && i > 0 && pts[i - 1].date.getTime() < viewStart) out.push(pts[i - 1]);
      out.push(pts[i]);
    }
    if (out.length === 0) {
      // Whole series falls outside the window - still show the point(s)
      // just before/after it so a hard pan doesn't blank the chart.
      let before = null, after = null;
      pts.forEach(p => {
        const t = p.date.getTime();
        if (t <= viewStart) before = p;
        if (t >= viewEnd && !after) after = p;
      });
      if (before) out.push(before);
      if (after) out.push(after);
    }
    return out;
  }

  // Shared by both modes: clears the SVG, draws the fixed-surface
  // background, and returns the x-axis helpers/plot rect every renderer
  // needs. Everything after this differs between a continuous value axis
  // (lines) and a per-day stack (bars).
  function renderScaffold() {
    const rect = body.getBoundingClientRect();
    W = Math.max(280, Math.round(rect.width));
    H = Math.max(240, Math.round(rect.height));
    const padL = 34, padR = 16, padT = 14, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;

    const xOf = (ms) => padL + ((ms - viewStart) / (viewEnd - viewStart)) * plotW;
    const tOf = (x) => viewStart + ((x - padL) / plotW) * (viewEnd - viewStart);

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';

    const bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('x', 0); bg.setAttribute('y', 0); bg.setAttribute('width', W); bg.setAttribute('height', H);
    bg.setAttribute('rx', 16); bg.setAttribute('fill', 'var(--chart-surface)');
    svg.appendChild(bg);

    return { padL, padR, padT, padB, plotW, plotH, xOf, tOf };
  }

  function drawXAxisLabels(padL, padR, padT, padB, plotW, xOf) {
    const spanMs = viewEnd - viewStart;
    const spanDays = spanMs / 86400000;
    const labelCount = Math.max(3, Math.floor(plotW / 70));
    for (let i = 0; i <= labelCount; i++) {
      const ms = viewStart + (i / labelCount) * spanMs;
      const x = xOf(ms);
      if (x < padL - 1 || x > W - padR + 1) continue;
      const label = document.createElementNS(NS, 'text');
      label.setAttribute('x', x); label.setAttribute('y', H - 10);
      label.setAttribute('text-anchor', 'middle'); label.setAttribute('font-size', '11');
      label.setAttribute('fill', 'var(--chart-muted)');
      const d = new Date(ms);
      label.textContent = spanDays > 450
        ? d.toLocaleDateString(locale(), { month: 'short', year: '2-digit' })
        : fmtDate(d);
      svg.appendChild(label);
    }
  }

  function addHitRect(padL, padT, plotW, plotH) {
    const hit = document.createElementNS(NS, 'rect');
    hit.setAttribute('x', padL); hit.setAttribute('y', padT);
    hit.setAttribute('width', plotW); hit.setAttribute('height', plotH);
    hit.setAttribute('fill', 'transparent');
    svg.appendChild(hit);
  }

  function renderLines() {
    const { padL, padR, padT, padB, plotW, plotH, xOf, tOf } = renderScaffold();

    let yMin = Infinity, yMax = -Infinity;
    const visible = series.map(s => {
      const pts = pointsInWindow(s.points);
      pts.forEach(p => { if (p.value < yMin) yMin = p.value; if (p.value > yMax) yMax = p.value; });
      return pts;
    });
    if (!isFinite(yMin)) { yMin = 0; yMax = 1; }
    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    const yPad = (yMax - yMin) * 0.12 || 1;
    yMin -= yPad; yMax += yPad;
    const yOf = (v) => padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    const clipId = 'chv-clip-' + Math.random().toString(36).slice(2);
    const defs = document.createElementNS(NS, 'defs');
    const clip = document.createElementNS(NS, 'clipPath');
    clip.setAttribute('id', clipId);
    const clipRect = document.createElementNS(NS, 'rect');
    clipRect.setAttribute('x', padL); clipRect.setAttribute('y', padT);
    clipRect.setAttribute('width', plotW); clipRect.setAttribute('height', plotH);
    clip.appendChild(clipRect);
    defs.appendChild(clip);
    svg.appendChild(defs);

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const v = yMin + (i / steps) * (yMax - yMin);
      const gy = yOf(v);
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', padL); line.setAttribute('x2', W - padR);
      line.setAttribute('y1', gy); line.setAttribute('y2', gy);
      line.setAttribute('stroke', 'var(--gridline)'); line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
      const label = document.createElementNS(NS, 'text');
      label.setAttribute('x', padL - 6); label.setAttribute('y', gy + 3);
      label.setAttribute('text-anchor', 'end'); label.setAttribute('font-size', '12');
      label.setAttribute('fill', 'var(--chart-muted)');
      label.textContent = Math.round(v * 10) / 10;
      svg.appendChild(label);
    }

    drawXAxisLabels(padL, padR, padT, padB, plotW, xOf);

    const plotGroup = document.createElementNS(NS, 'g');
    plotGroup.setAttribute('clip-path', `url(#${clipId})`);
    svg.appendChild(plotGroup);

    series.forEach((s, si) => {
      const pts = visible[si];
      if (pts.length === 0) return;
      const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + xOf(p.date.getTime()) + ' ' + yOf(p.value)).join(' ');

      if (s.area && !s.noLine && pts.length > 1) {
        const areaPath = d + ` L${xOf(pts[pts.length - 1].date.getTime())} ${padT + plotH} L${xOf(pts[0].date.getTime())} ${padT + plotH} Z`;
        const area = document.createElementNS(NS, 'path');
        area.setAttribute('d', areaPath);
        area.setAttribute('fill', s.color);
        area.setAttribute('opacity', '0.14');
        area.setAttribute('stroke', 'none');
        plotGroup.appendChild(area);
      }

      if (!s.noLine) {
        const line = document.createElementNS(NS, 'path');
        line.setAttribute('d', d);
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', s.color);
        line.setAttribute('stroke-width', s.dashed ? '2' : '2.6');
        if (s.dashed) line.setAttribute('stroke-dasharray', '6 5');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('stroke-linejoin', 'round');
        plotGroup.appendChild(line);
      }

      if (pts.length > 1 && (s.noLine || plotW / pts.length > 14)) {
        pts.forEach(p => {
          const c = document.createElementNS(NS, 'circle');
          c.setAttribute('cx', xOf(p.date.getTime()));
          c.setAttribute('cy', yOf(p.value));
          c.setAttribute('r', 3.2);
          c.setAttribute('fill', s.color);
          plotGroup.appendChild(c);
        });
      }
    });

    addHitRect(padL, padT, plotW, plotH);
    currentXOf = xOf; currentYOf = yOf; currentTOf = tOf; currentPlotW = plotW; currentDays = null;
  }

  function daysInWindow() {
    // Day-granularity - no boundary padding needed like the line-mode
    // pointsInWindow(), since bars is always a fully-filled daily series
    // (see each report's buildFilledDays) with no gaps to bridge.
    return bars.filter(b => {
      const t = b.date.getTime();
      return t >= viewStart - 43200000 && t <= viewEnd + 43200000;
    });
  }

  function renderBars() {
    const { padL, padR, padT, padB, plotW, plotH, xOf, tOf } = renderScaffold();

    const visibleDays = daysInWindow();
    const yTop = fixedYMax != null
      ? fixedYMax
      : Math.max(1, ...visibleDays.map(d => d.segments.length));
    const yOf = (v) => padT + plotH - (v / yTop) * plotH;

    for (let v = 0; v <= yTop; v++) {
      const gy = yOf(v);
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', padL); line.setAttribute('x2', W - padR);
      line.setAttribute('y1', gy); line.setAttribute('y2', gy);
      line.setAttribute('stroke', 'var(--gridline)'); line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
      if (v > 0) {
        const label = document.createElementNS(NS, 'text');
        label.setAttribute('x', padL - 6); label.setAttribute('y', gy + 3);
        label.setAttribute('text-anchor', 'end'); label.setAttribute('font-size', '12');
        label.setAttribute('fill', 'var(--chart-muted)');
        label.textContent = v;
        svg.appendChild(label);
      }
    }

    drawXAxisLabels(padL, padR, padT, padB, plotW, xOf);

    const bandW = visibleDays.length ? plotW / visibleDays.length : plotW;
    const barW = Math.max(6, Math.min(38, bandW * 0.55));
    visibleDays.forEach(d => {
      const cx = xOf(d.date.getTime() + 43200000); // center of that calendar day
      if (cx < padL - barW || cx > W - padR + barW) return;
      let baseline = padT + plotH;
      d.segments.forEach(seg => {
        const rect = document.createElementNS(NS, 'rect');
        rect.setAttribute('x', cx - barW / 2);
        rect.setAttribute('y', baseline - (plotH / yTop) + 1);
        rect.setAttribute('width', barW);
        rect.setAttribute('height', Math.max(0, plotH / yTop - 2));
        rect.setAttribute('rx', 3);
        rect.setAttribute('fill', seg.color);
        svg.appendChild(rect);
        baseline -= plotH / yTop;
      });
    });

    addHitRect(padL, padT, plotW, plotH);
    currentXOf = xOf; currentYOf = yOf; currentTOf = tOf; currentPlotW = plotW; currentDays = visibleDays;
  }

  function render() {
    if (mode === 'bars') renderBars(); else renderLines();
  }

  function updateResetVisibility() {
    const atHome = Math.abs(viewStart - homeStart) < 1000 && Math.abs(viewEnd - homeEnd) < 1000;
    resetBtn.classList.toggle('show', !atHome);
  }

  function clampView(newStart, newEnd) {
    let width = clamp(newEnd - newStart, MIN_WINDOW_MS, MAX_WINDOW_MS);
    if (newStart < boundMin) newStart = boundMin;
    if (newStart + width > boundMax) newStart = boundMax - width;
    return [newStart, newStart + width];
  }

  let rafPending = false;
  function scheduleRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; render(); updateResetVisibility(); });
  }

  function svgXFromClient(clientX) {
    const r = svg.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * W;
  }

  function hideTooltip() { tooltip.style.display = 'none'; }

  function showBarsTooltipAtClientX(clientX) {
    if (!currentDays || !currentDays.length || !currentXOf) return;
    const tMs = currentTOf(svgXFromClient(clientX));
    let nearest = null, best = Infinity;
    currentDays.forEach(d => {
      const dd = Math.abs(d.date.getTime() + 43200000 - tMs);
      if (dd < best) { best = dd; nearest = d; }
    });
    if (!nearest) return;

    tooltip.innerHTML = '';
    const dateEl = document.createElement('div');
    dateEl.className = 'chv-tt-date';
    dateEl.textContent = fmtDate(nearest.date, { month: 'short', day: 'numeric', year: 'numeric' });
    tooltip.appendChild(dateEl);

    if (nearest.segments.length === 0) {
      const none = document.createElement('div');
      none.className = 'chv-tt-row';
      none.textContent = emptyDayLabel;
      tooltip.appendChild(none);
    } else {
      nearest.segments.forEach(seg => {
        const row = document.createElement('div');
        row.className = 'chv-tt-row';
        const key = document.createElement('span');
        key.className = 'chv-tt-key';
        key.style.background = seg.color;
        const name = document.createElement('span');
        name.textContent = seg.label;
        row.appendChild(key); row.appendChild(name);
        tooltip.appendChild(row);
      });
    }

    const rect = svg.getBoundingClientRect();
    const px = (currentXOf(nearest.date.getTime() + 43200000) / W) * rect.width;
    tooltip.style.left = px + 'px';
    tooltip.style.top = '4px';
    tooltip.style.display = 'block';
  }

  function showTooltipAtClientX(clientX) {
    if (mode === 'bars') { showBarsTooltipAtClientX(clientX); return; }
    if (!series.length || !currentTOf) return;
    const tMs = currentTOf(svgXFromClient(clientX));
    const primary = series[0].points;
    let nearest = null, best = Infinity;
    primary.forEach(p => {
      const dd = Math.abs(p.date.getTime() - tMs);
      if (dd < best) { best = dd; nearest = p; }
    });
    if (!nearest) return;

    tooltip.innerHTML = '';
    const dateEl = document.createElement('div');
    dateEl.className = 'chv-tt-date';
    dateEl.textContent = fmtDate(nearest.date, { month: 'short', day: 'numeric', year: 'numeric' });
    tooltip.appendChild(dateEl);

    series.forEach(s => {
      let sp = null, sbest = Infinity;
      s.points.forEach(p => {
        const dd = Math.abs(p.date.getTime() - nearest.date.getTime());
        if (dd < sbest) { sbest = dd; sp = p; }
      });
      if (!sp) return;
      const row = document.createElement('div');
      row.className = 'chv-tt-row';
      const key = document.createElement('span');
      key.className = 'chv-tt-key';
      key.style.background = s.color;
      const name = document.createElement('span');
      name.textContent = s.label;
      const val = document.createElement('span');
      val.className = 'chv-tt-value';
      val.textContent = formatValue(sp.value, s);
      row.appendChild(key); row.appendChild(name); row.appendChild(val);
      tooltip.appendChild(row);
    });

    const rect = svg.getBoundingClientRect();
    const px = (currentXOf(nearest.date.getTime()) / W) * rect.width;
    const py = (currentYOf(nearest.value) / H) * rect.height;
    tooltip.style.left = px + 'px';
    tooltip.style.top = Math.max(0, py - 6) + 'px';
    tooltip.style.display = 'block';
  }

  const pointers = new Map();
  let pinchStartDist = null, pinchStartWindow = null, pinchAnchorMs = null;
  let panStartX = null, panStartView = null, panScale = null;
  let moved = false, downPos = null;

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function startPan(clientX) {
    panStartX = clientX;
    panStartView = [viewStart, viewEnd];
    const r = svg.getBoundingClientRect();
    panScale = {
      pxToSvg: W / r.width,
      svgToMs: (panStartView[1] - panStartView[0]) / (currentPlotW || (W - 62))
    };
  }

  svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    downPos = { x: e.clientX, y: e.clientY };
    moved = false;
    hideTooltip();

    if (pointers.size === 1) {
      startPan(e.clientX);
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStartDist = dist(a, b);
      pinchStartWindow = [viewStart, viewEnd];
      const midClientX = (a.x + b.x) / 2;
      pinchAnchorMs = currentTOf ? currentTOf(svgXFromClient(midClientX)) : (viewStart + viewEnd) / 2;
      panStartX = null;
    }
  });

  svg.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2 && pinchStartDist) {
      const [a, b] = [...pointers.values()];
      const scale = dist(a, b) / pinchStartDist;
      const [ws, we] = pinchStartWindow;
      const newWidth = (we - ws) / scale;
      const anchorFrac = (pinchAnchorMs - ws) / (we - ws);
      const newStart = pinchAnchorMs - anchorFrac * newWidth;
      [viewStart, viewEnd] = clampView(newStart, newStart + newWidth);
      moved = true;
      scheduleRender();
    } else if (pointers.size === 1 && panStartX != null) {
      const dx = e.clientX - panStartX;
      if (Math.abs(dx) > 3 || Math.abs(e.clientY - downPos.y) > 3) moved = true;
      const dMs = dx * panScale.pxToSvg * panScale.svgToMs;
      const newStart = panStartView[0] - dMs;
      const newEnd = panStartView[1] - dMs;
      [viewStart, viewEnd] = clampView(newStart, newEnd);
      scheduleRender();
    }
  });

  function endPointer(e) {
    pointers.delete(e.pointerId);
    try { svg.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }

    if (pointers.size === 0) {
      pinchStartDist = null;
      panStartX = null;
      if (!moved && downPos) showTooltipAtClientX(downPos.x);
    } else if (pointers.size === 1) {
      pinchStartDist = null;
      const [[, pos]] = [...pointers.entries()];
      startPan(pos.x);
    }
  }
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const anchorMs = currentTOf ? currentTOf(svgXFromClient(e.clientX)) : (viewStart + viewEnd) / 2;
    const factor = Math.exp(-e.deltaY * 0.0015);
    const newWidth = (viewEnd - viewStart) / factor;
    const anchorFrac = (anchorMs - viewStart) / (viewEnd - viewStart);
    const newStart = anchorMs - anchorFrac * newWidth;
    [viewStart, viewEnd] = clampView(newStart, newStart + newWidth);
    scheduleRender();
  }, { passive: false });

  resetBtn.addEventListener('click', () => {
    viewStart = homeStart; viewEnd = homeEnd;
    hideTooltip();
    scheduleRender();
  });

  requestAnimationFrame(() => { render(); updateResetVisibility(); });

  return { close };
}
