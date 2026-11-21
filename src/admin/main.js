/**
 * 쿼구리 관리자 — 브라우저에서 바로 글을 쓰고 커밋하는 클라이언트 CMS
 *
 * · 로그인: 직접 발급한 GitHub Fine-grained PAT를 이 브라우저에만 저장
 * · 편집: src/content/blog 의 마크다운을 GitHub API로 읽고/커밋
 * · 점검: 저장 전에 제목·설명·소제목·분량·내부링크·이미지 설명을 실시간 채점
 * · 계정 정보(아이디·이메일·토큰)는 코드에 전혀 들어 있지 않습니다.
 */

import { GitHub, GitHubError } from './github.js';
import { parsePost, serializePost, slugify, toDateInput } from './frontmatter.js';
import { renderMarkdown } from './markdown.js';
import { analyzeSeo } from './seo.js';
import {
  ABOUT_PATH,
  aboutDefaults,
  cleanAbout,
  todayInput,
  validateAbout,
  parseAbout,
  serializeAbout,
} from './about.js';
import {
  MAX_OUTPUT_BYTES,
  MAX_EDGE,
  buildUploadPath,
  extensionForMime,
  formatBytes,
  publicPathFor,
  validateImageFile,
} from './images.js';

const CONTENT_DIR = 'src/content/blog';
const BRANCH = 'main';
const REPO_HINT = 'quoguri-blog';

const TOKEN_KEY = 'qg-admin-token';
const REPO_KEY = 'qg-admin-repo';
const REMEMBER_KEY = 'qg-admin-remember';

const CATEGORIES = [
  { slug: 'tech', label: '테크·데스크테리어' },
  { slug: 'beauty', label: '뷰티·리뷰' },
  { slug: 'travel', label: '여행·디카' },
  { slug: 'life', label: '일상·꿀팁' },
];

const state = {
  gh: null,
  user: null,
  repo: null,
  posts: [],
  loadedAt: 0,
  current: null,
  dirty: false,
  view: 'login',
  filter: 'all',
  query: '',
  keyword: '',
  section: 'posts',
  about: null,
  aboutDirty: false,
};

const root = () => document.getElementById('admin-root');
const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const basePath = () => {
  const value = root()?.dataset.base || '/';
  return value.endsWith('/') ? value : `${value}/`;
};

const today = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

function toast(message, type = 'ok') {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const node = document.createElement('div');
  node.className = `toast toast--${type}`;
  node.textContent = message;
  host.appendChild(node);
  window.setTimeout(() => {
    node.classList.add('toast--out');
    window.setTimeout(() => node.remove(), 320);
  }, type === 'error' ? 6000 : 3200);
}

function setError(host, message) {
  if (!host) return;
  host.textContent = message || '';
  host.hidden = !message;
}

/* ── 저장소·토큰 ───────────────────────────────────────── */
function readStoredToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function readStoredRepo() {
  try {
    return localStorage.getItem(REPO_KEY) || '';
  } catch {
    return '';
  }
}

function storeToken(token, remember) {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  } catch {
    /* 저장소를 막아 둔 브라우저면 이번 세션에서만 메모리로 씁니다. */
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* noop */
  }
}

const parseRepoInput = (value) => {
  const text = String(value || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/, '');
  const parts = text.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], name: parts[1] };
};

/* ── 로그인 화면 ───────────────────────────────────────── */
function renderLogin(message = '') {
  document.title = '로그인 · 쿼구리 관리자';
  state.view = 'login';
  state.section = 'posts';
  root().innerHTML = `
    <div class="login">
      <div class="login__card">
        <div class="login__brand">
          <span class="mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="38" height="38" fill="none">
              <rect width="40" height="40" rx="12" fill="currentColor" />
              <circle cx="19" cy="18.6" r="8" stroke="#fbf7f0" stroke-width="2.4" />
              <path d="M22.8 23.2 28.2 29" stroke="#fbf7f0" stroke-width="2.4" stroke-linecap="round" />
            </svg>
          </span>
          <div>
            <p class="login__title">쿼구리 관리자</p>
            <p class="login__sub">내 GitHub 토큰으로만 열리는 글쓰기 화면</p>
          </div>
        </div>

        <form id="login-form" autocomplete="off">
          <label class="field">
            <span class="field__label">GitHub Personal Access Token</span>
            <input id="login-token" type="password" inputmode="text" spellcheck="false"
              autocomplete="off" placeholder="github_pat_…" required />
          </label>

          <details class="login__advanced">
            <summary>저장소를 직접 지정하기 (보통은 자동으로 찾습니다)</summary>
            <label class="field">
              <span class="field__label">owner/repo</span>
              <input id="login-repo" type="text" spellcheck="false" autocomplete="off"
                placeholder="예: 내아이디/quoguri-blog" />
            </label>
          </details>

          <label class="check">
            <input id="login-remember" type="checkbox" />
            <span>이 브라우저에 토큰 기억하기 (내 기기에서만)</span>
          </label>

          <p class="login__error" id="login-error" hidden></p>

          <button class="btn btn--primary btn--block" type="submit" id="login-submit">로그인</button>
        </form>

        <details class="login__help">
          <summary>토큰은 어떻게 만드나요?</summary>
          <ol>
            <li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">GitHub → Fine-grained personal access token 만들기</a>를 엽니다.</li>
            <li>Token name에 <code>quoguri-admin</code>처럼 알아보기 쉬운 이름을 적습니다.</li>
            <li>Expiration은 90일을 권장합니다. 만료되면 새 토큰으로 다시 로그인하면 됩니다.</li>
            <li>Repository access → <strong>Only select repositories</strong> → <strong>${esc(REPO_HINT)}</strong> 저장소만 선택합니다.</li>
            <li>Repository permissions → <strong>Contents: Read and write</strong> (Metadata는 자동으로 Read).</li>
            <li>Generate token 후 나온 <code>github_pat_…</code> 값을 위 칸에 붙여 넣습니다. 이 값은 다시 볼 수 없으니 안전한 곳에 따로 보관하세요.</li>
          </ol>
          <p class="login__warn">
            토큰은 이 브라우저 안(탭을 닫으면 사라지는 저장소)에서만 쓰이고, <code>api.github.com</code> 외에는 전송되지 않습니다.
            공용 PC에서는 '기억하기'를 켜지 마세요.
          </p>
        </details>
      </div>

      <p class="login__foot">© ${new Date().getFullYear()} 쿼구리 · 이 화면은 검색엔진에 노출되지 않습니다</p>
    </div>
  `;

  const form = document.getElementById('login-form');
  const tokenInput = document.getElementById('login-token');
  const repoInput = document.getElementById('login-repo');
  const remember = document.getElementById('login-remember');
  const errorBox = document.getElementById('login-error');
  const submit = document.getElementById('login-submit');

  repoInput.value = readStoredRepo();
  setError(errorBox, message);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = tokenInput.value.trim();
    if (!token) {
      setError(errorBox, '토큰을 입력해 주세요.');
      return;
    }
    submit.disabled = true;
    submit.textContent = '확인 중…';
    setError(errorBox, '');
    try {
      await connect(token, parseRepoInput(repoInput.value), Boolean(remember.checked));
    } catch (error) {
      setError(errorBox, error?.message || '로그인하지 못했어요.');
      submit.disabled = false;
      submit.textContent = '로그인';
    }
  });

  window.setTimeout(() => tokenInput.focus(), 60);
}

