/**
 * 관리자 — 소개 페이지(/about/) 데이터
 *
 * 소개 페이지 내용은 저장소의 src/content/pages/about.json 하나에 모여 있고,
 * /admin/ 의 '소개 페이지' 탭에서 이 파일을 읽고 커밋합니다.
 * 이 파일에는 계정 정보가 없습니다.
 */

export const ABOUT_PATH = 'src/content/pages/about.json';

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const list = (value) => (Array.isArray(value) ? value : []);

export function todayInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function aboutDefaults() {
  return {
    meta: {
      eyebrow: 'about',
      title: '쿼구리 소개',
      description:
        '쿼카처럼 웃고 너구리처럼 부스럭거리는 기록자, 쿼구리(quoguri)를 소개합니다. 직접 써보고 직접 찍은 것만 남기는 리뷰 블로그입니다.',
    },
    hero: {
      title: '안녕하세요, 쿼구리예요',
      lede: '호주 쿼카처럼 해맑게 웃고, 너구리처럼 부스럭거리며 살림을 하는 기록자예요.',
    },
    plate: {
      name: '쿼구리',
      nameEn: 'quoguri',
      tagline: '직접 써보고, 직접 찍은 것만',
    },
    intro: { heading: '쿼구리는 어떤 블로그예요?', paragraphs: [] },
    topics: { heading: '이런 걸 써요' },
    rules: { heading: '글을 쓰는 기준', items: [] },
    monetization: { heading: '수익화 고지', paragraph: '' },
    faq: { heading: '자주 묻는 것', items: [] },
    contact: { heading: '함께 이야기해요', paragraph: '' },
    updated: todayInput(),
  };
}

/** 어떤 모양의 JSON이 와도 화면이 깨지지 않도록 모양을 맞춥니다. */
export function normalizeAbout(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const base = aboutDefaults();
  const meta = data.meta && typeof data.meta === 'object' ? data.meta : {};
  const hero = data.hero && typeof data.hero === 'object' ? data.hero : {};
  const plate = data.plate && typeof data.plate === 'object' ? data.plate : {};
  const intro = data.intro && typeof data.intro === 'object' ? data.intro : {};
  const topics = data.topics && typeof data.topics === 'object' ? data.topics : {};
  const rules = data.rules && typeof data.rules === 'object' ? data.rules : {};
  const monetization = data.monetization && typeof data.monetization === 'object' ? data.monetization : {};
  const faq = data.faq && typeof data.faq === 'object' ? data.faq : {};
  const contact = data.contact && typeof data.contact === 'object' ? data.contact : {};

  return {
    meta: {
      eyebrow: text(meta.eyebrow) || base.meta.eyebrow,
      title: text(meta.title) || base.meta.title,
      description: text(meta.description) || base.meta.description,
    },
    hero: {
      title: text(hero.title) || base.hero.title,
      lede: text(hero.lede) || base.hero.lede,
    },
    plate: {
      name: text(plate.name) || base.plate.name,
      nameEn: text(plate.nameEn) || base.plate.nameEn,
      tagline: text(plate.tagline) || base.plate.tagline,
    },
    intro: {
      heading: text(intro.heading) || base.intro.heading,
      paragraphs: list(intro.paragraphs).map(text),
    },
    topics: { heading: text(topics.heading) || base.topics.heading },
    rules: {
      heading: text(rules.heading) || base.rules.heading,
      items: list(rules.items).map(text),
    },
    monetization: {
      heading: text(monetization.heading) || base.monetization.heading,
      paragraph: text(monetization.paragraph),
    },
    faq: {
      heading: text(faq.heading) || base.faq.heading,
      items: list(faq.items).map((item) => ({
        q: text(item && item.q),
        a: text(item && item.a),
      })),
    },
    contact: {
      heading: text(contact.heading) || base.contact.heading,
      paragraph: text(contact.paragraph),
    },
    updated: text(data.updated) || todayInput(),
  };
}

/** 저장 전에 확인할 것들. 빈 문자열 배열이면 통과입니다. */
export function validateAbout(input) {
  const data = normalizeAbout(input);
  const rawTitle = text(input?.meta?.title);
  const rawHeroTitle = text(input?.hero?.title);
  const rawDescription = text(input?.meta?.description);
  const errors = [];

  if (!rawTitle) errors.push('페이지 제목을 입력해 주세요.');
  else if (rawTitle.length > 60) errors.push('페이지 제목은 60자까지 쓸 수 있어요.');

  if (!rawHeroTitle) errors.push('히어로 제목(큰 제목)을 입력해 주세요.');
  else if (rawHeroTitle.length > 120) errors.push('히어로 제목은 120자까지 쓸 수 있어요.');

  const descLength = Array.from(rawDescription).length;
  if (descLength < 40) errors.push('메타 설명은 40자 이상으로 적어 주세요. (검색 결과에 보여요)');
  if (descLength > 300) errors.push('메타 설명은 300자까지 쓸 수 있어요.');

  const emptyParagraph = data.intro.paragraphs.findIndex((item) => !item);
  if (emptyParagraph >= 0) errors.push(`${emptyParagraph + 1}번째 소개 문단이 비어 있어요.`);

  const emptyRule = data.rules.items.findIndex((item) => !item);
  if (emptyRule >= 0) errors.push(`${emptyRule + 1}번째 글쓰기 기준이 비어 있어요.`);

  const halfFaq = data.faq.items.findIndex((item) => (item.q ? !item.a : item.a));
  if (halfFaq >= 0) errors.push(`${halfFaq + 1}번째 자주 묻는 질문의 질문과 답을 모두 채워 주세요.`);

  return errors;
}

/** 저장 직전에 빈 줄을 덜어 내고 보기 좋은 JSON으로 만듭니다. */
export function cleanAbout(input) {
  const data = normalizeAbout(input);
  return {
    ...data,
    intro: {
      ...data.intro,
      paragraphs: data.intro.paragraphs.filter((item) => item),
    },
    rules: {
      ...data.rules,
      items: data.rules.items.filter((item) => item),
    },
    faq: {
      ...data.faq,
      items: data.faq.items.filter((item) => item.q || item.a),
    },
    updated: data.updated || todayInput(),
  };
}

export function serializeAbout(input) {
  return `${JSON.stringify(cleanAbout(input), null, 2)}\n`;
}

export function parseAbout(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('소개 페이지 데이터(JSON)를 읽지 못했어요. 파일 형식을 확인해 주세요.');
  }
  return normalizeAbout(data);
}
