/**
 * 프런트매터(frontmatter) 읽기·쓰기
 *
 * Astro 글의 YAML 앞부분을 다루는 최소 구현입니다.
 * 지원: 문자열(따옴표), 숫자, true/false, [a, b] 배열, 줄바꿈 배열(- 항목), | 블록
 */

const FIELD_ORDER = [
  'title',
  'description',
  'pubDate',
  'updatedDate',
  'category',
  'tags',
  'cover',
  'coverAlt',
  'featured',
  'draft',
  'series',
  'seoTitle',
];

function unquote(value) {
  const text = value.trim();
  if (text.length < 2) return text;
  const first = text[0];
  if (first === '"' && text.endsWith('"')) {
    try {
      return JSON.parse(text);
    } catch {
      return text.slice(1, -1);
    }
  }
  if (first === "'" && text.endsWith("'")) {
    return text.slice(1, -1).replace(/''/g, "'");
  }
  return text;
}

function parseScalar(value) {
  const text = value.trim();
  if (!text) return '';
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text === 'null' || text === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (text.startsWith('[')) return parseFlowArray(text);
  return unquote(text);
}

function parseFlowArray(text) {
  const inner = text.replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!inner) return [];
  const items = [];
  let current = '';
  let quote = null;
  for (const char of inner) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ',') {
      items.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  items.push(current);
  return items
    .map((item) => unquote(item.trim()))
    .filter((item) => item !== '');
}

function parseYaml(lines) {
  const data = {};
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith('#')) {
      index += 1;
      continue;
    }
    const match = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!match) {
      index += 1;
      continue;
    }
    const key = match[1];
    const rest = match[2];
    index += 1;

    if (rest === '') {
      const items = [];
      const block = [];
      while (index < lines.length) {
        const next = lines[index];
        if (!next.trim()) {
          index += 1;
          continue;
        }
        if (/^\s+-\s+/.test(next)) {
          items.push(unquote(next.replace(/^\s*-\s+/, '')));
          index += 1;
          continue;
        }
        if (/^\s+/.test(next)) {
          block.push(next.trim());
          index += 1;
          continue;
        }
        break;
      }
      data[key] = items.length > 0 ? items : block.join(' ');
      continue;
    }

    if (rest.startsWith('|') || rest.startsWith('>')) {
      const block = [];
      while (index < lines.length && (/^\s{2,}/.test(lines[index]) || !lines[index].trim())) {
        block.push(lines[index].trim());
        index += 1;
      }
      data[key] = block.join('\n').trim();
      continue;
    }

    data[key] = parseScalar(rest);
  }

  return data;
}

export function parsePost(raw) {
  const text = String(raw ?? '').replace(/^\uFEFF/, '');
  if (!text.startsWith('---')) {
    return { data: {}, body: text, hasFrontmatter: false };
  }
  const lines = text.split(/\r?\n/);
  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) return { data: {}, body: text, hasFrontmatter: false };

  const data = parseYaml(lines.slice(1, end));
  const body = lines
    .slice(end + 1)
    .join('\n')
    .replace(/^\n+/, '');
  return { data, body, hasFrontmatter: true };
}

function formatValue(key, value) {
  if (value === undefined || value === null || value === '') return null;

  if (key === 'pubDate' || key === 'updatedDate') {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const text = String(value).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : JSON.stringify(text);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    return `[${items.map((item) => JSON.stringify(item)).join(', ')}]`;
  }

  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return JSON.stringify(String(value));
}

export function serializePost(data, body) {
  const keys = [
    ...FIELD_ORDER.filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== ''),
    ...Object.keys(data).filter((key) => !FIELD_ORDER.includes(key) && data[key] !== undefined),
  ];

  const lines = ['---'];
  for (const key of keys) {
    const formatted = formatValue(key, data[key]);
    if (formatted === null) continue;
    lines.push(`${key}: ${formatted}`);
  }
  lines.push('---', '');

  const cleanBody = String(body ?? '').replace(/\r\n/g, '\n').trimEnd();
  return `${lines.join('\n')}\n${cleanBody}\n`;
}

export function toDateInput(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

/** 한글 제목도 그대로 주소로 쓸 수 있게 정리합니다. */
export function slugify(title) {
  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[`~!@#$%^&*()+=[\]{};:'",.<>/?\\|]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