/* ── 연결 ─────────────────────────────────────────────── */
async function connect(token, manualRepo, remember = false) {
  const gh = new GitHub(token, manualRepo || { owner: '', name: '' });
  const user = await gh.getUser();

  let repo = manualRepo;
  if (!repo) {
    const found = await gh.findRepo(REPO_HINT);
    if (!found) {
      throw new Error(
        `토큰으로 접근할 수 있는 저장소에서 '${REPO_HINT}'를 찾지 못했어요. ` +
          "'저장소를 직접 지정하기'에 owner/repo를 적거나, 토큰의 Repository access를 확인해 주세요.",
      );
    }
    repo = { owner: found.owner.login, name: found.name };
  }

  gh.repo = repo;
  const info = await gh.getRepo();
  if (!info.permissions || !info.permissions.push) {
    throw new Error('이 저장소에 쓸 권한이 없어요. 토큰 권한의 Contents를 Read and write로 바꿔 주세요.');
  }

  try {
    await gh.listDir(CONTENT_DIR);
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) {
      throw new Error(`저장소 안에서 '${CONTENT_DIR}' 폴더를 찾지 못했어요. 저장소가 맞는지 확인해 주세요.`);
    }
    throw error;
  }

  state.gh = gh;
  state.user = user;
  state.repo = repo;
  state.posts = [];
  state.loadedAt = 0;
  state.current = null;
  storeToken(token, remember);
  try {
    localStorage.setItem(REPO_KEY, `${repo.owner}/${repo.name}`);
  } catch {
    /* noop */
  }

  renderApp();
  await loadPosts();
}

