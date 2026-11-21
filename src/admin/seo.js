/**
 * 내장 SEO 점검 — 네이버·구글 상위노출에서 공통으로 중요하게 보는 항목
 *
 * 점수는 절대적인 순위가 아니라 '빠뜨린 기본기'를 알려 주는 용도입니다.
 * 검색 결과에서 제목·설명이 잘리지 않는 길이, 소제목 구조, 본문 분량,
 * 내부 링크, 이미지 대체텍스트를 함께 봅니다.
 */

import { headingsOf, linksOf, plainText } from './markdown.js';

const charCount = (text) => Array.from(String(text ?? '')).length;

function readingMinutes(text) {
  const chars = charCount(String(text).replace(/\s+/g, ''));
  return Math.max(1, Math.round(chars / 500));
}

function makeCheck(id, label, weight, ratio, detail, tip) {
  const earned = Math.round(weight * Math.max(0, Math.min(1, ratio)) * 10) / 10;
  let status = 'fail';
  if (ratio >= 0.99) status = 'pass';
  else if (ratio >= 0.5) status = 'warn';
  return { id, label, weight, earned, status, detail, tip };
}

export function analyzeSeo({ title = '', description = '', body = '', keyword = '' }) {
  const plain = plainText(body);
  const chars = charCount(plain);
  const headings = headingsOf(body);
  const { links, images } = linksOf(body);
  const internalLinks = links.filter((link) => link.href.startsWith('/') || link.href.startsWith('#'));
  const externalLinks = links.filter((link) => /^https?:\/\//.test(link.href));
  const h2 = headings.filter((heading) => heading.level === 2);
  const h3 = headings.filter((heading) => heading.level === 3);

  const titleLength = charCount(title.trim());
  const descLength = charCount(description.trim());
  const key = keyword.trim();
  const keyLower = key.toLowerCase();
  const titleLower = title.toLowerCase();
  const bodyLower = plain.toLowerCase();

  const checks = [];

  /* 1. 제목 길이 */
  let titleRatio = 0.2;
  if (titleLength >= 25 && titleLength <= 45) titleRatio = 1;
  else if (titleLength >= 15 && titleLength <= 55) titleRatio = 0.6;
  checks.push(
    makeCheck(
      'title-length',
      '제목 길이',
      15,
      titleRatio,
      `${titleLength}자 (권장 25~45자)`,
      titleLength < 25
        ? '제목이 짧아요. 무슨 제품·상황인지 한 마디 더 붙이면 검색어와 맞닿을 확률이 올라가요.'
        : titleLength > 45
          ? '제목이 길어 검색 결과에서 뒤가 잘릴 수 있어요. 핵심 단어를 앞으로 옮기고 45자 안으로 줄여 보세요.'
          : '검색 결과에서 잘리지 않는 좋은 길이예요.',
    ),
  );

  /* 2. 제목 앞부분 키워드 */
  if (key) {
    const head = titleLower.slice(0, Math.max(12, Math.ceil(titleLength / 3)));
    const ratio = head.includes(keyLower) ? 1 : titleLower.includes(keyLower) ? 0.6 : 0;
    checks.push(
      makeCheck(
        'title-keyword',
        '제목 앞쪽에 핵심 키워드',
        10,
        ratio,
        ratio === 1 ? `'${key}'가 제목 앞부분에 있어요` : ratio === 0.6 ? `'${key}'가 제목 뒤쪽에 있어요` : `제목에 '${key}'가 없어요`,
        '네이버·구글 모두 제목 앞쪽 단어를 더 무겁게 봅니다. 검색할 법한 단어를 제목 맨 앞에 두세요.',
      ),
    );
  }

  /* 3. 메타 설명 길이 */
  let descRatio = 0.2;
  if (descLength >= 80 && descLength <= 150) descRatio = 1;
  else if (descLength >= 60 && descLength <= 180) descRatio = 0.6;
  checks.push(
    makeCheck(
      'description-length',
      '메타 설명 길이',
      20,
      descRatio,
      `${descLength}자 (권장 80~150자)`,
      descLength < 80
        ? '설명이 짧아요. 누가·무엇을·어떻게 느꼈는지 한 문장 더 넣으면 클릭률이 올라갑니다.'
        : descLength > 150
          ? '설명이 길어 검색 결과에서 잘릴 수 있어요. 150자 안으로 줄여 보세요.'
          : '검색 결과에 두 줄로 잘 보이는 길이예요.',
    ),
  );

  /* 4. 소제목 구조 */
  let headingRatio = 0;
  if (h2.length >= 2) headingRatio = h3.length >= 1 ? 1 : 0.7;
  else if (h2.length === 1) headingRatio = 0.45;
  checks.push(
    makeCheck(
      'headings',
      'H2·H3 소제목 구조',
      15,
      headingRatio,
      `H2 ${h2.length}개 · H3 ${h3.length}개`,
      '소제목(H2) 두 개 이상에, 필요한 곳은 H3로 한 단계 더 나눠 주세요. 검색엔진이 글의 뼈대를 읽습니다.',
    ),
  );

  /* 5. 본문 분량 */
  let bodyRatio = 0.15;
  if (chars >= 1500) bodyRatio = 1;
  else if (chars >= 1000) bodyRatio = 0.8;
  else if (chars >= 600) bodyRatio = 0.55;
  checks.push(
    makeCheck(
      'body-length',
      '본문 분량',
      15,
      bodyRatio,
      `${chars.toLocaleString('ko-KR')}자 · 약 ${readingMinutes(plain)}분`,
      '리뷰 글은 1,500자(약 3분 분량) 이상이면 검색 결과에서 다룰 내용이 충분해집니다. 표·목록으로 살을 붙여 보세요.',
    ),
  );

  /* 6. 내부 링크 */
  let linkRatio = 0;
  if (internalLinks.length >= 2) linkRatio = 1;
  else if (internalLinks.length === 1) linkRatio = 0.6;
  checks.push(
    makeCheck(
      'internal-links',
      '내부 링크',
      10,
      linkRatio,
      `내부 ${internalLinks.length}개 · 외부 ${externalLinks.length}개`,
      '관련 글·카테고리로 가는 링크를 2개 이상 넣으면, 검색엔진이 블로그 안의 글 관계를 이해합니다.',
    ),
  );

  /* 7. 이미지 대체텍스트 */
  if (images.length > 0) {
    const withAlt = images.filter((image) => image.alt && image.alt.trim().length > 2).length;
    checks.push(
      makeCheck(
        'image-alt',
        '이미지 대체텍스트',
        10,
        withAlt / images.length,
        `이미지 ${images.length}개 중 ${withAlt}개에 설명`,
        '![[설명](주소)] 형식으로 사진마다 설명을 적어 주세요. 이미지 검색 유입과 접근성에 함께 도움이 됩니다.',
      ),
    );
  }

  /* 8. 첫 문단 키워드 */
  if (key) {
    const intro = bodyLower.slice(0, 150);
    const count = (bodyLower.match(new RegExp(keyLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    const ratio = intro.includes(keyLower) ? 1 : count >= 3 ? 0.6 : count >= 1 ? 0.3 : 0;
    checks.push(
      makeCheck(
        'keyword-intro',
        '첫 문단에 핵심 키워드',
        5,
        ratio,
        `본문 전체 ${count}회 등장`,
        '검색해서 들어온 사람이 30초 안에 답을 얻도록, 첫 문단에 핵심 단어와 결론을 먼저 놓아 주세요.',
      ),
    );
  }

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks.reduce((sum, check) => sum + check.earned, 0);
  const score = Math.round((earned / totalWeight) * 100);

  const grade = score >= 85 ? '좋아요' : score >= 70 ? '괜찮아요' : score >= 50 ? '보완 필요' : '기본기 부족';

  return {
    score,
    grade,
    checks,
    stats: {
      chars,
      words: plain ? plain.split(/\s+/).filter(Boolean).length : 0,
      minutes: readingMinutes(plain),
      h2: h2.length,
      h3: h3.length,
      internalLinks: internalLinks.length,
      externalLinks: externalLinks.length,
      images: images.length,
      keywords: key ? (bodyLower.match(new RegExp(keyLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length : 0,
    },
  };
}
