# 쿼구리 (quoguri) 블로그

> 직접 써보고, 직접 찍은 것만 — 테크·데스크테리어 · 뷰티 · 여행·디카 · 일상 꿀팁

**Astro 7** 기반 정적 블로그입니다. GitHub Pages로 무료 배포되고, 나중에 `quoguri.com`을 연결할 수 있게 만들어 뒀어요.
애드센스(Google AdSense)와 쿠팡 파트너스 수익화 요소, SEO(사이트맵·RSS·OG·구조화 데이터)가 처음부터 들어 있습니다.

| 항목 | 내용 |
| --- | --- |
| 프레임워크 | Astro 7 (정적 출력) + MDX |
| 스타일 | 키치 에디토리얼 — 버터 크림 바탕 + 팝 컬러 스티커 카드, 다크 모드 지원 |
| 폰트 | 제목·UI `Paperlogy`(CDN), 본문 `Pretendard`(가변 다이내믹 서브셋) |
| 검색 | 헤더에서 가로로 펼쳐지는 인라인 검색 → `/search/?q=…` |
| 배포 | GitHub Actions → GitHub Pages (하루 1회 자동 재빌드 포함) |
| 주소 | `.github/workflows/deploy.yml`의 `SITE_URL`·`BASE_PATH`로 결정 (도메인을 붙이면 그 주소가 기준이 됩니다) |
| 관리자 | `/admin/` — 글쓰기 · 대표 사진 업로드 · 소개 페이지 편집을 브라우저에서 커밋 |
| 목표 도메인 | `https://quoguri.com` |

---

## 1. 로컬에서 켜기

Node **22.23 이상**(권장 24 LTS)이 필요합니다.

```bash
npm install
npm run dev        # http://localhost:4321/quoguri-blog/
npm run build      # dist/ 에 결과물 생성
npm run preview    # 빌드 결과를 로컬에서 확인
```

`npm run dev`에서 광고 자리는 점선 박스로 보입니다. 실제 광고 ID를 넣으면 그 자리에 광고가 나옵니다.

---

## 2. 글 쓰는 법

글은 `src/content/blog/` 폴더에 `.md` 또는 `.mdx` 파일로 추가합니다. **파일 이름이 그대로 주소**가 돼요.

```
src/content/blog/my-first-post.md  →  /posts/my-first-post/
```

### 앞부분(frontmatter)

```yaml
---
title: '글 제목 (120자 이내)'
description: '검색 결과에 보일 한 줄 요약 (300자 이내)'
pubDate: 2026-11-20          # 발행일 (미래 날짜면 그날 이후 빌드에서 공개)
updatedDate: 2026-11-22      # 선택: 수정일
category: tech               # tech | beauty | travel | life
tags: ['키보드', '데스크테리어']
cover: /images/cover-tech.jpg # public/images 안의 경로 또는 외부 URL
coverAlt: '책상 위 키보드 사진'
featured: false              # true면 홈 상단 대표 글로 노출
draft: false                 # true면 빌드에서 제외
---
```

### 카테고리

| slug | 이름 | 설명 |
| --- | --- | --- |
| `tech` | 테크·데스크테리어 | 맥북·태블릿·키보드, 책상 위의 물건들 |
| `beauty` | 뷰티·리뷰 | 써보고 남는 것만 남기는 솔직 후기 |
| `travel` | 여행·디카 | 빈티지 디카와 함께한 동네 여행 |
| `life` | 일상·꿀팁 | 살림·기록·생활 속 작은 발견 |

카테고리를 바꾸거나 추가하려면 `src/config.ts`의 `categories`를 고치고, 같은 파일의 `category` enum(`src/content.config.ts`)도 함께 맞춰 주세요.

### 사진 넣기 (선택)

이 블로그는 **대표 사진 없이도 완성됩니다.** `cover`를 비워 두면 카테고리 색과 번호로 만든
타이포그래피 커버가 자동으로 그려져요. 직접 찍은 사진이 있을 때만 넣으면 됩니다.

