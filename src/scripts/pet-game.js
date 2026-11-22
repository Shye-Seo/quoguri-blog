/**
 * 쿼구리 키우기 — /game/quoguri-pet/
 *
 * 서버 없이 브라우저에서만 도는 작은 다마고치입니다.
 *  · 배부름 · 기분 · 기운 세 게이지가 실제 시간에 맞춰 줄어들고
 *  · 잠들면 기운이 다시 차고
 *  · 상태는 localStorage('quoguri-pet-v1')에 남습니다.
 */
(() => {
  const stage = document.querySelector('[data-pet-device]');
  if (!stage) return;

  const KEY = 'quoguri-pet-v1';
  const HOUR = 60 * 60 * 1000;
  /** 시간당 감소량 (깨어 있을 때) */
  const RATE = { fullness: 8, mood: 5, energy: 4 };
  /** 시간당 감소량 (잠들었을 때) */
  const SLEEP_RATE = { fullness: 3, mood: 1, energy: -18 };
  const OFFLINE_CAP_MS = 12 * HOUR;

  const el = {
    actor: document.querySelector('[data-pet-actor]'),
    figure: document.querySelector('.pet-figure'),
    bubble: document.querySelector('[data-pet-bubble]'),
    hearts: document.querySelector('[data-pet-hearts]'),
    days: document.querySelector('[data-pet-days]'),
    care: document.querySelector('[data-pet-care]'),
    hint: document.querySelector('[data-pet-hint]'),
    sleepLabel: document.querySelector('[data-sleep-label]'),
    reset: document.querySelector('[data-pet-reset]'),
    gauges: {},
    buttons: {},
  };
  for (const node of document.querySelectorAll('[data-gauge]')) el.gauges[node.dataset.gauge] = node;
  for (const node of document.querySelectorAll('[data-act]')) el.buttons[node.dataset.act] = node;

  const clamp = (value) => Math.max(0, Math.min(100, value));
  const now = () => Date.now();

  const fresh = () => ({
    fullness: 74,
    mood: 70,
    energy: 82,
    sleeping: false,
    care: 0,
    born: now(),
    lastSeen: now(),
  });

  /** 저장된 값을 읽고, 비어 있는 동안 흐른 시간만큼 게이지를 줄입니다. */
  const load = () => {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      saved = null;
    }
    if (!saved || typeof saved !== 'object') return fresh();

    const state = {
      fullness: Number(saved.fullness ?? 74),
      mood: Number(saved.mood ?? 70),
      energy: Number(saved.energy ?? 82),
      sleeping: Boolean(saved.sleeping),
      care: Number(saved.care ?? 0),
      born: Number(saved.born ?? now()),
      lastSeen: Number(saved.lastSeen ?? now()),
    };

    const elapsed = Math.min(Math.max(now() - state.lastSeen, 0), OFFLINE_CAP_MS);
    const hours = elapsed / HOUR;
    const rate = state.sleeping ? SLEEP_RATE : RATE;
    state.fullness = clamp(state.fullness - rate.fullness * hours);
    state.mood = clamp(state.mood - rate.mood * hours);
    state.energy = clamp(state.energy - rate.energy * hours);
    // 잠깐 자리를 비운 사이 기운이 다 차면 깨어 있는 상태로 돌아옵니다.
    if (state.sleeping && state.energy >= 100) state.sleeping = false;
    return state;
  };

  let state = load();
  let lastTick = now();
  let lastSave = 0;
  let bubbleTimer = 0;
  const cooldowns = {};

  const save = () => {
    state.lastSeen = now();
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* 저장이 막혀도 이번 방문 동안은 그대로 동작합니다. */
    }
  };

  const say = (text, ms = 2600) => {
    if (!el.bubble) return;
    el.bubble.textContent = text;
    el.bubble.classList.add('is-visible');
    window.clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(() => el.bubble.classList.remove('is-visible'), ms);
  };

  const animate = (name) => {
    if (!el.actor) return;
    el.actor.classList.remove('is-jump', 'is-wiggle', 'is-spin');
    // 같은 애니메이션을 연달아 재생하려면 한 프레임 비워야 합니다.
    void el.actor.offsetWidth;
    el.actor.classList.add(name);
    window.setTimeout(() => el.actor.classList.remove(name), 900);
  };

  const hearts = () => {
    if (!el.hearts) return;
    for (let i = 0; i < 3; i += 1) {
      const heart = document.createElement('span');
      heart.className = 'pet-heart';
      heart.textContent = '♥';
      heart.style.setProperty('--hx', `${(i - 1) * 26 + (Math.random() * 10 - 5)}px`);
      heart.style.animationDelay = `${i * 90}ms`;
      el.hearts.append(heart);
      window.setTimeout(() => heart.remove(), 1300);
    }
  };

  const moodKey = () => {
    if (state.sleeping) return 'sleep';
    if (state.energy < 24) return 'drowsy';
    if (state.fullness < 28) return 'hungry';
    if (state.mood < 28) return 'sad';
    return 'happy';
  };

  const HINTS = {
    happy: '지금은 기분이 좋아 보여요.',
    hungry: '배가 고픈 것 같아요. 밥을 줘 볼까요?',
    drowsy: '눈이 스르르 감겨요. 재워 줄 시간이에요.',
    sad: '심심한 것 같아요. 같이 놀아 줄까요?',
    sleep: '쿨쿨 자는 중이에요. 기운이 차면 깨워 주세요.',
  };

  const render = () => {
    for (const key of ['fullness', 'mood', 'energy']) {
      const gauge = el.gauges[key];
      if (!gauge) continue;
      const value = Math.round(state[key]);
      gauge.setAttribute('aria-valuenow', String(value));
      const fill = gauge.firstElementChild;
      if (fill) fill.style.width = `${value}%`;
      gauge.dataset.level = value < 25 ? 'low' : value < 50 ? 'mid' : 'high';
    }

    if (el.figure) el.figure.dataset.mood = moodKey();
    if (el.actor) el.actor.classList.toggle('is-sleeping', state.sleeping);
    if (el.days) el.days.textContent = String(Math.max(1, Math.floor((now() - state.born) / (24 * HOUR)) + 1));
    if (el.care) el.care.textContent = String(state.care);
    if (el.hint) el.hint.textContent = HINTS[moodKey()];
    if (el.sleepLabel) el.sleepLabel.textContent = state.sleeping ? '깨우기' : '재우기';
    if (el.buttons.sleep) el.buttons.sleep.classList.toggle('is-on', state.sleeping);
  };

  const tick = () => {
    const t = now();
    const hours = Math.max(0, t - lastTick) / HOUR;
    lastTick = t;
    if (hours <= 0) return;
    const rate = state.sleeping ? SLEEP_RATE : RATE;
    state.fullness = clamp(state.fullness - rate.fullness * hours);
    state.mood = clamp(state.mood - rate.mood * hours);
    state.energy = clamp(state.energy - rate.energy * hours);
    if (state.sleeping && state.energy >= 100) {
      state.sleeping = false;
      say('기운이 다 찼어! 일어날 시간이야', 3000);
    }
    render();
    if (t - lastSave > 5000) {
      save();
      lastSave = t;
    }
  };

  const cool = (action, ms) => {
    cooldowns[action] = now() + ms;
    const button = el.buttons[action];
    if (!button) return;
    button.disabled = true;
    window.setTimeout(() => {
      button.disabled = false;
    }, ms);
  };

  const ready = (action) => !cooldowns[action] || now() >= cooldowns[action];

  const wake = () => {
    if (!state.sleeping) return false;
    state.sleeping = false;
    say('음… 일어났어', 2200);
    render();
    return true;
  };

  const FEED_LINES = ['냠냠, 맛있어!', '한 입 더!', '배부르다…', '고마워!'];
  const PLAY_LINES = ['신나! 한 번 더!', '이거 재밌어!', '아직 안 졸려!'];
  const PET_LINES = ['기분 좋아…', '또 쓰다듬어 줘', '히히'];

  const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];

  const actions = {
    feed() {
      if (!ready('feed')) return;
      if (wake()) return;
      if (state.fullness >= 97) {
        say('배불러… 조금 뒤에 줄래?', 2400);
        return;
      }
      state.fullness = clamp(state.fullness + 20);
      state.mood = clamp(state.mood + 2);
      state.energy = clamp(state.energy + 1);
      state.care += 1;
      animate('is-jump');
      say(pick(FEED_LINES));
      cool('feed', 1100);
      render();
      save();
    },

    play() {
      if (!ready('play')) return;
      if (state.sleeping) {
        say('자는 중엔 못 놀아… 이따가 놀자', 2400);
        return;
      }
      if (state.energy < 12) {
        say('너무 졸려서 못 놀겠어…', 2400);
        animate('is-wiggle');
        return;
      }
      state.mood = clamp(state.mood + 16);
      state.energy = clamp(state.energy - 9);
      state.fullness = clamp(state.fullness - 3);
      state.care += 1;
      animate('is-spin');
      say(pick(PLAY_LINES));
      cool('play', 1400);
      render();
      save();
    },

    sleep() {
      if (!ready('sleep')) return;
      if (state.sleeping) {
        state.sleeping = false;
        state.mood = clamp(state.mood + 3);
        say('잘 잤어!', 2200);
      } else {
        state.sleeping = true;
        state.care += 1;
        say('쿨쿨… 잘 자요', 2600);
      }
      cool('sleep', 900);
      render();
      save();
    },

    pet() {
      if (!ready('pet')) return;
      if (wake()) return;
      state.mood = clamp(state.mood + 6);
      state.care += 1;
      animate('is-wiggle');
      hearts();
      say(pick(PET_LINES), 2200);
      cool('pet', 800);
      render();
      save();
    },
  };

  for (const [name, button] of Object.entries(el.buttons)) {
    button.addEventListener('click', () => actions[name]?.());
  }

  el.reset?.addEventListener('click', () => {
    const ok = window.confirm('쿼구리 기록을 지우고 처음부터 시작할까요?');
    if (!ok) return;
    state = fresh();
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* 저장소가 막혀 있어도 진행 */
    }
    render();
    say('다시 만나서 반가워!', 2600);
    save();
  });

  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || (target && target.isContentEditable)) return;
    const map = { f: 'feed', n: 'play', s: 'sleep', p: 'pet' };
    const action = map[event.key.toLowerCase()];
    if (!action) return;
    event.preventDefault();
    actions[action]();
  });

  /** 가만히 있으면 한 마디씩 건넵니다. */
  const idle = () => {
    const key = moodKey();
    const lines = {
      happy: ['오늘도 좋은 하루!', '심심해… 놀아 줄래?', '여기 있어서 좋아'],
      hungry: ['배고파… 밥 줘…', '냠냠할 시간 아니야?'],
      drowsy: ['졸려… 재워 줘…', '눈이 감겨…'],
      sad: ['심심해…', '쓰다듬어 줘…'],
      sleep: [],
    };
    const pool = lines[key] || lines.happy;
    if (pool.length) say(pick(pool), 2800);
    window.setTimeout(idle, 26000 + Math.random() * 16000);
  };

  render();
  save();
  window.setInterval(tick, 1000);
  window.setTimeout(idle, 12000);
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      save();
    } else {
      lastTick = now();
    }
  });
})();
