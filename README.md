# 쿼구리 (quoguri) 블로그

> 직접 써보고, 직접 찍은 것만 — 테크·데스크테리어 · 뷰티 · 여행·디카 · 일상 꿀팁

**Astro 7** 기반 정적 블로그입니다. GitHub Pages로 무료 배포되고, 나중에 `quoguri.com`을 연결할 수 있게 만들어 뒀어요.
애드센스(Google AdSense)와 쿠팡 파트너스 수익화 요소, SEO(사이트맵·RSS·OG·구조화 데이터)가 처음부터 들어 있습니다.

| 항목 | 내용 |
| --- | --- |
| 프레임워크 | Astro 7 (정적 출력) + MDX |
| 스타일 | 직접 작성한 CSS 디자인 토큰 (크림·화이트 에디토리얼, 다크 모드 지원) |
| 배포 | GitHub Actions → GitHub Pages (하루 1회 자동 재빌드 포함) |
| 기본 주소 | `https://shye-seo.github.io/quoguri-blog/` |
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

### 사진 넣기

1. 사진을 `public/images/` 폴더에 넣습니다. (예: `public/images/my-photo.jpg`)
2. frontmatter의 `cover`에 `/images/my-photo.jpg`를 적습니다.
3. 본문 중간에 넣을 때는 `![설명](/images/my-photo.jpg)` 처럼 씁니다.

> 사진은 가로 1600px 정도, JPEG 품질 80~85면 충분해요. 그 이상은 로딩만 느려집니다.

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

- **표·인용·접기**는 일반 마크다운 그대로 씁니다. H2/H3 제목은 자동으로 목차(TOC)에 들어가요.

### 링크는 `/about/` 처럼 그냥 쓰세요

본문에 `/about/`, `/images/a.jpg` 같은 **루트 경로**를 쓰면, 배포 위치(하위 경로/도메인)에 맞춰 자동으로 변환됩니다.
(`astro.config.mjs`의 `rehypeBasePaths` 플러그인이 처리해요.)

---

## 3. 배포 (GitHub Pages)

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

## 4. `quoguri.com` 연결하기

도메인을 산 다음, **DNS 설정 → GitHub 설정 → 코드 두 줄** 순서로 하면 됩니다.

### 4-1. DNS 레코드 (도메인 산 곳에서 설정)

| 타입 | 이름(호스트) | 값 |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `<계정>.github.io` |

- 기존에 있던 기본 A 레코드나 `parking` 레코드는 지워 주세요.
- 전파에 최대 24시간이 걸릴 수 있어요.

### 4-2. GitHub 설정

저장소 → **Settings → Pages → Custom domain**에 `quoguri.com`을 넣고 **Save** → **Enforce HTTPS** 체크.
(이 저장소는 Actions로 배포하므로 `CNAME` 파일은 필요 없습니다.)

### 4-3. 코드에서 주소 바꾸기

`.github/workflows/deploy.yml` 맨 위 `env` 두 줄만 바꿉니다.

```yaml
env:
  SITE_URL: https://quoguri.com
  BASE_PATH: /
```

커밋·푸시하면 사이트맵·RSS·canonical 주소까지 전부 `quoguri.com` 기준으로 다시 만들어집니다.

> 로컬에서 미리 확인하려면: `SITE_URL=https://quoguri.com BASE_PATH=/ npm run build`

---

## 5. 애드센스(Google AdSense) 붙이기

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

**동작 방식**

- `PUBLIC_ADSENSE_CLIENT`가 `ca-pub-` + 숫자 16자리 형식일 때만 스크립트와 광고 슬롯이 렌더링됩니다.
- ID가 없으면 운영 사이트에는 **아무것도 그리지 않습니다**(빈 박스가 남지 않아요). 개발 모드에서만 점선 자리 표시가 보입니다.
- 광고를 더 넣고 싶으면 MDX 글 안에 `<AdSlot />`을 원하는 위치에 넣으면 됩니다.

---

## 6. 쿠팡 파트너스

1. <https://partners.coupang.com> 가입 → 상품 링크(단축 URL)를 만듭니다.
2. 글에서 `<CoupangCard url="https://link.coupang.com/a/xxxxx" … />`로 넣습니다.
3. `PUBLIC_COUPANG_PARTNER_ID` 변수를 넣어 두면 추후 자동 링크 조합에도 쓸 수 있습니다(현재 카드는 `url`을 그대로 사용).

**공정위 문구**는 `src/config.ts`의 `coupang.disclosure`에 있고, 카드와 푸터에 자동으로 표시됩니다. 문구를 바꾸려면 이 파일만 고치면 됩니다.