1. 사진을 `public/images/` 폴더에 넣습니다. (예: `public/images/my-photo.jpg`)
2. frontmatter의 `cover`에 `/images/my-photo.jpg`를 적고, `coverAlt`에 설명을 씁니다.
3. 본문 중간에 넣을 때는 `![설명](/images/my-photo.jpg)` 처럼 씁니다.

> 사진은 가로 1600px 정도, JPEG 품질 80~85면 충분해요. 그 이상은 로딩만 느려집니다.
> 일러스트·자동 생성 그림은 쓰지 않습니다. (2026-11 개편에서 모두 제거)

### 본문에서 쓸 수 있는 요소

- **강조 상자** (MDX에서 사용)

  ```mdx
  <div class="callout callout--tip">
    <span class="callout__icon">💡</span>
    <span>이런 팁을 적어요.</span>
  </div>
  ```

- **광고 슬롯** (MDX에서 사용)

  ```mdx
  import AdSlot from '../../components/AdSlot.astro';

  <AdSlot />              {/* 본문 중간 광고 */}
  <AdSlot slot="home" />  {/* 홈용 슬롯 */}
  ```

- **쿠팡 파트너스 카드** (MDX에서 사용)

  ```mdx
  import CoupangCard from '../../components/CoupangCard.astro';

  <CoupangCard
    name="상품 이름"
    price={29900}
    originalPrice={45000}
    description="한 줄 설명"
    image="/images/products/example.jpg"
    url="https://link.coupang.com/a/xxxxx"
  />
  ```

  카드 하단에 공정위 문구(`이 포스팅은 쿠팡 파트너스 활동의 일환으로…`)가 **자동으로** 들어갑니다.
  `CoupangCard`가 들어간 글은 본문 맨 위에도 공시 배너가 자동으로 붙어요. (아래 '리뷰 블록' 항목 참고)

- **리뷰 블록 3종** — 한 줄 결론 · 장단점 · 가격 기준 (md·mdx 모두, 코드 펜스로 씁니다)

  ````md
  ```verdict
  매일 8시간 타이핑하는 사람에게는 추천, 가끔 쓰는 사람에게는 과한 선택
  ```

  ```proscons
  + 소리가 조용해서 밤에 작업해도 괜찮아요
  + 키캡이 낮아 손목 받침 없이도 편해요
  - 백라이트가 없어 어두운 방에서는 키가 안 보여요
  ```

  ```price
  price: 89,000원
  store: 쿠팡
  date: 2026-11-21
  note: 가격은 판매처 사정에 따라 달라질 수 있어요
  ```
  ````

  `/admin/` 에디터 툴바의 **결론 · 장단점 · 가격** 버튼을 누르면 같은 문구가 커서 자리에 들어가고,
  오른쪽 미리보기에도 사이트와 같은 모습으로 보입니다. 블록 안에서는 굵게·기울임·코드·링크(`[글자](/about/)`)를 쓸 수 있어요.

- **쿠팡 공시 배너** — frontmatter에 `coupang: true`를 켜거나 본문에 `CoupangCard`·`link.coupang.com` 링크가 있으면
  글 본문이 시작되기 전에 공시 배너가 자동으로 붙습니다. `/admin/` 글 편집기의 **쿠팡 파트너스 글** 체크박스로도 켤 수 있어요.

- **표·인용·접기**는 일반 마크다운 그대로 씁니다. H2/H3 제목은 자동으로 목차(TOC)에 들어가요.

### 링크는 `/about/` 처럼 그냥 쓰세요

본문에 `/about/`, `/images/a.jpg` 같은 **루트 경로**를 쓰면, 배포 위치(하위 경로/도메인)에 맞춰 자동으로 변환됩니다.
(`astro.config.mjs`의 `rehypeBasePaths` 플러그인이 처리해요.)

---

## 3. 관리자 페이지 (`/admin/`)

