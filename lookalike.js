// そっくりチャンプ: two lookalike kanji are shown side by side as a red (left)
// and a blue (right) button. A clue (the kanji, a reading or a meaning of one
// of them) is shown on top and the player picks the matching one with ← / →.
// Only kanji whose lesson is done are used: for the N2 kanji deck, those with
// progress in the app's stats; for a custom deck, single-kanji cards that have
// an SRS entry. Lookalike pairs come from data/similar-kanji.json.
(() => {
  "use strict";

  const SETTINGS_KEY = "kanjiFlashN2.settings.v1";
  const STATS_KEY = "kanjiFlashN2.stats.v1";
  const CUSTOM_DECKS_KEY = "kanjiFlashN2.customDecks.v1";
  const KANJI_REMOVALS_KEY = "kanjiFlashN2.kanjiRemovals.v1";
  const PREFS_KEY = "kanjiFlashN2.lookalike.v1";

  const READING_LABEL = /読み|よみ|reading|kana|ふりがな/i;
  const MEANING_LABEL = /意味|いみ|meaning|definition|english/i;
  const ONE_KANJI = /^[一-鿿]$/;
  const NEXT_DELAY_MS = 750;

  const $ = (id) => document.getElementById(id);
  const els = {
    setup: $("screen-setup"),
    play: $("screen-play"),
    results: $("screen-results"),
    chooseSeg: $("chooseSeg"),
    countSeg: $("countSeg"),
    timeRange: $("timeRange"),
    timeLabel: $("timeLabel"),
    poolNote: $("poolNote"),
    startBtn: $("startBtn"),
    quitBtn: $("quitBtn"),
    hudRight: $("hudRight"),
    hudCombo: $("hudCombo"),
    hudNum: $("hudNum"),
    hudTotal: $("hudTotal"),
    timer: $("timer"),
    timerBar: $("timerBar"),
    clueLabel: $("clueLabel"),
    clueText: $("clueText"),
    choice: [$("choiceL"), $("choiceR")],
    text: [$("textL"), $("textR")],
    detail: [$("detailL"), $("detailR")],
    feedback: $("feedback"),
    nextBtn: $("nextBtn"),
    resultScore: $("resultScore"),
    resultLine: $("resultLine"),
    againBtn: $("againBtn"),
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
  const saveJson = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* storage unavailable */
    }
  };

  const appSettings = loadJson(SETTINGS_KEY, {}) || {};
  document.documentElement.setAttribute("data-theme", appSettings.theme || "dark");
  if (appSettings.fontScale) document.documentElement.style.setProperty("--font-scale", appSettings.fontScale);

  const prefs = Object.assign({ choose: "all", count: 20, time: 6 }, loadJson(PREFS_KEY, {}));
  const savePrefs = () => saveJson(PREFS_KEY, prefs);

  // ---------- the kanji pool ----------

  let n2Deck = [];
  let similar = {};

  const toHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const readingKey = (s) => toHira(s.replace(/[-.\s]/g, ""));
  const meaningKey = (s) => s.toLowerCase().trim();

  function splitReadings(text) {
    return String(text || "")
      .split(/[,、;；・/]/)
      .map((t) => t.replace(/[()（）]/g, "").replace(/[-.－‐]/g, "").trim())
      .filter(Boolean);
  }

  function splitMeanings(text) {
    return String(text || "")
      .split(/[,;、]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // Every kanji whose lesson is done, as { kanji, readings, meanings }.
  function learnedKanji() {
    const stats = loadJson(STATS_KEY, {}) || {};
    const perCard = stats.perCard || {};
    const removals = loadJson(KANJI_REMOVALS_KEY, {}) || {};
    const pool = new Map();
    const add = (kanji, readings, meanings) => {
      const info = pool.get(kanji) || { kanji, readings: [], meanings: [] };
      readings.forEach((r) => {
        if (!info.readings.some((x) => readingKey(x) === readingKey(r))) info.readings.push(r);
      });
      meanings.forEach((m) => {
        if (!info.meanings.some((x) => meaningKey(x) === meaningKey(m))) info.meanings.push(m);
      });
      pool.set(kanji, info);
    };

    n2Deck.forEach((e) => {
      const entry = perCard[String(e.num)];
      if (!entry || !(entry.lastSeen || entry.right > 0 || entry.wrong > 0)) return;
      if (removals[e.num] && removals[e.num].removed) return;
      add(e.kanji, [...splitReadings(e.onyomi), ...splitReadings(e.kunyomi)], splitMeanings(e.meaning));
    });

    (loadJson(CUSTOM_DECKS_KEY, []) || []).forEach((deck) => {
      if (!deck || !Array.isArray(deck.cards)) return;
      const srs = deck.srs || {};
      deck.cards.forEach((card) => {
        if (!ONE_KANJI.test(card.front || "")) return;
        if (!srs[card.front] || !srs[card.front].lastSeen) return;
        const readings = [];
        const meanings = [];
        (card.sections || []).forEach((s) => {
          if (!s || !s.value) return;
          if (READING_LABEL.test(s.label)) readings.push(...splitReadings(s.value));
          else if (MEANING_LABEL.test(s.label)) meanings.push(...splitMeanings(s.value));
        });
        add(card.front, readings, meanings);
      });
    });
    return pool;
  }

  function pairsOf(pool) {
    const seen = new Set();
    const pairs = [];
    pool.forEach((a, ka) => {
      Array.from(similar[ka] || "").forEach((kb) => {
        const b = pool.get(kb);
        if (!b) return;
        const id = ka < kb ? ka + kb : kb + ka;
        if (seen.has(id)) return;
        seen.add(id);
        pairs.push([a, b]);
      });
    });
    return pairs;
  }

  // ---------- questions ----------

  const KIND_LABEL = { kanji: "漢字", reading: "読み方", meaning: "意味" };

  const shuffle = (list) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  // Values of `kind` that belong to `t` but not to `o`.
  function uniqueValues(t, o, kind) {
    if (kind === "kanji") return [t.kanji];
    if (kind === "reading") {
      const other = new Set(o.readings.map(readingKey));
      return t.readings.filter((r) => !other.has(readingKey(r)));
    }
    const other = new Set(o.meanings.map(meaningKey));
    return t.meanings.filter((m) => !other.has(meaningKey(m)));
  }

  // The kinds to show as the clue and as the two choices for the setting.
  function kindCombos() {
    const kinds = ["kanji", "reading", "meaning"];
    const answers = prefs.choose === "all" ? kinds : [prefs.choose];
    const combos = [];
    answers.forEach((answer) => kinds.filter((clue) => clue !== answer).forEach((clue) => combos.push({ clue, answer })));
    return combos;
  }

  let lastPairId = "";

  function makeQuestion(pairs) {
    const combos = kindCombos();
    for (let attempt = 0; attempt < 60; attempt++) {
      const pair = pick(pairs);
      const id = pair[0].kanji + pair[1].kanji;
      if (pairs.length > 1 && id === lastPairId && attempt < 30) continue;
      const [target, other] = Math.random() < 0.5 ? pair : [pair[1], pair[0]];
      const { clue, answer } = pick(combos);
      const clues = uniqueValues(target, other, clue);
      const rights = uniqueValues(target, other, answer);
      const wrongs = uniqueValues(other, target, answer);
      if (!clues.length || !rights.length || !wrongs.length) continue;
      lastPairId = id;
      const right = pick(rights);
      const wrong = pick(wrongs);
      const rightSide = Math.random() < 0.5 ? 0 : 1;
      const options = rightSide === 0 ? [right, wrong] : [wrong, right];
      return { pair, target, other, clueKind: clue, clue: pick(clues), answerKind: answer, options, rightSide };
    }
    return null;
  }

  // A short line under a revealed choice: the kanji's reading and meaning.
  const describe = (info) => {
    const parts = [];
    if (info.readings.length) parts.push(info.readings.slice(0, 3).join("・"));
    if (info.meanings.length) parts.push(info.meanings.slice(0, 2).join(", "));
    return parts.join("  ");
  };

  // ---------- the game ----------

  let session = null;

  function showScreen(name) {
    els.setup.hidden = name !== "setup";
    els.play.hidden = name !== "play";
    els.results.hidden = name !== "results";
  }

  function currentPool() {
    const pool = learnedKanji();
    return { pool, pairs: pairsOf(pool) };
  }

  function start() {
    const { pairs } = currentPool();
    if (!pairs.length) return;
    session = { pairs, total: prefs.count, index: 0, right: 0, combo: 0, bestCombo: 0, misses: [], q: null, answered: true, timerId: 0 };
    showScreen("play");
    nextQuestion();
  }

  function setText(el, value, kind) {
    el.textContent = value;
    el.classList.toggle("is-text", kind !== "kanji");
  }

  function nextQuestion() {
    clearTimeout(session.advanceId);
    if (session.index >= session.total) return finish();
    const q = makeQuestion(session.pairs);
    if (!q) return finish();
    session.q = q;
    session.index++;
    session.answered = false;
    els.hudNum.textContent = session.index;
    els.hudTotal.textContent = session.total;
    els.hudRight.textContent = session.right;
    els.hudCombo.textContent = session.combo > 1 ? `${session.combo} コンボ` : "";
    els.clueLabel.textContent = `ヒント：${KIND_LABEL[q.clueKind]}`;
    setText(els.clueText, q.clue, q.clueKind);
    [0, 1].forEach((side) => {
      setText(els.text[side], q.options[side], q.answerKind);
      els.detail[side].textContent = "";
      els.choice[side].disabled = false;
      els.choice[side].classList.remove("dim", "correct");
    });
    els.feedback.textContent = "";
    els.feedback.className = "lk-feedback";
    els.nextBtn.hidden = true;
    startTimer();
  }

  function startTimer() {
    cancelAnimationFrame(session.timerId);
    const limit = prefs.time * 1000;
    els.timer.classList.toggle("off", !limit);
    els.timer.classList.remove("low");
    els.timerBar.style.transform = "scaleX(1)";
    if (!limit) return;
    const began = performance.now();
    const tick = (now) => {
      if (session.answered) return;
      const left = Math.max(0, 1 - (now - began) / limit);
      els.timerBar.style.transform = `scaleX(${left})`;
      els.timer.classList.toggle("low", left < 0.25);
      if (left <= 0) return answer(-1);
      session.timerId = requestAnimationFrame(tick);
    };
    session.timerId = requestAnimationFrame(tick);
  }

  // side: 0 left, 1 right, -1 time ran out.
  function answer(side) {
    if (!session || session.answered) return;
    session.answered = true;
    cancelAnimationFrame(session.timerId);
    const q = session.q;
    const ok = side === q.rightSide;
    if (ok) {
      session.right++;
      session.combo++;
      session.bestCombo = Math.max(session.bestCombo, session.combo);
    } else {
      session.combo = 0;
      session.misses.push({ q, side });
    }
    els.hudRight.textContent = session.right;
    els.hudCombo.textContent = session.combo > 1 ? `${session.combo} コンボ` : "";
    [0, 1].forEach((s) => {
      els.choice[s].disabled = true;
      els.choice[s].classList.toggle("correct", s === q.rightSide);
      els.choice[s].classList.toggle("dim", s !== q.rightSide);
      // Reveal what each choice stands for.
      const owner = s === q.rightSide ? q.target : q.other;
      els.detail[s].textContent = q.answerKind === "kanji" ? describe(owner) : `${owner.kanji}  ${describe(owner)}`;
    });
    els.feedback.textContent = ok ? "正解！" : side === -1 ? "時間切れ" : "ざんねん";
    els.feedback.className = `lk-feedback ${ok ? "ok" : "bad"}`;
    if (ok) {
      session.advanceId = setTimeout(nextQuestion, NEXT_DELAY_MS);
    } else {
      els.nextBtn.hidden = false;
    }
  }

  function finish() {
    cancelAnimationFrame(session.timerId);
    clearTimeout(session.advanceId);
    const s = session;
    session = null;
    showScreen("results");
    els.resultScore.textContent = `${s.right} / ${s.index}`;
    els.resultLine.textContent = `${s.index ? Math.round((s.right / s.index) * 100) : 0}%　最高コンボ ${s.bestCombo}`;
    els.missHeading.hidden = !s.misses.length;
    els.missList.innerHTML = "";
    s.misses.forEach(({ q }) => {
      const li = document.createElement("li");
      li.className = "miss-item";
      const [a, b] = q.pair;
      li.innerHTML = `<span class="miss-term"></span><span class="miss-body"><span class="miss-answer"></span></span>`;
      li.querySelector(".miss-term").textContent = `${a.kanji} ${b.kanji}`;
      li.querySelector(".miss-answer").textContent = `${a.kanji}：${describe(a)}　${b.kanji}：${describe(b)}`;
      els.missList.appendChild(li);
    });
  }

  function quit() {
    if (!session) return;
    cancelAnimationFrame(session.timerId);
    clearTimeout(session.advanceId);
    session = null;
    renderSetup();
    showScreen("setup");
  }

  // ---------- setup ----------

  function renderTimeLabel() {
    els.timeLabel.textContent = prefs.time ? `${prefs.time}秒` : "制限なし";
  }

  function renderSetup() {
    const { pool, pairs } = currentPool();
    if (!pairs.length) {
      els.poolNote.textContent = pool.size
        ? `レッスンを終えた漢字（${pool.size}字）の中に、似た組がまだありません。レッスンを進めると増えます。`
        : "レッスンを終えた漢字がまだありません。レッスンを進めてください。";
    } else {
      els.poolNote.textContent = `レッスン済み ${pool.size}字 ／ 似た組 ${pairs.length}組`;
    }
    els.startBtn.disabled = !pairs.length;
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
    });
    render();
  }

  bindSeg(els.chooseSeg, "choose");
  bindSeg(els.countSeg, "count", Number);
  els.timeRange.value = prefs.time;
  renderTimeLabel();
  els.timeRange.addEventListener("input", () => {
    prefs.time = Number(els.timeRange.value);
    savePrefs();
    renderTimeLabel();
  });

  els.startBtn.addEventListener("click", start);
  els.againBtn.addEventListener("click", start);
  els.setupBtn.addEventListener("click", () => {
    renderSetup();
    showScreen("setup");
  });
  els.quitBtn.addEventListener("click", quit);
  els.choice[0].addEventListener("click", () => answer(0));
  els.choice[1].addEventListener("click", () => answer(1));
  els.nextBtn.addEventListener("click", nextQuestion);

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || els.play.hidden || !session) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      answer(0);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      answer(1);
    } else if ((e.key === " " || e.key === "Enter") && session.answered) {
      e.preventDefault();
      nextQuestion();
    }
  });

  showScreen("setup");
  renderSetup();
  Promise.all([
    fetch("data/n2-kanji.json").then((r) => r.json()).catch(() => []),
    fetch("data/similar-kanji.json").then((r) => r.json()).catch(() => ({})),
  ]).then(([deck, sim]) => {
    n2Deck = Array.isArray(deck) ? deck : [];
    similar = sim && typeof sim === "object" ? sim : {};
    renderSetup();
  });
})();
