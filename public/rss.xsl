<?xml version="1.0" encoding="UTF-8"?>
<!--
  쿼구리 RSS 피드 스타일시트
  브라우저에서 /rss.xml 을 열면 날것의 XML 대신 이 미리보기 페이지가 보입니다.
  RSS 리더는 이 파일을 무시하고 원래 피드를 그대로 읽습니다.
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" doctype-system="about:legacy-compat" />

  <xsl:template name="format-date">
    <xsl:param name="date" />
    <xsl:variable name="month-name" select="substring($date, 9, 3)" />
    <xsl:variable name="month">
      <xsl:choose>
        <xsl:when test="$month-name = 'Jan'">01</xsl:when>
        <xsl:when test="$month-name = 'Feb'">02</xsl:when>
        <xsl:when test="$month-name = 'Mar'">03</xsl:when>
        <xsl:when test="$month-name = 'Apr'">04</xsl:when>
        <xsl:when test="$month-name = 'May'">05</xsl:when>
        <xsl:when test="$month-name = 'Jun'">06</xsl:when>
        <xsl:when test="$month-name = 'Jul'">07</xsl:when>
        <xsl:when test="$month-name = 'Aug'">08</xsl:when>
        <xsl:when test="$month-name = 'Sep'">09</xsl:when>
        <xsl:when test="$month-name = 'Oct'">10</xsl:when>
        <xsl:when test="$month-name = 'Nov'">11</xsl:when>
        <xsl:when test="$month-name = 'Dec'">12</xsl:when>
        <xsl:otherwise><xsl:value-of select="$month-name" /></xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:value-of select="substring($date, 13, 4)" />.<xsl:value-of select="$month" />.<xsl:value-of select="substring($date, 6, 2)" />
  </xsl:template>

  <xsl:template match="/rss">
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, follow" />
        <title>
          <xsl:value-of select="channel/title" /> · RSS
        </title>
        <style>
          :root {
            color-scheme: light;
            --bg: #fff7e6;
            --panel: #fffefb;
            --ink: #241d15;
            --soft: #5b4c3c;
            --mute: #8c7a63;
            --line: #f0debb;
            --outline: #241d15;
            --pop: #ffd84d;
            --brand: #ff4d67;
            --brand-ink: #c81e3c;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: var(--bg) radial-gradient(circle at 1px 1px, rgba(36, 29, 21, 0.07) 1px, transparent 0);
            background-size: 22px 22px;
            color: var(--ink);
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
            line-height: 1.7;
            letter-spacing: -0.01em;
          }
          .wrap { max-width: 760px; margin: 0 auto; padding: 40px 20px 72px; }
          .feed-head {
            border: 2.5px solid var(--outline);
            border-radius: 28px;
            background: var(--panel);
            box-shadow: 8px 8px 0 var(--outline);
            padding: 30px 28px 26px;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 5px 12px;
            border: 2px solid var(--outline);
            border-radius: 999px;
            background: var(--pop);
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.1em;
            transform: rotate(-2deg);
            box-shadow: 2px 2px 0 var(--outline);
          }
          h1 { margin: 16px 0 6px; font-size: clamp(24px, 5vw, 34px); line-height: 1.25; letter-spacing: -0.04em; }
          .lede { margin: 0; color: var(--soft); font-size: 15px; }
          .meta { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px 14px; font-size: 12.5px; color: var(--mute); }
          .meta a { color: var(--brand-ink); font-weight: 700; }
          .notice {
            margin-top: 22px;
            border: 2px dashed var(--line);
            border-radius: 16px;
            background: #fff2d9;
            padding: 14px 16px;
            font-size: 13.5px;
            color: var(--soft);
          }
          .notice strong { color: var(--ink); }
          h2 {
            margin: 38px 0 14px;
            font-size: 13px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            display: inline-block;
            padding: 5px 12px;
            border: 2px solid var(--outline);
            border-radius: 999px;
            background: var(--pop);
            transform: rotate(-1.4deg);
          }
          .items { display: flex; flex-direction: column; gap: 14px; }
          .item {
            border: 2px solid var(--outline);
            border-radius: 20px;
            background: var(--panel);
            box-shadow: 4px 4px 0 var(--outline);
            padding: 18px 20px;
          }
          .item a.title { color: var(--ink); text-decoration: none; font-weight: 800; font-size: 17.5px; letter-spacing: -0.03em; display: block; }
          .item a.title:hover { color: var(--brand-ink); }
          .item .desc { margin: 7px 0 0; color: var(--soft); font-size: 14px; }
          .item .row { margin-top: 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 11.5px; color: var(--mute); }
          .item time { font-weight: 700; color: var(--ink); }
          .tag {
            border: 1px solid var(--line);
            border-radius: 999px;
            padding: 1px 8px;
            background: #fff2d9;
            color: var(--soft);
          }
          footer { margin-top: 40px; text-align: center; font-size: 12px; color: var(--mute); }
          footer a { color: var(--brand-ink); font-weight: 700; }
          .empty { border: 2px dashed var(--line); border-radius: 18px; padding: 22px; color: var(--mute); }
          @media (max-width: 520px) {
            .feed-head { padding: 22px 20px; box-shadow: 5px 5px 0 var(--outline); }
            .item { padding: 16px; box-shadow: 3px 3px 0 var(--outline); }
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <header class="feed-head">
            <span class="badge">RSS FEED</span>
            <h1>
              <xsl:value-of select="channel/title" />
            </h1>
            <p class="lede">
              <xsl:value-of select="channel/description" />
            </p>
            <div class="meta">
              <span>
                글 <xsl:value-of select="count(channel/item)" />편
              </span>
              <xsl:if test="channel/lastBuildDate">
                <span>
                  마지막 빌드 <xsl:value-of select="channel/lastBuildDate" />
                </span>
              </xsl:if>
              <a href="{channel/link}">블로그로 가기 →</a>
            </div>
            <div class="notice">
              <strong>구독하려면</strong> RSS 리더(Feedly, Inoreader, NetNewsWire 등)에 이 페이지의 주소를 그대로 추가하세요.
              새 글은 발행되는 대로 이 피드에 담깁니다.
            </div>
          </header>

          <h2>Latest posts</h2>

          <xsl:choose>
            <xsl:when test="channel/item">
              <div class="items">
                <xsl:for-each select="channel/item">
                  <article class="item">
                    <a class="title" href="{link}">
                      <xsl:value-of select="title" />
                    </a>
                    <p class="desc">
                      <xsl:value-of select="description" />
                    </p>
                    <div class="row">
                      <time>
                        <xsl:call-template name="format-date">
                          <xsl:with-param name="date" select="pubDate" />
                        </xsl:call-template>
                      </time>
                      <xsl:if test="author">
                        <span>· <xsl:value-of select="author" /></span>
                      </xsl:if>
                      <xsl:for-each select="category">
                        <span class="tag">
                          <xsl:value-of select="." />
                        </span>
                      </xsl:for-each>
                    </div>
                  </article>
                </xsl:for-each>
              </div>
            </xsl:when>
            <xsl:otherwise>
              <p class="empty">아직 피드에 담긴 글이 없어요.</p>
            </xsl:otherwise>
          </xsl:choose>

          <footer>
            <xsl:value-of select="channel/copyright" /> ·
            <a href="{channel/link}rss.xml">이 피드 주소</a>
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
