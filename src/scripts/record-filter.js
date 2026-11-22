/**
 * 기록 필터 (/lab/)
 *
 * 주소의 ?cat= · ?tag= 를 읽어 목록을 걸러 내고,
 * 칩을 누르면 페이지를 새로 열지 않고 그 자리에서 다시 거릅니다.
 * 자바스크립트가 없으면 칩은 그냥 링크로 동작합니다.
 */
(() => {
  const bar = document.querySelector('[data-filter-bar]');
  if (!bar || bar.dataset.filterInPlace !== 'true') return;

  const items = [...document.querySelectorAll('[data-log-item]')];
  const chips = [...bar.querySelectorAll('[data-filter]')];
  const note = document.querySelector('[data-filter-note]');
  const empty = document.querySelector('[data-filter-empty]');
  const base = bar.dataset.filterBase || '/lab/';

  let state = { kind: 'all', value: '' };

  const readUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('cat');
    const tag = params.get('tag');
    if (tag) return { kind: 'tag', value: tag };
    if (cat) return { kind: 'cat', value: cat };
    return { kind: 'all', value: '' };
  };

  const paintChips = () => {
    for (const chip of chips) {
      const kind = chip.dataset.filter;
      const value = chip.dataset.value || '';
      const on = kind === state.kind && (kind === 'all' || value === state.value);
      chip.classList.toggle('is-active', on);
      if (on) chip.setAttribute('aria-current', 'true');
      else chip.removeAttribute('aria-current');
    }
  };

  const apply = () => {
    let visible = 0;
    for (const item of items) {
      let match = true;
      if (state.kind === 'cat') match = item.dataset.cat === state.value;
      if (state.kind === 'tag') {
        const tags = (item.dataset.tags || '').split('|');
        match = tags.includes(state.value);
      }
      item.hidden = !match;
      if (match) visible += 1;
    }
    if (note) {
      if (state.kind === 'all') {
        note.innerHTML = `전체 <strong>${visible}</strong>편`;
      } else {
        const label = state.kind === 'cat' ? '카테고리' : '태그';
        note.innerHTML = `${label} <strong>${state.value}</strong> · ${visible}편`;
      }
    }
    if (empty) empty.hidden = visible > 0;
    paintChips();
  };

  const writeUrl = () => {
    const params = new URLSearchParams();
    if (state.kind === 'cat') params.set('cat', state.value);
    if (state.kind === 'tag') params.set('tag', state.value);
    const query = params.toString();
    const next = query ? `${base}?${query}` : base;
    window.history.replaceState(null, '', next);
  };

  bar.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-filter]');
    if (!chip) return;
    event.preventDefault();
    state = { kind: chip.dataset.filter || 'all', value: chip.dataset.value || '' };
    writeUrl();
    apply();
  });

  state = readUrl();
  apply();
})();