/* ── 앱 껍데기 ─────────────────────────────────────────── */
function renderApp() {
  state.view = 'list';
  root().innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="topbar__brand">
          <span class="mark mark--sm" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="30" height="30" fill="none">
              <rect width="40" height="40" rx="12" fill="currentColor" />
              <circle cx="19" cy="18.6" r="8" stroke="#fbf7f0" stroke-width="2.4" />
              <path d="M22.8 23.2 28.2 29" stroke="#fbf7f0" stroke-width="2.4" stroke-linecap="round" />
            </svg>
          </span>
          <span class="topbar__name">쿼구리 관리자</span>
          <nav class="topbar__tabs" aria-label="관리자 메뉴">
            <button class="topbar__tab${state.section === 'posts' ? ' is-active' : ''}" type="button" data-section="posts">글 관리</button>
            <button class="topbar__tab${state.section === 'about' ? ' is-active' : ''}" type="button" data-section="about">소개 페이지</button>
          </nav>
        </div>
        <div class="topbar__right">
          <span class="topbar__repo" title="현재 저장소">${esc(state.repo.owner)}/${esc(state.repo.name)}</span>
          <a class="topbar__link" href="${esc(siteHome())}" target="_blank" rel="noopener noreferrer">사이트 열기 ↗</a>
          <button class="btn btn--ghost" type="button" id="logout">로그아웃</button>
        </div>
      </header>
      <main class="workspace" id="workspace"></main>
      <div class="toast-host" id="toast-host" aria-live="polite"></div>
    </div>
  `;

  document.getElementById('logout')?.addEventListener('click', () => {
    if ((state.dirty || state.aboutDirty) && !window.confirm('저장하지 않은 변경이 있어요. 그래도 로그아웃할까요?')) return;
    state.dirty = false;
    state.aboutDirty = false;
    clearSession();
    state.gh = null;
    state.user = null;
    state.posts = [];
    state.about = null;
    renderLogin();
  });

  document.querySelectorAll('[data-section]').forEach((button) => {
    button.addEventListener('click', () => switchSection(button.dataset.section));
  });

  window.onbeforeunload = () => (state.dirty || state.aboutDirty ? true : undefined);
}

function markSection(section) {
  state.section = section;
  document.querySelectorAll('[data-section]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.section === section);
    button.setAttribute('aria-current', button.dataset.section === section ? 'page' : 'false');
  });
}

function switchSection(next) {
  if (!next || next === state.section) return;
  if ((state.dirty || state.aboutDirty) && !window.confirm('저장하지 않은 변경이 있어요. 이동할까요?')) return;
  const leftAbout = state.section === 'about' && next !== 'about';
  state.dirty = false;
  state.aboutDirty = false;
  state.current = null;
  if (leftAbout) state.about = null;
  markSection(next);
  if (next === 'about') {
    loadAbout();
  } else if (state.posts.length) {
    renderList();
  } else {
    loadPosts();
  }
}

function siteHome() {
  return basePath();
}

function postUrl(slug) {
  return `${basePath()}posts/${encodeURIComponent(slug)}/`;
}

function setWorkspace(html) {
  const node = document.getElementById('workspace');
  if (node) node.innerHTML = html;
  return node;
}

/* ── 글 목록 ──────────────────────────────────────────── */
async function loadPosts(force = false) {
  const workspace = document.getElementById('workspace');
  if (!workspace) return;
  const fresh = Date.now() - state.loadedAt < 60_000;
  if (!force && state.posts.length && fresh) {
    renderList();
    return;
  }

  workspace.innerHTML = `
    <div class="loading">
      <span class="spinner" aria-hidden="true"></span>
      <p>글 목록을 불러오는 중…</p>
    </div>
  `;

  try {
    const entries = await state.gh.listDir(CONTENT_DIR);
    const files = (Array.isArray(entries) ? entries : []).filter(
      (entry) => entry.type === 'file' && /\.(md|mdx)$/i.test(entry.name),
    );

    const posts = await mapLimit(files, 4, async (file) => {
      try {
        const data = await state.gh.getFile(file.path);
        const parsed = parsePost(data.text);
        return {
          path: file.path,
          name: file.name,
          slug: file.name.replace(/\.(md|mdx)$/i, ''),
          ext: file.name.endsWith('.mdx') ? 'mdx' : 'md',
          sha: data.sha,
          size: data.size,
          data: { ...parsed.data, ...normalizeData(parsed.data) },
          body: parsed.body,
          raw: data.text,
        };
      } catch (error) {
        console.warn('파일을 읽지 못했습니다', file.path, error);
        return null;
      }
    });

    state.posts = posts.filter(Boolean).sort((a, b) => {
      const at = new Date(a.data.pubDate || 0).getTime();
      const bt = new Date(b.data.pubDate || 0).getTime();
      return bt - at;
    });
    state.loadedAt = Date.now();
    renderList();
  } catch (error) {
    workspace.innerHTML = `
      <div class="empty">
        <p class="empty__title">글 목록을 불러오지 못했어요</p>
        <p>${esc(error?.message || '알 수 없는 오류')}</p>
        <button class="btn" type="button" id="retry-load">다시 시도</button>
      </div>
    `;
    document.getElementById('retry-load')?.addEventListener('click', () => loadPosts(true));
  }
}

function normalizeData(data) {
  const tags = Array.isArray(data.tags) ? data.tags : data.tags ? [String(data.tags)] : [];
  return {
    title: data.title ? String(data.title) : '',
    description: data.description ? String(data.description) : '',
    pubDate: toDateInput(data.pubDate) || '',
    updatedDate: toDateInput(data.updatedDate) || '',
    category: ['tech', 'beauty', 'travel', 'life'].includes(data.category) ? data.category : 'life',
    tags,
    cover: data.cover ? String(data.cover) : '',
    coverAlt: data.coverAlt ? String(data.coverAlt) : '',
    featured: data.featured === true || data.featured === 'true',
    draft: data.draft === true || data.draft === 'true',
    series: data.series ? String(data.series) : '',
    seoTitle: data.seoTitle ? String(data.seoTitle) : '',
  };
}

function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index], index);
    }
  });
  return Promise.all(workers).then(() => results);
}

function categoryLabel(slug) {
  return CATEGORIES.find((item) => item.slug === slug)?.label ?? slug;
}

function renderList() {
  state.view = 'list';
  document.title = '글 목록 · 쿼구리 관리자';

  const now = new Date();
  const counts = {
    all: state.posts.length,
    published: state.posts.filter((post) => !post.data.draft && new Date(post.data.pubDate || 0) <= now).length,
    draft: state.posts.filter((post) => post.data.draft).length,
    featured: state.posts.filter((post) => post.data.featured).length,
  };

  const query = state.query.trim().toLowerCase();
  const visible = state.posts.filter((post) => {
    if (state.filter === 'published' && (post.data.draft || new Date(post.data.pubDate || 0) > now)) return false;
    if (state.filter === 'draft' && !post.data.draft) return false;
    if (state.filter === 'featured' && !post.data.featured) return false;
    if (!query) return true;
    return [post.data.title, post.data.description, post.data.tags.join(' '), post.slug]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  setWorkspace(`
    <div class="listview">
      <div class="listview__head">
        <div>
          <h1 class="listview__title">글 관리</h1>
          <p class="listview__sub">${counts.all}편 · 발행 ${counts.published} · 임시저장 ${counts.draft}</p>
        </div>
        <div class="listview__actions">
          <button class="btn" type="button" id="reload">새로고침</button>
          <button class="btn btn--primary" type="button" id="new-post">새 글 쓰기</button>
        </div>
      </div>

      <div class="filters">
        <div class="filters__tabs" role="tablist">
          ${[
            ['all', `전체 ${counts.all}`],
            ['published', `발행 ${counts.published}`],
            ['draft', `임시저장 ${counts.draft}`],
            ['featured', `대표 ${counts.featured}`],
          ]
            .map(
              ([key, label]) =>
                `<button class="tab${state.filter === key ? ' is-active' : ''}" type="button" data-filter="${key}" role="tab" aria-selected="${state.filter === key}">${label}</button>`,
            )
            .join('')}
        </div>
        <input class="filters__search" id="list-search" type="search" placeholder="제목·태그로 찾기" value="${esc(state.query)}" />
      </div>

      ${
        visible.length === 0
          ? `<div class="empty">
               <p class="empty__title">${state.posts.length ? '조건에 맞는 글이 없어요' : '아직 글이 없어요'}</p>
               <p>${state.posts.length ? '검색어나 필터를 바꿔 보세요.' : '첫 글을 써서 블로그를 시작해 보세요.'}</p>
               <button class="btn btn--primary" type="button" id="new-post-2">새 글 쓰기</button>
             </div>`
          : `<ul class="posts">
              ${visible.map((post) => renderRow(post, now)).join('')}
            </ul>`
      }
    </div>
  `);

  document.getElementById('new-post')?.addEventListener('click', () => openEditor(null));
  document.getElementById('new-post-2')?.addEventListener('click', () => openEditor(null));
  document.getElementById('reload')?.addEventListener('click', () => loadPosts(true));

  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      renderList();
    });
  });

  const searchInput = document.getElementById('list-search');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      state.query = event.target.value;
      renderList();
      const next = document.getElementById('list-search');
      if (next) {
        next.focus();
        next.setSelectionRange(next.value.length, next.value.length);
      }
    });
  }

  document.querySelectorAll('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      const post = state.posts.find((item) => item.path === button.dataset.edit);
      if (post) openEditor(post);
    });
  });

  document.querySelectorAll('[data-duplicate]').forEach((button) => {
    button.addEventListener('click', () => {
      const post = state.posts.find((item) => item.path === button.dataset.duplicate);
      if (post) duplicatePost(post);
    });
  });

  document.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', () => {
      const post = state.posts.find((item) => item.path === button.dataset.delete);
      if (post) removePost(post);
    });
  });
}

function renderRow(post, now) {
  const future = new Date(post.data.pubDate || 0) > now;
  const status = post.data.draft ? 'draft' : future ? 'scheduled' : 'live';
  const statusLabel = post.data.draft ? '임시저장' : future ? '예약' : '발행';
  const date = post.data.pubDate || '날짜 없음';
  return `
    <li class="post-row">
      <div class="post-row__main">
        <div class="post-row__badges">
          <span class="badge badge--${status}">${statusLabel}</span>
          <span class="badge badge--cat">${esc(categoryLabel(post.data.category))}</span>
          ${post.data.featured ? '<span class="badge badge--pick">대표</span>' : ''}
          ${post.ext === 'mdx' ? '<span class="badge">MDX</span>' : ''}
        </div>
        <button class="post-row__title" type="button" data-edit="${esc(post.path)}">${esc(post.data.title || post.slug)}</button>
        <p class="post-row__desc">${esc(post.data.description || '설명이 아직 없어요')}</p>
        <p class="post-row__meta">
          <span>${esc(date)}</span>
          <span>${esc(post.slug)}</span>
          <span>${Math.max(1, Math.round(post.size / 1024))}KB</span>
          ${post.data.tags.length ? `<span>#${post.data.tags.map((tag) => esc(tag)).join(' #')}</span>` : ''}
        </p>
      </div>
      <div class="post-row__actions">
        <button class="btn btn--sm" type="button" data-edit="${esc(post.path)}">수정</button>
        <button class="btn btn--sm btn--ghost" type="button" data-duplicate="${esc(post.path)}">복제</button>
        <button class="btn btn--sm btn--danger" type="button" data-delete="${esc(post.path)}">삭제</button>
      </div>
    </li>
  `;
}

/* ── 편집기 ───────────────────────────────────────────── */
function emptyPost() {
  return {
    path: '',
    name: '',
    slug: '',
    ext: 'md',
    sha: '',
    data: {
      title: '',
      description: '',
      pubDate: today(),
      updatedDate: '',
      category: 'life',
      tags: [],
      cover: '',
      coverAlt: '',
      featured: false,
      draft: true,
      series: '',
      seoTitle: '',
    },
    body: '',
    isNew: true,
  };
}

function openEditor(post) {
  state.current = post ?? emptyPost();
  state.dirty = false;
  state.keyword = '';
  renderEditor();
}

function duplicatePost(post) {
  const copy = {
    ...post,
    path: '',
    name: '',
    slug: `${post.slug}-copy`,
    sha: '',
    isNew: true,
    data: { ...post.data, title: `${post.data.title} (복사)`, draft: true, featured: false },
  };
  state.current = copy;
  state.dirty = true;
  renderEditor();
  toast('복제본을 열었어요. 제목과 주소를 고친 뒤 저장하세요.');
}

function editorHtml(post) {
  const data = post.data;
  return `
    <div class="editor">
      <div class="editor__bar">
        <button class="btn btn--ghost btn--sm" type="button" id="back">← 글 목록</button>
        <div class="editor__bar-title">
          <span id="editor-mode">${post.isNew ? '새 글' : '글 수정'}</span>
          <span class="editor__dot" aria-hidden="true">·</span>
          <span id="editor-slug">${esc(post.slug || '주소 없음')}</span>
        </div>
        <div class="editor__bar-actions">
          <span class="editor__state" id="editor-state">${post.isNew ? '아직 저장 전' : '불러옴'}</span>
          ${post.isNew ? '' : `<a class="btn btn--ghost btn--sm" href="${esc(`https://github.com/${state.repo.owner}/${state.repo.name}/blob/${BRANCH}/${post.path}`)}" target="_blank" rel="noopener noreferrer">GitHub 원문 ↗</a>`}
          <button class="btn btn--primary btn--sm" type="button" id="save">저장 (커밋)</button>
        </div>
      </div>

      <div class="editor__grid">
        <div class="editor__main">
          <div class="fields">
            <label class="field field--wide">
              <span class="field__label">제목 <em id="title-count">0자</em></span>
              <input id="f-title" type="text" maxlength="120" placeholder="예: 당근에서 빈티지 디카 살 때 꼭 확인하는 5가지" value="${esc(data.title)}" />
            </label>

            <div class="field field--wide">
              <span class="field__label">주소(슬러그) <em>영문·숫자·한글, 공백은 - 로</em></span>
              <div class="field__row">
                <input id="f-slug" type="text" placeholder="used-digicam-checklist" value="${esc(post.slug)}" />
                <button class="btn btn--sm btn--ghost" type="button" id="slug-from-title">제목에서 만들기</button>
              </div>
            </div>

            <label class="field field--wide">
              <span class="field__label">메타 설명 <em id="desc-count">0자 · 80~150자 권장</em></span>
              <textarea id="f-description" rows="3" maxlength="300" placeholder="검색 결과에 보일 한 줄 요약">${esc(data.description)}</textarea>
            </label>

            <label class="field">
              <span class="field__label">카테고리</span>
              <select id="f-category">
                ${CATEGORIES.map(
                  (category) =>
                    `<option value="${category.slug}"${data.category === category.slug ? ' selected' : ''}>${category.label}</option>`,
                ).join('')}
              </select>
            </label>

            <label class="field">
              <span class="field__label">태그 <em>쉼표로 구분</em></span>
              <input id="f-tags" type="text" placeholder="빈티지디카, 중고거래" value="${esc(data.tags.join(', '))}" />
            </label>

            <label class="field">
              <span class="field__label">발행일</span>
              <input id="f-pubdate" type="date" value="${esc(data.pubDate)}" />
            </label>

            <label class="field">
              <span class="field__label">수정일 <em>선택</em></span>
              <input id="f-updated" type="date" value="${esc(data.updatedDate)}" />
            </label>

            <div class="field field--wide">
              <span class="field__label">대표 사진 <em>비우면 타이포그래피 커버</em></span>
              <div class="upload__row">
                <input id="f-cover" type="text" placeholder="/images/my-photo.jpg 또는 https://…" value="${esc(data.cover)}" />
                <label class="btn btn--sm upload__pick" for="f-cover-file">
                  <span aria-hidden="true">⤒</span> 내 컴퓨터에서 선택
                </label>
                <input id="f-cover-file" class="upload__file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" />
              </div>
              <p class="upload__state" id="cover-upload-state">
                사진을 고르면 저장소 public/images/uploads/ 에 올리고 주소를 자동으로 채워요.
              </p>
              <div class="upload__preview" id="cover-preview" hidden>
                <img alt="대표 사진 미리보기" id="cover-preview-img" />
              </div>
            </div>

            <label class="field field--wide">
              <span class="field__label">대표 사진 설명(alt) <em>사진이 있을 때만</em></span>
              <input id="f-coveralt" type="text" value="${esc(data.coverAlt)}" />
            </label>

            <label class="field">
              <span class="field__label">시리즈 <em>선택</em></span>
              <input id="f-series" type="text" placeholder="빈티지 디카 입문기" value="${esc(data.series)}" />
            </label>

            <div class="field">
              <span class="field__label">공개 설정</span>
              <div class="checks">
                <label class="check"><input id="f-draft" type="checkbox"${data.draft ? ' checked' : ''} /><span>임시저장 (draft)</span></label>
                <label class="check"><input id="f-featured" type="checkbox"${data.featured ? ' checked' : ''} /><span>홈 대표 글로</span></label>
              </div>
            </div>
          </div>

          <div class="write">
            <div class="write__toolbar" role="toolbar" aria-label="마크다운 서식">
              <button type="button" data-md="h2" title="소제목 H2">H2</button>
              <button type="button" data-md="h3" title="소제목 H3">H3</button>
              <span class="write__sep" aria-hidden="true"></span>
              <button type="button" data-md="bold" title="굵게"><b>B</b></button>
              <button type="button" data-md="italic" title="기울임"><i>I</i></button>
              <button type="button" data-md="link" title="링크">링크</button>
              <button type="button" data-md="image" title="이미지">사진</button>
              <span class="write__sep" aria-hidden="true"></span>
              <button type="button" data-md="ul" title="목록">• 목록</button>
              <button type="button" data-md="ol" title="번호 목록">1. 목록</button>
              <button type="button" data-md="quote" title="인용">인용</button>
              <button type="button" data-md="table" title="표">표</button>
              <button type="button" data-md="hr" title="구분선">―</button>
            </div>
            <div class="write__panes">
              <textarea id="f-body" class="write__input" spellcheck="false" placeholder="## 소제목부터 시작해 보세요.

첫 문단에 결론을 먼저 쓰면 검색으로 들어온 사람이 바로 답을 얻어요.">${esc(post.body)}</textarea>
              <div class="write__preview">
                <p class="write__preview-label">미리보기</p>
                <div class="preview" id="preview"></div>
              </div>
            </div>
          </div>
        </div>

        <aside class="editor__side">
          <div class="seo" id="seo">
            <div class="seo__head">
              <div class="seo__score" id="seo-score">
                <span id="seo-score-value">0</span>
              </div>
              <div>
                <p class="seo__title">검색 노출 점검</p>
                <p class="seo__grade" id="seo-grade">점검 중…</p>
              </div>
            </div>

            <label class="field field--tight">
              <span class="field__label">노릴 검색어 <em>선택</em></span>
              <input id="seo-keyword" type="text" placeholder="예: 빈티지 디카" />
            </label>

            <ul class="seo__checks" id="seo-checks"></ul>
            <dl class="seo__stats" id="seo-stats"></dl>

            <div class="seo__deploy" id="deploy-box" hidden></div>
          </div>
        </aside>
      </div>
    </div>
  `;
}

function renderEditor() {
  state.view = 'editor';
  const post = state.current;
  document.title = `${post.isNew ? '새 글' : post.data.title || '글 수정'} · 쿼구리 관리자`;
  setWorkspace(editorHtml(post));

  const $ = (id) => document.getElementById(id);
  const body = $('f-body');
  const preview = $('preview');
  const seo = $('seo');
  const title = $('f-title');
  const description = $('f-description');
  const slug = $('f-slug');
  const category = $('f-category');
  const tags = $('f-tags');
  const pubdate = $('f-pubdate');
  const updated = $('f-updated');
  const cover = $('f-cover');
  const coverAlt = $('f-coveralt');
  const series = $('f-series');
  const draft = $('f-draft');
  const featured = $('f-featured');
  const keyword = $('seo-keyword');
  const stateLabel = $('editor-state');
  const slugLabel = $('editor-slug');
  const titleCount = $('title-count');
  const descCount = $('desc-count');

  keyword.value = state.keyword;

  const coverFile = $('f-cover-file');
  const coverState = $('cover-upload-state');
  const coverPreview = $('cover-preview');
  const coverPreviewImg = $('cover-preview-img');

  const showCoverPreview = (src) => {
    if (!coverPreview || !coverPreviewImg || !src) return;
    coverPreviewImg.src = src.startsWith('http') ? src : `${basePath()}${src.replace(/^\//, '')}`;
    coverPreview.hidden = false;
  };

  if (cover.value.trim()) showCoverPreview(cover.value.trim());

  const markDirty = () => {
    state.dirty = true;
    stateLabel.textContent = '저장 전 변경';
    stateLabel.classList.add('is-dirty');
  };

  let timer = null;
  const update = () => {
    const bodyText = body.value;
    preview.innerHTML = bodyText.trim()
      ? renderMarkdown(bodyText)
      : '<p class="preview__empty">왼쪽에 글을 쓰면 여기에 그대로 보여요.</p>';

    titleCount.textContent = `${Array.from(title.value).length}자`;
    descCount.textContent = `${Array.from(description.value).length}자 · 80~150자 권장`;
    slugLabel.textContent = `${slug.value || '주소 없음'}.${post.ext}`;

    const result = analyzeSeo({
      title: title.value,
      description: description.value,
      body: bodyText,
      keyword: keyword.value,
    });
    paintSeo(result, seo, $);
    state.lastSeo = result;
  };

  const scheduleUpdate = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(update, 140);
  };

  [title, description, body, keyword, tags, slug].forEach((input) => {
    input.addEventListener('input', () => {
      markDirty();
      scheduleUpdate();
    });
  });
  [pubdate, updated, cover, coverAlt, series].forEach((input) => {
    input.addEventListener('input', markDirty);
  });

  cover.addEventListener('input', () => {
    if (cover.value.trim()) showCoverPreview(cover.value.trim());
    else if (coverPreview) coverPreview.hidden = true;
  });

  coverFile?.addEventListener('change', async () => {
    const file = coverFile.files && coverFile.files[0];
    if (!file) return;
    await uploadCoverImage(file, {
      coverInput: cover,
      stateEl: coverState,
      preview: coverPreview,
      previewImg: coverPreviewImg,
      onDone: () => {
        markDirty();
        scheduleUpdate();
      },
    });
    coverFile.value = '';
  });
  [category, draft, featured].forEach((input) => {
    input.addEventListener('change', markDirty);
  });

  $('slug-from-title')?.addEventListener('click', () => {
    const next = slugify(title.value);
    if (!next) {
      toast('제목을 먼저 적어 주세요.', 'error');
      return;
    }
    slug.value = next;
    markDirty();
    scheduleUpdate();
  });

  document.querySelectorAll('[data-md]').forEach((button) => {
    button.addEventListener('click', () => {
      applyMarkdown(button.dataset.md, body);
      markDirty();
      scheduleUpdate();
    });
  });

  $('back')?.addEventListener('click', () => {
    if (state.dirty && !window.confirm('저장하지 않은 변경이 있어요. 목록으로 돌아갈까요?')) return;
    state.dirty = false;
    state.current = null;
    renderList();
  });

  $('save')?.addEventListener('click', () => savePost({ slug, title, description, category, tags, pubdate, updated, cover, coverAlt, series, draft, featured, body }));

  update();
  if (post.isNew) title.focus();
}

/* ── 대표 사진 업로드 ──────────────────────────────── */
function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('사진을 읽지 못했어요.'));
    reader.readAsDataURL(file);
  });
}

