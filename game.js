// タイピング: terms fall from the top of the screen and are cleared by typing
// their reading or meaning before they reach the bottom; a term that reaches
// the bottom counts as wrong. Tiles use the app's question colours: pink for
// the kanji itself (音読み and meaning), purple for its word, teal for its
// noun; a custom deck's readings are pink and its meanings purple. Each term
// is a karuta card with a border in that colour, its term running top to bottom.
(() => {
  "use strict";

  const SETTINGS_KEY = "kanjiFlashN2.settings.v1";
  const CUSTOM_DECKS_KEY = "kanjiFlashN2.customDecks.v1";
  const GAME_KEY = "kanjiFlashN2.fallingGame.v1";
  const LEECHES_KEY = "kanjiFlashN2.leeches.v1";
  const KANJI_REMOVALS_KEY = "kanjiFlashN2.kanjiRemovals.v1";
  const N2_DECK = "n2-kanji";
  const LEECH_DECK = "leech";

  const READING_LABEL_PATTERN = /読み|よみ|reading|kana|ふりがな/i;
  const MEANING_LABEL_PATTERN = /意味|いみ|meaning|definition|english/i;

  // Seconds a tile takes to fall the height of the field at the start.
  const FALL_SECONDS = { slow: 15, normal: 10.5, fast: 7 };
  // About this many terms on screen at a time, and never more than the cap.
  const TARGET_ON_SCREEN = 2;
  const MAX_ON_SCREEN = 3;
  const MAX_SPEEDUP = 1.8;

  const $ = (id) => document.getElementById(id);
  const els = {
    setup: $("screen-setup"),
    play: $("screen-play"),
    results: $("screen-results"),
    deckSelect: $("deckSelect"),
    typeSeg: $("typeSeg"),
    countSeg: $("countSeg"),
    speedSeg: $("speedSeg"),
    deckNote: $("deckNote"),
    startBtn: $("startBtn"),
    field: $("field"),
    input: $("answerInput"),
    inputForm: $("inputForm"),
    kanaPreview: $("kanaPreview"),
    hudScore: $("hudScore"),
    hudCombo: $("hudCombo"),
    hudRight: $("hudRight"),
    hudWrong: $("hudWrong"),
    hudLeft: $("hudLeft"),
    pauseBtn: $("pauseBtn"),
    pauseOverlay: $("pauseOverlay"),
    resumeBtn: $("resumeBtn"),
    quitBtn: $("quitBtn"),
    countdown: $("countdown"),
    resultScore: $("resultScore"),
    resultLine: $("resultLine"),
    againBtn: $("againBtn"),
    missesBtn: $("missesBtn"),
    setupBtn: $("setupBtn"),
    missHeading: $("missHeading"),
    missList: $("missList"),
  };

  function loadJson(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "null");
      return v == null ? fallback : v;
    } catch (err) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* storage unavailable */
    }
  }

  // The same theme as the rest of the app.
  const appSettings = loadJson(SETTINGS_KEY, {}) || {};
  document.documentElement.setAttribute("data-theme", appSettings.theme || "dark");
  if (appSettings.fontScale) document.documentElement.style.setProperty("--font-scale", appSettings.fontScale);

  const prefs = Object.assign({ deck: N2_DECK, type: "all", count: 20, speed: "normal", best: {} }, loadJson(GAME_KEY, {}));
  const savePrefs = () => saveJson(GAME_KEY, prefs);

  // Keep the answer bar above a phone's on-screen keyboard.
  function fitViewport() {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty("--app-h", `${h}px`);
    if (window.visualViewport) window.scrollTo(0, 0);
  }
  fitViewport();
  (window.visualViewport || window).addEventListener("resize", fitViewport);

  // ---------- answers ----------

  const hasWanakana = () => typeof wanakana !== "undefined";
  const toHira = (s, ime) => (hasWanakana() ? wanakana.toHiragana(s, ime ? { IMEMode: true } : undefined) : s);
  const isKanaOrKanji = (s) => /[぀-ヿ一-鿿]/.test(s);
  const isLatin = (s) => /[a-z]/i.test(s) && !isKanaOrKanji(s);
  const normalize = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const stripParens = (t) => t.replace(/\s*[(（][^)）]*[)）]/g, "").replace(/\s+/g, " ").trim();

  function splitOutsideParens(text, separators) {
    const parts = [];
    let depth = 0;
    let current = "";
    for (const ch of text) {
      if (ch === "(" || ch === "（") depth++;
      else if ((ch === ")" || ch === "）") && depth > 0) depth--;
      if (depth === 0 && separators.includes(ch)) {
        parts.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    parts.push(current);
    return parts;
  }

  function pluralVariants(word) {
    const out = [];
    if (/[^aeiou]y$/.test(word)) out.push(word.slice(0, -1) + "ies");
    else if (/(s|x|z|ch|sh)$/.test(word)) out.push(word + "es");
    else if (!word.endsWith("s")) out.push(word + "s");
    if (word.endsWith("ies") && word.length > 3) out.push(word.slice(0, -3) + "y");
    else if (word.endsWith("s") && !word.endsWith("ss")) out.push(word.slice(0, -1));
    return out;
  }

  // Any one reading counts; okurigana in parentheses may be typed or left out.
  function readingAnswers(value) {
    const set = new Set();
    value
      .split(/[,、;；・/]/)
      .map((t) => t.replace(/[-.－‐]/g, "").trim())
      .filter(Boolean)
      .forEach((t) => {
        [t.replace(/[()（）]/g, ""), t.replace(/[(（][^)）]*[)）]/g, "")].forEach((v) => {
          if (v) set.add(toHira(normalize(v)));
        });
      });
    return set;
  }

  // Any one gloss counts, with or without "to" and parenthetical notes.
  function meaningAnswers(value) {
    const set = new Set();
    const add = (t) => {
      if (!t) return;
      set.add(t);
      if (isLatin(t)) pluralVariants(t).forEach((v) => set.add(v));
      else set.add(toHira(t));
    };
    [value, ...splitOutsideParens(value, ";,、")].forEach((part) => {
      const t = normalize(part);
      const bare = stripParens(t);
      [t, bare, t.replace(/^to\s+/, ""), bare.replace(/^to\s+/, "")].forEach(add);
    });
    return set;
  }

  function levenshtein(a, b) {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const curr = [i];
      for (let j = 1; j <= b.length; j++) {
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = curr;
    }
    return prev[b.length];
  }

  const typoThreshold = (len) => (len <= 3 ? 0 : len <= 7 ? 1 : 2);

  // ---------- decks and questions ----------

  let n2Deck = null;
  const customDecks = (loadJson(CUSTOM_DECKS_KEY, []) || []).filter((d) => d && Array.isArray(d.cards));
  // Leeches (リーチ), across all decks: { "n2|<num>" or "<deckId>|<front>": { leech, ... } }.
  const leeches = loadJson(LEECHES_KEY, {}) || {};
  // N2 kanji removed in 編集: { num: { removed } }.
  const kanjiRemovals = loadJson(KANJI_REMOVALS_KEY, {}) || {};
  const visibleKanji = () => (n2Deck || []).filter((k) => !(kanjiRemovals[k.num] && kanjiRemovals[k.num].removed));

  function kanjiQuestions(e) {
    const qs = [];
    const add = (id, term, label, tone, kind, value) => {
      if (!value) return;
      qs.push({
        id: `${e.num}:${id}`,
        term,
        label,
        tone,
        kind,
        display: value,
        answers: kind === "reading" ? readingAnswers(value) : meaningAnswers(value),
      });
    };
    // Pink: the kanji itself. Purple: its word. Teal: its noun (as in the app).
    add("onyomi", e.kanji, "音読み", "pink", "reading", e.onyomi);
    add("meaning", e.kanji, "Meaning", "pink", "meaning", e.meaning);
    if (e.word) {
      add("wordReading", e.word, "単語の読み方", "purple", "reading", e.wordReading);
      add("wordMeaning", e.word, "Word meaning", "purple", "meaning", e.wordMeaning);
    }
    if (e.noun) {
      add("nounReading", e.noun, "訓読み", "teal", "reading", e.nounReading);
      add("nounMeaning", e.noun, "Noun meaning", "teal", "meaning", e.nounMeaning);
    }
    return qs;
  }

  function customQuestions(deck, keepCard) {
    const qs = [];
    deck.cards.forEach((card, ci) => {
      if (keepCard && !keepCard(card)) return;
      (card.sections || []).forEach((s, si) => {
        if (!s || !s.value || !String(s.value).trim()) return;
        const value = String(s.value);
        const kind = READING_LABEL_PATTERN.test(s.label) ? "reading" : MEANING_LABEL_PATTERN.test(s.label) ? "meaning" : "other";
        let label = s.label;
        if (kind === "reading") label = "読み方";
        else if (kind === "meaning" && !isKanaOrKanji(value)) label = "Meaning";
        const answers = kind === "reading" ? readingAnswers(value) : meaningAnswers(value);
        qs.push({
          id: `${deck.id}:${ci}:${si}`,
          term: card.front,
          label,
          tone: kind === "reading" ? "pink" : kind === "meaning" ? "purple" : "plain",
          kind,
          display: value,
          answers,
        });
      });
    });
    return qs;
  }

  // Every question of each current leech that still exists in its deck, as
  // in the app's own リーチ review. `terms` counts the leeches found.
  function leechQuestions() {
    const qs = [];
    let terms = 0;
    const customFronts = new Map();
    Object.keys(leeches).forEach((key) => {
      if (!leeches[key] || !leeches[key].leech) return;
      const sep = key.indexOf("|");
      const owner = key.slice(0, sep);
      const id = key.slice(sep + 1);
      if (owner === "n2") {
        const e = visibleKanji().find((k) => String(k.num) === id);
        if (e) {
          terms++;
          qs.push(...kanjiQuestions(e));
        }
      } else if (customDecks.some((d) => d.id === owner)) {
        if (!customFronts.has(owner)) customFronts.set(owner, new Set());
        customFronts.get(owner).add(id);
      }
    });
    customFronts.forEach((fronts, deckId) => {
      const deck = customDecks.find((d) => d.id === deckId);
      const found = new Set();
      qs.push(
        ...customQuestions(deck, (card) => {
          if (!fronts.has(card.front)) return false;
          found.add(card.front);
          return true;
        })
      );
      terms += found.size;
    });
    return { qs, terms };
  }

  function questionsFor(deckId) {
    if (deckId === N2_DECK) return visibleKanji().flatMap(kanjiQuestions);
    if (deckId === LEECH_DECK) return leechQuestions().qs;
    const deck = customDecks.find((d) => d.id === deckId);
    return deck ? customQuestions(deck) : [];
  }

  function filteredQuestions() {
    const all = questionsFor(prefs.deck);
    return prefs.type === "all" ? all : all.filter((q) => q.kind === prefs.type);
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- setup screen ----------

  function showScreen(name) {
    els.setup.hidden = name !== "setup";
    els.play.hidden = name !== "play";
    els.results.hidden = name !== "results";
  }

  function renderDeckSelect() {
    els.deckSelect.innerHTML = "";
    // The leech count needs the N2 deck, so it shows once that has loaded.
    const leechName = n2Deck ? `リーチ（${leechQuestions().terms}）` : "リーチ";
    const options = [
      { id: N2_DECK, name: "N2 漢字" },
      ...customDecks.map((d) => ({ id: d.id, name: d.name || "デッキ" })),
      { id: LEECH_DECK, name: leechName },
    ];
    options.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.id;
      opt.textContent = o.name;
      els.deckSelect.appendChild(opt);
    });
    if (!options.some((o) => o.id === prefs.deck)) prefs.deck = N2_DECK;
    els.deckSelect.value = prefs.deck;
  }

  function bindSeg(seg, key, parse) {
    const render = () =>
      seg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", String(prefs[key]) === b.dataset.value));
    seg.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      prefs[key] = parse ? parse(b.dataset.value) : b.dataset.value;
      savePrefs();
      render();
      renderSetupNote();
    });
    render();
  }

  function renderSetupNote() {
    const n = filteredQuestions().length;
    const best = prefs.best[prefs.deck];
    els.deckNote.textContent = n
      ? (prefs.count === "all" ? `全 ${n} 問` : `${n} 問から ${Math.min(n, prefs.count)} 問`) + (best ? ` · ベスト ${best.toLocaleString()}` : "")
      : !n2Deck && (prefs.deck === N2_DECK || prefs.deck === LEECH_DECK)
        ? "読み込み中…"
        : prefs.deck === LEECH_DECK
          ? "リーチのカードはありません。"
          : "このデッキには出せる問題がありません。";
    els.startBtn.disabled = n === 0;
  }

  els.deckSelect.addEventListener("change", () => {
    prefs.deck = els.deckSelect.value;
    savePrefs();
    renderSetupNote();
  });
  bindSeg(els.typeSeg, "type");
  // 全部: every question of the deck, once each.
  bindSeg(els.countSeg, "count", (v) => (v === "all" ? "all" : Number(v)));
  bindSeg(els.speedSeg, "speed");

  // ---------- the game ----------

  let game = null;
  let rafId = 0;

  function newGame(questions) {
    game = {
      questions,
      queue: questions.slice(),
      tiles: [],
      results: [],
      score: 0,
      combo: 0,
      bestCombo: 0,
      right: 0,
      wrong: 0,
      lastSpawn: -Infinity,
      clock: 0,
      lastTs: 0,
      paused: false,
      starting: true,
      over: false,
    };
    els.field.querySelectorAll(".tile, .float-points").forEach((n) => n.remove());
    els.input.value = "";
    els.kanaPreview.textContent = "";
    els.pauseOverlay.hidden = true;
    renderHud();
    showScreen("play");
    els.input.focus();
    runCountdown();
  }

  function startRound(questions) {
    newGame(prefs.count === "all" ? shuffle(questions) : shuffle(questions).slice(0, prefs.count));
  }

  function runCountdown() {
    let n = 3;
    els.countdown.hidden = false;
    els.countdown.textContent = n;
    const step = () => {
      if (!game || !game.starting) return;
      n--;
      if (n > 0) {
        els.countdown.textContent = n;
        game.countdownTimer = setTimeout(step, 650);
      } else {
        els.countdown.hidden = true;
        game.starting = false;
        game.lastTs = 0;
        rafId = requestAnimationFrame(frame);
      }
    };
    game.countdownTimer = setTimeout(step, 650);
  }

  // Speeds up a little with every term that is answered or missed.
  const speedUp = () => Math.min(MAX_SPEEDUP, 1 + 0.025 * (game.right + game.wrong));

  function frame(ts) {
    if (!game || game.over) return;
    if (game.paused) {
      game.lastTs = 0;
      return;
    }
    const dt = game.lastTs ? Math.min(ts - game.lastTs, 50) / 1000 : 0;
    game.lastTs = ts;
    game.clock += dt;

    const fieldH = els.field.clientHeight;
    const fall = FALL_SECONDS[prefs.speed] || FALL_SECONDS.normal;
    const speed = (fieldH / fall) * speedUp();
    const gap = fall / speedUp() / (TARGET_ON_SCREEN + 0.2);
    const live = game.tiles.filter((t) => !t.dead);
    if (game.queue.length && live.length < MAX_ON_SCREEN && (live.length === 0 || game.clock - game.lastSpawn >= gap)) {
      spawn();
    }

    game.tiles.forEach((t) => {
      if (t.dead) return;
      t.y += speed * dt;
      t.el.style.transform = `translate(${t.x}px, ${t.y}px)`;
      if (t.y + t.h >= fieldH) miss(t);
    });

    if (!game.queue.length && game.tiles.every((t) => t.dead)) {
      game.over = true;
      setTimeout(showResults, 900);
      return;
    }
    rafId = requestAnimationFrame(frame);
  }

  function spawn() {
    const q = game.queue.shift();
    const el = document.createElement("div");
    // Border colour: what is asked about. Badge: what to type, あ in a circle
    // for a reading, A in a square for a meaning.
    el.className = `tile tone-${q.tone} kind-${q.kind}`;
    el.innerHTML =
      '<span class="tile-head"><span class="tile-badge"></span><span class="tile-label"></span></span><span class="tile-term"></span><span class="tile-answer"></span>';
    el.querySelector(".tile-badge").textContent = kindBadge(q);
    el.querySelector(".tile-label").textContent = q.label;
    const termEl = el.querySelector(".tile-term");
    termEl.textContent = q.term;
    // Japanese runs top to bottom, as on a karuta card; other text stays flat.
    if (/^[぀-ヿ一-鿿々〆ー]+$/.test(q.term)) {
      termEl.classList.add("vertical");
      const n = [...q.term].length;
      if (n >= 6) el.style.setProperty("--term-size", "1.2rem");
      else if (n >= 4) el.style.setProperty("--term-size", "1.55rem");
    }
    el.querySelector(".tile-answer").textContent = q.display;
    els.field.appendChild(el);
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const fieldW = els.field.clientWidth;
    const maxX = Math.max(8, fieldW - w - 8);
    // Keep away from tiles still near the top.
    const overlaps = (t, x) => Math.abs(t.x - x) < Math.max(t.w, w);
    let x = 8 + Math.random() * (maxX - 8);
    for (let i = 0; i < 12; i++) {
      const crowded = game.tiles.some((t) => !t.dead && t.y < h * 1.6 && overlaps(t, x));
      if (!crowded) break;
      x = 8 + Math.random() * (maxX - 8);
    }
    const tile = { q, el, x, y: -h, w, h, dead: false };
    el.style.transform = `translate(${x}px, ${-h}px)`;
    game.tiles.push(tile);
    game.lastSpawn = game.clock;
    renderHud();
    updateTargets();
  }

  // あ for a reading, A for an English meaning (意 for one written in Japanese).
  function kindBadge(q) {
    if (q.kind === "reading") return "あ";
    if (q.kind === "meaning") return isKanaOrKanji(q.display) ? "意" : "A";
    return "?";
  }

  function retire(tile, delay) {
    tile.dead = true;
    setTimeout(() => {
      tile.el.remove();
      game.tiles = game.tiles.filter((t) => t !== tile);
    }, delay);
  }

  function hit(tile) {
    const fieldH = els.field.clientHeight || 1;
    // More for a long combo and for a term caught high up.
    const height = 1 + 0.5 * Math.max(0, 1 - tile.y / fieldH);
    const points = Math.round(100 * (1 + Math.min(game.combo, 20) * 0.1) * height);
    game.score += points;
    game.combo++;
    game.bestCombo = Math.max(game.bestCombo, game.combo);
    game.right++;
    game.results.push({ q: tile.q, correct: true });
    tile.el.classList.add("hit");
    floatPoints(tile, `+${points}`);
    retire(tile, 350);
    renderHud();
  }

  function miss(tile) {
    game.combo = 0;
    game.wrong++;
    game.results.push({ q: tile.q, correct: false });
    tile.el.classList.add("missed");
    // The answer makes the card taller: keep its whole height in the field.
    tile.h = tile.el.offsetHeight;
    tile.y = els.field.clientHeight - tile.h;
    tile.el.style.transform = `translate(${tile.x}px, ${tile.y}px)`;
    els.field.classList.remove("flash");
    void els.field.offsetWidth;
    els.field.classList.add("flash");
    retire(tile, 1400);
    renderHud();
    updateTargets();
  }

  function floatPoints(tile, text) {
    const el = document.createElement("div");
    el.className = "float-points";
    el.textContent = text;
    el.style.transform = `translate(${tile.x + tile.w / 2}px, ${tile.y}px)`;
    els.field.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  function renderHud() {
    if (!game) return;
    els.hudScore.textContent = game.score.toLocaleString();
    els.hudCombo.textContent = game.combo >= 2 ? `${game.combo} コンボ` : "";
    els.hudRight.textContent = game.right;
    els.hudWrong.textContent = game.wrong;
    els.hudLeft.textContent = game.queue.length + game.tiles.filter((t) => !t.dead).length;
  }

  // What has been typed, as typed and as kana.
  function inputForms() {
    const norm = normalize(els.input.value);
    if (!norm) return null;
    return { norm, kana: toHira(norm), kanaPrefix: toHira(norm, true).replace(/[a-z']+$/, "") };
  }

  // Of the tiles the answer fits, the one lowest on the screen.
  function findMatch(forms, fuzzy) {
    let best = null;
    game.tiles.forEach((t) => {
      if (t.dead) return;
      let ok = t.q.answers.has(forms.norm) || t.q.answers.has(forms.kana);
      if (!ok && fuzzy && isLatin(forms.norm)) {
        for (const a of t.q.answers) {
          if (!isLatin(a)) continue;
          const th = typoThreshold(Math.max(a.length, forms.norm.length));
          if (th && Math.abs(a.length - forms.norm.length) <= th && levenshtein(forms.norm, a) <= th) {
            ok = true;
            break;
          }
        }
      }
      if (ok && (!best || t.y > best.y)) best = t;
    });
    return best;
  }

  // Tiles whose answer starts with what has been typed are outlined.
  function updateTargets() {
    if (!game) return;
    const forms = inputForms();
    game.tiles.forEach((t) => {
      let on = false;
      if (forms && !t.dead) {
        for (const a of t.q.answers) {
          if (a.startsWith(forms.norm) || (forms.kanaPrefix && a.startsWith(forms.kanaPrefix))) {
            on = true;
            break;
          }
        }
      }
      t.el.classList.toggle("target", on);
    });
    const readingOnScreen = game.tiles.some((t) => !t.dead && t.q.kind !== "meaning");
    els.kanaPreview.textContent =
      forms && readingOnScreen && /^[a-z' -]+$/.test(forms.norm) && toHira(forms.norm, true) !== forms.norm ? toHira(forms.norm, true) : "";
  }

  els.input.addEventListener("input", () => {
    if (!game || game.over || game.paused) return;
    const forms = inputForms();
    if (forms) {
      const t = findMatch(forms, false);
      if (t) {
        hit(t);
        els.input.value = "";
      }
    }
    updateTargets();
  });

  els.inputForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!game || game.over || game.paused || game.starting) return;
    const forms = inputForms();
    if (!forms) return;
    const t = findMatch(forms, true);
    if (t) {
      hit(t);
    } else {
      game.combo = 0;
      renderHud();
      els.inputForm.classList.remove("shake");
      void els.inputForm.offsetWidth;
      els.inputForm.classList.add("shake");
    }
    els.input.value = "";
    updateTargets();
  });

  // Tapping the field keeps the keyboard up.
  els.field.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    e.preventDefault();
    els.input.focus();
  });

  function pause() {
    if (!game || game.over || game.paused || game.starting) return;
    game.paused = true;
    cancelAnimationFrame(rafId);
    els.pauseOverlay.hidden = false;
    els.input.blur();
  }

  function resume() {
    if (!game || !game.paused) return;
    game.paused = false;
    els.pauseOverlay.hidden = true;
    game.lastTs = 0;
    els.input.focus();
    rafId = requestAnimationFrame(frame);
  }

  function quit() {
    if (!game) return;
    clearTimeout(game.countdownTimer);
    cancelAnimationFrame(rafId);
    game.over = true;
    game = null;
    showSetup();
  }

  els.pauseBtn.addEventListener("click", () => (game && game.paused ? resume() : pause()));
  els.resumeBtn.addEventListener("click", resume);
  els.quitBtn.addEventListener("click", quit);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || els.play.hidden) return;
    e.preventDefault();
    if (game && game.paused) resume();
    else pause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });

  // ---------- results ----------

  function showResults() {
    if (!game) return;
    const total = game.results.length;
    const pct = total ? Math.round((game.right / total) * 100) : 0;
    const best = prefs.best[prefs.deck] || 0;
    const newBest = game.score > best;
    if (newBest) {
      prefs.best[prefs.deck] = game.score;
      savePrefs();
    }
    els.resultScore.textContent = game.score.toLocaleString();
    els.resultScore.classList.toggle("new-best", newBest);
    els.resultLine.textContent =
      `正解 ${game.right} / ${total}（${pct}%）· 最高 ${game.bestCombo} コンボ` + (newBest ? " · ベスト更新！" : ` · ベスト ${best.toLocaleString()}`);

    const misses = game.results.filter((r) => !r.correct);
    els.missList.innerHTML = "";
    misses.forEach(({ q }) => {
      const li = document.createElement("li");
      li.className = `miss tone-${q.tone} kind-${q.kind}`;
      li.innerHTML =
        '<span class="miss-term"></span><span class="miss-body"><span class="miss-label"><span class="tile-badge"></span></span><span class="miss-answer"></span></span>';
      li.querySelector(".tile-badge").textContent = kindBadge(q);
      li.querySelector(".miss-term").textContent = q.term;
      li.querySelector(".miss-label").append(q.label);
      li.querySelector(".miss-answer").textContent = q.display;
      els.missList.appendChild(li);
    });
    els.missHeading.textContent = misses.length ? `間違い（${misses.length}）` : "全問正解！";
    els.missesBtn.disabled = !misses.length;
    game.lastMisses = misses.map((r) => r.q);
    lastGame = game;
    showScreen("results");
  }

  let lastGame = null;
  els.againBtn.addEventListener("click", () => startRound(filteredQuestions()));
  els.missesBtn.addEventListener("click", () => {
    if (lastGame && lastGame.lastMisses && lastGame.lastMisses.length) newGame(shuffle(lastGame.lastMisses));
  });
  els.setupBtn.addEventListener("click", showSetup);

  function showSetup() {
    renderSetupNote();
    showScreen("setup");
  }

  els.startBtn.addEventListener("click", () => {
    const qs = filteredQuestions();
    if (qs.length) startRound(qs);
  });

  // ---------- start ----------

  renderDeckSelect();
  renderSetupNote();
  fetch("data/n2-kanji.json")
    .then((r) => r.json())
    .then((data) => {
      n2Deck = Array.isArray(data) ? data : [];
      renderDeckSelect();
      renderSetupNote();
    })
    .catch(() => {
      n2Deck = [];
      renderDeckSelect();
      renderSetupNote();
    });
})();