브라우저에서 글을 쓰고, 그대로 GitHub에 커밋해 자동 배포까지 보내는 화면입니다.
계정 정보는 **코드에 전혀 없습니다.** 로그인은 직접 발급한 GitHub 토큰으로만 이뤄집니다.

### 처음 한 번: 토큰 만들기

1. <https://github.com/settings/personal-access-tokens/new> 를 엽니다. (Fine-grained token)
2. **Token name**: `quoguri-admin` / **Expiration**: 90 days 권장
3. **Repository access** → **Only select repositories** → `quoguri-blog` 만 선택
4. **Repository permissions** → **Contents: Read and write** (Metadata는 자동으로 Read)
5. Generate token → `github_pat_…` 값을 복사

### 로그인

1. `/admin/` 을 엽니다. (예: `https://<계정>.github.io/quoguri-blog/admin/`)
2. 토큰을 붙여 넣고 로그인합니다. 저장소는 자동으로 찾습니다.
3. 토큰은 **그 탭의 sessionStorage**에만 저장되고, '기억하기'를 켰을 때만 localStorage에 남습니다.
   로그아웃하면 즉시 지워집니다. `api.github.com` 외에는 어떤 곳으로도 전송하지 않습니다.
4. 화면에는 `Content-Security-Policy`로 통신 대상을 GitHub API 하나로 제한해 두었습니다.

### 할 수 있는 일

| 기능 | 설명 |
| --- | --- |
| 글 목록 | 발행·임시저장·예약·대표 글 필터, 제목·태그 검색 |
| 새 글 / 수정 | 제목, 주소(슬러그), 설명, 카테고리, 태그, 발행일, 수정일, 대표 사진, 시리즈, draft·대표 토글 |
| 본문 편집 | 마크다운 에디터 + 서식 버튼 + 실시간 미리보기 (MDX 컴포넌트는 안내 박스로 표시) |
| SEO 점검 | 제목 25~45자·키워드 앞배치, 설명 80~150자, H2/H3 구조, 본문 분량, 내부 링크, 이미지 alt를 100점으로 실시간 채점 |
| 저장 | GitHub Contents API로 커밋 → `main` 푸시 → 기존 Actions가 자동 배포 (1~3분) |
| 복제 / 삭제 / 주소 변경 | 복제는 임시저장 사본을 만들고, 삭제·주소 변경은 확인 후 처리 |
| 대표 사진 업로드 | '내 컴퓨터에서 선택'으로 사진을 고르면 1600px 이하 JPEG로 줄여 `public/images/uploads/연/월/`에 커밋하고, 대표 사진 주소를 자동으로 채웁니다 |
| 소개 페이지 탭 | `/about/`의 제목·소개 문단·글쓰기 기준·FAQ·수익화 고지·마지막 인사를 폼으로 고쳐 `src/content/pages/about.json`에 저장합니다 |
| 사이트 설정 탭 | 검색엔진 소유확인 코드, 문의 메일, GA4, 애드센스·쿠팡 ID, 소셜 링크를 `src/content/pages/site.json`에 저장하고 커밋합니다. 값이 비면 해당 태그·링크는 사이트에 나오지 않습니다 |
| 리뷰 블록 버튼 | 에디터 툴바의 **결론 · 장단점 · 가격** 버튼으로 `verdict`·`proscons`·`price` 블록을 넣고, 미리보기에서 바로 확인합니다 |
| 쿠팡 파트너스 글 토글 | 편집기의 **쿠팡 파트너스 글** 체크박스로 `coupang: true`를 켜면 본문 맨 위에 공시 배너가 자동으로 붙습니다 |
| 단축키 | `Ctrl/⌘ + S` 저장 (글·소개 페이지·사이트 설정 모두) |

#### 대표 사진 업로드가 하는 일