function decodeImage(file, fallbackUrl) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file).catch(() => loadImageElement(fallbackUrl));
  }
  return loadImageElement(fallbackUrl);
}

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('사진을 열지 못했어요. 다른 사진으로 시도해 주세요.'));
    image.src = url;
  });
}

/** 사진을 최대 1600px로 줄이고 JPEG로 바꿔 저장소에 올리기 좋은 크기로 만듭니다. */
async function prepareImageForUpload(file) {
  const previewUrl = await readAsDataUrl(file);

  if (file.type === 'image/gif') {
    return { bytes: new Uint8Array(await file.arrayBuffer()), mime: file.type, ext: 'gif', previewUrl };
  }

  const source = await decodeImage(file, previewUrl);
  const width = source.width || source.naturalWidth || 0;
  const height = source.height || source.naturalHeight || 0;
  if (!width || !height) throw new Error('사진 크기를 읽지 못했어요.');

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('이 브라우저에서는 사진을 줄일 수 없어요.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (typeof source.close === 'function') source.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
  if (!blob) throw new Error('사진을 변환하지 못했어요.');

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    mime: 'image/jpeg',
    ext: 'jpg',
    previewUrl,
  };
}

async function uploadCoverImage(file, ui) {
  const setState = (message, tone = '') => {
    if (!ui.stateEl) return;
    ui.stateEl.textContent = message;
    ui.stateEl.dataset.tone = tone;
  };

  const problem = validateImageFile(file);
  if (problem) {
    setState(problem, 'error');
    toast(problem, 'error');
    return;
  }
  if (!state.gh) {
    toast('로그인이 풀렸어요. 새로고침한 뒤 다시 로그인해 주세요.', 'error');
    return;
  }

  const title = document.getElementById('f-title')?.value?.trim() || file.name;
  setState('사진을 준비하는 중…', 'busy');

  try {
    const prepared = await prepareImageForUpload(file);
    if (prepared.bytes.length > MAX_OUTPUT_BYTES) {
      throw new Error(
        `사진이 너무 커요. ${formatBytes(MAX_OUTPUT_BYTES)} 이하로 줄여 주세요. (지금 ${formatBytes(prepared.bytes.length)})`,
      );
    }

    const ext = prepared.ext || extensionForMime(prepared.mime) || 'jpg';
    const message = `content: 대표 사진 업로드 — ${title}`;

    let path = buildUploadPath({ title, ext });
    setState(`GitHub에 올리는 중… (${formatBytes(prepared.bytes.length)})`, 'busy');

    try {
      await state.gh.putBytes(path, { bytes: prepared.bytes, message, branch: BRANCH });
    } catch (error) {
      // 같은 이름이 이미 있으면 새 이름으로 한 번 더 시도합니다.
      if (error instanceof GitHubError && error.status === 422) {
        path = buildUploadPath({ title, ext });
        await state.gh.putBytes(path, { bytes: prepared.bytes, message, branch: BRANCH });
      } else {
        throw error;
      }
    }

    const sitePath = publicPathFor(path);
    ui.coverInput.value = sitePath;

    const altInput = document.getElementById('f-coveralt');
    if (altInput && !altInput.value.trim()) {
      altInput.value = title ? `${title} 대표 사진` : '대표 사진';
    }
    if (ui.previewImg) ui.previewImg.src = prepared.previewUrl;
    if (ui.preview) ui.preview.hidden = false;

    setState(`올렸어요 · ${sitePath}\n글을 저장(커밋)하면 이 사진이 대표 사진으로 쓰입니다.`, 'ok');
    toast('대표 사진을 올렸어요. 이제 글을 저장해 주세요.');
    ui.onDone?.();
  } catch (error) {
    console.error(error);
    const message = error?.message || '사진을 올리지 못했어요.';
    setState(message, 'error');
    toast(message, 'error');
  }
}

