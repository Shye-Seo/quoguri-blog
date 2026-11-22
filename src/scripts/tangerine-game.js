/**
 * 쿼구리 귤 받기 — /game/tangerine-rush/
 *
 * 캔버스로 그리는 60초 아케이드입니다.
 *  · 귤 +10 · 황금별 +50 · 폭탄 −20, 5개마다 콤보 배수
 *  · 드래그 · ← → · 화면 버튼으로 바구니를 움직입니다
 *  · 최고 기록은 localStorage('quoguri-tangerine-best-v1')에 남습니다
 */
(() => {
  const canvas = document.querySelector('[data-arcade-canvas]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const root = canvas.closest('.arcade');
  const el = {
    score: document.querySelector('[data-arcade-score]'),
    combo: document.querySelector('[data-arcade-combo]'),
    comboWrap: document.querySelector('[data-arcade-combo-wrap]'),
    time: document.querySelector('[data-arcade-time]'),
    best: document.querySelector('[data-arcade-best]'),
    start: document.querySelector('[data-arcade-start]'),
    overlay: document.querySelector('[data-arcade-overlay]'),
    panelLabel: document.querySelector('[data-arcade-panel-label]'),
    panelTitle: document.querySelector('[data-arcade-panel-title]'),
    panelText: document.querySelector('[data-arcade-panel-text]'),
    status: document.querySelector('[data-arcade-status]'),
    sound: document.querySelector('[data-arcade-sound]'),
    dirs: [...document.querySelectorAll('[data-arcade-dir]')],
  };

  const DURATION = 60;
  const BEST_KEY = 'quoguri-tangerine-best-v1';
  const SOUND_KEY = 'quoguri-tangerine-sound-v1';

  let W = 0;
  let H = 0;
  let dpr = 1;

  /** idle · playing · over */
  let phase = 'idle';
  let score = 0;
  let best = 0;
  let combo = 0;
  let comboMax = 0;
  let elapsed = 0;
  let basketX = 0.5;
  let targetX = 0.5;
  let dir = 0;
  let items = [];
  let particles = [];
  let spawnTimer = 0;
  let shake = 0;
  let paused = false;
  let lastFrame = 0;
  let hudClock = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rand = (min, max) => min + Math.random() * (max - min);

  try {
    best = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
  } catch {
    best = 0;
  }
  if (el.best) el.best.textContent = String(best);

  /* ── 소리 ─────────────────────────────────────────────── */
  let soundOn = true;
  try {
    soundOn = localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    soundOn = true;
  }
  let audio = null;

  const paintSound = () => {
    if (!el.sound) return;
    el.sound.setAttribute('aria-pressed', String(soundOn));
    el.sound.setAttribute('aria-label', soundOn ? '소리 끄기' : '소리 켜기');
    el.sound.textContent = soundOn ? '🔊 소리' : '🔇 소리';
  };

  const beep = (freq, duration = 0.09, type = 'sine', volume = 0.05) => {
    if (!soundOn) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audio = audio || new AudioCtx();
      if (audio.state === 'suspended') audio.resume();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
      osc.stop(audio.currentTime + duration + 0.02);
    } catch {
      /* 소리를 못 내도 게임은 그대로 진행합니다. */
    }
  };

  paintSound();
  el.sound?.addEventListener('click', () => {
    soundOn = !soundOn;
    try {
      localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off');
    } catch {
      /* 무시 */
    }
    paintSound();
    if (soundOn) beep(720);
  });

  /* ── 크기 ─────────────────────────────────────────────── */
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(240, rect.width);
    H = Math.max(240, rect.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  resize();
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => resize()).observe(canvas);
  } else {
    window.addEventListener('resize', resize);
  }

  const basket = () => {
    const bw = clamp(W * 0.24, 72, 122);
    const bh = bw * 0.6;
    return { bw, bh, top: H - bh - Math.max(10, H * 0.03) };
  };

  const itemRadius = () => clamp(W * 0.034, 11, 21);

  /* ── 아이템 ───────────────────────────────────────────── */
  const spawn = () => {
    const progress = clamp(elapsed / DURATION, 0, 1);
    const r = itemRadius() * rand(0.85, 1.15);
    const roll = Math.random();
    const bombShare = 0.16 + progress * 0.12;
    const goldShare = 0.08;
    const type = roll < goldShare ? 'gold' : roll < goldShare + bombShare ? 'bomb' : 'tangerine';
    items.push({
      type,
      x: rand(r + 8, W - r - 8),
      y: -r - 4,
      r: type === 'gold' ? r * 0.92 : r,
      vy: (0.34 + Math.random() * 0.12 + progress * 0.3) * H,
      rot: rand(-0.4, 0.4),
      spin: rand(-1.2, 1.2),
    });
  };

  const burst = (x, y, color, count = 9) => {
    for (let i = 0; i < count; i += 1) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(40, 190);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: rand(0.35, 0.7),
        age: 0,
        r: rand(1.5, 3.4),
        color,
      });
    }
  };

  const flash = (text) => {
    if (el.status) el.status.textContent = text;
  };

  const multiplier = () => 1 + Math.min(4, Math.floor(combo / 5));

  const scorePoints = (base) => {
    const points = base * multiplier();
    score += points;
    return points;
  };

  /* ── 진행 ─────────────────────────────────────────────── */
  const startGame = () => {
    phase = 'playing';
    score = 0;
    combo = 0;
    comboMax = 0;
    elapsed = 0;
    items = [];
    particles = [];
    spawnTimer = 0.35;
    shake = 0;
    basketX = 0.5;
    targetX = 0.5;
    paused = false;
    lastFrame = performance.now();
    el.overlay?.classList.add('is-hidden');
    root?.classList.add('is-playing');
    if (el.comboWrap) el.comboWrap.hidden = true;
    flash('귤을 받아요! 폭탄은 피하고요.');
    beep(880, 0.12, 'triangle', 0.05);
    syncHud(true);
  };

  const endGame = () => {
    phase = 'over';
    root?.classList.remove('is-playing');
    const isBest = score > best;
    if (isBest) {
      best = score;
      try {
        localStorage.setItem(BEST_KEY, String(best));
      } catch {
        /* 무시 */
      }
    }
    if (el.best) el.best.textContent = String(best);
    if (el.panelLabel) el.panelLabel.textContent = isBest ? '새 최고 기록!' : '한 판 끝';
    if (el.panelTitle) el.panelTitle.textContent = `${score}점`;
    if (el.panelText) {
      el.panelText.innerHTML = `최고 ${best}점 · 최고 콤보 ${comboMax}<br />${
        isBest ? '오늘 제일 잘했어요. 한 번 더?' : '한 판 더 하면 더 잘할 수 있어요.'
      }`;
    }
    if (el.start) el.start.textContent = '다시 하기';
    el.overlay?.classList.remove('is-hidden');
    flash(`한 판 끝! ${score}점이에요. 최고 기록은 ${best}점.`);
    beep(520, 0.14, 'triangle', 0.05);
    window.setTimeout(() => beep(392, 0.2, 'triangle', 0.05), 140);
    syncHud(true);
  };

  const update = (dt) => {
    if (phase === 'playing') {
      elapsed += dt;
      if (elapsed >= DURATION) {
        elapsed = DURATION;
        endGame();
        return;
      }

      const b = basket();
      const speed = 1.05;
      if (dir !== 0) {
        basketX = clamp(basketX + dir * speed * dt, 0.04, 0.96);
        targetX = basketX;
      } else {
        basketX += (targetX - basketX) * Math.min(1, dt * 16);
      }

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawn();
        if (Math.random() < 0.18) spawn();
        const progress = elapsed / DURATION;
        spawnTimer = rand(0.62, 0.8) - progress * 0.3;
      }

      for (const item of items) {
        item.y += item.vy * dt;
        item.rot += item.spin * dt;
      }

      const catchY = b.top + b.bh * 0.35;
      const basketPx = basketX * W;

      items = items.filter((item) => {
        if (item.y + item.r < catchY) return true;

        const caught =
          item.y - item.r < b.top + b.bh &&
          item.y + item.r > b.top - b.bh * 0.35 &&
          Math.abs(item.x - basketPx) < b.bw / 2 + item.r * 0.55;

        if (caught) {
          if (item.type === 'bomb') {
            score = Math.max(0, score - 20);
            combo = 0;
            shake = 0.4;
            burst(item.x, item.y, '#3A3A34', 12);
            flash('폭탄! 콤보가 끊겼어요.');
            beep(110, 0.18, 'sawtooth', 0.06);
          } else if (item.type === 'gold') {
            const points = scorePoints(50);
            combo += 1;
            comboMax = Math.max(comboMax, combo);
            burst(item.x, item.y, '#E8C24E', 16);
            flash(`황금별! +${points}`);
            beep(1180, 0.09, 'triangle', 0.05);
            window.setTimeout(() => beep(1480, 0.1, 'triangle', 0.045), 70);
          } else {
            const points = scorePoints(10);
            combo += 1;
            comboMax = Math.max(comboMax, combo);
            burst(item.x, item.y, '#EF9F4A', 9);
            flash(`귤 +${points}${combo >= 5 ? ` · 콤보 ${combo}` : ''}`);
            beep(660 + Math.min(combo, 12) * 26, 0.06, 'sine', 0.045);
          }
          return false;
        }

        if (item.y - item.r > H) {
          if (item.type !== 'bomb') combo = 0;
          return false;
        }
        return true;
      });

      if (el.comboWrap) {
        el.comboWrap.hidden = combo < 2;
        if (el.combo) el.combo.textContent = String(combo);
      }
    } else if (phase === 'idle') {
      // 시작 전에는 배경에서 귤이 천천히 흐릅니다.
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        const r = itemRadius();
        items.push({
          type: Math.random() < 0.12 ? 'gold' : 'tangerine',
          x: rand(r + 8, W - r - 8),
          y: -r,
          r,
          vy: (0.16 + Math.random() * 0.1) * H,
          rot: rand(-0.4, 0.4),
          spin: rand(-0.8, 0.8),
        });
        spawnTimer = rand(1.1, 1.8);
      }
      for (const item of items) {
        item.y += item.vy * dt;
        item.rot += item.spin * dt;
      }
      items = items.filter((item) => item.y - item.r < H + 20);
    }

    for (const particle of particles) {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 640 * dt;
      particle.vx *= 0.98;
    }
    particles = particles.filter((particle) => particle.age < particle.life);
    if (shake > 0) shake = Math.max(0, shake - dt * 2.4);
  };

  /* ── 그리기 ───────────────────────────────────────────── */
  const roundRect = (x, y, w, h, radii) => {
    const [tl, tr, br, bl] = radii;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  };

  const drawTangerine = (item) => {
    const { x, y, r, rot } = item;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#EF9F4A';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#DE8B36';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.32, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.92);
    ctx.quadraticCurveTo(r * 0.9, -r * 1.5, r * 1.05, -r * 0.8);
    ctx.quadraticCurveTo(r * 0.4, -r * 0.72, 0, -r * 0.92);
    ctx.fillStyle = '#8CA181';
    ctx.fill();
    ctx.restore();
  };

  const drawGold = (item) => {
    const { x, y, r, rot } = item;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.shadowColor = 'rgba(232,194,78,0.6)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const outer = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const inner = outer + Math.PI / 5;
      ctx.lineTo(Math.cos(outer) * r * 1.15, Math.sin(outer) * r * 1.15);
      ctx.lineTo(Math.cos(inner) * r * 0.5, Math.sin(inner) * r * 0.5);
    }
    ctx.closePath();
    ctx.fillStyle = '#E8C24E';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#D3A732';
    ctx.stroke();
    ctx.restore();
  };

  const drawBomb = (item) => {
    const { x, y, r } = item;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#3A3A34';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.32, r * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.42, -r * 0.8);
    ctx.quadraticCurveTo(r * 1.15, -r * 1.45, r * 1.45, -r * 0.75);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#8A7A63';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 1.5, -r * 0.72, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#E8C24E';
    ctx.fill();
    ctx.restore();
  };

  const drawBasket = () => {
    const { bw, bh, top } = basket();
    const cx = basketX * W;
    ctx.save();
    ctx.translate(cx, top);
    // 손잡이 그늘
    ctx.beginPath();
    ctx.ellipse(0, bh * 0.98, bw * 0.36, bh * 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(58,58,52,0.07)';
    ctx.fill();
    // 귀
    ctx.beginPath();
    ctx.ellipse(-bw * 0.3, -bh * 0.05, bw * 0.11, bh * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F2E1C6';
    ctx.strokeStyle = '#DEC9A6';
    ctx.lineWidth = 1.6;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(bw * 0.3, -bh * 0.05, bw * 0.11, bh * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 몸통
    roundRect(-bw / 2, 0, bw, bh, [bh * 0.28, bh * 0.28, bh * 0.42, bh * 0.42]);
    ctx.fillStyle = '#F8EAD2';
    ctx.fill();
    ctx.strokeStyle = '#E1CCAA';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // 짜임
    ctx.beginPath();
    for (let i = 1; i <= 3; i += 1) {
      const y = (bh / 4) * i;
      ctx.moveTo(-bw / 2 + 6, y);
      ctx.lineTo(bw / 2 - 6, y);
    }
    ctx.strokeStyle = 'rgba(225,204,170,0.85)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // 얼굴
    const eyeY = bh * 0.36;
    const eyeX = bw * 0.19;
    ctx.beginPath();
    ctx.arc(-eyeX, eyeY, Math.max(2, bw * 0.03), 0, Math.PI * 2);
    ctx.arc(eyeX, eyeY, Math.max(2, bw * 0.03), 0, Math.PI * 2);
    ctx.fillStyle = '#3B3A32';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-bw * 0.31, eyeY + bh * 0.12, bw * 0.05, 0, Math.PI * 2);
    ctx.arc(bw * 0.31, eyeY + bh * 0.12, bw * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(242,182,188,0.7)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-bw * 0.06, eyeY + bh * 0.12);
    ctx.quadraticCurveTo(0, eyeY + bh * 0.22, bw * 0.06, eyeY + bh * 0.12);
    ctx.strokeStyle = '#3B3A32';
    ctx.lineWidth = Math.max(1.4, bw * 0.018);
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  };

  const draw = () => {
    ctx.save();
    if (shake > 0) {
      ctx.translate(rand(-1, 1) * shake * 9, rand(-1, 1) * shake * 9);
    }

    // 배경 종이
    ctx.fillStyle = '#FBF7EE';
    ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.strokeStyle = '#F0E8D8';
    ctx.lineWidth = 1;
    const gap = Math.max(38, H / 9);
    for (let y = gap; y < H; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // 바닥
    const { top } = basket();
    ctx.fillStyle = '#F2E9D8';
    ctx.fillRect(0, top + basket().bh + 4, W, H);
    ctx.strokeStyle = '#E7DCC7';
    ctx.beginPath();
    ctx.moveTo(0, top + basket().bh + 4);
    ctx.lineTo(W, top + basket().bh + 4);
    ctx.stroke();

    for (const item of items) {
      if (item.type === 'gold') drawGold(item);
      else if (item.type === 'bomb') drawBomb(item);
      else drawTangerine(item);
    }

    if (phase !== 'idle') drawBasket();

    for (const particle of particles) {
      const alpha = 1 - particle.age / particle.life;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  const syncHud = (force = false) => {
    if (el.score) el.score.textContent = String(score);
    if (el.time) el.time.textContent = String(Math.max(0, Math.ceil(DURATION - elapsed)));
    const t = performance.now();
    if (force || t - hudClock > 120) {
      hudClock = t;
      canvas.dataset.state = phase;
      canvas.dataset.score = String(score);
      canvas.dataset.timeLeft = String(Math.max(0, Math.ceil(DURATION - elapsed)));
      canvas.dataset.basketX = basketX.toFixed(3);
    }
  };

  const frame = (time) => {
    const dt = Math.min(Math.max((time - lastFrame) / 1000, 0), 0.05);
    lastFrame = time;
    if (!paused) update(dt);
    draw();
    syncHud();
    window.requestAnimationFrame(frame);
  };

  /* ── 입력 ─────────────────────────────────────────────── */
  let dragging = false;

  const pointerTo = (clientX) => {
    const rect = canvas.getBoundingClientRect();
    targetX = clamp((clientX - rect.left) / rect.width, 0.04, 0.96);
  };

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    canvas.setPointerCapture?.(event.pointerId);
    pointerTo(event.clientX);
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    pointerTo(event.clientX);
    event.preventDefault();
  });
  const endDrag = () => {
    dragging = false;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', endDrag);

  const KEY_LEFT = new Set(['ArrowLeft', 'a', 'A']);
  const KEY_RIGHT = new Set(['ArrowRight', 'd', 'D']);

  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea') return;
    if (KEY_LEFT.has(event.key)) {
      dir = -1;
      event.preventDefault();
    } else if (KEY_RIGHT.has(event.key)) {
      dir = 1;
      event.preventDefault();
    } else if (event.key === ' ' || event.key === 'Enter') {
      if (phase !== 'playing') {
        event.preventDefault();
        startGame();
      }
    }
  });

  document.addEventListener('keyup', (event) => {
    if (KEY_LEFT.has(event.key) && dir === -1) dir = 0;
    if (KEY_RIGHT.has(event.key) && dir === 1) dir = 0;
  });

  for (const button of el.dirs) {
    const value = button.dataset.arcadeDir === 'left' ? -1 : 1;
    const press = (event) => {
      event.preventDefault();
      dir = value;
    };
    const release = () => {
      if (dir === value) dir = 0;
    };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('pointercancel', release);
  }

  el.start?.addEventListener('click', startGame);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      paused = true;
    } else {
      paused = false;
      lastFrame = performance.now();
    }
  });

  /* ── 시작 ─────────────────────────────────────────────── */
  // 시작 전 화면이 비어 보이지 않게 귤 몇 개를 띄어 둡니다.
  for (let i = 0; i < 5; i += 1) {
    const r = itemRadius();
    items.push({
      type: Math.random() < 0.14 ? 'gold' : 'tangerine',
      x: rand(r + 10, W - r - 10),
      y: rand(0, H * 0.62),
      r,
      vy: (0.13 + Math.random() * 0.08) * H,
      rot: rand(-0.4, 0.4),
      spin: rand(-0.7, 0.7),
    });
  }
  spawnTimer = rand(0.8, 1.6);
  lastFrame = performance.now();
  window.requestAnimationFrame(frame);
})();
