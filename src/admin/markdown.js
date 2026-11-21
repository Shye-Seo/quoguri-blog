/**
 * 미리보기용 가벼운 마크다운 렌더러
 *
 * 글을 저장할 때 쓰는 마크다운과 100% 같지는 않지만, 작성 중에
 * 제목·목록·표·링크·인용이 어떻게 보일지 바로 확인할 수 있게 해 줍니다.
 * (실제 사이트 렌더링은 Astro의 정식 마크다운 파이프라인이 담당합니다)
 */

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function inline(text) {
  let html = escapeHtml(text);

  // 코드 스팬
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // 이미지
  html = html.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_, alt, src, title) =>
      `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ''} loading="lazy" />`,
  );
  // 링크
  html = html.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_, label, href, title) => {
      const external = /^https?:\/\//.test(href);
      return `<a href="${href}"${title ? ` title="${title}"` : ''}${external ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
    },
  );
  // 굵게 / 기울임 / 취소선
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  // 줄바꿈
  html = html.replace(/ {2,}\n/g, '<br />');
  return html;
}

function renderLines(lines) {
  const out = [];
  let i = 0;

  const isBlockStart = (line, next = '') =>
    /^(#{1,6})\s+/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    /^(\*\*\*|---|___)\s*$/.test(line) ||
    /^@@CODE\d+@@$/.test(line) ||
    /^@@COMP:[^@]+@@$/.test(line) ||
    (line.includes('|') && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(next));

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // 코드 블록
    const codeMatch = /^@@CODE(\d+)@@$/.exec(line.trim());
    if (codeMatch) {
      out.push({ type: 'code', index: Number(codeMatch[1]) });
      i += 1;
      continue;
    }

    // MDX 컴포넌트
    const compMatch = /^@@COMP:([^@]+)@@$/.exec(line.trim());
    if (compMatch) {
      out.push(
        `<p class="md-comp"><span>MDX 컴포넌트</span> ${escapeHtml(compMatch[1])} — 사이트에서 실제 모습으로 보입니다.</p>`,
      );
      i += 1;
      continue;
    }

    // 제목
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2].replace(/\s+#+\s*$/, ''))}</h${level}>`);
      i += 1;
      continue;
    }

    // 구분선
    if (/^(\*\*\*|---|___)\s*$/.test(line)) {
      out.push('<hr />');
      i += 1;
      continue;
    }

    // 인용
    if (/^\s*>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${quote.map((item) => `<p>${inline(item)}</p>`).join('')}</blockquote>`);
      continue;
    }

    // 표
    if (line.includes('|') && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1] || '')) {
      const header = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      out.push(
        `<div class="md-table"><table><thead><tr>${header
          .map((cell) => `<th>${inline(cell)}</th>`)
          .join('')}</tr></thead><tbody>${rows
          .map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      );
      continue;
    }

    // 목록
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''));
        i += 1;
        // 이어지는 줄
        while (i < lines.length && lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
          items[items.length - 1] += ` ${lines[i].trim()}`;
          i += 1;
        }
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</${tag}>`);
      continue;
    }

    // 문단
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i], lines[i + 1] ?? '')) {
      paragraph.push(lines[i]);
      i += 1;
    }
    if (paragraph.length === 0) {
      paragraph.push(lines[i] ?? '');
      i += 1;
    }
    out.push(`<p>${inline(paragraph.join('\n'))}</p>`);
  }

  return out;
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function renderMarkdown(source) {
  let text = String(source ?? '').replace(/\r\n/g, '\n');

  // MDX import / export 줄은 미리보기에서 숨깁니다.
  text = text.replace(/^\s*import\s+.+$/gm, '');
  text = text.replace(/^\s*export\s+(const|default|function)\s+.+$/gm, '');

  // 코드 블록은 먼저 떼어 둡니다.
  const codes = [];
  text = text.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    codes.push({ lang, code });
    return `\n@@CODE${codes.length - 1}@@\n`;
  });

  // MDX 컴포넌트(<CoupangCard … />)는 안내 박스로 바꿉니다.
  text = text.replace(/<([A-Z][A-Za-z0-9]*)(?:\s[^>]*)?\/>/g, '\n@@COMP:$1@@\n');
  text = text.replace(/<([A-Z][A-Za-z0-9]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g, '\n@@COMP:$1@@\n');

  const blocks = renderLines(text.split('\n'));

  const html = blocks
    .map((block) => {
      if (typeof block !== 'string') {
        const { lang, code } = codes[block.index] ?? { lang: '', code: '' };
        return `<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`;
      }
      return block;
    })
    .join('\n');

  return html;
}

/** 마크다운 기호를 걷어낸 순수 텍스트 (글자 수·키워드 계산용) */
export function plainText(source) {
  return String(source ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^\s*import\s+.+$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[>#*_`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 제목 목록 추출 (SEO 점검용) */
export function headingsOf(source) {
  const result = [];
  const lines = String(source ?? '').split(/\r?\n/);
  let inCode = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const match = /^(#{2,4})\s+(.*)$/.exec(line);
    if (match) result.push({ level: match[1].length, text: match[2].trim() });
  }
  return result;
}

/** 링크·이미지 목록 추출 */
export function linksOf(source) {
  const text = String(source ?? '').replace(/```[\s\S]*?```/g, ' ');
  const links = [];
  const images = [];
  const linkPattern = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match;
  while ((match = linkPattern.exec(text))) {
    if (match[1] === '!') images.push({ alt: match[2], src: match[3] });
    else links.push({ label: match[2], href: match[3] });
  }
  return { links, images };
}
