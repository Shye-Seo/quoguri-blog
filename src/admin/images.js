/**
 * 관리자 — 대표 사진 업로드 도우미
 *
 * · 파일 이름·저장 경로를 만드는 순수 함수는 테스트에서 그대로 씁니다.
 * · 브라우저에서 고른 사진은 1600px 안쪽으로 줄여 저장소 용량을 아낍니다.
 */

export const UPLOAD_ROOT = 'public/images/uploads';
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;
export const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
export const MAX_EDGE = 1600;

const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export function isSupportedImageType(type) {
  return Object.prototype.hasOwnProperty.call(MIME_EXT, String(type || '').toLowerCase());
}

export function extensionForMime(type) {
  return MIME_EXT[String(type || '').toLowerCase()] || '';
}

/** 한글 제목은 파일 이름에서 뺍니다. 영문·숫자만 남기고, 없으면 cover. */
export function asciiSlug(value) {
  const text = String(value ?? '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return text.slice(0, 40) || 'cover';
}

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value}B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)}KB`;
  return `${(value / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * 저장소 안 경로를 만듭니다.
 * public/images/uploads/2026/11/cover-20261121-a1b2c3.jpg
 */
export function buildUploadPath({ title, ext, date = new Date(), random } = {}) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const stamp = `${year}${month}${pad(date.getDate())}`;
  const safeExt = String(ext || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
  const suffix =
    random ||
    Array.from({ length: 6 }, () =>
      'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36)),
    ).join('');
  return `${UPLOAD_ROOT}/${year}/${month}/${asciiSlug(title)}-${stamp}-${suffix}.${safeExt}`;
}

/** 저장소 경로 → 사이트에서 쓰는 경로 (/images/uploads/…) */
export function publicPathFor(repoPath) {
  return `/${String(repoPath).replace(/^public\//, '').replace(/^\/+/, '')}`;
}

/** 파일을 고르기 전에 브라우저에서 먼저 걸러 줄 조건 */
export function validateImageFile({ type, size } = {}) {
  if (!isSupportedImageType(type)) {
    return 'JPG·PNG·WebP·GIF 사진만 올릴 수 있어요.';
  }
  if (!size) return '빈 파일이에요. 다른 사진을 골라 주세요.';
  if (size > MAX_INPUT_BYTES) {
    return `사진이 너무 커요. ${formatBytes(MAX_INPUT_BYTES)} 이하로 줄여서 올려 주세요. (지금 ${formatBytes(size)})`;
  }
  return '';
}