1. 사진을 고르면 브라우저에서 최대 1600px·JPEG(품질 0.86)로 줄입니다. (GIF는 원본 유지, 20MB 초과는 거절)
2. GitHub Contents API로 `public/images/uploads/YYYY/MM/이름-날짜-난수.jpg` 에 커밋합니다.
3. 대표 사진 주소 칸에 `/images/uploads/…` 가 들어가고, alt가 비어 있으면 `제목 대표 사진`으로 채웁니다.
4. 글을 저장(커밋)해야 그 글이 새 사진을 씁니다. 사진만 올리고 글을 저장하지 않으면 저장소에 쓰이지 않는 파일이 남습니다.

#### 소개 페이지 관리

- 내용은 `src/content/pages/about.json` 한 파일에 있습니다. `/admin/` → **소개 페이지** 탭에서 읽고 커밋합니다.
- '이런 걸 써요'의 목록 항목은 `src/config.ts`의 카테고리 설정을 그대로 쓰고, 소제목만 여기서 바꿉니다.
- 질문과 답을 모두 채운 FAQ만 사이트와 FAQ 구조화 데이터(JSON-LD)에 들어갑니다.
- 저장 전에 제목·메타 설명(40자 이상)·히어로 제목·반쪽 질문을 점검합니다.

### 노출되지 않는 이유

- `/admin/` 은 `robots.txt`에서 차단(`Disallow`)되고 `<meta name="robots" content="noindex, nofollow, noarchive">`가 붙습니다.
- 사이트맵에서 제외되고, 헤더·푸터·모바일 탭 어디에도 링크가 없습니다.
- HTML·JS·JSON-LD·메타데이터에 아이디·이메일·토큰이 없습니다. (배포 도메인은 GitHub Pages가 정한 주소라 canonical에 자동으로 들어갑니다.)
- 토큰이 없으면 아무 데이터도 읽을 수 없습니다. 관리자 화면 자체는 공개되어 있어도 안전합니다.

> 도메인(`quoguri.com`)을 연결하면 canonical·OG 주소도 그 도메인으로 바뀌어, 주소에 남는 계정 흔적까지 사라집니다.

---

## 4. 배포 (GitHub Pages)

### 처음 한 번만

1. GitHub에서 **새 저장소**를 만듭니다.
   - 이름: `quoguri-blog`
   - 공개(Public) · README/라이선스 추가 안 함
2. 저장소 → **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 바꿉니다.
3. 아래 명령으로 코드를 올립니다.

   ```bash
   git init -b main
   git add .
   git commit -m "feat: 쿼구리 블로그 초기 구축"
   git remote add origin https://github.com/<계정>/quoguri-blog.git
   git push -u origin main
   ```

4. **Actions** 탭에서 `Deploy to GitHub Pages`가 초록불이 되면
   `https://<계정>.github.io/quoguri-blog/` 로 열립니다.

이후에는 `main` 브랜치에 푸시할 때마다 자동으로 다시 배포됩니다. 매일 09:00(KST)에도 한 번씩 재빌드해서, 예약 발행해 둔 글이 자동으로 올라옵니다.

---

## 5. `quoguri.com` 연결하기

도메인을 산 다음, **DNS 설정 → GitHub 설정 → 코드 두 줄** 순서로 하면 됩니다.

### 5-1. DNS 레코드 (도메인 산 곳에서 설정)

| 타입 | 이름(호스트) | 값 |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `<계정>.github.io` |

- 기존에 있던 기본 A 레코드나 `parking` 레코드는 지워 주세요.
- 전파에 최대 24시간이 걸릴 수 있어요.

### 5-2. GitHub 설정

저장소 → **Settings → Pages → Custom domain**에 `quoguri.com`을 넣고 **Save** → **Enforce HTTPS** 체크.
(이 저장소는 Actions로 배포하므로 `CNAME` 파일은 필요 없습니다.)

### 5-3. 코드에서 주소 바꾸기

`.github/workflows/deploy.yml` 맨 위 `env` 두 줄만 바꿉니다.

```yaml
env:
  SITE_URL: https://quoguri.com
  BASE_PATH: /
```

커밋·푸시하면 사이트맵·RSS·canonical 주소까지 전부 `quoguri.com` 기준으로 다시 만들어집니다.