function paintSeo(result, host, $) {
  const scoreValue = $('seo-score-value');
  const grade = $('seo-grade');
  const checks = $('seo-checks');
  const stats = $('seo-stats');
  if (!scoreValue || !grade) return;

  scoreValue.textContent = String(result.score);
  host.dataset.score = String(result.score);
  grade.textContent = `${result.grade} · ${result.score}점`;
  grade.dataset.grade = result.score >= 85 ? 'good' : result.score >= 70 ? 'ok' : result.score >= 50 ? 'warn' : 'bad';

  checks.innerHTML = result.checks
    .map(
      (check) => `
        <li class="seo__check seo__check--${check.status}">
          <span class="seo__dot" aria-hidden="true"></span>
          <span class="seo__check-body">
            <span class="seo__check-top">
              <span class="seo__check-label">${esc(check.label)}</span>
              <span class="seo__check-detail">${esc(check.detail)}</span>
            </span>
            ${check.status === 'pass' ? '' : `<span class="seo__tip">${esc(check.tip)}</span>`}
          </span>
        </li>`,
    )
    .join('');

  const s = result.stats;
  stats.innerHTML = `
    <div><dt>본문</dt><dd>${s.chars.toLocaleString('ko-KR')}자</dd></div>
    <div><dt>읽기</dt><dd>약 ${s.minutes}분</dd></div>
    <div><dt>소제목</dt><dd>H2 ${s.h2} · H3 ${s.h3}</dd></div>
    <div><dt>링크</dt><dd>내부 ${s.internalLinks} · 외부 ${s.externalLinks}</dd></div>
  `;
}

