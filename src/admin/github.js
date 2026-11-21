/**
 * GitHub REST API 클라이언트 — 관리자 페이지 전용
 *
 * 토큰은 이 브라우저 안에서만 쓰이고 api.github.com 외에는 나가지 않습니다.
 * 저장소·계정 정보는 코드에 넣지 않고, 로그인한 토큰으로 그때그때 찾습니다.
 */

const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
    this.data = data;
  }
}

export function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function decodeBase64(base64) {
  const clean = String(base64 || '').replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function messageFor(status, data) {
  const apiMessage = data && typeof data.message === 'string' ? data.message : '';
  if (status === 401) return '토큰이 올바르지 않거나 만료됐어요. 새 토큰을 만들어 다시 로그인해 주세요.';
  if (status === 403) {
    if (/rate limit/i.test(apiMessage)) return 'GitHub 요청 한도를 넘었어요. 잠시(최대 1시간) 뒤에 다시 시도해 주세요.';
    return '이 저장소에 쓸 권한이 없어요. 토큰의 Contents 권한(Read and write)을 확인해 주세요.';
  }
  if (status === 404) return '저장소나 파일을 찾지 못했어요. 저장소 이름과 토큰의 저장소 선택을 확인해 주세요.';
  if (status === 409) return '방금 다른 곳에서 같은 파일이 바뀌었어요. 새로고침한 뒤 다시 저장해 주세요.';
  if (status === 422) return '저장 요청이 거부됐어요. 파일 이름이나 내용을 확인해 주세요.';
  if (status >= 500) return 'GitHub 서버가 잠시 응답하지 않아요. 조금 뒤에 다시 시도해 주세요.';
  return apiMessage || `요청을 처리하지 못했어요 (${status})`;
}

export class GitHub {
  /** @param {string} token @param {{owner: string, name: string}} repo */
  constructor(token, repo) {
    this.token = token;
    this.repo = repo;
  }

  get repoFullName() {
    return `${this.repo.owner}/${this.repo.name}`;
  }

  async request(path, { method = 'GET', body, accept = 'application/vnd.github+json' } = {}) {
    let response;
    try {
      response = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
        method,
        headers: {
          Accept: accept,
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
    } catch (error) {
      throw new GitHubError('네트워크에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.', 0, error);
    }

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }
    if (!response.ok) throw new GitHubError(messageFor(response.status, data), response.status, data);
    return data;
  }

  /* ── 계정 ─────────────────────────────────────────────── */
  getUser() {
    return this.request('/user');
  }

  /** 로그인한 사용자의 저장소 중 이름이 일치하는 것을 찾습니다. (계정명 하드코딩 없음) */
  async findRepo(name = 'quoguri-blog') {
    const repos = await this.request('/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator');
    return repos.find((repo) => repo.name.toLowerCase() === String(name).toLowerCase()) ?? null;
  }

  getRepo() {
    return this.request(`/repos/${this.repoFullName}`);
  }

  /* ── 파일 ─────────────────────────────────────────────── */
  listDir(path) {
    return this.request(`/repos/${this.repoFullName}/contents/${encodeURI(path)}`);
  }

  async getFile(path, ref) {
    const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const data = await this.request(`/repos/${this.repoFullName}/contents/${encodeURI(path)}${query}`);
    if (Array.isArray(data)) throw new GitHubError('폴더 경로가 넘어왔어요.', 400, data);
    return {
      path: data.path,
      sha: data.sha,
      size: data.size,
      text: decodeBase64(data.content),
    };
  }

  putFile(path, { text, message, sha, branch }) {
    return this.request(`/repos/${this.repoFullName}/contents/${encodeURI(path)}`, {
      method: 'PUT',
      body: {
        message,
        content: encodeBase64(text),
        ...(sha ? { sha } : {}),
        ...(branch ? { branch } : {}),
      },
    });
  }

  deleteFile(path, { message, sha, branch }) {
    return this.request(`/repos/${this.repoFullName}/contents/${encodeURI(path)}`, {
      method: 'DELETE',
      body: { message, sha, ...(branch ? { branch } : {}) },
    });
  }

  /** 마지막 커밋 정보 — 배포가 실제로 도는지 확인할 때 씁니다. */
  async latestCommit(branch = 'main') {
    const data = await this.request(
      `/repos/${this.repoFullName}/commits?sha=${encodeURIComponent(branch)}&per_page=1`,
    );
    return Array.isArray(data) ? data[0] : null;
  }

  actionsUrl() {
    return `https://github.com/${this.repoFullName}/actions`;
  }

  fileUrl(path, branch = 'main') {
    return `https://github.com/${this.repoFullName}/blob/${branch}/${path}`;
  }
}