> 로컬에서 미리 확인하려면: `SITE_URL=https://quoguri.com BASE_PATH=/ npm run build`

---

## 6. 애드센스(Google AdSense) 붙이기

1. <https://adsense.google.com> 에서 사이트 추가 → `quoguri.com` (또는 임시 주소).
2. **소유 확인**을 위해 `public/ads.txt` 파일을 만들고 아래 한 줄을 넣습니다.

   ```
   google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
   ```

   `pub-…` 부분은 애드센스 화면에 나온 **내 게시자 ID**로 바꿔 주세요. (파일을 `public/`에 두면 사이트 루트 `/ads.txt`로 배포됩니다.)
3. 저장소 → **Settings → Secrets and variables → Actions → Variables** 탭에서 `New repository variable`로 추가:

   | 이름 | 값 예시 |
   | --- | --- |
   | `PUBLIC_ADSENSE_CLIENT` | `ca-pub-1234567890123456` |
   | `PUBLIC_ADSENSE_SLOT_ARTICLE` | `1234567890` (본문 중간 슬롯) |
   | `PUBLIC_ADSENSE_SLOT_HOME` | `0987654321` (홈 하단 슬롯) |

4. 다시 배포하면 `<head>`에 애드센스 스크립트가 자동 삽입되고, 글 본문 하단과 홈 하단에 광고가 나옵니다.

저장소 Variables를 쓰지 않고 `/admin/` → **사이트 설정** 탭에 게시자 ID·슬롯을 넣어 커밋해도 됩니다.
(저장소 Variables가 있으면 그 값이 우선합니다.)

**동작 방식**

- `PUBLIC_ADSENSE_CLIENT`가 `ca-pub-` + 숫자 16자리 형식일 때만 스크립트와 광고 슬롯이 렌더링됩니다.
- ID가 없으면 운영 사이트에는 **아무것도 그리지 않습니다**(빈 박스가 남지 않아요). 개발 모드에서만 점선 자리 표시가 보입니다.
- 광고를 더 넣고 싶으면 MDX 글 안에 `<AdSlot />`을 원하는 위치에 넣으면 됩니다.

---

## 7. 쿠팡 파트너스

1. <https://partners.coupang.com> 가입 → 상품 링크(단축 URL)를 만듭니다.
2. 글에서 `<CoupangCard url="https://link.coupang.com/a/xxxxx" … />`로 넣습니다.
3. `PUBLIC_COUPANG_PARTNER_ID` 변수를 넣어 두면 추후 자동 링크 조합에도 쓸 수 있습니다(현재 카드는 `url`을 그대로 사용).

**공정위 문구**는 `src/lib/disclosure.js`의 `COUPANG_DISCLOSURE` 한 곳에서 관리하고, 카드·글 상단 배너·개인정보처리방침에 함께 쓰입니다. (사이트 푸터에는 넣지 않습니다 — 글마다 상단 공시 배너로만 표시)

**글 상단 공시 배너**는 아래 중 하나만 해당하면 자동으로 붙습니다.

- frontmatter `coupang: true`
- 본문에 `<CoupangCard … />` 컴포넌트
- 본문에 `link.coupang.com` 제휴 링크

> 대가성 문구는 글 맨 위 또는 카드 바로 옆에 있어야 합니다. 카드 하단 문구와 함께, 협찬 글이라면 본문 첫머리에도 한 줄 적어 주세요.

---

## 8. SEO · 검색 등록

이미 만들어져 있는 것:

