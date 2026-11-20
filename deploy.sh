#!/usr/bin/env bash
# 쿼구리 블로그 — GitHub Pages 배포 스크립트
#
# 사용법:
#   ./deploy.sh                      # 기본값(Shye-Seo/quoguri-blog)으로 배포
#   REPO=내계정/저장소 ./deploy.sh    # 저장소 이름을 바꿔서 배포
#
# 하는 일:
#   1) 아직 git 저장소가 아니면 초기화하고 커밋
#   2) 원격 저장소가 없으면 `gh repo create`로 생성 (권한이 없으면 안내 후 종료)
#   3) main 브랜치 푸시
#   4) GitHub Pages 소스를 "GitHub Actions"로 설정
#   5) Actions 배포가 끝날 때까지 기다린 뒤 라이브 주소를 curl로 확인
set -euo pipefail

REPO="${REPO:-Shye-Seo/quoguri-blog}"
BRANCH="${BRANCH:-main}"
OWNER="${REPO%%/*}"
NAME="${REPO##*/}"
LIVE_URL="https://${OWNER,,}.github.io/${NAME}/"

cd "$(dirname "$0")"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

command -v gh >/dev/null || fail "gh(GitHub CLI)가 필요합니다."
command -v git >/dev/null || fail "git이 필요합니다."

# 1) git 저장소 준비 -------------------------------------------------------
if [ ! -d .git ]; then
  say "1) git 저장소 초기화"
  git init -b "$BRANCH" >/dev/null
fi

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  git add -A
  git commit -m "feat: 쿼구리 블로그 초기 구축" >/dev/null
fi

# 2) 원격 저장소 확인 ------------------------------------------------------
say "2) 원격 저장소 확인: $REPO"
if gh repo view "$REPO" >/dev/null 2>&1; then
  echo "   이미 있습니다."
else
  echo "   저장소가 없어 새로 만듭니다…"
  if ! gh repo create "$REPO" --public \
      --description "쿼구리(quoguri) — 테크·뷰티·여행 리뷰 블로그 (Astro · GitHub Pages)" >/dev/null 2>&1; then
    cat <<EOF
   ✗ 저장소를 만들 권한이 없습니다.
     GitHub에서 직접 만든 뒤 다시 실행해 주세요:
       https://github.com/new  →  이름: $NAME  →  Public  →  README 추가 안 함
EOF
    exit 2
  fi
  echo "   생성 완료."
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "https://github.com/${REPO}.git"
else
  git remote set-url origin "https://github.com/${REPO}.git"
fi

# 3) 푸시 ------------------------------------------------------------------
say "3) $BRANCH 브랜치 푸시"
git push -u origin "$BRANCH"

# 4) Pages 소스 설정 -------------------------------------------------------
say "4) GitHub Pages 설정 (Source: GitHub Actions)"
if gh api "repos/${REPO}/pages" >/dev/null 2>&1; then
  gh api -X PUT "repos/${REPO}/pages" -f build_type=workflow >/dev/null 2>&1 || true
  echo "   기존 Pages 설정을 확인했습니다."
else
  if gh api -X POST "repos/${REPO}/pages" -f build_type=workflow >/dev/null 2>&1; then
    echo "   Pages를 켰습니다."
  else
    echo "   ⚠ Pages를 자동으로 켜지 못했습니다."
    echo "     Settings → Pages → Build and deployment → Source를 'GitHub Actions'로 바꿔 주세요."
  fi
fi

# 5) 배포 대기 + 확인 ------------------------------------------------------
say "5) 배포 대기 (최대 5분)"
for i in $(seq 1 30); do
  sleep 10
  STATUS="$(gh run list -R "$REPO" --limit 1 --json status,conclusion -q '.[0] | "\(.status):\(.conclusion)"' 2>/dev/null || echo "queued:")"
  echo "   [$((i * 10))s] $STATUS"
  case "$STATUS" in
    completed:success) break ;;
    completed:*) fail "배포가 실패했습니다. gh run view -R $REPO --log-failed 로 확인하세요." ;;
  esac
done

say "6) 라이브 확인"
for i in $(seq 1 12); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' -L "$LIVE_URL" || echo 000)"
  echo "   $LIVE_URL → HTTP $CODE"
  [ "$CODE" = "200" ] && { say "✅ 배포 완료: $LIVE_URL"; exit 0; }
  sleep 10
done

fail "페이지가 아직 200을 주지 않습니다. Actions 탭에서 배포 상태를 확인해 주세요."
