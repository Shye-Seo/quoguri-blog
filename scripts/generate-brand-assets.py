#!/usr/bin/env python3
"""
브랜드 이미지 생성 — 그림(일러스트) 없이 타이포그래피로만 만듭니다.

    python3 scripts/generate-brand-assets.py

만들어지는 파일
    public/images/og-default.jpg   1200x630  (OG·트위터 카드)
    public/apple-touch-icon.png     180x180  (아이폰 홈화면 아이콘)

폰트는 시스템에 있는 FreeSerif/FreeSans를 씁니다. (없으면 기본 폰트로 대체)
"""
from __future__ import annotations

import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"

BG = (251, 247, 240)
INK = (34, 31, 26)
MUTED = (133, 124, 109)
LINE = (232, 222, 206)
BRAND = (210, 96, 58)

SERIF = "/usr/share/fonts/truetype/freefont/FreeSerif.ttf"
SERIF_BOLD = "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf"
SANS = "/usr/share/fonts/truetype/freefont/FreeSans.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default(size)


def draw_monogram(draw: ImageDraw.ImageDraw, x: int, y: int, size: int, radius_ratio: float = 0.3) -> None:
    """Q 모노그램 — 둥근 사각형 + 원 + 꼬리. (사이트 헤더의 마크와 같은 모양)"""
    draw.rounded_rectangle([x, y, x + size, y + size], radius=int(size * radius_ratio), fill=BRAND)

    inset = size * 0.28
    r = size * 0.21
    cx, cy = x + size / 2 - size * 0.04, y + size / 2 - size * 0.03
    stroke = max(2, int(size * 0.065))
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=BG, width=stroke)
    draw.line(
        [cx + r * 0.62, cy + r * 0.62, cx + r * 1.55, cy + r * 1.75],
        fill=BG,
        width=stroke,
    )


def make_og() -> None:
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    # 얇은 이중 테두리 — 인쇄물 느낌의 여백
    draw.rectangle([40, 40, w - 41, h - 41], outline=LINE, width=2)
    draw.rectangle([56, 56, w - 57, h - 57], outline=LINE, width=1)

    # 상단 라벨
    draw.text((108, 108), "Q U O G U R I   ·   R E V I E W   L O G", font=font(SANS, 22), fill=MUTED)

    # 모노그램 + 워드마크
    draw_monogram(draw, 104, 216, 118)
    draw.text((252, 232), "quoguri", font=font(SERIF, 104), fill=INK)

    # 구분선
    draw.line([108, 400, 108 + 96, 400], fill=BRAND, width=5)

    # 설명 문장 (라틴 문자만)
    draw.text((108, 436), "Notes on things I actually use.", font=font(SERIF, 42), fill=INK)

    # 하단 메타
    draw.text((108, 524), "TECH  ·  BEAUTY  ·  TRAVEL  ·  LIFE", font=font(SANS, 20), fill=MUTED)
    draw.text((w - 108 - 150, 524), "quoguri.com", font=font(SANS, 20), fill=MUTED)

    out = PUBLIC / "images" / "og-default.jpg"
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "JPEG", quality=90, optimize=True, progressive=True)
    print("wrote", out, img.size)


def make_apple_touch() -> None:
    size = 180
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    draw_monogram(draw, 22, 22, size - 44, radius_ratio=0.28)
    out = PUBLIC / "apple-touch-icon.png"
    img.save(out, "PNG", optimize=True)
    print("wrote", out, img.size)


if __name__ == "__main__":
    make_og()
    make_apple_touch()