- `sitemap-index.xml` (+ `sitemap-0.xml`) — 자동 생성, `/admin/`·`/search/`·404는 제외
- `robots.txt` — `/admin/`·`/search/` 차단, 사이트맵 주소 포함 (네이버 Yeti·다음 Daumoa 허용)
- `rss.xml` — RSS 2.0 피드. 브라우저로 열면 `public/rss.xsl` 덕분에 XML 원문 대신 피드 미리보기 카드가 보입니다. (RSS 리더는 스타일시트를 무시하고 원문을 읽습니다)
- `rss.xml`의 글 링크는 RSS 리더에서 바로 열리도록 절대 주소로 나갑니다
- 페이지별 `title`·`description`·`keywords`·`canonical`·`hreflang`·Open Graph·Twitter 카드
- 글마다 `BlogPosting` + `BreadcrumbList`, 홈은 `WebSite` + `Organization`, 소개는 `FAQPage` 구조화 데이터
- 화면에 보이는 빵부스러기(`홈 / 카테고리 / 글`), 글 하단 관련 글 내부 링크, 이전·다음 글
- 검색 페이지(`/search/`) — 빌드 시 만든 정적 인덱스로 동작 (noindex)
- 검색엔진 소유확인 메타 자리 — `/admin/` → **사이트 설정** 탭(또는 `src/content/pages/site.json`)의
  `verification.google` / `verification.naver`, 저장소 변수 `PUBLIC_GOOGLE_SITE_VERIFICATION` / `PUBLIC_NAVER_SITE_VERIFICATION`
  (저장소 변수가 없으면 site.json 값이 그대로 쓰입니다. 값이 비면 메타 태그가 출력되지 않습니다)
- 방문 분석 — `/admin/` → **사이트 설정**의 GA4 측정 ID(`G-…`) 또는 `PUBLIC_GA4_ID`. 값을 넣으면 모든 페이지에 gtag가 들어갑니다

**등록할 곳**