function applyMarkdown(kind, textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end);
  let insert = '';
  let caret = 0;

  const wrap = (before, after, placeholder) => {
    const text = selected || placeholder;
    insert = `${before}${text}${after}`;
    caret = start + before.length + text.length;
  };

  switch (kind) {
    case 'h2':
      insert = `\n## ${selected || '소제목'}\n`;
      caret = start + insert.length;
      break;
    case 'h3':
      insert = `\n### ${selected || '작은 소제목'}\n`;
      caret = start + insert.length;
      break;
    case 'bold':
      wrap('**', '**', '굵게');
      break;
    case 'italic':
      wrap('*', '*', '기울임');
      break;
    case 'link':
      insert = `[${selected || '링크 글자'}](https://)`;
      caret = start + insert.length - 1;
      break;
    case 'image':
      insert = `![${selected || '사진 설명'}](/images/파일이름.jpg)`;
      caret = start + insert.length - 3;
      break;
    case 'ul':
      insert = `${selected || '첫 번째 항목'}\n- 두 번째 항목`;
      insert = `- ${insert}`;
      caret = start + insert.length;
      break;
    case 'ol':
      insert = `1. ${selected || '첫 번째 항목'}\n2. 두 번째 항목`;
      caret = start + insert.length;
      break;
    case 'quote':
      insert = `> ${selected || '인용할 문장'}`;
      caret = start + insert.length;
      break;
    case 'table':
      insert = '| 항목 | 내용 |\n| --- | --- |\n| 예시 | 값 |';
      caret = start + insert.length;
      break;
    case 'hr':
      insert = '\n---\n';
      caret = start + insert.length;
      break;
    default:
      return;
  }

  textarea.value = value.slice(0, start) + insert + value.slice(end);
  textarea.focus();
  textarea.setSelectionRange(caret, caret);
}

/* ── 저장·삭제 ────────────────────────────────────────── */
function collectPost(form) {
  const title = form.title.value.trim();
  const description = form.description.value.trim();
  const slugValue = slugify(form.slug.value);

  if (!title) throw new Error('제목을 입력해 주세요.');
  if (Array.from(title).length > 120) throw new Error('제목은 120자까지 쓸 수 있어요.');
  if (!description) throw new Error('메타 설명을 입력해 주세요. 검색 결과에 보이는 문장이에요.');
  if (!slugValue) throw new Error('주소(슬러그)를 입력해 주세요.');
  if (!/^[a-zA-Z0-9가-힣._-]+$/.test(slugValue)) {
    throw new Error('주소에는 영문·숫자·한글·- _ . 만 쓸 수 있어요.');
  }
  if (!form.pubdate.value) throw new Error('발행일을 골라 주세요.');

  const tags = form.tags.value
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean);

  const data = {
    ...state.current.data,
    title,
    description,
    pubDate: form.pubdate.value,
    updatedDate: form.updated.value || '',
    category: form.category.value,
    tags,
    cover: form.cover.value.trim(),
    coverAlt: form.coverAlt.value.trim(),
    featured: form.featured.checked,
    draft: form.draft.checked,
    series: form.series.value.trim(),
  };

  return { data, body: form.body.value, slug: slugValue };
}

async function savePost(form) {
  const button = document.getElementById('save');
  const stateLabel = document.getElementById('editor-state');
  let payload;
  try {
    payload = collectPost(form);
  } catch (error) {
    toast(error.message, 'error');
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = '커밋 중…';
  }
  if (stateLabel) stateLabel.textContent = '커밋 중…';

  const current = state.current;
  const ext = current.ext || 'md';
  const newPath = `${CONTENT_DIR}/${payload.slug}.${ext}`;
  const isRename = !current.isNew && current.path !== newPath;
  const conflict = state.posts.find((post) => post.path === newPath && post.path !== current.path);
  if (conflict) {
    toast(`'${payload.slug}' 주소를 이미 다른 글이 쓰고 있어요. 다른 주소를 골라 주세요.`, 'error');
    if (button) {
      button.disabled = false;
      button.textContent = '저장 (커밋)';
    }
    return;
  }

  const text = serializePost(payload.data, payload.body);
  const message = `${current.isNew ? 'content: 새 글' : 'content: 수정'} — ${payload.data.title}`;

  try {
    let result;
    if (current.isNew) {
      result = await state.gh.putFile(newPath, { text, message, branch: BRANCH });
    } else if (isRename) {
      result = await state.gh.putFile(newPath, { text, message: `${message} (주소 변경)`, branch: BRANCH });
      await state.gh.deleteFile(current.path, {
        message: `content: 주소 변경으로 이전 파일 정리 — ${payload.data.title}`,
        sha: current.sha,
        branch: BRANCH,
      });
    } else {
      result = await state.gh.putFile(newPath, { text, message, sha: current.sha, branch: BRANCH });
    }

    const updatedPost = {
      ...current,
      path: newPath,
      name: `${payload.slug}.${ext}`,
      slug: payload.slug,
      sha: result?.content?.sha ?? current.sha,
      size: new Blob([text]).size,
      data: payload.data,
      body: payload.body,
      raw: text,
      isNew: false,
    };

    state.posts = [updatedPost, ...state.posts.filter((post) => post.path !== current.path && post.path !== newPath)];
    state.current = updatedPost;
    state.dirty = false;

    if (stateLabel) {
      stateLabel.textContent = '저장됨 · 배포 대기';
      stateLabel.classList.remove('is-dirty');
    }

    await afterSave(updatedPost);
    toast('커밋했어요. 1~3분 안에 사이트에 반영됩니다.');
  } catch (error) {
    console.error(error);
    toast(error?.message || '저장하지 못했어요.', 'error');
    if (stateLabel) stateLabel.textContent = '저장 실패';
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = '저장 (커밋)';
    }
  }
}

async function afterSave(post) {
  const box = document.getElementById('deploy-box');
  if (!box) return;
  const live = !post.data.draft && new Date(post.data.pubDate) <= new Date();
  box.hidden = false;
  box.innerHTML = `
    <p class="deploy__title">커밋 완료 · 자동 배포가 시작됩니다</p>
    <p>GitHub Actions가 사이트를 다시 빌드해요. 보통 1~3분 걸립니다.</p>
    <div class="deploy__links">
      <a href="${esc(state.gh.actionsUrl())}" target="_blank" rel="noopener noreferrer">배포 진행 상황 ↗</a>
      ${live ? `<a href="${esc(postUrl(post.slug))}" target="_blank" rel="noopener noreferrer">사이트에서 보기 ↗</a>` : ''}
      <a href="${esc(state.gh.fileUrl(post.path, BRANCH))}" target="_blank" rel="noopener noreferrer">커밋된 파일 ↗</a>
    </div>
  `;
}

async function removePost(post) {
  const ok = window.confirm(
    `'${post.data.title || post.slug}' 글을 정말 삭제할까요?\n\n삭제하면 저장소에서 파일이 지워지고, 다음 배포 때 사이트에서도 사라집니다. (Git 기록에는 남아 있어 되돌릴 수 있어요)`,
  );
  if (!ok) return;

  try {
    await state.gh.deleteFile(post.path, {
      message: `content: 삭제 — ${post.data.title || post.slug}`,
      sha: post.sha,
      branch: BRANCH,
    });
    state.posts = state.posts.filter((item) => item.path !== post.path);
    if (state.current?.path === post.path) {
      state.current = null;
      state.dirty = false;
      renderList();
    } else {
      renderList();
    }
    toast('삭제했어요. 다음 배포에서 사이트에서도 빠집니다.');
  } catch (error) {
    console.error(error);
    toast(error?.message || '삭제하지 못했어요.', 'error');
  }
}

/* ── 소개 페이지(/about/) 관리 ─────────────────────── */
function aboutUrl() {
  return `${basePath()}about/`;
}

function getByPath(object, path) {
  return String(path)
    .split('.')
    .reduce((value, key) => (value && typeof value === 'object' ? value[key] : undefined), object);
}

function setByPath(object, path, value) {
  const keys = String(path).split('.');
  const last = keys.pop();
  const target = keys.reduce((node, key) => {
    if (!node[key] || typeof node[key] !== 'object') node[key] = {};
    return node[key];
  }, object);
  target[last] = value;
  return object;
}