> 대가성 문구는 글 맨 위 또는 카드 바로 옆에 있어야 합니다. 카드 하단 문구와 함께, 협찬 글이라면 본문 첫머리에도 한 줄 적어 주세요.

---

## 7. SEO · 검색 등록

이미 만들어져 있는 것:

- `sitemap-index.xml` (+ `sitemap-0.xml`) — 자동 생성
- `robots.txt` — 사이트맵 주소 포함 (네이버 Yeti·다음 Daumoa 허용)
- `rss.xml` — RSS 2.0 피드
- 페이지별 `title`·`description`·`canonical`·Open Graph·Twitter 카드
- 글마다 `BlogPosting` + `BreadcrumbList` 구조화 데이터(JSON-LD)
- 검색 페이지(`/search/`) — 빌드 시 만든 정적 인덱스로 동작

**등록할 곳**

1. [Google Search Console](https://search.google.com/search-console) → 속성 추가 → `sitemap-index.xml` 제출
2. [네이버 서치어드바이저](https://searchadvisor.naver.com) → 사이트 등록 → 소유 확인(메타 태그를 `BaseLayout.astro`의 `<head>`에 추가) → 사이트맵 제출
3. [다음 검색등록](https://search.daum.net/search/registration) — RSS(`/rss.xml`) 제출

> 네이버 소유 확인 메타 태그는 `src/layouts/BaseLayout.astro`의 `<head>` 안, `<!-- Open Graph -->` 위에 한 줄로 넣으면 됩니다.

---

## 8. 폴더 구조

```
quoguri-blog/
├─ .github/workflows/deploy.yml   # GitHub Pages 자동 배포
├─ astro.config.mjs               # 사이트 주소·base·마크다운 설정
├─ public/
│  ├─ favicon.svg
│  └─ images/                     # 대표 이미지·커버 (직접 추가)
├─ src/
│  ├─ config.ts                   # ★ 브랜드·카테고리·수익화 ID·SNS 링크
│  ├─ content.config.ts           # 글 frontmatter 스키마
│  ├─ content/blog/               # ★ 글 (.md / .mdx)
│  ├─ components/                 # Header · Footer · PostCard · AdSlot · CoupangCard
│  ├─ layouts/BaseLayout.astro    # <head> SEO·OG·광고 스크립트
│  ├─ lib/                        # 경로·날짜·글 목록 도우미
│  ├─ pages/                      # 홈·글·카테고리·검색·소개·개인정보·RSS·robots
│  └─ styles/global.css           # 디자인 토큰 (색·타이포·컴포넌트)
└─ package.json
```

**자주 고치는 곳**

| 하고 싶은 것 | 파일 |
| --- | --- |
| 블로그 소개 문구·SNS 링크·연락처 | `src/config.ts` |
| 카테고리 이름·색·설명 | `src/config.ts` |
| 색상·글꼴·여백 | `src/styles/global.css` (`:root` 토큰) |
| 애드센스·쿠팡 ID | GitHub 저장소 Variables (또는 `src/config.ts` 기본값) |
| 푸터 고지 문구 | `src/config.ts`의 `coupang.disclosure` |
| 홈 히어로 문구 | `src/pages/index.astro` |

---

## 9. 자주 겪는 문제

| 증상 | 원인 / 해결 |
| --- | --- |
| 배포 후 페이지가 404 | Settings → Pages의 Source가 **GitHub Actions**인지 확인하고, Actions 탭의 배포 성공 여부를 봅니다. |
| CSS가 안 먹음 | `BASE_PATH`가 실제 배포 경로와 다를 때 생깁니다. 프로젝트 페이지는 `/quoguri-blog`, 도메인은 `/`. |
| 본문 링크가 404 | 루트 경로(`/about/`)로 쓰면 자동 변환됩니다. 외부 링크는 `https://`를 붙여 주세요. |
| 글을 올렸는데 안 보임 | `draft: true`이거나 `pubDate`가 미래일 수 있습니다. |
| 광고가 안 나옴 | `PUBLIC_ADSENSE_CLIENT` 형식(`ca-pub-` + 16자리)과 슬롯 ID를 확인하고, 애드센스 승인 상태를 봅니다. |
| 검색이 안 됨 | `/search-index.json`이 배포됐는지 확인합니다(빌드 때 자동 생성). |

---

## 10. 참고

- 디자인·문구는 쿼구리 브랜드 기준으로 작성돼 있습니다. 색을 바꾸려면 `src/styles/global.css`의 `:root` 변수만 고치면 전체에 반영됩니다.
- 현재 글 4편은 형식을 보여 주는 **샘플 글**입니다. 실제 운영 전에 자유롭게 고치거나 지우고 본인 글로 채우세요.
- 라이선스: 콘텐츠 © 쿼구리. 코드는 자유롭게 사용하셔도 됩니다.