1. [Google Search Console](https://search.google.com/search-console) → 속성 추가 → `sitemap-index.xml` 제출
2. [네이버 서치어드바이저](https://searchadvisor.naver.com) → 사이트 등록 → 소유 확인(HTML 태그를 `/admin/` → 사이트 설정의 네이버 칸에 통째로 붙여 넣어도 됩니다) → 사이트맵 제출
3. [다음 검색등록](https://search.daum.net/search/registration) — RSS(`/rss.xml`) 제출

> 소유확인 값이 비어 있으면 메타 태그 자체가 출력되지 않습니다. 값을 넣고 다시 배포하면 `<head>`에 자동으로 들어갑니다.
> 색인 상태는 서치콘솔·서치어드바이저에서 확인하고, 새 글은 사이트맵 재제출 없이도 다음 크롤에서 반영됩니다.

---

## 9. 폴더 구조

```
quoguri-blog/
├─ .github/workflows/deploy.yml   # GitHub Pages 자동 배포
├─ astro.config.mjs               # 사이트 주소·base·마크다운 설정
├─ public/
│  ├─ favicon.svg · apple-touch-icon.png
│  ├─ images/og-default.jpg       # OG 카드 (스크립트로 생성, 일러스트 없음)
│  ├─ images/uploads/             # 관리자에서 올린 대표 사진
│  └─ rss.xsl                     # /rss.xml을 브라우저에서 열 때 보이는 피드 미리보기
├─ src/
│  ├─ config.ts                   # ★ 브랜드·카테고리·수익화 ID·SNS 링크
│  ├─ content.config.ts           # 글 frontmatter 스키마
│  ├─ content/blog/               # ★ 글 (.md / .mdx)
│  ├─ content/pages/about.json    # ★ 소개 페이지 내용 (관리자에서 편집)
│  ├─ content/pages/site.json     # ★ 소유확인·문의 메일·GA4·광고 ID (관리자 '사이트 설정')
│  ├─ components/                 # Header · Footer · PostCard · AdSlot · CoupangCard
│  ├─ layouts/BaseLayout.astro    # <head> SEO·OG·광고 스크립트
│  ├─ lib/                        # 경로·날짜·글 목록 도우미, 리뷰 블록(review-blocks.js), 쿠팡 공시(disclosure.js)
│  ├─ pages/                      # 홈·글·카테고리·검색·소개·개인정보·RSS·robots
│  ├─ pages/admin/index.astro     # ★ 관리자 화면 (noindex)
│  ├─ admin/                      # 관리자 로직 (github·frontmatter·markdown·seo·about·settings·images)
│  └─ styles/global.css           # 디자인 토큰 (색·타이포·컴포넌트)
├─ scripts/
│  ├─ generate-brand-assets.py    # OG 카드·앱 아이콘 생성
│  └─ verify-dist.mjs             # 빌드 검증 (개인정보·SEO·robots·sitemap)
├─ tests/                         # 관리자 모듈 · 소개 데이터 · 사이트 설정 · 리뷰 블록 · 사진 업로드 테스트
└─ package.json
```

**자주 고치는 곳**

| 하고 싶은 것 | 파일 |
| --- | --- |
| 블로그 소개 문구·SNS 링크·연락처 | `src/config.ts` |
| 카테고리 이름·색·설명 | `src/config.ts` |
| 색상·글꼴·여백 | `src/styles/global.css` (`:root` 토큰, 키치 컴포넌트 레이어) |
| 소개 페이지 내용 | `/admin/` → 소개 페이지 탭 또는 `src/content/pages/about.json` |
| 소유확인·문의 메일·GA4·광고 ID | `/admin/` → 사이트 설정 탭 또는 `src/content/pages/site.json` |
| 쿠팡 공시 문구 | `src/lib/disclosure.js`의 `COUPANG_DISCLOSURE` |
| RSS 피드 미리보기 디자인 | `public/rss.xsl` |
| 애드센스·쿠팡 ID | GitHub 저장소 Variables (또는 `src/config.ts` 기본값) |
| 푸터 고지 문구 | 없음(쿠팡 공시는 글 상단 배너로만) |
| 홈 히어로 문구 | `src/pages/index.astro` |

---

## 10. 자주 겪는 문제

| 증상 | 원인 / 해결 |
| --- | --- |
| 배포 후 페이지가 404 | Settings → Pages의 Source가 **GitHub Actions**인지 확인하고, Actions 탭의 배포 성공 여부를 봅니다. |
| CSS가 안 먹음 | `BASE_PATH`가 실제 배포 경로와 다를 때 생깁니다. 프로젝트 페이지는 `/quoguri-blog`, 도메인은 `/`. |
| 본문 링크가 404 | 루트 경로(`/about/`)로 쓰면 자동 변환됩니다. 외부 링크는 `https://`를 붙여 주세요. |
| 글을 올렸는데 안 보임 | `draft: true`이거나 `pubDate`가 미래일 수 있습니다. |
| 광고가 안 나옴 | `PUBLIC_ADSENSE_CLIENT` 형식(`ca-pub-` + 16자리)과 슬롯 ID를 확인하고, 애드센스 승인 상태를 봅니다. |
| 검색이 안 됨 | `/search-index.json`이 배포됐는지 확인합니다(빌드 때 자동 생성). |
| 관리자 로그인이 안 됨 | 토큰 만료(401), 저장소 미선택(404), Contents 권한 없음(403) 순서로 확인합니다. '저장소를 직접 지정하기'에 `owner/repo`를 적어 볼 수도 있습니다. |
| 관리자에서 저장했는데 사이트가 그대로 | Actions 탭에서 배포가 도는지 확인합니다. 커밋 후 1~3분 걸리고, `draft: true`면 사이트에 나오지 않습니다. |

---

## 11. 참고

- 디자인·문구는 쿼구리 브랜드 기준으로 작성돼 있습니다. 색을 바꾸려면 `src/styles/global.css`의 `:root` 변수만 고치면 전체에 반영됩니다.
- 현재 글 4편은 형식을 보여 주는 **샘플 글**입니다. 실제 운영 전에 자유롭게 고치거나 지우고 본인 글로 채우세요.
- `npm test` (관리자 모듈), `npm run verify` (빌드 검증: 개인정보 노출·SEO 태그·robots·sitemap)로 배포 전 확인을 합니다.
- 라이선스: 콘텐츠 © 쿼구리. 코드는 자유롭게 사용하셔도 됩니다.