async function loadAbout(force = false) {
  state.section = 'about';
  markSection('about');
  const workspace = document.getElementById('workspace');
  if (!workspace) return;

  if (!force && state.about) {
    renderAbout();
    return;
  }

  workspace.innerHTML = `
    <div class="loading">
      <span class="spinner" aria-hidden="true"></span>
      <p>소개 페이지 내용을 불러오는 중…</p>
    </div>
  `;

  try {
    let file = null;
    try {
      file = await state.gh.getFile(ABOUT_PATH);
    } catch (error) {
      if (!(error instanceof GitHubError) || error.status !== 404) throw error;
    }

    const data = file ? parseAbout(file.text) : aboutDefaults();
    state.about = { data, sha: file?.sha ?? '', exists: Boolean(file) };
    state.aboutDirty = false;
    renderAbout();
  } catch (error) {
    console.error(error);
    workspace.innerHTML = `
      <div class="empty">
        <p class="empty__title">소개 페이지를 불러오지 못했어요</p>
        <p>${esc(error?.message || '알 수 없는 오류')}</p>
        <button class="btn" type="button" id="about-retry">다시 시도</button>
      </div>
    `;
    document.getElementById('about-retry')?.addEventListener('click', () => loadAbout(true));
  }
}

function repeatRow(value, index, label) {
  return `
    <div class="repeat__row">
      <textarea rows="3" data-about-list-value placeholder="${esc(label)} ${index + 1}">${esc(value)}</textarea>
      <button class="repeat__remove" type="button" data-about-remove aria-label="${esc(label)} ${index + 1} 빼기">빼기</button>
    </div>
  `;
}

function faqRow(item, index) {
  return `
    <div class="repeat__row repeat__row--faq">
      <input type="text" data-faq-q placeholder="질문 ${index + 1}" value="${esc(item.q)}" />
      <textarea rows="2" data-faq-a placeholder="답변">${esc(item.a)}</textarea>
      <button class="repeat__remove" type="button" data-about-remove aria-label="질문 ${index + 1} 빼기">빼기</button>
    </div>
  `;
}

export function aboutPageHtml(about) {
  const fields = (path, label, value, opts = {}) => `
    <label class="field${opts.wide ? ' field--wide' : ''}">
      <span class="field__label">${label}${opts.hint ? ` <em>${opts.hint}</em>` : ''}</span>
      ${opts.textarea
        ? `<textarea rows="${opts.rows || 3}" data-about="${path}" placeholder="${esc(opts.placeholder || '')}">${esc(value)}</textarea>`
        : `<input type="text" data-about="${path}" placeholder="${esc(opts.placeholder || '')}" value="${esc(value)}" />`}
    </label>
  `;

  return `
    <div class="about-admin">
      <div class="listview__head">
        <div>
          <h1 class="listview__title">소개 페이지</h1>
          <p class="listview__sub">저장소 ${esc(ABOUT_PATH)} · 저장(커밋)하면 몇 분 뒤 사이트에 반영돼요</p>
        </div>
        <div class="listview__actions">
          <a class="btn btn--ghost" href="${esc(aboutUrl())}" target="_blank" rel="noopener noreferrer">사이트에서 보기 ↗</a>
          <button class="btn" type="button" id="about-reload">불러온 내용으로 되돌리기</button>
          <button class="btn btn--primary" type="button" id="about-save">저장 (커밋)</button>
        </div>
      </div>

      <p class="about-admin__state" id="about-state">${state.aboutDirty ? '저장 전 변경' : '불러옴'}</p>

      <div class="about-admin__grid">
        <section class="panel panel--wide">
          <div class="panel__head">
            <h2 class="panel__title">페이지 기본</h2>
            <span class="panel__tag">meta</span>
          </div>
          <div class="fields">
            ${fields('meta.eyebrow', '구분 라벨', about.meta.eyebrow, { hint: '영문 소문자', placeholder: 'about' })}
            ${fields('meta.title', '페이지 제목', about.meta.title, { hint: '브라우저 탭·빵부스러기', placeholder: '쿼구리 소개' })}
            ${fields('meta.description', '메타 설명', about.meta.description, { wide: true, textarea: true, rows: 3, hint: '40~160자 · 검색 결과에 보여요' })}
          </div>
        </section>

        <section class="panel panel--wide">
          <div class="panel__head">
            <h2 class="panel__title">히어로</h2>
            <span class="panel__tag">h1</span>
          </div>
          <div class="fields">
            ${fields('hero.title', '큰 제목 (h1)', about.hero.title, { wide: true, placeholder: '안녕하세요, 쿼구리예요' })}
            ${fields('hero.lede', '한 줄 소개', about.hero.lede, { wide: true, textarea: true, rows: 2 })}
          </div>
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">소개 명판</h2>
            <span class="panel__tag">profile</span>
          </div>
          <div class="fields">
            ${fields('plate.name', '이름', about.plate.name)}
            ${fields('plate.nameEn', '영문 이름', about.plate.nameEn)}
            ${fields('plate.tagline', '태그라인', about.plate.tagline, { wide: true })}
          </div>
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">소개 문단</h2>
            <span class="panel__tag">intro</span>
          </div>
          ${fields('intro.heading', '소제목', about.intro.heading, { wide: true })}
          <div class="repeat" data-about-list="intro.paragraphs">
            ${about.intro.paragraphs.map((paragraph, index) => repeatRow(paragraph, index, '문단')).join('')}
          </div>
          <button class="btn btn--sm repeat__add" type="button" data-about-add="intro.paragraphs">+ 문단 추가</button>
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">이런 걸 써요</h2>
            <span class="panel__tag">topics</span>
          </div>
          ${fields('topics.heading', '소제목', about.topics.heading, { wide: true })}
          <p class="panel__note">목록 항목은 카테고리 설정(<code>src/config.ts</code>)을 그대로 씁니다. 여기서는 소제목만 바꿀 수 있어요.</p>
        </section>

        <section class="panel panel--wide">
          <div class="panel__head">
            <h2 class="panel__title">글을 쓰는 기준</h2>
            <span class="panel__tag">rules</span>
          </div>
          ${fields('rules.heading', '소제목', about.rules.heading, { wide: true })}
          <div class="repeat" data-about-list="rules.items">
            ${about.rules.items.map((item, index) => repeatRow(item, index, '기준')).join('')}
          </div>
          <button class="btn btn--sm repeat__add" type="button" data-about-add="rules.items">+ 기준 추가</button>
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">수익화 고지</h2>
            <span class="panel__tag">disclosure</span>
          </div>
          <div class="fields">
            ${fields('monetization.heading', '소제목', about.monetization.heading, { wide: true })}
            ${fields('monetization.paragraph', '본문', about.monetization.paragraph, { wide: true, textarea: true, rows: 4 })}
          </div>
        </section>

        <section class="panel panel--wide">
          <div class="panel__head">
            <h2 class="panel__title">자주 묻는 것</h2>
            <span class="panel__tag">FAQ</span>
          </div>
          ${fields('faq.heading', '소제목', about.faq.heading, { wide: true })}
          <div class="repeat" data-about-list="faq.items">
            ${about.faq.items.map((item, index) => faqRow(item, index)).join('')}
          </div>
          <button class="btn btn--sm repeat__add" type="button" data-about-add="faq.items">+ 질문 추가</button>
          <p class="panel__note">질문과 답을 모두 채운 항목만 사이트에 보이고 검색엔진 FAQ 데이터로도 들어갑니다.</p>
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">마지막 인사</h2>
            <span class="panel__tag">contact</span>
          </div>
          <div class="fields">
            ${fields('contact.heading', '소제목', about.contact.heading, { wide: true })}
            ${fields('contact.paragraph', '본문', about.contact.paragraph, { wide: true, textarea: true, rows: 4 })}
          </div>
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">반영 정보</h2>
            <span class="panel__tag">meta</span>
          </div>
          <div class="fields">
            ${fields('updated', '마지막 정리 날짜', about.updated, { hint: 'YYYY-MM-DD', placeholder: todayInput() })}
          </div>
          <p class="panel__note">사이트 화면에는 나오지 않고, 기록용으로만 남습니다.</p>
        </section>
      </div>

      <div class="about-admin__foot">
        <button class="btn btn--primary" type="button" id="about-save-2">저장 (커밋)</button>
        <span class="about-admin__foot-note">저장하면 GitHub에 커밋되고 자동 배포가 시작돼요.</span>
      </div>

      <div class="seo__deploy" id="about-deploy" hidden></div>
    </div>
  `;
}

