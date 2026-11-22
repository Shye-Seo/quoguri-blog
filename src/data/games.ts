/**
 * 게임 전시관 데이터
 * ==========================================================
 * 새 게임을 만들면 이 배열에 한 칸만 추가하면 됩니다.
 *   - /game/ 전시 페이지의 쇼케이스 카드
 *   - 홈 하단의 게임 미리보기
 *   - 사이트맵·구조화 데이터
 * 가 한 번에 따라 늘어납니다. (페이지는 src/pages/game/<slug>.astro 로 만듭니다)
 */

export interface GameEntry {
  /** 주소 조각 — /game/<slug>/ */
  slug: string;
  /** 게임 이름 */
  title: string;
  /** 한 줄 소개 */
  summary: string;
  /** 특징 목록 (쇼케이스 카드의 불릿) */
  features: string[];
  /** 카드 아래 작은 안내 문구 */
  note: string;
  /** 카드 왼쪽 미리보기 그림 종류 — src/components/game/GamePreview.astro */
  preview: 'pet' | 'tangerine';
  /** NEW 배지 표시 */
  isNew: boolean;
  /** 정렬용 — 작을수록 위 */
  order: number;
  /** 카드 포인트 색 */
  accent: string;
  /** 플레이 버튼 문구 */
  cta: string;
  /** 게임 페이지 상단의 짧은 안내 */
  intro: string;
  /** 게임 페이지에서 알려 줄 조작 방법 */
  controls: string[];
  /** 태그 (구조화 데이터·필터에 사용) */
  tags: string[];
}

export const games: GameEntry[] = [
  {
    slug: 'quoguri-pet',
    title: '쿼구리 키우기',
    summary: '다마고치 기기 속에서 쿼구리를 키워요. 밥 주고, 놀아 주고, 재워 주세요.',
    features: [
      '밥주기 · 놀아주기 · 재우기 · 쓰다듬기 네 가지 돌보기',
      '배부름 · 기분 · 기운 게이지가 실제 시간에 맞춰 줄어들어요',
      '표정과 말풍선, 점프가 반응하고 기록은 브라우저에 저장돼요',
    ],
    note: '로그인 없이 바로 · 모바일 터치와 PC 키보드 모두 지원',
    preview: 'pet',
    isNew: true,
    order: 1,
    accent: '#B3A0E8',
    cta: '플레이하기',
    intro:
      '기기 속 쿼구리는 시간이 지나면 배가 고프고, 심심하고, 졸려해요. 네 가지 돌보기로 기분을 맞춰 주세요.',
    controls: [
      '버튼을 눌러 돌보기 — 밥주기(F) · 놀아주기(N) · 재우기(S) · 쓰다듬기(P)',
      '잠들면 기운이 다시 차요. 다 자란 뒤에는 재우기로 깨울 수 있어요',
      '기록은 이 브라우저에만 저장돼요. 다시 시작은 아래 링크로',
    ],
    tags: ['다마고치', '육성', '캐주얼'],
  },
  {
    slug: 'tangerine-rush',
    title: '쿼구리 귤 받기',
    summary: '60초 동안 떨어지는 귤과 황금별을 받아요. 폭탄은 피해야 해요.',
    features: [
      '좌우로 움직여 귤(+10)과 황금별(+50)을 받고 폭탄(−20)은 피해요',
      '연속으로 받으면 콤보 보너스, 놓치면 콤보가 끊겨요',
      '60초가 끝나면 점수와 최고 기록을 브라우저에 저장해요',
    ],
    note: '로그인 없이 바로 · 드래그·화살표·화면 버튼 모두 지원',
    preview: 'tangerine',
    isNew: true,
    order: 2,
    accent: '#E0A75E',
    cta: '플레이하기',
    intro: '귤이 쏟아지는 60초예요. 바구니를 움직여 귤을 받고 폭탄은 흘려보내세요.',
    controls: [
      '화면을 드래그하거나 ← → 화살표, 화면 아래 ◀ ▶ 버튼으로 움직여요',
      '시작은 스페이스바 또는 시작 버튼, 다시 하기도 스페이스바로 돼요',
      '최고 기록은 이 브라우저에만 저장돼요',
    ],
    tags: ['아케이드', '캐주얼', '기록'],
  },
];

/** order 순으로 정렬한 목록 */
export const gameList = [...games].sort((a, b) => a.order - b.order);

/** 주소로 게임 하나 찾기 */
export const gameBySlug = (slug: string) => gameList.find((game) => game.slug === slug);