function renderAbout(data) {
  state.section = 'about';
  state.view = 'about';
  const about = data || state.about?.data || aboutDefaults();
  if (!state.about) state.about = { data: about, sha: '', exists: false };
  state.about.data = about;

  document.title = '소개 페이지 · 쿼구리 관리자';
  markSection('about');
  setWorkspace(aboutPageHtml(about));
  bindAbout();
}

function collectAboutForm() {
  const base = state.about?.data || aboutDefaults();
  const data = JSON.parse(JSON.stringify(base));

  document.querySelectorAll('[data-about]').forEach((field) => {
    const path = field.dataset.about;
    if (path) setByPath(data, path, field.value);
  });

  document.querySelectorAll('[data-about-list]').forEach((box) => {
    const path = box.dataset.aboutList;
    if (!path) return;
    const rows = Array.from(box.children).filter((node) => node.classList.contains('repeat__row'));
    if (path === 'faq.items') {
      setByPath(
        data,
        path,
        rows.map((row) => ({
          q: row.querySelector('[data-faq-q]')?.value ?? '',
          a: row.querySelector('[data-faq-a]')?.value ?? '',
        })),
      );
    } else {
      setByPath(
        data,
        path,
        rows.map((row) => {
          const field = row.querySelector('[data-about-list-value]');
          return field ? field.value : '';
        }),
      );
    }
  });

  return data;
}

function bindAbout() {
  const stateLabel = document.getElementById('about-state');
  const setState = (message, dirty) => {
    state.aboutDirty = dirty;
    if (stateLabel) {
      stateLabel.textContent = message;
      stateLabel.classList.toggle('is-dirty', dirty);
    }
  };

  const form = document.querySelector('.about-admin');
  form?.addEventListener('input', () => setState('저장 전 변경', true));

  document.querySelectorAll('[data-about-add]').forEach((button) => {
    button.addEventListener('click', () => {
      const data = collectAboutForm();
      const path = button.dataset.aboutAdd;
      const list = Array.isArray(getByPath(data, path)) ? [...getByPath(data, path)] : [];
      list.push(path === 'faq.items' ? { q: '', a: '' } : '');
      setByPath(data, path, list);
      state.aboutDirty = true;
      renderAbout(data);
      const rows = document.querySelectorAll(`[data-about-list="${path}"] .repeat__row`);
      rows[rows.length - 1]?.querySelector('input, textarea')?.focus();
    });
  });

  document.querySelectorAll('[data-about-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      const row = button.closest('.repeat__row');
      const box = row?.parentElement;
      const path = box?.dataset.aboutList;
      if (!row || !box || !path) return;
      const data = collectAboutForm();
      const rows = Array.from(box.children).filter((node) => node.classList.contains('repeat__row'));
      const index = rows.indexOf(row);
      const list = Array.isArray(getByPath(data, path)) ? [...getByPath(data, path)] : [];
      list.splice(index, 1);
      setByPath(data, path, list);
      state.aboutDirty = true;
      renderAbout(data);
    });
  });

  document.getElementById('about-reload')?.addEventListener('click', () => {
    if (state.aboutDirty && !window.confirm('저장하지 않은 변경이 있어요. 불러온 내용으로 되돌릴까요?')) return;
    state.aboutDirty = false;
    loadAbout(true);
  });

  document.getElementById('about-save')?.addEventListener('click', saveAbout);
  document.getElementById('about-save-2')?.addEventListener('click', saveAbout);
}

async function saveAbout() {
  if (!state.gh) return;
  const data = collectAboutForm();
  const errors = validateAbout(data);
  if (errors.length) {
    toast(errors[0], 'error');
    return;
  }

  const buttons = [document.getElementById('about-save'), document.getElementById('about-save-2')].filter(Boolean);
  const stateLabel = document.getElementById('about-state');
  buttons.forEach((button) => {
    button.disabled = true;
    button.textContent = '커밋 중…';
  });
  if (stateLabel) stateLabel.textContent = '커밋 중…';

  const clean = cleanAbout(data);
  const text = serializeAbout(clean);

  try {
    const result = await state.gh.putFile(ABOUT_PATH, {
      text,
      message: 'content: 소개 페이지 수정',
      sha: state.about?.sha || undefined,
      branch: BRANCH,
    });

    state.about = {
      data: clean,
      sha: result?.content?.sha ?? state.about?.sha ?? '',
      exists: true,
    };
    state.aboutDirty = false;

    // 비어 있던 줄을 덜어 낸 결과를 화면에도 그대로 반영합니다.
    renderAbout(clean);

    const freshLabel = document.getElementById('about-state');
    if (freshLabel) {
      freshLabel.textContent = '저장됨 · 배포 대기';
      freshLabel.classList.remove('is-dirty');
    }

    const box = document.getElementById('about-deploy');
    if (box) {
      box.hidden = false;
      box.innerHTML = `
        <p class="deploy__title">커밋 완료 · 자동 배포가 시작됩니다</p>
        <p>보통 1~3분 뒤 소개 페이지에 반영돼요.</p>
        <div class="deploy__links">
          <a href="${esc(state.gh.actionsUrl())}" target="_blank" rel="noopener noreferrer">배포 진행 상황 ↗</a>
          <a href="${esc(aboutUrl())}" target="_blank" rel="noopener noreferrer">사이트에서 보기 ↗</a>
          <a href="${esc(state.gh.fileUrl(ABOUT_PATH, BRANCH))}" target="_blank" rel="noopener noreferrer">커밋된 파일 ↗</a>
        </div>
      `;
    }

    toast('소개 페이지를 저장했어요. 1~3분 안에 반영됩니다.');
  } catch (error) {
    console.error(error);
    toast(error?.message || '소개 페이지를 저장하지 못했어요.', 'error');
    const errorLabel = document.getElementById('about-state');
    if (errorLabel) errorLabel.textContent = '저장 실패';
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
      button.textContent = '저장 (커밋)';
    });
  }
}

/* ── 시작 ─────────────────────────────────────────────── */
let shortcutBound = false;
function bindShortcut() {
  if (shortcutBound) return;
  shortcutBound = true;
  document.addEventListener('keydown', (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
    if (state.view === 'about') {
      event.preventDefault();
      const saveAboutButton = document.getElementById('about-save');
      if (saveAboutButton && !saveAboutButton.disabled) saveAbout();
      return;
    }
    if (state.view !== 'editor') return;
    event.preventDefault();
    const get = (id) => document.getElementById(id);
    if (!get('save') || get('save').disabled) return;
    savePost({
      slug: get('f-slug'),
      title: get('f-title'),
      description: get('f-description'),
      category: get('f-category'),
      tags: get('f-tags'),
      pubdate: get('f-pubdate'),
      updated: get('f-updated'),
      cover: get('f-cover'),
      coverAlt: get('f-coveralt'),
      series: get('f-series'),
      draft: get('f-draft'),
      featured: get('f-featured'),
      body: get('f-body'),
    });
  });
}

export function initAdmin() {
  bindShortcut();
  const token = readStoredToken();
  if (!token) {
    renderLogin();
    return;
  }

  renderLogin('저장된 토큰으로 연결하는 중…');
  connect(token, parseRepoInput(readStoredRepo()), false).catch((error) => {
    clearSession();
    renderLogin(error?.message || '저장된 토큰으로 로그인하지 못했어요. 새 토큰을 넣어 주세요.');
  });
}
