(function () {
  "use strict";

  const STORAGE_KEY = "kanjiFlashN2.v1";
  const STATS_KEY = "kanjiFlashN2.stats.v1";
  const SETTINGS_KEY = "kanjiFlashN2.settings.v1";
  const LESSONS_KEY = "kanjiFlashN2.lessons.v1";
  const CUSTOM_ANSWERS_KEY = "kanjiFlashN2.customAnswers.v1";
  const CUSTOM_DECKS_KEY = "kanjiFlashN2.customDecks.v1";
  // How long the "Correct!" confirmation shows before a right typed answer
  // moves on to the next card by itself.
  const AUTO_ADVANCE_MS = 150;
  // In lessons and reviews a question answered wrongly goes back into the
  // session this many places later (or to the end if fewer remain), and the
  // session only ends once every question has been answered correctly.
  // すべて復習 asks each question once and ends with a report card instead.
  const REQUEUE_GAP = 4;
  const EXPORT_APP_ID = "kanji-flash";
  const EXPORT_VERSION = 1;
  const SYNC_GROUP_KEY = "kanjiFlashN2.syncGroup.v1";
  const SYNC_COUNTS_KEY = "kanjiFlashN2.syncCounts.v1";
  // Written by the earlier two-device version; read once to migrate.
  const OLD_SYNC_PAIR_KEY = "kanjiFlashN2.sync.v1";
  const OLD_SYNC_BASE_KEY = "kanjiFlashN2.syncBase.v1";
  const DEVICE_ID_KEY = "kanjiFlashN2.deviceId.v1";
  const DECK_TOMBSTONES_KEY = "kanjiFlashN2.deckTombstones.v1";
  const PEERJS_SRC = "https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js";
  const PEERJS_SRI = "sha384-nlUQ8ZqCbvStErob+biJNzSgltf6urV3VGqhfIfzhmg9RXmpeRm76ELw0pYnKlTR";
  const MIN_MINUTES = 1;
  const MAX_MINUTES = 30;
  const DEFAULT_MINUTES = 3;
  const MIN_QUESTIONS = 5;
  const MAX_QUESTIONS = 30;
  const DEFAULT_QUESTIONS = 10;
  // Leitner-box spaced repetition: box index -> days until next due date.
  // A correct answer advances a card to the next box (longer interval); a
  // miss keeps it in its box and brings it back at 6:00 the next morning.
  const BOX_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30, 90, 90];
  const MAX_BOX = BOX_INTERVALS_DAYS.length - 1;
  const KNOWN_BOX_THRESHOLD = 4;
  // Placement quiz: a never-reviewed card the player says they know starts in
  // this box (due in a few days) instead of box 1, so the quiz actually
  // shortens their review queue; "don't know" starts it at box 0, due today.
  const QUIZ_KNOWN_BOX = 2;

  const els = {
    // screens
    screenHome: document.getElementById("screen-home"),
    screenDailySetup: document.getElementById("screen-daily-setup"),
    screenPlay: document.getElementById("screen-play"),
    screenDailyResults: document.getElementById("screen-daily-results"),
    screenLessonResults: document.getElementById("screen-lesson-results"),
    screenLessonStudy: document.getElementById("screen-lesson-study"),
    studyBackBtn: document.getElementById("studyBackBtn"),
    studyProgress: document.getElementById("studyProgress"),
    studyTerm: document.getElementById("studyTerm"),
    studyGloss: document.getElementById("studyGloss"),
    studyTabs: document.getElementById("studyTabs"),
    studyPanel: document.getElementById("studyPanel"),
    studyPrevBtn: document.getElementById("studyPrevBtn"),
    studyNextBtn: document.getElementById("studyNextBtn"),
    studyStrip: document.getElementById("studyStrip"),
    studyContinueBtn: document.getElementById("studyContinueBtn"),
    screenStats: document.getElementById("screen-stats"),
    screenSettings: document.getElementById("screen-settings"),
    screenLessons: document.getElementById("screen-lessons"),
    // home
    modeMarathonBtn: document.getElementById("modeMarathonBtn"),
    screenDeckPick: document.getElementById("screen-deck-pick"),
    deckPickTitle: document.getElementById("deckPickTitle"),
    deckPickList: document.getElementById("deckPickList"),
    screenDeckEdit: document.getElementById("screen-deck-edit"),
    editDecksBtn: document.getElementById("editDecksBtn"),
    deckEditBackBtn: document.getElementById("deckEditBackBtn"),
    deckEditTitle: document.getElementById("deckEditTitle"),
    deckEditLegend: document.getElementById("deckEditLegend"),
    deckEditToolbar: document.getElementById("deckEditToolbar"),
    deckEditList: document.getElementById("deckEditList"),
    deckEditTagsBtn: document.getElementById("deckEditTagsBtn"),
    deckEditStatus: document.getElementById("deckEditStatus"),
    deckEditNewBtn: document.getElementById("deckEditNewBtn"),
    deckEditUndo: document.getElementById("deckEditUndo"),
    deckEditUndoText: document.getElementById("deckEditUndoText"),
    deckEditUndoBtn: document.getElementById("deckEditUndoBtn"),
    deckEditRestoreBtn: document.getElementById("deckEditRestoreBtn"),
    lessonDeckBtn: document.getElementById("lessonDeckBtn"),
    lessonFilterBar: document.getElementById("lessonFilterBar"),
    lessonFilterBtn: document.getElementById("lessonFilterBtn"),
    selectShownBtn: document.getElementById("selectShownBtn"),
    lessonFilterPanel: document.getElementById("lessonFilterPanel"),
    cardLegacyRows: document.getElementById("cardLegacyRows"),
    cardWordBlock: document.getElementById("cardWordBlock"),
    cardWord: document.getElementById("cardWord"),
    typeWordBlock: document.getElementById("typeWordBlock"),
    typeNounBlock: document.getElementById("typeNounBlock"),
    typeNoun: document.getElementById("typeNoun"),
    typeWord: document.getElementById("typeWord"),
    cardSections: document.getElementById("cardSections"),
    typeLegacyRows: document.getElementById("typeLegacyRows"),
    typeSections: document.getElementById("typeSections"),
    modeDailyBtn: document.getElementById("modeDailyBtn"),
    modeStatsBtn: document.getElementById("modeStatsBtn"),
    modeLessonsBtn: document.getElementById("modeLessonsBtn"),
    settingsBtn: document.getElementById("settingsBtn"),
    // daily setup
    timeValue: document.getElementById("timeValue"),
    timeUpBtn: document.getElementById("timeUpBtn"),
    timeDownBtn: document.getElementById("timeDownBtn"),
    startDailyBtn: document.getElementById("startDailyBtn"),
    // play
    card: document.getElementById("card"),
    kanji: document.getElementById("kanjiChar"),
    kanjiBack: document.getElementById("kanjiCharBack"),
    onyomi: document.getElementById("onyomi"),
    kunyomi: document.getElementById("kunyomi"),
    meaning: document.getElementById("meaning"),
    progress: document.getElementById("progress"),
    timerDisplay: document.getElementById("timerDisplay"),
    againBtn: document.getElementById("againBtn"),
    gotItBtn: document.getElementById("gotItBtn"),
    frontHint: document.getElementById("frontHint"),
    congratsMsg: document.getElementById("congratsMsg"),
    newDeckBtn: document.getElementById("newDeckBtn"),
    cardStats: document.getElementById("cardStats"),
    cardStatsRight: document.getElementById("cardStatsRight"),
    cardStatsWrong: document.getElementById("cardStatsWrong"),
    cardCustomAnswers: document.getElementById("cardCustomAnswers"),
    cardCustomAnswersList: document.getElementById("cardCustomAnswersList"),
    // daily results
    resultSeen: document.getElementById("resultSeen"),
    resultRight: document.getElementById("resultRight"),
    resultWrong: document.getElementById("resultWrong"),
    resultAccuracy: document.getElementById("resultAccuracy"),
    dailyAgainBtn: document.getElementById("dailyAgainBtn"),
    dailyHomeBtn: document.getElementById("dailyHomeBtn"),
    lessonResultTitle: document.getElementById("lessonResultTitle"),
    lessonResultSeen: document.getElementById("lessonResultSeen"),
    lessonResultRight: document.getElementById("lessonResultRight"),
    lessonResultWrong: document.getElementById("lessonResultWrong"),
    lessonResultAccuracy: document.getElementById("lessonResultAccuracy"),
    lessonResultsLessonsBtn: document.getElementById("lessonResultsLessonsBtn"),
    lessonResultReport: document.getElementById("lessonResultReport"),
    // stats
    statsBody: document.getElementById("statsBody"),
    resetStatsBtn: document.getElementById("resetStatsBtn"),
    // settings
    themeOptions: document.getElementById("themeOptions"),
    stylizedFontToggle: document.getElementById("stylizedFontToggle"),
    fontSizeSlider: document.getElementById("fontSizeSlider"),
    fontSizeValue: document.getElementById("fontSizeValue"),
    dataStatus: document.getElementById("dataStatus"),
    openSyncBtn: document.getElementById("openSyncBtn"),
    screenSync: document.getElementById("screen-sync"),
    syncUnpaired: document.getElementById("syncUnpaired"),
    syncPaired: document.getElementById("syncPaired"),
    syncNowBtn: document.getElementById("syncNowBtn"),
    syncSasTitle: document.getElementById("syncSasTitle"),
    syncGroupTitle: document.getElementById("syncGroupTitle"),
    syncSasHint: document.getElementById("syncSasHint"),
    syncStatus: document.getElementById("syncStatus"),
    syncCode: document.getElementById("syncCode"),
    syncCodeStatus: document.getElementById("syncCodeStatus"),
    syncCodeCopyBtn: document.getElementById("syncCodeCopyBtn"),
    syncCodeImportBtn: document.getElementById("syncCodeImportBtn"),
    syncCodePasteBtn: document.getElementById("syncCodePasteBtn"),
    syncTech: document.getElementById("syncTech"),
    syncRoomTech: document.getElementById("syncRoomTech"),
    syncNearbyStatus: document.getElementById("syncNearbyStatus"),
    syncSasBox: document.getElementById("syncSasBox"),
    syncSas: document.getElementById("syncSas"),
    syncSasYesBtn: document.getElementById("syncSasYesBtn"),
    syncSasNoBtn: document.getElementById("syncSasNoBtn"),
    customDecksDue: document.getElementById("customDecksDue"),
    streak: document.getElementById("streak"),
    rank: document.getElementById("rank"),
    termSearchModal: document.getElementById("termSearchModal"),
    termSearchForm: document.getElementById("termSearchForm"),
    termSearchInput: document.getElementById("termSearchInput"),
    termSearchResults: document.getElementById("termSearchResults"),
    termSearchClose: document.getElementById("termSearchClose"),
    answersModal: document.getElementById("answersModal"),
    answersModalTitle: document.getElementById("answersModalTitle"),
    answersBody: document.getElementById("answersBody"),
    answersModalClose: document.getElementById("answersModalClose"),
    noteModal: document.getElementById("noteModal"),
    noteModalTitle: document.getElementById("noteModalTitle"),
    noteFields: document.getElementById("noteFields"),
    noteModalClose: document.getElementById("noteModalClose"),
    rankModal: document.getElementById("rankModal"),
    rankModalTitle: document.getElementById("rankModalTitle"),
    rankModalBody: document.getElementById("rankModalBody"),
    rankModalClose: document.getElementById("rankModalClose"),
    rankName: document.getElementById("rankName"),
    rankLevel: document.getElementById("rankLevel"),
    streakNum: document.getElementById("streakNum"),
    customDecksDueNum: document.getElementById("customDecksDueNum"),
    exportDataBtn: document.getElementById("exportDataBtn"),
    importDataBtn: document.getElementById("importDataBtn"),
    importFileInput: document.getElementById("importFileInput"),
    screenImportChoice: document.getElementById("screen-import-choice"),
    importMergeBtn: document.getElementById("importMergeBtn"),
    importReplaceBtn: document.getElementById("importReplaceBtn"),
    importCancelBtn: document.getElementById("importCancelBtn"),
    quizQuestionsDownBtn: document.getElementById("quizQuestionsDownBtn"),
    quizQuestionsUpBtn: document.getElementById("quizQuestionsUpBtn"),
    quizQuestionsValue: document.getElementById("quizQuestionsValue"),
    lessonMonthLabel: document.getElementById("lessonMonthLabel"),
    lessonTitle: document.getElementById("lessonTitle"),
    lessonSubtitle: document.getElementById("lessonSubtitle"),
    lessonCalendar: document.getElementById("lessonCalendar"),
    startLessonBtn: document.getElementById("startLessonBtn"),
    termChart: document.getElementById("termChart"),
    clearSelectionBtn: document.getElementById("clearSelectionBtn"),
    lessonResultNote: document.getElementById("lessonResultNote"),
    startReviewBtn: document.getElementById("startReviewBtn"),
    // type answer
    screenType: document.getElementById("screen-type"),
    modeTypeBtn: document.getElementById("modeTypeBtn"),
    typeProgress: document.getElementById("typeProgress"),
    typeScore: document.getElementById("typeScore"),
    customTypeScore: document.getElementById("customTypeScore"),
    typeCard: document.getElementById("typeCard"),
    questionTypeBadge: document.getElementById("questionTypeBadge"),
    typeKanji: document.getElementById("typeKanji"),
    typeForm: document.getElementById("typeForm"),
    typeInput: document.getElementById("typeInput"),
    typeSubmitBtn: document.getElementById("typeSubmitBtn"),
    typeFeedback: document.getElementById("typeFeedback"),
    typeMnemonic: document.getElementById("typeMnemonic"),
    customTypeMnemonic: document.getElementById("customTypeMnemonic"),
    typeFeedbackResult: document.getElementById("typeFeedbackResult"),
    typeOnyomi: document.getElementById("typeOnyomi"),
    typeOnyomiBlock: document.getElementById("typeOnyomiBlock"),
    typeKunyomiBlock: document.getElementById("typeKunyomiBlock"),
    typeKunyomi: document.getElementById("typeKunyomi"),
    typeMeaning: document.getElementById("typeMeaning"),
    typeCongratsMsg: document.getElementById("typeCongratsMsg"),
    typeNewDeckBtn: document.getElementById("typeNewDeckBtn"),
    typeCardStats: document.getElementById("typeCardStats"),
    typeCardStatsRight: document.getElementById("typeCardStatsRight"),
    typeCardStatsWrong: document.getElementById("typeCardStatsWrong"),
    addAnswerRow: document.getElementById("addAnswerRow"),
    typoBtn: document.getElementById("typoBtn"),
    addAnswerBtn: document.getElementById("addAnswerBtn"),
    addAnswerBtnText: document.getElementById("addAnswerBtnText"),
    typeCustomAnswers: document.getElementById("typeCustomAnswers"),
    typeCustomAnswersList: document.getElementById("typeCustomAnswersList"),
    // custom decks
    screenCustomDecks: document.getElementById("screen-custom-decks"),
    screenCustomDeckSave: document.getElementById("screen-custom-deck-save"),
    screenCustomStudy: document.getElementById("screen-custom-study"),
    screenCustomType: document.getElementById("screen-custom-type"),
    screenCustomComplete: document.getElementById("screen-custom-complete"),
    modeCustomDecksBtn: document.getElementById("modeCustomDecksBtn"),
    uploadCsvBtn: document.getElementById("uploadCsvBtn"),
    csvFileInput: document.getElementById("csvFileInput"),
    customDecksList: document.getElementById("customDecksList"),
    customDecksEmpty: document.getElementById("customDecksEmpty"),
    downloadTemplateBtn: document.getElementById("downloadTemplateBtn"),
    customSaveTitle: document.getElementById("customSaveTitle"),
    customSaveCancelBtn: document.getElementById("customSaveCancelBtn"),
    customDeckNameInput: document.getElementById("customDeckNameInput"),
    customSaveInfo: document.getElementById("customSaveInfo"),
    customSaveWarning: document.getElementById("customSaveWarning"),
    customSaveConfirmBtn: document.getElementById("customSaveConfirmBtn"),
    customStudyCard: document.getElementById("customStudyCard"),
    customStudyProgress: document.getElementById("customStudyProgress"),
    customStudyFront: document.getElementById("customStudyFront"),
    customStudyBackSections: document.getElementById("customStudyBackSections"),
    customFlashAgainBtn: document.getElementById("customFlashAgainBtn"),
    customFlashGotItBtn: document.getElementById("customFlashGotItBtn"),
    customStudyBackBtn: document.getElementById("customStudyBackBtn"),
    customCompleteStat: document.getElementById("customCompleteStat"),
    customStudyAgainBtn: document.getElementById("customStudyAgainBtn"),
    customBackToListBtn: document.getElementById("customBackToListBtn"),
    customTypeCard: document.getElementById("customTypeCard"),
    customTypeProgress: document.getElementById("customTypeProgress"),
    customTypeBadge: document.getElementById("customTypeBadge"),
    customTypeFront: document.getElementById("customTypeFront"),
    customTypeForm: document.getElementById("customTypeForm"),
    customTypeInput: document.getElementById("customTypeInput"),
    customTypeSubmitBtn: document.getElementById("customTypeSubmitBtn"),
    customTypeFeedback: document.getElementById("customTypeFeedback"),
    customTypeFeedbackResult: document.getElementById("customTypeFeedbackResult"),
    customAddAnswerRow: document.getElementById("customAddAnswerRow"),
    customTypoBtn: document.getElementById("customTypoBtn"),
    customAddAnswerBtn: document.getElementById("customAddAnswerBtn"),
    customAddAnswerBtnText: document.getElementById("customAddAnswerBtnText"),
    customTypeSections: document.getElementById("customTypeSections"),
    customTypeBackBtn: document.getElementById("customTypeBackBtn"),
  };

  const screens = {
    home: els.screenHome,
    dailySetup: els.screenDailySetup,
    play: els.screenPlay,
    dailyResults: els.screenDailyResults,
    lessonResults: els.screenLessonResults,
    lessonStudy: els.screenLessonStudy,
    stats: els.screenStats,
    type: els.screenType,
    settings: els.screenSettings,
    lessons: els.screenLessons,
    deckPick: els.screenDeckPick,
    deckEdit: els.screenDeckEdit,
    importChoice: els.screenImportChoice,
    sync: els.screenSync,
    customDecks: els.screenCustomDecks,
    customDeckSave: els.screenCustomDeckSave,
    customStudy: els.screenCustomStudy,
    customType: els.screenCustomType,
    customComplete: els.screenCustomComplete,
  };

  let allKanji = [];
  let kanjiByNum = new Map();
  let queue = []; // working stack for the current session; queue[0] is the card on top
  let totalCount = 0;
  let masteredCount = 0;
  let flipped = false;
  let animating = false;
  let stats = { daily: {}, perCard: {} };
  const THEMES = ["dark", "hanafuda", "hyakunin"];
  const DEFAULT_THEME = "dark";

  let settings = { stylizedFont: true, fontScale: 1, defaultDailyMinutes: DEFAULT_MINUTES, quizQuestions: DEFAULT_QUESTIONS, theme: DEFAULT_THEME, lessonDeck: "n2-kanji", marathonDeck: "n2-kanji" };
  let lessonHistory = { completed: {}, placement: {}, today: null };
  let lessonSession = null;
  let lessonQuestionTypes = [];
  let lessonTermState = new Map();
  let savedMainSession = null;
  let customAnswers = {};
  let customDecks = [];
  let pendingReplaceId = null;
  let pendingCsvParse = null;
  let customStudyDeck = null;
  let customStudyCards = [];
  let customQuizKnown = 0;
  let customTypeCards = [];
  let customTypeAsked = [];
  let customTermState = new Map();
  let customTypeMode = "type"; // "type" | "quiz" | "review"
  let customStudyMode = "cards"; // flashcards only; typed review runs through the custom type screen
  let customStudyIndex = 0;
  let customStudyFlipped = false;
  let customTypeDeck = null;
  let customTypeIndex = 0;
  let customScore = { attempted: new Set(), right: 0, wrong: 0 };
  let customTypeAnswering = true;
  let customTypeDone = 0;
  let customTypeTotal = 0;
  let customTypeCurrentSection = null;
  let pendingCustomTypeCorrect = false;
  let pendingCustomTypeRawAnswer = "";
  let customCompleteDeck = null;
  let customCompleteMode = "cards";
  let pendingImport = null;

  let mode = null; // "marathon" | "daily" | "type" | "lesson-type"
  let dailyMinutes = DEFAULT_MINUTES;
  let dailyTimeLeft = 0;
  let dailyIntervalId = null;
  let dailyTally = { seen: 0, right: 0, wrong: 0 };

  let typeAnswering = true;
  let typeAutoAdvanceTimer = null;
  let customTypeAutoAdvanceTimer = null;
  let pendingTypeCorrect = false;
  let pendingTypeRawAnswer = "";
  let currentQuestionType = "meaning";

  // Shuffles questions, then picks them one at a time, skipping any whose
  // group (the term it asks about) matches the previous pick, so a term's
  // questions don't come back to back unless only that term's are left.
  function spreadQuestions(questions, groupOf) {
    const pool = shuffle(questions);
    const ordered = [];
    while (pool.length) {
      const last = ordered.length ? groupOf(ordered[ordered.length - 1]) : null;
      let k = pool.findIndex((q) => groupOf(q) !== last);
      if (k === -1) k = 0;
      ordered.push(pool.splice(k, 1)[0]);
    }
    return ordered;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function showScreen(name) {
    Object.keys(screens).forEach((key) => {
      screens[key].hidden = key !== name;
    });
    if (name === "home") {
      updateHomeInfo();
      fitBrand();
    }
    if (name !== "sync") stopSyncActivity();
  }

  // The Custom Decks tile on the home screen shows how many reviews are due
  // across all of the player's decks.
  // Consecutive days with at least one answered question, up to today. If
  // today has no answers yet the streak is still alive (it counts back from
  // yesterday) until the day ends.
  function currentStreak() {
    const daily = stats.daily || {};
    const studied = (d) => Boolean(daily[dateKey(d)] && daily[dateKey(d)].completed > 0);
    const day = new Date();
    const doneToday = studied(day);
    if (!doneToday) day.setDate(day.getDate() - 1);
    let days = 0;
    while (studied(day)) {
      days++;
      day.setDate(day.getDate() - 1);
    }
    return { days, doneToday };
  }

  function updateHomeInfo() {
    const streak = currentStreak();
    els.streakNum.textContent = String(streak.days);
    els.streak.classList.toggle("pending", !streak.doneToday);
    const rank = rankInfo(totalReviews());
    els.rank.style.setProperty("--tone", RANK_TONES[rank.index]);
    els.streak.style.setProperty("--tone", STREAK_TONES[Math.floor(streak.days / 10) % STREAK_TONES.length]);
    els.rankName.textContent = rank.name;
    els.rankLevel.textContent = `Lv.${rank.level}`;
    els.rank.title = rank.maxed ? "最高ランクです" : `次のレベルまであと${rank.toNext}回の復習`;
    els.streak.title = streak.doneToday ? "連続で学習した日数" : "今日はまだ学習していません。続けるには今日学習しましょう。";
    // Questions waiting across the decks (the リーチ deck has its own count).
    let due = unitQuestionCount(getReviewUnits(visibleKanji()));
    customDecks.forEach((deck) => {
      due += customQuestionCount(getDueCustomCards(deck));
    });
    els.customDecksDueNum.textContent = String(due);
    els.customDecksDue.classList.toggle("has-due", due > 0);
  }

  // ---------- decks (Lessons and Ultimate Challenge can use any of them) ----------
  // The built-in N2 kanji deck, or one of the player's custom decks (id
  // "custom:<deck id>"). The active deck's cards are `allKanji`; a custom
  // deck's cards are turned into items that carry their own `sections`.

  const KANJI_DECK_ID = "n2-kanji";
  const CUSTOM_ITEM_BASE = 2000000000;
  const DECK_STATES_KEY = "kanjiFlashN2.deckStates.v1";
  const KANJI_REMOVALS_KEY = "kanjiFlashN2.kanjiRemovals.v1";
  // N2 kanji removed from the built-in deck in the editor: { num: { at, removed } }.
  let kanjiRemovals = {};

  function saveKanjiRemovals() {
    saveJson(KANJI_REMOVALS_KEY, kanjiRemovals);
  }

  function setKanjiRemoved(num, removed) {
    kanjiRemovals[num] = { at: Date.now(), removed };
    saveKanjiRemovals();
  }

  // ---------- leeches ----------
  // A term answered wrongly twice becomes a leech and is collected in its own
  // review (復習 > リーチ), which is optional and not part of the due count.
  // It leaves again once it has been answered correctly twice in an ordinary
  // review. Keyed by deck and term: { wrong, right, leech, at }.
  const LEECHES_KEY = "kanjiFlashN2.leeches.v1";
  const LEECH_AFTER_WRONG = 2;
  const LEECH_CLEARED_AFTER_RIGHT = 2;
  let leeches = {};

  function saveLeeches() {
    saveJson(LEECHES_KEY, leeches);
  }

  function leechKey(item) {
    return item.deckId ? `${item.deckId}|${item.front}` : `n2|${item.num}`;
  }

  // `inReview`: the answer came in a normal review (復習 or すべて復習), the
  // only place a correct answer counts towards clearing a leech.
  function noteLeechAnswer(key, correct, inReview) {
    const entry = leeches[key] || { wrong: 0, right: 0, leech: false, at: 0 };
    if (!correct) {
      if (entry.leech) return;
      entry.wrong++;
      if (entry.wrong >= LEECH_AFTER_WRONG) {
        entry.leech = true;
        entry.right = 0;
      }
    } else {
      if (!entry.leech || !inReview) return;
      entry.right++;
      if (entry.right >= LEECH_CLEARED_AFTER_RIGHT) {
        entry.leech = false;
        entry.wrong = 0;
        entry.right = 0;
      }
    }
    entry.at = Date.now();
    leeches[key] = entry;
    saveLeeches();
  }

  // The current leeches that still exist in their decks, as lesson items.
  function getLeechItems() {
    const items = [];
    const customItems = new Map();
    Object.keys(leeches).forEach((key) => {
      if (!leeches[key].leech) return;
      const sep = key.indexOf("|");
      const owner = key.slice(0, sep);
      const id = key.slice(sep + 1);
      let item;
      if (owner === "n2") {
        item = visibleKanji().find((k) => String(k.num) === id);
      } else {
        const deck = customDeckById(owner);
        if (deck && !customItems.has(owner)) customItems.set(owner, buildCustomItems(deck));
        item = deck && customItems.get(owner).find((i) => i.front === id);
      }
      if (item) items.push(item);
    });
    return items;
  }

  // ---------- mnemonics ----------
  // Text the player types under a term's meaning or readings on the study
  // screen: { "<term key>|<tab>": { text, at } }, kept per term and per tab.
  const MNEMONICS_KEY = "kanjiFlashN2.mnemonics.v1";
  let mnemonics = {};

  function saveMnemonics() {
    saveJson(MNEMONICS_KEY, mnemonics);
  }

  const isKanjiRemoved = (num) => Boolean(kanjiRemovals[num] && kanjiRemovals[num].removed);
  const visibleKanji = () => n2Kanji.filter((k) => !isKanjiRemoved(k.num));
  let n2Kanji = [];
  let activeDeckId = KANJI_DECK_ID;

  function hashString(text) {
    let h = 0x811c9dc5;
    for (const ch of text) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
  }

  function customDeckById(id) {
    return customDecks.find((deck) => deck.id === id) || null;
  }

  function buildCustomItems(deck) {
    return deck.cards
      .filter((card) => card.sections.length)
      .map((card) => ({
        num: CUSTOM_ITEM_BASE + hashString(`${deck.id}|${card.front}`),
        kanji: card.front,
        front: card.front,
        deckId: deck.id,
        sections: card.sections,
        tags: card.tags || null,
        facets: tagFacets(card.tags),
      }));
  }

  function deckItems(deckId) {
    if (deckId === KANJI_DECK_ID) return visibleKanji();
    const deck = customDeckById(deckId.replace(/^custom:/, ""));
    return deck ? buildCustomItems(deck) : [];
  }

  function resolveDeckId(deckId) {
    return deckItems(deckId).length ? deckId : KANJI_DECK_ID;
  }

  function deckName(deckId) {
    if (deckId === KANJI_DECK_ID) return "N2漢字";
    const deck = customDeckById(deckId.replace(/^custom:/, ""));
    return deck ? deck.name : "N2漢字";
  }

  const isKanjiDeck = () => activeDeckId === KANJI_DECK_ID;
  const deckNoun = () => (isKanjiDeck() ? "漢字" : "カード");
  const deckUnit = () => (isKanjiDeck() ? "字" : "枚");

  // Switches the active deck. The marathon stack of the deck being left is
  // saved first, and the new deck's own saved stack (or a fresh shuffle) is
  // loaded, so each deck keeps its place.
  function activateDeck(deckId) {
    const next = resolveDeckId(deckId);
    if (next !== activeDeckId && allKanji.length) saveState();
    activeDeckId = next;
    allKanji = deckItems(next);
    kanjiByNum = new Map(allKanji.map((item) => [item.num, item]));
    applyDeckState();
  }

  function applyDeckState() {
    const saved = loadState();
    if (saved && saved.totalCount === allKanji.length && saved.queueNums.every((n) => kanjiByNum.has(n))) {
      queue = saved.queueNums.map((n) => kanjiByNum.get(n));
      totalCount = saved.totalCount;
      masteredCount = saved.masteredCount;
    } else {
      queue = shuffle(allKanji);
      totalCount = allKanji.length;
      masteredCount = 0;
      saveState();
    }
  }

  // ---------- shared deck persistence (all modes) ----------

  function saveState() {
    const state = {
      queueNums: queue.map((item) => item.num),
      masteredCount,
      totalCount,
    };
    try {
      if (activeDeckId === KANJI_DECK_ID) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } else {
        const all = loadJson(DECK_STATES_KEY, {});
        all[activeDeckId] = state;
        saveJson(DECK_STATES_KEY, all);
      }
    } catch (err) {
      /* localStorage unavailable (private mode, quota, etc.) */
    }
  }

  function loadState() {
    try {
      const parsed =
        activeDeckId === KANJI_DECK_ID
          ? JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")
          : (loadJson(DECK_STATES_KEY, {}) || {})[activeDeckId];
      if (!parsed || !Array.isArray(parsed.queueNums)) return null;
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function reshuffleDeck() {
    queue = shuffle(allKanji);
    totalCount = allKanji.length;
    masteredCount = 0;
    flipped = false;
    saveState();
  }

  // ---------- stats ----------

  function dateKey(d) {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function loadStats() {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (!raw) return { daily: {}, perCard: {} };
      const parsed = JSON.parse(raw);
      return {
        daily: parsed.daily || {},
        perCard: parsed.perCard || {},
      };
    } catch (err) {
      return { daily: {}, perCard: {} };
    }
  }

  function saveStats() {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (err) {
      /* localStorage unavailable (private mode, quota, etc.) */
    }
  }

  // ---------- spaced repetition (Leitner boxes) ----------
  //
  // Shared by the built-in deck (stats.perCard, keyed by kanji num) and
  // custom decks (deck.srs, keyed by card front text) — both store the same
  // { box, due, lastSeen, streak } shape, so grading logic only needs to be
  // written once.

  // Every graded term has its own due time (`dueAt`, in ms). A right answer is
  // due one interval after it was given. A missed term is taken off the due
  // list for the rest of the day and comes back at 6:00 the next morning,
  // Pacific time.
  const MISS_RETURN_ZONE = "America/Los_Angeles";
  const MISS_RETURN_HOUR = 6;

  // How far the zone's clock is ahead of UTC at an instant, in ms.
  function zoneOffsetMs(ms, zone) {
    const parts = {};
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(new Date(ms))
      .forEach((p) => {
        parts[p.type] = Number(p.value);
      });
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return asUtc - Math.floor(ms / 1000) * 1000;
  }

  // The next 6:00 in the zone that falls on the zone's following calendar day.
  // The instant of 6:00 in the zone for a wall-clock time given as if UTC.
  function sixAmInstant(wall) {
    const first = wall - zoneOffsetMs(wall, MISS_RETURN_ZONE);
    return wall - zoneOffsetMs(first, MISS_RETURN_ZONE);
  }

  // 6:00 in the zone on the day `daysAhead` after the zone's day of `nowMs`
  // (0 = that same day). Every review is delivered at that time of day.
  function dueAtOnDay(nowMs, daysAhead) {
    const local = new Date(nowMs + zoneOffsetMs(nowMs, MISS_RETURN_ZONE));
    return sixAmInstant(
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + daysAhead, MISS_RETURN_HOUR)
    );
  }

  const nextMissDueAt = (nowMs) => dueAtOnDay(nowMs, 1);

  // Terms already missed today, before misses had a return time, get one too
  // so they leave today's due list as well.
  // Every review is delivered at 6:00 (Pacific) on its day: schedules made
  // earlier, with another time of day or only a date, are moved to that time.
  function alignDueTimesTo6am() {
    const fix = (entry) => {
      if (!entry) return false;
      let dueAt = null;
      if (entry.dueAt) dueAt = dueAtOnDay(entry.dueAt, 0);
      else if (entry.due) {
        const [y, m, d] = String(entry.due).split("-").map(Number);
        if (y && m && d) dueAt = sixAmInstant(Date.UTC(y, m - 1, d, MISS_RETURN_HOUR));
      }
      if (dueAt === null || dueAt === entry.dueAt) return false;
      entry.dueAt = dueAt;
      return true;
    };
    let statsChanged = false;
    Object.values(stats.perCard || {}).forEach((entry) => {
      if (fix(entry)) statsChanged = true;
    });
    if (statsChanged) saveStats();
    let decksChanged = false;
    customDecks.forEach((deck) => {
      let changed = false;
      Object.values(deck.srs || {}).forEach((entry) => {
        if (fix(entry)) changed = true;
      });
      if (changed) {
        deck.updatedAt = new Date().toISOString();
        decksChanged = true;
      }
    });
    if (decksChanged) saveCustomDecks();
  }

  function migrateTodaysMisses() {
    const today = dateKey(new Date());
    const dueAt = nextMissDueAt(Date.now());
    const fix = (entry) => {
      if (!entry || entry.dueAt || entry.lastSeen !== today || entry.streak !== 0 || entry.due !== today) return false;
      entry.dueAt = dueAt;
      entry.due = dateKey(new Date(dueAt));
      return true;
    };
    let statsChanged = false;
    Object.values(stats.perCard || {}).forEach((entry) => {
      if (fix(entry)) statsChanged = true;
    });
    if (statsChanged) saveStats();
    let decksChanged = false;
    customDecks.forEach((deck) => {
      let changed = false;
      Object.values(deck.srs || {}).forEach((entry) => {
        if (fix(entry)) changed = true;
      });
      if (changed) {
        deck.updatedAt = new Date().toISOString();
        decksChanged = true;
      }
    });
    if (decksChanged) saveCustomDecks();
  }

  // Gives a graded term its next due time counted from `atMs`: a right answer
  // one interval later, a miss the next 6:00 AM Pacific. Reviews call this with
  // the time the session ended, so every term in a batch comes back together.
  function stampDue(entry, correct, atMs) {
    if (!entry) return;
    if (correct) {
      entry.dueAt = dueAtOnDay(atMs, BOX_INTERVALS_DAYS[Math.min(entry.box || 0, MAX_BOX)]);
    } else {
      entry.dueAt = nextMissDueAt(atMs);
    }
    entry.due = dateKey(new Date(entry.dueAt));
  }

  function isDue(entry, todayKeyStr) {
    if (!entry || !entry.due) return true;
    if (entry.dueAt) return Date.now() >= entry.dueAt;
    return entry.due <= todayKeyStr;
  }

  function applySrsResult(entry, correct, todayKeyStr) {
    const box = entry && typeof entry.box === "number" ? entry.box : 0;
    const streak = entry && typeof entry.streak === "number" ? entry.streak : 0;
    let nextBox;
    let due;
    let dueAt; // the moment the term is due again
    if (correct) {
      // Due again one interval later, at 6:00 that morning.
      nextBox = Math.min(box + 1, MAX_BOX);
      dueAt = dueAtOnDay(Date.now(), BOX_INTERVALS_DAYS[nextBox]);
      due = dateKey(new Date(dueAt));
    } else {
      nextBox = box; // a miss keeps the level; it only comes back sooner
      dueAt = nextMissDueAt(Date.now());
      due = dateKey(new Date(dueAt));
    }
    return {
      box: nextBox,
      due,
      dueAt,
      lastSeen: todayKeyStr,
      streak: correct ? streak + 1 : 0,
    };
  }

  function srsTier(entry) {
    if (!entry || (entry.right === 0 && entry.wrong === 0 && !entry.lastSeen)) return "new";
    const box = entry.box || 0;
    return box >= KNOWN_BOX_THRESHOLD ? "known" : "learning";
  }

  // Picks whichever of two SRS entries reflects the more recent review, for
  // merging local vs. imported state (box/due/streak are state, not
  // counters, so they can't just be summed the way right/wrong are).
  function pickNewerSrs(a, b) {
    const aSeen = (a && a.lastSeen) || "";
    const bSeen = (b && b.lastSeen) || "";
    const newer = bSeen > aSeen ? b : a;
    return {
      box: (newer && newer.box) || 0,
      due: (newer && newer.due) || null,
      dueAt: (newer && newer.dueAt) || undefined,
      lastSeen: (newer && newer.lastSeen) || null,
      streak: (newer && newer.streak) || 0,
    };
  }

  // Records one answer in the daily and per-card counters. The review schedule
  // is updated here too unless `gradeSrs` is false (lessons grade each kanji
  // once, however many questions it had; see gradeLessonTerm).
  // Each device counts its own answers separately (see sync.js): the totals the
  // app shows are the sum over all devices in the sync group.
  let syncCounts = null;

  function ownCounts() {
    const id = getDeviceId();
    if (!syncCounts.devices[id]) syncCounts.devices[id] = { daily: {}, perCard: {} };
    return syncCounts.devices[id];
  }

  function saveSyncCounts() {
    saveJson(SYNC_COUNTS_KEY, syncCounts);
  }

  function bumpOwnCounts(day, cardKey, correct) {
    const own = ownCounts();
    const d = own.daily[day] || (own.daily[day] = { completed: 0, right: 0, wrong: 0, reviews: 0 });
    d.completed++;
    d[correct ? "right" : "wrong"]++;
    const c = own.perCard[cardKey] || (own.perCard[cardKey] = { right: 0, wrong: 0 });
    c[correct ? "right" : "wrong"]++;
    saveSyncCounts();
  }

  // ---------- rank (sumo ranks, levelled up by completing reviews) ----------
  // A review is a question answered correctly in 復習 or すべて復習. Each rank
  // has five levels, and a level takes 100 reviews in the first rank (前相撲),
  // 200 in the next, and so on up to 横綱.

  const RANKS = ["前相撲", "序ノ口", "序二段", "三段目", "幕下", "十両", "前頭", "小結", "関脇", "大関", "横綱"];
  const LEVELS_PER_RANK = 5;

  // Colours (r, g, b), cold to warm: one per rank, and a cycle for the streak
  // that moves on every 10 days.
  const RANK_TONES = [
    "130, 140, 230",
    "100, 165, 240",
    "92, 195, 240",
    "76, 205, 205",
    "100, 215, 160",
    "170, 220, 110",
    "255, 215, 80",
    "255, 175, 90",
    "255, 130, 80",
    "255, 100, 95",
    "235, 60, 60",
  ];
  const STREAK_TONES = [
    "110, 130, 240",
    "92, 180, 240",
    "76, 200, 200",
    "126, 226, 168",
    "255, 210, 77",
    "255, 150, 90",
    "255, 100, 100",
  ];

  function totalReviews() {
    return Object.values(stats.daily || {}).reduce((sum, day) => sum + ((day && day.reviews) || 0), 0);
  }

  function rankInfo(total) {
    let remaining = total;
    for (let i = 0; i < RANKS.length; i++) {
      const perLevel = 100 * (i + 1);
      if (remaining < perLevel * LEVELS_PER_RANK) {
        const level = Math.floor(remaining / perLevel) + 1;
        return {
          name: RANKS[i],
          index: i,
          level,
          toNext: perLevel - (remaining % perLevel),
          nextRank: i + 1 < RANKS.length ? RANKS[i + 1] : null,
          toNextRank: perLevel * LEVELS_PER_RANK - remaining,
          maxed: false,
        };
      }
      remaining -= perLevel * LEVELS_PER_RANK;
    }
    return {
      name: RANKS[RANKS.length - 1],
      index: RANKS.length - 1,
      level: LEVELS_PER_RANK,
      toNext: 0,
      nextRank: null,
      toNextRank: 0,
      maxed: true,
    };
  }

  // Tapping the rank bubble shows how far the next level and the next rank are.
  function openRankModal() {
    const total = totalReviews();
    const rank = rankInfo(total);
    els.rankModal.style.setProperty("--tone", RANK_TONES[rank.index]);
    els.rankModalTitle.textContent = `${rank.name} Lv.${rank.level}`;
    const rows = [];
    if (rank.maxed) {
      rows.push(["", "最高ランクを達成しました。"]);
    } else {
      const lastLevel = rank.level === LEVELS_PER_RANK;
      if (!lastLevel || !rank.nextRank) {
        rows.push(["次のレベルまで", `あと${rank.toNext}回`]);
      }
      if (rank.nextRank) {
        rows.push([`${rank.nextRank}にランクアップまで`, `あと${rank.toNextRank}回`]);
      }
    }
    rows.push(["これまでの復習回数", `${total}回`]);
    els.rankModalBody.innerHTML =
      rows
        .map(([label, value]) =>
          label
            ? `<div class="modal-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
            : `<div class="modal-note">${escapeHtml(value)}</div>`
        )
        .join("") + `<div class="modal-note">復習・すべて復習で正解するたびに1回と数えます。</div>`;
    els.rankModal.hidden = false;
    els.rankModalClose.focus();
  }

  function closeRankModal() {
    els.rankModal.hidden = true;
  }

  els.rank.addEventListener("click", openRankModal);
  els.rankModalClose.addEventListener("click", closeRankModal);
  els.rankModal.addEventListener("click", (event) => {
    if (event.target === els.rankModal) closeRankModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.rankModal.hidden) closeRankModal();
  });

  function addReviewPoint() {
    const day = dateKey(new Date());
    if (!stats.daily[day]) stats.daily[day] = { completed: 0, right: 0, wrong: 0, reviews: 0 };
    stats.daily[day].reviews = (stats.daily[day].reviews || 0) + 1;
    const own = ownCounts();
    const d = own.daily[day] || (own.daily[day] = { completed: 0, right: 0, wrong: 0, reviews: 0 });
    d.reviews = (d.reviews || 0) + 1;
    saveStats();
    saveSyncCounts();
  }

  // Makes this device's own counters cover whatever the local statistics have
  // beyond what other devices already account for (first run, or after a
  // backup import). Only ever raises a counter, as counters must never go down.
  function reconcileOwnWithStats() {
    const id = getDeviceId();
    const others = { epoch: syncCounts.epoch, devices: { ...syncCounts.devices } };
    delete others.devices[id];
    const otherTotals = KanjiFlashSync.totalCounts(others);
    const own = ownCounts();
    Object.keys(stats.daily || {}).forEach((day) => {
      const mine = own.daily[day] || (own.daily[day] = { completed: 0, right: 0, wrong: 0, reviews: 0 });
      ["completed", "right", "wrong", "reviews"].forEach((field) => {
        const need = (stats.daily[day][field] || 0) - ((otherTotals.daily[day] && otherTotals.daily[day][field]) || 0);
        if (need > mine[field]) mine[field] = need;
      });
    });
    Object.keys(stats.perCard || {}).forEach((key) => {
      const mine = own.perCard[key] || (own.perCard[key] = { right: 0, wrong: 0 });
      ["right", "wrong"].forEach((field) => {
        const need = (stats.perCard[key][field] || 0) - ((otherTotals.perCard[key] && otherTotals.perCard[key][field]) || 0);
        if (need > mine[field]) mine[field] = need;
      });
    });
    saveSyncCounts();
  }

  function initSyncCounts() {
    migrateOldPairing();
    ensureSelfInGroup();
    const saved = loadJson(SYNC_COUNTS_KEY, null);
    syncCounts =
      saved && typeof saved === "object" && saved.devices && typeof saved.devices === "object"
        ? { epoch: Number(saved.epoch) || 0, devices: saved.devices }
        : { epoch: 0, devices: {} };
    ownCounts();
    reconcileOwnWithStats();
  }

  function recordResult(kanjiNum, correct, gradeSrs = true) {
    const day = dateKey(new Date());
    if (!stats.daily[day]) {
      stats.daily[day] = { completed: 0, right: 0, wrong: 0, reviews: 0 };
    }
    stats.daily[day].completed++;
    if (correct) {
      stats.daily[day].right++;
    } else {
      stats.daily[day].wrong++;
    }

    const cardKey = String(kanjiNum);
    if (!stats.perCard[cardKey]) {
      stats.perCard[cardKey] = { right: 0, wrong: 0 };
    }
    if (correct) {
      stats.perCard[cardKey].right++;
    } else {
      stats.perCard[cardKey].wrong++;
    }
    if (gradeSrs) {
      Object.assign(stats.perCard[cardKey], applySrsResult(stats.perCard[cardKey], correct, day));
    }

    bumpOwnCounts(day, cardKey, correct);
    saveStats();
  }

  // A kanji and the word (verb or adjective) that goes with it are scheduled
  // separately: the kanji (its meaning and onyomi) under its number, the word
  // (its reading and meaning) under "w<number>".
  // A kanji, the word (verb or adjective) that goes with it, and the noun made
  // of just that kanji (read as a kunyomi) are scheduled separately: the kanji
  // under its number, the word under "w<number>" and the noun under "n<number>".
  const groupOfType = (type) =>
    type === "wordReading" || type === "wordMeaning"
      ? "word"
      : type === "nounReading" || type === "nounMeaning"
      ? "noun"
      : "kanji";
  const srsKeyOf = (num, group) => (group === "word" ? `w${num}` : group === "noun" ? `n${num}` : String(num));

  function gradeBuiltinSrs(kanjiNum, correct, group = "kanji") {
    const cardKey = srsKeyOf(kanjiNum, group);
    if (!stats.perCard[cardKey]) {
      stats.perCard[cardKey] = { right: 0, wrong: 0 };
    }
    Object.assign(
      stats.perCard[cardKey],
      applySrsResult(stats.perCard[cardKey], correct, dateKey(new Date()))
    );
    saveStats();
  }

  // Progress for an item lives in stats.perCard for the built-in deck and in
  // the deck's own srs (keyed by card front) for a custom deck, so Lessons and
  // Ultimate Challenge share progress with that deck's other study modes.
  function srsOf(item, group = "kanji") {
    if (item.deckId) {
      const deck = customDeckById(item.deckId);
      return (deck && deck.srs && deck.srs[item.front]) || null;
    }
    return stats.perCard[srsKeyOf(item.num, group)] || null;
  }

  // Progress shown by colour. A correct answer moves a card up one box: the
  // lesson takes it to box 1 and each review one higher, so box 3 means two
  // reviews are done (lime), 4 three (green), 5 four (pink), 6 five (purple), 7
  // six (light blue). Before that a studied card is "learning"; one never
  // studied is "new".
  const REVIEW_STATUS_BY_BOX = { 3: "r2", 4: "r3", 5: "r4", 6: "r5", 7: "r6" };

  function statusOfEntry(entry, studied) {
    if (!studied || !entry) return "new";
    const box = Math.min(entry.box || 0, MAX_BOX);
    return REVIEW_STATUS_BY_BOX[box] || "learning";
  }

  function isItemStudied(item) {
    const entry = srsOf(item);
    if (!entry) return false;
    return item.deckId ? Boolean(entry.lastSeen) : entry.right > 0 || entry.wrong > 0;
  }

  function recordItemResult(item, correct, gradeSrs = true) {
    if (!item.deckId) {
      recordResult(item.num, correct, gradeSrs);
      return;
    }
    const deck = customDeckById(item.deckId);
    if (deck && gradeSrs) applyCustomSrsResult(deck, item.front, correct);
  }

  function gradeItemSrs(item, correct, group = "kanji") {
    if (!item.deckId) {
      gradeBuiltinSrs(item.num, correct, group);
      return;
    }
    const deck = customDeckById(item.deckId);
    if (deck) applyCustomSrsResult(deck, item.front, correct);
  }

  function getCardStats(kanjiNum) {
    return stats.perCard[String(kanjiNum)] || { right: 0, wrong: 0 };
  }

  // ---------- custom (user-added) answers ----------
  // Stored per kanji as { meaning: string[], onyomi: string[], kunyomi: string[] }.
  // Answers were originally a flat string[] per kanji (before question types
  // were split out); normalizeCustomAnswersShape migrates that old shape by
  // sorting each answer into a bucket based on its script (katakana ->
  // onyomi, hiragana -> kunyomi, else -> meaning).

  const HIRAGANA_RANGE = /[぀-ゟ]/;
  const KATAKANA_RANGE = /[゠-ヿ]/;

  function normalizeCustomAnswersShape(raw) {
    const result = {};
    Object.keys(raw || {}).forEach((key) => {
      const val = raw[key];
      if (Array.isArray(val)) {
        const migrated = { meaning: [], onyomi: [], kunyomi: [] };
        val.forEach((ans) => {
          if (KATAKANA_RANGE.test(ans)) migrated.onyomi.push(ans);
          else if (HIRAGANA_RANGE.test(ans)) migrated.kunyomi.push(ans);
          else migrated.meaning.push(ans);
        });
        result[key] = migrated;
      } else if (val && typeof val === "object") {
        result[key] = {
          meaning: Array.isArray(val.meaning) ? val.meaning : [],
          onyomi: Array.isArray(val.onyomi) ? val.onyomi : [],
          kunyomi: Array.isArray(val.kunyomi) ? val.kunyomi : [],
          wordMeaning: Array.isArray(val.wordMeaning) ? val.wordMeaning : [],
          nounReading: Array.isArray(val.nounReading) ? val.nounReading : [],
          nounMeaning: Array.isArray(val.nounMeaning) ? val.nounMeaning : [],
        };
      }
    });
    return result;
  }

  function loadCustomAnswers() {
    try {
      const raw = localStorage.getItem(CUSTOM_ANSWERS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function saveCustomAnswers() {
    try {
      localStorage.setItem(CUSTOM_ANSWERS_KEY, JSON.stringify(customAnswers));
    } catch (err) {
      /* localStorage unavailable (private mode, quota, etc.) */
    }
  }

  function getCustomAnswers(kanjiNum, type) {
    const entry = customAnswers[String(kanjiNum)];
    return (entry && entry[type]) || [];
  }

  function getAllCustomAnswers(kanjiNum) {
    return customAnswers[String(kanjiNum)] || null;
  }

  function addCustomAnswer(kanjiNum, type, rawAnswer) {
    const trimmed = rawAnswer.trim();
    if (!trimmed) return;
    const key = String(kanjiNum);
    const entry = customAnswers[key] || { meaning: [], onyomi: [], kunyomi: [] };
    const norm = normalize(trimmed);
    const list = entry[type] || [];
    if (list.some((a) => normalize(a) === norm)) return;
    customAnswers[key] = { ...entry, [type]: [...list, trimmed] };
    saveCustomAnswers();
  }

  function formatCustomAnswersSummary(kanjiNum) {
    const entry = getAllCustomAnswers(kanjiNum);
    if (!entry) return "";
    const parts = [];
    if (entry.kunyomi && entry.kunyomi.length) {
      parts.push(`Kunyomi: ${entry.kunyomi.join(", ")}`);
    }
    if (entry.onyomi && entry.onyomi.length) {
      parts.push(`Onyomi: ${entry.onyomi.join(", ")}`);
    }
    if (entry.meaning && entry.meaning.length) {
      parts.push(`Meaning: ${entry.meaning.join(", ")}`);
    }
    return parts.join(" · ");
  }

  // ---------- custom decks (user-uploaded CSV flashcard sets) ----------
  // Each deck: { id, name, createdAt, updatedAt, cards: [{ front, sections: [{label, value}] }] }.
  // The first CSV column is the card front (no label shown); the header text
  // of every later column becomes a section label on the back, paired with
  // that row's value in the same column.

  function parseCsvText(text) {
    const clean = String(text).replace(/^\uFEFF/, "");
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    let i = 0;
    const n = clean.length;
    while (i < n) {
      const c = clean[i];
      if (inQuotes) {
        if (c === '"') {
          if (clean[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        field += c;
        i++;
        continue;
      }
      if (c === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (c === ",") {
        row.push(field);
        field = "";
        i++;
        continue;
      }
      if (c === "\r") {
        i++;
        continue;
      }
      if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i++;
        continue;
      }
      field += c;
      i++;
    }
    row.push(field);
    rows.push(row);
    return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
  }

  // A header named "<Label> (extra answers)" carries added-answer data
  // (see addCustomDeckAnswer) rather than display content — deckToCsvText
  // emits one of these per column that has any, so re-uploading a deck you
  // exported restores your added answers instead of showing them as a
  // bogus extra flashcard section.
  const EXTRA_ANSWERS_SUFFIX = " (extra answers)";

  // Two optional columns carry Jisho-style labels instead of study content:
  // "Common" ("Common word" or "Uncommon") and "JLPT" ("N3"). They are kept on
  // the card as `tags` and shown as badges, never asked as questions.
  const COMMON_HEADER = "common";
  const JLPT_HEADER = "jlpt";
  const POS_HEADERS = ["part of speech", "pos"];

  // The part of speech column holds Jisho/JMdict-style text such as
  // "verb (ru)", "i-adj" or "noun, suru verb". Each comma-separated part maps
  // to one broad category used for the filters and the badges.
  const POS_CATEGORIES = [
    ["noun", "Noun"],
    ["verb", "Verb"],
    ["adjective", "Adjective"],
    ["adverb", "Adverb"],
    ["pronoun", "Pronoun"],
    ["particle", "Particle"],
    ["conjunction", "Conjunction"],
    ["interjection", "Interjection"],
    ["expression", "Expression"],
    ["auxiliary", "Auxiliary"],
    ["affix", "Prefix / Suffix"],
    ["number", "Number"],
    ["other", "Other"],
  ];
  const POS_LABELS = Object.fromEntries(POS_CATEGORIES);

  function posCategories(raw) {
    const found = new Set();
    String(raw || "")
      .split(",")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean)
      .forEach((p) => {
        if (/^aux/.test(p)) found.add("auxiliary");
        else if (/verb/.test(p) || p === "kuru") found.add("verb");
        else if (/adj/.test(p)) found.add("adjective");
        else if (/^adv/.test(p)) found.add("adverb");
        else if (/^pron/.test(p)) found.add("pronoun");
        else if (/^part/.test(p)) found.add("particle");
        else if (/^conj/.test(p)) found.add("conjunction");
        else if (/^interj/.test(p)) found.add("interjection");
        else if (/^expr/.test(p)) found.add("expression");
        else if (/suffix|prefix/.test(p)) found.add("affix");
        else if (/^num|^count/.test(p)) found.add("number");
        else if (/^noun|^n$/.test(p)) found.add("noun");
        else found.add("other");
      });
    return Array.from(found);
  }

  function parseTags(commonCell, jlptCell, posCell) {
    const common = /^common/i.test(commonCell) ? true : /^(uncommon|not common)/i.test(commonCell) ? false : null;
    const level = /([1-5])/.exec(jlptCell || "");
    const jlpt = level ? Number(level[1]) : null;
    const pos = posCell ? posCell : null;
    return common === null && jlpt === null && pos === null ? null : { common, jlpt, pos };
  }

  function termTagsHtml(tags) {
    if (!tags) return "";
    const out = [];
    if (tags.common) out.push(`<span class="tag tag-common">Common word</span>`);
    if (tags.jlpt) out.push(`<span class="tag tag-jlpt tag-jlpt${tags.jlpt}">JLPT N${tags.jlpt}</span>`);
    if (tags.common === false && !tags.jlpt) out.push(`<span class="tag">Uncommon</span>`);
    posCategories(tags.pos).forEach((cat) => out.push(`<span class="tag tag-pos">${escapeHtml(POS_LABELS[cat])}</span>`));
    return out.join("");
  }

  // What the lesson filters look at for a card.
  function tagFacets(tags) {
    if (!tags) return null;
    return {
      common: tags.common ? "common" : "other",
      jlpt: tags.jlpt ? String(tags.jlpt) : "none",
      pos: posCategories(tags.pos),
    };
  }

  // Returns { columns, cards, answers }. `columns` is the full ordered
  // header list of regular content columns (kept at the deck level, not
  // just implied by each card's sections) so a column that's blank on
  // every row still round-trips correctly on export — a card's `sections`
  // only lists its non-empty cells. `answers` mirrors deck.answers' shape,
  // parsed out of any "(extra answers)" columns present.
  function buildCustomDeckCards(rows) {
    if (!rows.length) return { columns: [], cards: [], answers: {} };
    const header = rows[0];
    const rawLabels = header.slice(1).map((h, idx) => (h || "").trim() || `Column ${idx + 2}`);
    const columns = [];
    const commonIdx = rawLabels.findIndex((l) => l.toLowerCase() === COMMON_HEADER);
    const jlptIdx = rawLabels.findIndex((l) => l.toLowerCase() === JLPT_HEADER);
    const posIdx = rawLabels.findIndex((l) => POS_HEADERS.includes(l.toLowerCase()));
    // Parallel to rawLabels: null for a regular column, or the label it
    // supplies extra answers for.
    const extraAnswerTarget = rawLabels.map((label, idx) => {
      if (label.endsWith(EXTRA_ANSWERS_SUFFIX)) {
        return label.slice(0, -EXTRA_ANSWERS_SUFFIX.length);
      }
      if (idx !== commonIdx && idx !== jlptIdx && idx !== posIdx) columns.push(label);
      return null;
    });

    const cards = [];
    const answers = {};
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const front = (row[0] || "").trim();
      if (!front) continue;
      const sections = [];
      rawLabels.forEach((label, idx) => {
        const value = (row[idx + 1] || "").trim();
        if (!value) return;
        if (idx === commonIdx || idx === jlptIdx || idx === posIdx) return;
        const targetLabel = extraAnswerTarget[idx];
        if (targetLabel) {
          const list = value.split(";").map((s) => s.trim()).filter(Boolean);
          if (!list.length) return;
          const existing = (answers[front] && answers[front][targetLabel]) || [];
          answers[front] = {
            ...(answers[front] || {}),
            [targetLabel]: Array.from(new Set([...existing, ...list])),
          };
        } else {
          sections.push({ label, value });
        }
      });
      const tags = parseTags(
        commonIdx >= 0 ? (row[commonIdx + 1] || "").trim() : "",
        jlptIdx >= 0 ? (row[jlptIdx + 1] || "").trim() : "",
        posIdx >= 0 ? (row[posIdx + 1] || "").trim() : ""
      );
      cards.push(tags ? { front, sections, tags } : { front, sections });
    }
    return { columns, cards, answers };
  }

  function csvEscapeField(value) {
    const str = String(value != null ? value : "");
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  // Older decks saved before `columns` was tracked at the deck level don't
  // have it; fall back to the union of section labels actually present
  // across their cards (in first-seen order) so export still works.
  function deckColumns(deck) {
    if (Array.isArray(deck.columns) && deck.columns.length) return deck.columns;
    const seen = [];
    const seenSet = new Set();
    (deck.cards || []).forEach((card) => {
      (card.sections || []).forEach((s) => {
        if (!seenSet.has(s.label)) {
          seenSet.add(s.label);
          seen.push(s.label);
        }
      });
    });
    return seen;
  }

  function deckToCsvText(deck) {
    const columns = deckColumns(deck);
    const answers = deck.answers || {};
    // Only emit an "(extra answers)" column for labels that actually have
    // at least one added answer somewhere in the deck, so decks that never
    // used the feature export exactly as before.
    const extraColumns = columns.filter((label) =>
      deck.cards.some((card) => ((answers[card.front] && answers[card.front][label]) || []).length)
    );
    const hasTags = deck.cards.some((card) => card.tags);
    const header = [
      "Front",
      ...columns,
      ...extraColumns.map((label) => `${label}${EXTRA_ANSWERS_SUFFIX}`),
      ...(hasTags ? ["Common", "JLPT", "Part of speech"] : []),
    ];
    const lines = [header.map(csvEscapeField).join(",")];
    deck.cards.forEach((card) => {
      const valueByLabel = new Map(card.sections.map((s) => [s.label, s.value]));
      const mainCells = columns.map((label) => valueByLabel.get(label) || "");
      const extraCells = extraColumns.map((label) =>
        ((answers[card.front] && answers[card.front][label]) || []).join("; ")
      );
      const tagCells = hasTags
        ? [
            card.tags && card.tags.common ? "Common word" : card.tags && card.tags.common === false ? "Uncommon" : "",
            card.tags && card.tags.jlpt ? `N${card.tags.jlpt}` : "",
            (card.tags && card.tags.pos) || "",
          ]
        : [];
      const row = [card.front, ...mainCells, ...extraCells, ...tagCells];
      lines.push(row.map(csvEscapeField).join(","));
    });
    return lines.join("\r\n");
  }

  function sanitizeFilename(name) {
    const cleaned = String(name || "").trim().replace(/[\\/:*?"<>|]+/g, "_");
    return cleaned || "deck";
  }

  function downloadTextFile(filename, text, mimeType) {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const CUSTOM_DECK_TEMPLATE_CSV =
    "Front,Reading,Meaning\r\n" +
    '舞台,ぶたい,"stage, setting (of a story)"\r\n' +
    '幕,まく,"curtain, act (of a play)"\r\n' +
    "猫,ねこ,cat\r\n";

  function loadCustomDecks() {
    try {
      const raw = localStorage.getItem(CUSTOM_DECKS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function saveCustomDecks() {
    try {
      localStorage.setItem(CUSTOM_DECKS_KEY, JSON.stringify(customDecks));
    } catch (err) {
      /* localStorage unavailable (private mode, quota, etc.) */
    }
  }

  function jsonByteSize(value) {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch (err) {
      return JSON.stringify(value).length;
    }
  }

  function makeDeckId() {
    if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  // Unions added-answer data from a re-uploaded file (parsed "(extra
  // answers)" columns) into a deck's existing answers, deduping by
  // normalized text — never lets a replace/re-import lose answers that
  // were already recorded locally.
  function mergeDeckAnswers(existing, incoming) {
    const merged = { ...(existing || {}) };
    Object.keys(incoming || {}).forEach((front) => {
      const existingEntry = merged[front] || {};
      const combinedEntry = { ...existingEntry };
      Object.keys(incoming[front]).forEach((label) => {
        const existingList = existingEntry[label] || [];
        const seen = new Set(existingList.map((a) => normalize(a)));
        const combinedList = [...existingList];
        incoming[front][label].forEach((a) => {
          const norm = normalize(a);
          if (!seen.has(norm)) {
            seen.add(norm);
            combinedList.push(a);
          }
        });
        combinedEntry[label] = combinedList;
      });
      merged[front] = combinedEntry;
    });
    return merged;
  }

  function upsertCustomDeck(name, cards, columns, parsedAnswers, replaceId) {
    const now = new Date().toISOString();
    let deck = null;
    if (replaceId) {
      const idx = customDecks.findIndex((d) => d.id === replaceId);
      if (idx !== -1) {
        const answers = mergeDeckAnswers(customDecks[idx].answers, parsedAnswers);
        customDecks[idx] = { ...customDecks[idx], name, cards, columns, answers, updatedAt: now };
        deck = customDecks[idx];
      }
    }
    if (!deck) {
      deck = { id: makeDeckId(), name, cards, columns, answers: parsedAnswers || {}, srs: {}, createdAt: now, updatedAt: now };
      customDecks.push(deck);
    }
    saveCustomDecks();
    return deck;
  }

  function loadJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      return parsed === null ? fallback : parsed;
    } catch (err) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* localStorage unavailable */
    }
  }

  function deleteCustomDeckById(id) {
    customDecks = customDecks.filter((d) => d.id !== id);
    saveCustomDecks();
    // Device sync matches decks by id; the tombstone stops the other device
    // from sending a deleted deck back.
    const tombstones = loadJson(DECK_TOMBSTONES_KEY, {});
    tombstones[id] = new Date().toISOString();
    saveJson(DECK_TOMBSTONES_KEY, tombstones);
  }

  // One button per deck: tapping it starts that deck's review right away.
  // The bubble gets warmer for every 25 reviews waiting (cool blue up to red).
  function deckReviewButton(name, meta, dueCount) {
    return `
          <button class="deck-review-btn deck-review-btn-chip" data-action="review" type="button"${dueCount ? "" : " disabled"}>
            <span class="deck-review-text">
              <span class="custom-deck-name">${escapeHtml(name)}</span>
              <span class="custom-deck-meta">${escapeHtml(meta)}</span>
            </span>
            <span class="mode-due${dueCount ? ` has-due due-tier-${Math.min(5, Math.floor(dueCount / 25))}` : ""}"><span class="mode-due-num">${dueCount}</span></span>
          </button>`;
  }

  // The number on a deck's button is how many questions its review asks: one
  // for each answer a due term has (meaning, reading, ...).
  function questionCount(items) {
    return items.reduce((n, item) => n + availableQuestionTypes(item).length, 0);
  }

  function customQuestionCount(cards) {
    return cards.reduce((n, card) => n + card.sections.length, 0);
  }

  function renderCustomDecksList() {
    els.customDecksEmpty.hidden = customDecks.length > 0;
    const n2Row = `
      <div class="custom-deck-row" data-deck-id="${KANJI_DECK_ID}">
        <div class="custom-deck-header">${deckReviewButton("N2漢字", `${visibleKanji().length}枚`, unitQuestionCount(getReviewUnits(visibleKanji())))}
        </div>
      </div>`;
    const leechItems = getLeechItems();
    const leechCount = leechItems.length;
    const leechRow = `
      <div class="custom-deck-row" data-deck-id="leech">
        <div class="custom-deck-header">${deckReviewButton("リーチ", leechCount ? "苦手なカード（任意）" : "苦手なカードはありません", questionCount(leechItems))}
        </div>
      </div>`;
    els.customDecksList.innerHTML = n2Row + customDecks
      .map((deck) => {
        return `
      <div class="custom-deck-row" data-deck-id="${escapeHtml(deck.id)}">
        <div class="custom-deck-header">${deckReviewButton(deck.name, `${deck.cards.length}枚`, customQuestionCount(getDueCustomCards(deck)))}
        </div>
      </div>`;
      })
      .join("") + leechRow;
  }

  els.customDecksList.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) return;
    const row = actionBtn.closest(".custom-deck-row");
    const deckId = row && row.dataset.deckId;
    if (deckId === "leech") {
      const items = getLeechItems();
      if (items.length) beginLesson(items, "leech");
      return;
    }
    if (deckId === KANJI_DECK_ID) {
      activateDeck(KANJI_DECK_ID);
      const units = getReviewUnits();
      if (units.length) startReview(units);
      return;
    }
    const deck = customDecks.find((d) => d.id === deckId);
    if (!deck) return;
    const action = actionBtn.dataset.action;
    if (action === "review") {
      startCustomDeckReview(deck);
    }
  });

  // ---------- deck editor ----------
  // Changes here are saved straight to the deck, so Lessons, 復習 and すべて復習
  // (which read the deck when they open) pick them up.

  let editingDeckId = null;
  let lastDeletedCard = null;
  let undoTimer = null;

  function hideEditUndo() {
    window.clearTimeout(undoTimer);
    els.deckEditUndo.hidden = true;
    els.deckEditStatus.hidden = true; // also left behind whenever the screen changes
    lastDeletedCard = null;
  }

  function cardSummary(card) {
    return card.sections.map((s) => s.value).join(" · ");
  }

  // ---------- mnemonics of a term, from 編集 ----------
  // The same notes as the Mnemonic box on the study screen (same keys), for a
  // kanji, its word and its noun, or for a custom card: one note for the
  // meaning and one for the readings of each.

  function deckCardItem(deck, card) {
    return { deckId: deck.id, front: card.front, kanji: card.front, sections: card.sections };
  }

  function noteFieldsFor(item) {
    const base = leechKey(item);
    const fields = [
      { label: "Meaning", key: `${base}|meaning` },
      { label: "Readings", key: `${base}|readings` },
    ];
    if (item.word) {
      fields.push({ label: `単語 ${item.word} · Meaning`, key: `${base}|word|meaning` });
      fields.push({ label: `単語 ${item.word} · Readings`, key: `${base}|word|readings` });
    }
    if (item.noun) {
      fields.push({ label: `名詞 ${item.noun} · Meaning`, key: `${base}|noun|meaning` });
      fields.push({ label: `名詞 ${item.noun} · Readings`, key: `${base}|noun|readings` });
    }
    return fields;
  }

  // ---------- added answers of a term, from 編集 ----------
  // The answers added with 答えを追加 while answering, listed per question so
  // they can be looked at, added by hand and removed. A slot is one question:
  // { label, list(), add(text), remove(text) }.

  function answerSlotsFor(item, deck) {
    if (item.sections) {
      return item.sections.map((section) => ({
        label: section.label,
        list: () => getCustomDeckAnswers(deck, item.front, section.label),
        add: (text) => {
          addCustomDeckAnswer(deck, item.front, section.label, text);
          deck.updatedAt = new Date().toISOString();
          saveCustomDecks();
        },
        remove: (text) => {
          const entry = (deck.answers && deck.answers[item.front]) || {};
          const list = (entry[section.label] || []).filter((a) => a !== text);
          deck.answers = { ...(deck.answers || {}), [item.front]: { ...entry, [section.label]: list } };
          deck.updatedAt = new Date().toISOString();
          saveCustomDecks();
        },
      }));
    }
    const slot = (label, bucket) => ({
      label,
      list: () => getCustomAnswers(item.num, bucket),
      add: (text) => addCustomAnswer(item.num, bucket, text),
      remove: (text) => {
        const entry = customAnswers[String(item.num)] || {};
        customAnswers[String(item.num)] = { ...entry, [bucket]: (entry[bucket] || []).filter((a) => a !== text) };
        saveCustomAnswers();
      },
    });
    const slots = [slot("Meaning", "meaning")];
    if (item.onyomi) slots.push(slot("音読み", "onyomi"));
    if (item.word) {
      slots.push(slot("単語の読み方", answerBucket("wordReading")));
      slots.push(slot("Word meaning", "wordMeaning"));
    }
    if (item.noun) {
      slots.push(slot("訓読み", "nounReading"));
      slots.push(slot("Noun meaning", "nounMeaning"));
    }
    return slots;
  }

  function editAnswersButton(slots) {
    const has = slots.some((s) => s.list().length);
    return `<button class="edit-answers${has ? " has-answers" : ""}" data-action="edit-answers" type="button" aria-label="追加した答え">答え</button>`;
  }

  let answersContext = null; // { title, slots }

  function renderAnswersModal() {
    els.answersModalTitle.textContent = answersContext.title;
    els.answersBody.innerHTML = answersContext.slots
      .map((slot, s) => {
        const list = slot.list();
        return `<div class="answer-slot" data-slot="${s}">
          <div class="note-field-label">${escapeHtml(slot.label)}</div>
          ${
            list.length
              ? `<div class="answer-chips">${list
                  .map(
                    (a, i) =>
                      `<span class="answer-chip">${escapeHtml(a)}<button type="button" data-action="remove-answer" data-index="${i}" aria-label="${escapeHtml(a)}を削除">✕</button></span>`
                  )
                  .join("")}</div>`
              : `<div class="answer-none">追加した答えはありません</div>`
          }
          <div class="answer-add">
            <input type="text" placeholder="答えを追加" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false">
            <button class="secondary-btn" type="button" data-action="add-answer">追加</button>
          </div>
        </div>`;
      })
      .join("");
  }

  function openAnswersModal(title, slots) {
    answersContext = { title, slots };
    renderAnswersModal();
    els.answersModal.hidden = false;
  }

  function closeAnswersModal() {
    els.answersModal.hidden = true;
    answersContext = null;
    renderDeckEdit(); // refresh which rows have added answers
  }

  function addAnswerFromInput(slotEl) {
    const input = slotEl.querySelector("input");
    const text = input.value.trim();
    if (!text) return;
    answersContext.slots[Number(slotEl.dataset.slot)].add(text);
    renderAnswersModal();
  }

  els.answersBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || !answersContext) return;
    const slotEl = button.closest(".answer-slot");
    const slot = answersContext.slots[Number(slotEl.dataset.slot)];
    if (button.dataset.action === "remove-answer") {
      const answer = slot.list()[Number(button.dataset.index)];
      if (answer !== undefined) slot.remove(answer);
      renderAnswersModal();
    } else if (button.dataset.action === "add-answer") {
      addAnswerFromInput(slotEl);
    }
  });
  els.answersBody.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.isComposing || !event.target.closest(".answer-add input")) return;
    event.preventDefault();
    addAnswerFromInput(event.target.closest(".answer-slot"));
  });
  els.answersModalClose.addEventListener("click", closeAnswersModal);
  els.answersModal.addEventListener("click", (event) => {
    if (event.target === els.answersModal) closeAnswersModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.answersModal.hidden) closeAnswersModal();
  });

  function editNoteButton(fields) {
    const has = fields.some((f) => mnemonics[f.key] && mnemonics[f.key].text.trim());
    return `<button class="edit-note${has ? " has-note" : ""}" data-action="edit-note" type="button" aria-label="メモ">メモ</button>`;
  }

  function openNoteModal(title, fields) {
    els.noteModalTitle.textContent = title;
    els.noteFields.innerHTML = fields
      .map(
        (f, i) => `<div>
          <div class="note-field-label">${escapeHtml(f.label)}</div>
          <textarea class="note-field-input" rows="2" data-key="${escapeHtml(f.key)}" placeholder="語呂合わせやメモを入力" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false">${escapeHtml(mnemonics[f.key] ? mnemonics[f.key].text : "")}</textarea>
        </div>`
      )
      .join("");
    els.noteModal.hidden = false;
  }

  function closeNoteModal() {
    els.noteModal.hidden = true;
    renderDeckEdit(); // refresh which rows have a note
  }

  // Saved as it is typed, like the box on the study screen.
  els.noteFields.addEventListener("input", (event) => {
    const field = event.target.closest(".note-field-input");
    if (!field) return;
    mnemonics[field.dataset.key] = { text: field.value, at: Date.now() };
    saveMnemonics();
  });
  els.noteModalClose.addEventListener("click", closeNoteModal);
  els.noteModal.addEventListener("click", (event) => {
    if (event.target === els.noteModal) closeNoteModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.noteModal.hidden) closeNoteModal();
  });

  function renderKanjiEdit() {
    const removedCount = n2Kanji.length - visibleKanji().length;
    els.deckEditLegend.hidden = false;
    els.deckEditToolbar.hidden = false;
    els.deckEditToolbar.querySelectorAll("[data-action]").forEach((btn) => {
      btn.hidden = btn.dataset.action !== "restore-kanji";
    });
    els.deckEditRestoreBtn.disabled = removedCount === 0;
    els.deckEditRestoreBtn.textContent = removedCount ? `削除した漢字を戻す（${removedCount}）` : "削除した漢字はありません";
    els.deckEditTitle.textContent = "N2漢字";
    els.deckEditList.innerHTML = visibleKanji()
      .map((item) => {
        const status = statusOfEntry(srsOf(item), isItemStudied(item));
        return `
        <div class="edit-row status-${status}" data-num="${item.num}">
          <span class="edit-front">${escapeHtml(item.kanji)}</span>
          <span class="edit-sub">${escapeHtml([item.onyomi || item.kunyomi, item.meaning].filter(Boolean).join(" · "))}</span>
          ${editNoteButton(noteFieldsFor(item))}
          ${editAnswersButton(answerSlotsFor(item))}
          <button class="edit-delete" data-action="delete-card" type="button" aria-label="${escapeHtml(item.kanji)}を削除">✕</button>
        </div>`;
      })
      .join("");
  }

  function renderDeckEdit() {
    els.deckEditNewBtn.hidden = Boolean(editingDeckId);
    if (editingDeckId === KANJI_DECK_ID) {
      renderKanjiEdit();
      return;
    }
    const deck = editingDeckId ? customDeckById(editingDeckId) : null;
    if (editingDeckId && !deck) editingDeckId = null;
    els.deckEditLegend.hidden = !deck;
    els.deckEditToolbar.hidden = !deck;
    if (deck) {
      els.deckEditToolbar.querySelectorAll("[data-action]").forEach((btn) => {
        btn.hidden = btn.dataset.action === "restore-kanji";
      });
    }
    if (!deck) {
      els.deckEditTitle.textContent = "デッキを編集";
      els.deckEditList.innerHTML =
        `
        <button class="edit-row" type="button" data-edit-deck="${KANJI_DECK_ID}">
          <span class="edit-front">N2漢字</span>
          <span class="edit-sub">${visibleKanji().length}枚</span>
        </button>` +
        customDecks
          .map(
            (d) => `
        <button class="edit-row" type="button" data-edit-deck="${escapeHtml(d.id)}">
          <span class="edit-front">${escapeHtml(d.name)}</span>
          <span class="edit-sub">${d.cards.length}枚</span>
        </button>`
          )
          .join("");
      return;
    }
    els.deckEditTitle.textContent = deck.name;
    els.deckEditList.innerHTML = deck.cards.length
      ? deck.cards
          .map((card, index) => {
            const entry = deck.srs && deck.srs[card.front];
            const status = statusOfEntry(entry, Boolean(entry && entry.lastSeen));
            return `
        <div class="edit-row status-${status}" data-index="${index}">
          <span class="edit-front">${escapeHtml(card.front)}</span>
          <span class="edit-main">
            <span class="edit-sub">${escapeHtml(cardSummary(card))}</span>
            ${card.tags ? `<span class="edit-tags">${termTagsHtml(card.tags)}</span>` : ""}
          </span>
          ${editNoteButton(noteFieldsFor(deckCardItem(deck, card)))}
          ${editAnswersButton(answerSlotsFor(deckCardItem(deck, card), deck))}
          <button class="edit-delete" data-action="delete-card" type="button" aria-label="${escapeHtml(card.front)}を削除">✕</button>
        </div>`;
          })
          .join("")
      : `<p class="stats-footnote">このデッキにはカードがありません。</p>`;
  }

  function openDeckEdit() {
    editingDeckId = null;
    hideEditUndo();
    renderDeckEdit();
    showScreen("deckEdit");
  }

  function deleteDeckCard(deck, index) {
    const [card] = deck.cards.splice(index, 1);
    if (!card) return;
    const srsEntry = deck.srs && deck.srs[card.front];
    if (deck.srs) delete deck.srs[card.front];
    deck.updatedAt = new Date().toISOString();
    saveCustomDecks();
    lastDeletedCard = { deckId: deck.id, card, index, srsEntry };
    els.deckEditUndoText.textContent = `「${card.front}」を削除しました`;
    els.deckEditUndo.hidden = false;
    window.clearTimeout(undoTimer);
    undoTimer = window.setTimeout(hideEditUndo, 8000);
    renderDeckEdit();
  }

  els.editDecksBtn.addEventListener("click", openDeckEdit);

  // A new deck starts empty, with reading and meaning columns, and opens
  // straight away so terms can be added to it.
  els.deckEditNewBtn.addEventListener("click", () => {
    const name = (window.prompt("新しいデッキの名前") || "").trim();
    if (!name) return;
    const deck = upsertCustomDeck(name, [], ["読み", "意味"], {}, null);
    hideEditUndo();
    editingDeckId = deck.id;
    renderDeckEdit();
  });

  els.deckEditBackBtn.addEventListener("click", () => {
    hideEditUndo();
    if (editingDeckId) {
      editingDeckId = null;
      renderDeckEdit();
    } else {
      showScreen("home");
    }
  });

  els.deckEditList.addEventListener("click", (event) => {
    const open = event.target.closest("[data-edit-deck]");
    if (open) {
      editingDeckId = open.dataset.editDeck;
      hideEditUndo();
      renderDeckEdit();
      return;
    }
    const answers = event.target.closest("[data-action='edit-answers']");
    if (answers) {
      const row = answers.closest(".edit-row");
      if (editingDeckId === KANJI_DECK_ID) {
        const item = n2Kanji.find((k) => k.num === Number(row.dataset.num));
        if (item) openAnswersModal(item.kanji, answerSlotsFor(item));
      } else {
        const deck = editingDeckId && customDeckById(editingDeckId);
        const card = deck && deck.cards[Number(row.dataset.index)];
        if (card) openAnswersModal(card.front, answerSlotsFor(deckCardItem(deck, card), deck));
      }
      return;
    }
    const note = event.target.closest("[data-action='edit-note']");
    if (note) {
      const row = note.closest(".edit-row");
      if (editingDeckId === KANJI_DECK_ID) {
        const item = n2Kanji.find((k) => k.num === Number(row.dataset.num));
        if (item) openNoteModal(item.kanji, noteFieldsFor(item));
      } else {
        const deck = editingDeckId && customDeckById(editingDeckId);
        const card = deck && deck.cards[Number(row.dataset.index)];
        if (card) openNoteModal(card.front, noteFieldsFor(deckCardItem(deck, card)));
      }
      return;
    }
    const del = event.target.closest("[data-action='delete-card']");
    if (del && editingDeckId === KANJI_DECK_ID) {
      const num = Number(del.closest(".edit-row").dataset.num);
      const item = n2Kanji.find((k) => k.num === num);
      if (!item) return;
      setKanjiRemoved(num, true);
      lastDeletedCard = { kanjiNum: num };
      els.deckEditUndoText.textContent = `「${item.kanji}」を削除しました`;
      els.deckEditUndo.hidden = false;
      window.clearTimeout(undoTimer);
      undoTimer = window.setTimeout(hideEditUndo, 8000);
      renderDeckEdit();
      return;
    }
    const deck = editingDeckId && customDeckById(editingDeckId);
    if (!del || !deck) return;
    deleteDeckCard(deck, Number(del.closest(".edit-row").dataset.index));
  });

  els.deckEditUndoBtn.addEventListener("click", () => {
    const last = lastDeletedCard;
    if (last && last.kanjiNum !== undefined) {
      setKanjiRemoved(last.kanjiNum, false);
      hideEditUndo();
      renderDeckEdit();
      return;
    }
    const deck = last && customDeckById(last.deckId);
    if (!deck) return;
    deck.cards.splice(Math.min(last.index, deck.cards.length), 0, last.card);
    if (last.srsEntry) {
      deck.srs = deck.srs || {};
      deck.srs[last.card.front] = last.srsEntry;
    }
    deck.updatedAt = new Date().toISOString();
    saveCustomDecks();
    hideEditUndo();
    renderDeckEdit();
  });

  // ---------- add terms from JMdict ----------
  // Searches Jotoba (a JMdict front end that allows requests from the
  // browser) by Japanese or English and adds the picked word to the deck being
  // edited as a card: the written form on the front, with its reading and
  // meaning as the card's sections.

  const TERM_SEARCH_URL = "https://jotoba.de/api/search/words";
  const READING_LABEL_PATTERN = /読み|よみ|reading|kana|ふりがな/i;
  const MEANING_LABEL_PATTERN = /意味|いみ|meaning|definition|english/i;
  const MAX_TERM_RESULTS = 10;
  const MAX_ADDED_GLOSSES = 4;
  let termSearchResultsList = [];
  let termSearchToken = 0;

  // JLPT level (1-5) of a word, from data/jlpt-vocab.json: Jonathan Waller's
  // lists (the ones Jisho uses), keyed "written form|reading" per level. It is
  // loaded the first time a search needs it; if it can't be, words just have
  // no level.
  let jlptLevels = null;
  async function loadJlptLevels() {
    if (jlptLevels) return jlptLevels;
    const levels = new Map();
    try {
      const data = await fetch("data/jlpt-vocab.json").then((res) => res.json());
      Object.keys(data).forEach((level) => data[level].forEach((key) => levels.set(key, Number(level))));
      jlptLevels = levels;
    } catch (err) {
      return levels;
    }
    return jlptLevels;
  }

  const wordJlpt = (word) => (jlptLevels && jlptLevels.get(`${wordFront(word)}|${word.reading.kana}`)) || null;

  function termSearchMessage(text) {
    els.termSearchResults.innerHTML = `<div class="term-search-status">${escapeHtml(text)}</div>`;
  }

  function wordFront(word) {
    return word.reading.kanji || word.reading.kana;
  }

  // The first few glosses of the first two senses, e.g. "to eat, to live on".
  function wordMeaning(word) {
    const glosses = [];
    word.senses.slice(0, 2).forEach((sense) => {
      sense.glosses.forEach((g) => {
        if (glosses.length < MAX_ADDED_GLOSSES && !glosses.includes(g)) glosses.push(g);
      });
    });
    return glosses.join(", ");
  }

  // "verb, noun" from Jotoba's [{ Verb: "Ichidan" }, "Noun"] part-of-speech list.
  function wordPos(word) {
    const found = [];
    word.senses.forEach((sense) =>
      (sense.pos || []).forEach((p) => {
        const name = (typeof p === "string" ? p : Object.keys(p)[0] || "").toLowerCase();
        if (name && !found.includes(name)) found.push(name);
      })
    );
    return found.join(", ");
  }

  function renderTermResults() {
    const deck = customDeckById(editingDeckId);
    if (!deck) return;
    if (!termSearchResultsList.length) {
      termSearchMessage("見つかりませんでした");
      return;
    }
    els.termSearchResults.innerHTML = termSearchResultsList
      .map((word, index) => {
        const front = wordFront(word);
        const added = deck.cards.some((c) => c.front === front);
        const reading = word.reading.kanji ? word.reading.kana : "";
        return `
        <div class="term-result">
          <span class="term-result-text">
            <span class="term-result-front">${escapeHtml(front)}</span>
            ${reading ? `<span class="term-result-reading">${escapeHtml(reading)}</span>` : ""}
            <span class="term-result-meaning">${escapeHtml(wordMeaning(word))}</span>
            <span class="edit-tags">${termTagsHtml({ common: Boolean(word.common), jlpt: wordJlpt(word), pos: wordPos(word) })}</span>
          </span>
          <button class="secondary-btn term-result-add" type="button" data-index="${index}"${added ? " disabled" : ""}>${added ? "追加済み" : "追加"}</button>
        </div>`;
      })
      .join("");
  }

  async function searchTerms(query) {
    const token = ++termSearchToken;
    termSearchMessage("検索中…");
    try {
      const res = await fetch(TERM_SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, language: "English", no_english: false }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      await loadJlptLevels();
      if (token !== termSearchToken) return;
      termSearchResultsList = (data.words || [])
        .filter((w) => w && w.reading && w.reading.kana && Array.isArray(w.senses) && w.senses.length)
        .slice(0, MAX_TERM_RESULTS);
      renderTermResults();
    } catch (err) {
      if (token !== termSearchToken) return;
      termSearchMessage("検索できませんでした。ネットワークを確認してください。");
    }
  }

  function addWordToDeck(deck, word) {
    const front = wordFront(word);
    if (deck.cards.some((c) => c.front === front)) return;
    const columns = Array.isArray(deck.columns) ? deck.columns : (deck.columns = deckColumns(deck).slice());
    const labelFor = (pattern, fallback) => {
      const found = columns.find((c) => pattern.test(c));
      if (found) return found;
      columns.push(fallback);
      return fallback;
    };
    const sections = [];
    if (word.reading.kanji) sections.push({ label: labelFor(READING_LABEL_PATTERN, "読み"), value: word.reading.kana });
    const meaning = wordMeaning(word);
    if (meaning) sections.push({ label: labelFor(MEANING_LABEL_PATTERN, "意味"), value: meaning });
    const pos = wordPos(word);
    deck.cards.push({ front, sections, tags: { common: Boolean(word.common), jlpt: wordJlpt(word), pos: pos || null } });
    deck.updatedAt = new Date().toISOString();
    saveCustomDecks();
    renderDeckEdit();
  }

  // ---------- fill in labels for a deck's cards ----------
  // Looks each card without labels up in JMdict and gives it the common flag,
  // part of speech and JLPT level, which is what the lesson filters use. A
  // card is only labelled when a result has exactly its written form (and its
  // reading, when the deck has one), so a wrong word is never attached.

  const LABEL_LOOKUP_PARALLEL = 3;
  let labelLookupRunning = false;

  const kanaKey = (text) =>
    typeof wanakana !== "undefined" && wanakana.isKana(text) ? wanakana.toHiragana(text) : text;

  function cardReadings(deck, card) {
    return card.sections
      .filter((s) => READING_LABEL_PATTERN.test(s.label))
      .flatMap((s) => s.value.split(/[;,、]/))
      .map((v) => kanaKey(v.trim()))
      .filter(Boolean);
  }

  function findCardWord(deck, card, words) {
    const readings = cardReadings(deck, card);
    return (
      words.find((w) => {
        if (wordFront(w) !== card.front) return false;
        return !readings.length || readings.includes(kanaKey(w.reading.kana));
      }) || null
    );
  }

  async function lookupWords(query) {
    const res = await fetch(TERM_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, language: "English", no_english: false }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.words || []).filter((w) => w && w.reading && w.reading.kana && Array.isArray(w.senses));
  }

  async function fetchDeckLabels(deck) {
    if (labelLookupRunning) return;
    const todo = deck.cards.filter((card) => !card.tags);
    if (!todo.length) {
      els.deckEditStatus.textContent = "すべてのカードにラベルがあります。";
      els.deckEditStatus.hidden = false;
      return;
    }
    labelLookupRunning = true;
    els.deckEditTagsBtn.disabled = true;
    els.deckEditStatus.hidden = false;
    await loadJlptLevels();
    let done = 0;
    let labelled = 0;
    let failed = 0;
    const show = () => {
      els.deckEditTagsBtn.textContent = `取得中… ${done}/${todo.length}`;
    };
    show();
    let next = 0;
    const worker = async () => {
      while (next < todo.length) {
        const card = todo[next++];
        try {
          const word = findCardWord(deck, card, await lookupWords(card.front));
          if (word) {
            card.tags = { common: Boolean(word.common), jlpt: wordJlpt(word), pos: wordPos(word) || null };
            labelled++;
          }
        } catch (err) {
          failed++;
        }
        done++;
        show();
      }
    };
    await Promise.all(Array.from({ length: LABEL_LOOKUP_PARALLEL }, worker));
    if (labelled) {
      deck.updatedAt = new Date().toISOString();
      saveCustomDecks();
    }
    labelLookupRunning = false;
    els.deckEditTagsBtn.disabled = false;
    els.deckEditTagsBtn.textContent = "ラベルを取得";
    const skipped = todo.length - labelled - failed;
    els.deckEditStatus.textContent =
      failed === todo.length
        ? "取得できませんでした。ネットワークを確認してください。"
        : `${labelled}枚にラベルを付けました` +
          (skipped ? `（${skipped}枚は一致する単語が見つかりませんでした）` : "") +
          (failed ? `（${failed}枚は取得に失敗しました）` : "");
    if (customDeckById(deck.id) && editingDeckId === deck.id) renderDeckEdit();
  }

  function openTermSearch() {
    termSearchResultsList = [];
    termSearchToken++;
    els.termSearchInput.value = "";
    els.termSearchResults.innerHTML = "";
    els.termSearchModal.hidden = false;
    els.termSearchInput.focus();
  }

  function closeTermSearch() {
    termSearchToken++;
    els.termSearchModal.hidden = true;
  }

  els.termSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = els.termSearchInput.value.trim();
    if (query) searchTerms(query);
  });

  els.termSearchResults.addEventListener("click", (event) => {
    const btn = event.target.closest(".term-result-add");
    const deck = customDeckById(editingDeckId);
    if (!btn || !deck || btn.disabled) return;
    const word = termSearchResultsList[Number(btn.dataset.index)];
    if (!word) return;
    addWordToDeck(deck, word);
    renderTermResults();
  });

  els.termSearchClose.addEventListener("click", closeTermSearch);
  els.termSearchModal.addEventListener("click", (event) => {
    if (event.target === els.termSearchModal) closeTermSearch();
  });

  els.deckEditToolbar.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (btn && btn.dataset.action === "restore-kanji" && editingDeckId === KANJI_DECK_ID) {
      Object.keys(kanjiRemovals).forEach((num) => {
        if (kanjiRemovals[num].removed) setKanjiRemoved(num, false);
      });
      hideEditUndo();
      renderDeckEdit();
      return;
    }
    const deck = btn && editingDeckId && customDeckById(editingDeckId);
    if (!deck) return;
    const action = btn.dataset.action;
    if (action === "add-term") {
      openTermSearch();
    } else if (action === "fetch-tags") {
      fetchDeckLabels(deck);
    } else if (action === "download") {
      downloadTextFile(`${sanitizeFilename(deck.name)}.csv`, deckToCsvText(deck), "text/csv;charset=utf-8");
    } else if (action === "replace") {
      pendingReplaceId = deck.id;
      els.csvFileInput.value = "";
      els.csvFileInput.click();
    } else if (action === "delete-deck") {
      const ok = window.confirm(`「${deck.name}」を削除しますか？この操作は元に戻せません。`);
      if (!ok) return;
      deleteCustomDeckById(deck.id);
      hideEditUndo();
      editingDeckId = null;
      renderDeckEdit();
    }
  });

  if (els.downloadTemplateBtn) {
    els.downloadTemplateBtn.addEventListener("click", () => {
      downloadTextFile("deck-template.csv", CUSTOM_DECK_TEMPLATE_CSV, "text/csv;charset=utf-8");
    });
  }

  els.modeCustomDecksBtn.addEventListener("click", () => {
    renderCustomDecksList();
    showScreen("customDecks");
  });

  els.uploadCsvBtn.addEventListener("click", () => {
    pendingReplaceId = null;
    els.csvFileInput.value = "";
    els.csvFileInput.click();
  });

  function isExcelFile(file) {
    return /\.(xlsx|xls)$/i.test(file.name);
  }

  // SheetJS is only needed for the (less common) Excel path, so it's loaded
  // on demand rather than unconditionally on every page load — this is a
  // mobile-first app and most uploads will be plain CSV. The "mini" build
  // (~245KB) covers reading modern .xlsx/.xls; it's cached by the browser
  // after the first load.
  let xlsxLoadPromise = null;
  function ensureXlsxLoaded() {
    if (window.XLSX) return Promise.resolve();
    if (xlsxLoadPromise) return xlsxLoadPromise;
    xlsxLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.mini.min.js";
      script.onload = () => resolve();
      script.onerror = () => {
        xlsxLoadPromise = null;
        reject(new Error("Failed to load Excel support"));
      };
      document.head.appendChild(script);
    });
    return xlsxLoadPromise;
  }

  function excelFileToRows(arrayBuffer) {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
    return rows.map((row) => row.map((cell) => String(cell != null ? cell : "")));
  }

  function handleParsedDeckRows(rows, file) {
    const { columns, cards, answers } = buildCustomDeckCards(rows);
    if (!cards.length) {
      window.alert(
        "ファイルにフラッシュカードが見つかりませんでした。1行目に見出しがあり、各行の1列目に内容があることを確認してください。"
      );
      return;
    }
    const replaceId = pendingReplaceId;
    const existing = replaceId ? customDecks.find((d) => d.id === replaceId) : null;
    const defaultName = existing ? existing.name : file.name.replace(/\.(csv|xlsx|xls)$/i, "");
    pendingCsvParse = { cards, columns, answers, replaceId };
    els.customSaveTitle.textContent = existing ? "デッキを置き換え" : "新しいデッキ";
    els.customDeckNameInput.value = defaultName;
    updateCustomSaveNote();
    showScreen("customDeckSave");
  }

  // A new upload with the name of a deck that already exists is merged into
  // that deck instead of making a second one.
  function findDeckByName(name) {
    const wanted = name.trim().toLowerCase();
    return wanted ? customDecks.find((d) => d.name.trim().toLowerCase() === wanted) || null : null;
  }

  // The cards of an upload that the deck does not have yet (by front text).
  function newCardsFor(deck, cards) {
    const fronts = new Set(deck.cards.map((c) => c.front));
    return cards.filter((card) => {
      if (fronts.has(card.front)) return false;
      fronts.add(card.front);
      return true;
    });
  }

  function mergeIntoDeck(deck, cards, columns, answers) {
    const added = newCardsFor(deck, cards);
    deck.cards.push(...added);
    deck.columns = Array.from(new Set([...deckColumns(deck), ...columns]));
    deck.answers = mergeDeckAnswers(deck.answers, answers);
    deck.updatedAt = new Date().toISOString();
    saveCustomDecks();
    return added.length;
  }

  function updateCustomSaveNote() {
    if (!pendingCsvParse) return;
    const target = pendingCsvParse.replaceId ? null : findDeckByName(els.customDeckNameInput.value);
    const total = pendingCsvParse.cards.length;
    if (target) {
      const fresh = newCardsFor(target, pendingCsvParse.cards).length;
      els.customSaveInfo.textContent = `${total}枚を読み込み · 既存のデッキに統合します（追加${fresh}枚、重複${total - fresh}枚はスキップ）`;
    } else {
      els.customSaveInfo.textContent = `${total}枚を読み込み`;
    }
    els.customSaveConfirmBtn.textContent = target ? "デッキを統合" : "デッキを保存";
    els.customSaveWarning.hidden = true;
  }

  els.customDeckNameInput.addEventListener("input", updateCustomSaveNote);

  els.csvFileInput.addEventListener("change", () => {
    const file = els.csvFileInput.files && els.csvFileInput.files[0];
    if (!file) return;

    if (isExcelFile(file)) {
      ensureXlsxLoaded()
        .then(() => {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const rows = excelFileToRows(reader.result);
              handleParsedDeckRows(rows, file);
            } catch (err) {
              window.alert("Excelファイルを読み込めませんでした。有効な.xlsxまたは.xlsファイルか確認してください。");
            }
          };
          reader.onerror = () => {
            window.alert("ファイルを読み込めませんでした。もう一度お試しください。");
          };
          reader.readAsArrayBuffer(file);
        })
        .catch(() => {
          window.alert(
            "Excelのサポートを読み込めませんでした。接続を確認してもう一度お試しいただくか、CSVをアップロードしてください。"
          );
        });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsvText(String(reader.result || ""));
      handleParsedDeckRows(rows, file);
    };
    reader.onerror = () => {
      window.alert("ファイルを読み込めませんでした。もう一度お試しください。");
    };
    reader.readAsText(file, "UTF-8");
  });

  els.customSaveConfirmBtn.addEventListener("click", () => {
    if (!pendingCsvParse) return;
    const name = els.customDeckNameInput.value.trim() || "Untitled Deck";
    const target = pendingCsvParse.replaceId ? null : findDeckByName(name);
    if (target) {
      mergeIntoDeck(target, pendingCsvParse.cards, pendingCsvParse.columns, pendingCsvParse.answers);
    } else {
      upsertCustomDeck(
        name,
        pendingCsvParse.cards,
        pendingCsvParse.columns,
        pendingCsvParse.answers,
        pendingCsvParse.replaceId
      );
    }
    pendingCsvParse = null;
    renderCustomDecksList();
    showScreen("customDecks");
  });

  els.customSaveCancelBtn.addEventListener("click", () => {
    pendingCsvParse = null;
    showScreen("customDecks");
  });

  // ---------- shared helpers for both custom study modes ----------

  function sectionsToHtml(sections) {
    return sections.length
      ? sections
          .map(
            (s) => `
        <div class="reading-block">
          <div class="reading-label">${escapeHtml(s.label)}</div>
          <div class="reading-value">${escapeHtml(s.value)}</div>
        </div>`
          )
          .join("")
      : `<div class="reading-block"><div class="reading-value">—</div></div>`;
  }

  // Deterministic label -> one of the existing themed badge colors, so
  // different columns in the same deck read as visually distinct without
  // needing to know their names ahead of time.
  const CUSTOM_BADGE_CLASSES = ["", "qt-kunyomi", "qt-onyomi"];
  function badgeClassForLabel(label) {
    let hash = 0;
    for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
    return CUSTOM_BADGE_CLASSES[hash % CUSTOM_BADGE_CLASSES.length];
  }

  // Per-deck user-added accepted answers, keyed by card front text (stable
  // across reorders/edits as long as the front text itself doesn't change)
  // and section label. Stored on the deck object itself so it travels
  // through the same local save (and export/import) as everything else.
  function getCustomDeckAnswers(deck, front, label) {
    const entry = (deck.answers && deck.answers[front]) || {};
    return entry[label] || [];
  }

  function addCustomDeckAnswer(deck, front, label, rawAnswer) {
    const trimmed = rawAnswer.trim();
    if (!trimmed) return;
    const norm = normalize(trimmed);
    const entry = (deck.answers && deck.answers[front]) || {};
    const list = entry[label] || [];
    if (list.some((a) => normalize(a) === norm)) return;
    deck.answers = { ...(deck.answers || {}), [front]: { ...entry, [label]: [...list, trimmed] } };
    saveCustomDecks();
  }

  // Per-card SRS state for a custom deck, keyed by front text (same stable
  // key deck.answers already uses). Reuses the same Leitner-box logic as the
  // built-in deck's recordResult via applySrsResult.
  function applyCustomSrsResult(deck, front, correct) {
    const today = dateKey(new Date());
    const srs = deck.srs || {};
    srs[front] = applySrsResult(srs[front], correct, today);
    deck.srs = srs;
    deck.updatedAt = new Date().toISOString();
    saveCustomDecks();
  }

  // Cards previously graded at least once whose SRS box has come due,
  // weakest/most-overdue first — mirrors getReviewCards() for the built-in
  // deck. Never-studied cards aren't included; a first pass through
  // Flashcards or Type Answer is what starts tracking them.
  function getDueCustomCards(deck) {
    const today = dateKey(new Date());
    const srs = deck.srs || {};
    const due = [];
    deck.cards.forEach((card) => {
      const entry = srs[card.front];
      if (!entry || !entry.lastSeen) return;
      if (!isDue(entry, today)) return;
      due.push({ card, box: entry.box || 0, dueDate: entry.due || "" });
    });
    due.sort((a, b) => a.box - b.box || (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
    return due.map((d) => d.card);
  }

  // A card counts as reviewed once any mode (Flashcards, Type Answer, Review
  // or Quiz) has graded it, i.e. it has an SRS entry with a lastSeen date.
  function isCustomCardReviewed(deck, card) {
    const entry = deck.srs && deck.srs[card.front];
    return Boolean(entry && entry.lastSeen);
  }

  // Only cards with answer data count: the quiz is typed, so a front-only card
  // can't be asked.
  function getUnreviewedCustomCards(deck) {
    return deck.cards.filter((card) => card.sections.length && !isCustomCardReviewed(deck, card));
  }

  // Quiz order: never-reviewed cards first (shuffled, so a partial quiz
  // samples the whole deck rather than just its start), then already-reviewed
  // cards that have gone longest without being seen.
  function buildQuizQueue(deck) {
    const srs = deck.srs || {};
    const seen = deck.cards
      .filter((card) => card.sections.length && isCustomCardReviewed(deck, card))
      .sort((a, b) => (srs[a.front].lastSeen < srs[b.front].lastSeen ? -1 : 1));
    return [...shuffle(getUnreviewedCustomCards(deck)), ...seen];
  }

  // Grades a quiz answer. First-time cards are placed directly into a box
  // based on the self-assessment; already-reviewed cards get a normal grade.
  function applyCustomQuizResult(deck, card, known) {
    if (isCustomCardReviewed(deck, card)) {
      applyCustomSrsResult(deck, card.front, known);
      return;
    }
    const today = dateKey(new Date());
    const box = known ? QUIZ_KNOWN_BOX : 0;
    const [y, m, d] = today.split("-").map(Number);
    const srs = deck.srs || {};
    srs[card.front] = {
      box,
      due: dateKey(new Date(y, m - 1, d + BOX_INTERVALS_DAYS[box])),
      lastSeen: today,
      streak: known ? 1 : 0,
    };
    deck.srs = srs;
    deck.updatedAt = new Date().toISOString();
    saveCustomDecks();
  }

  // Same convention the built-in meaning-matching uses: split on ;/, so a
  // multi-definition value ("stage, setting (of a story)") accepts any one
  // part, plus the whole value verbatim; each candidate also gets plural
  // variants. matchAnswer() itself still requires an exact match for any
  // kana/kanji candidate regardless, so this is safe for non-English data.
  function buildCustomAcceptedAnswers(value, extra) {
    const set = new Set();
    const addWithPlurals = (t) => {
      if (!t) return;
      set.add(t);
      pluralVariants(t).forEach((v) => set.add(v));
    };
    addWithPlurals(normalize(value));
    addWithPlurals(stripParens(normalize(value)));
    splitOutsideParens(value, ";,").forEach((part) => {
      addWithPlurals(normalize(part));
      addWithPlurals(stripParens(normalize(part)));
      // A kana answer is the same in hiragana and in katakana.
      [part.trim(), stripParens(part)].forEach((kana) => {
        if (kana && typeof wanakana !== "undefined" && wanakana.isKana(kana)) {
          set.add(wanakana.toHiragana(kana));
          set.add(wanakana.toKatakana(kana));
        }
      });
    });
    (extra || []).forEach((a) => {
      const t = normalize(a);
      if (t) set.add(t);
    });
    return set;
  }

  function showCustomDeckComplete(deck, mode, count) {
    customCompleteDeck = deck;
    customCompleteMode = mode;
    const shown = typeof count === "number" ? count : deck.cards.length;
    if (mode === "quiz") {
      const left = getUnreviewedCustomCards(deck).length;
      els.customCompleteStat.textContent =
        `${shown}枚中${customQuizKnown}枚正解 · 未復習${left}枚`;
    } else {
      els.customCompleteStat.textContent = `${shown}枚を復習しました`;
    }
    els.customStudyAgainBtn.textContent = mode === "quiz" ? "次のラウンド" : "もう一度学習";
    showScreen("customComplete");
  }

  els.customStudyAgainBtn.addEventListener("click", () => {
    if (!customCompleteDeck) {
      showScreen("customDecks");
      return;
    }
    if (customCompleteMode === "type") {
      startCustomDeckType(customCompleteDeck);
    } else if (customCompleteMode === "review") {
      startCustomDeckReview(customCompleteDeck);
    } else if (customCompleteMode === "quiz") {
      startCustomDeckQuiz(customCompleteDeck);
    } else {
      startCustomDeckStudy(customCompleteDeck);
    }
  });

  els.customBackToListBtn.addEventListener("click", () => {
    customCompleteDeck = null;
    renderCustomDecksList();
    showScreen("customDecks");
  });

  // ---------- custom deck study: flashcards (tap-to-reveal, Again/Got it grading) ----------

  function startCustomDeckStudy(deck) {
    customStudyDeck = deck;
    customStudyCards = deck.cards;
    customStudyMode = "cards";
    customStudyIndex = 0;
    customStudyFlipped = false;
    showScreen("customStudy");
    renderCustomStudy();
  }

  // Typed-answer review of just this deck's due cards (cards with no answer
  // data can't be typed against, so they're skipped).
  function startCustomDeckReview(deck) {
    const due = getDueCustomCards(deck).filter((c) => c.sections.length);
    if (!due.length) {
      renderCustomDecksList();
      showScreen("customDecks");
      window.alert("このデッキには現在復習するカードがありません。");
      return;
    }
    startCustomTypeSession(deck, buildTypedQuestions(due, true), "review");
  }

  function renderCustomStudy() {
    const cards = customStudyCards;
    const card = cards[customStudyIndex];
    els.customStudyProgress.textContent = `${customStudyIndex + 1} / ${cards.length}`;
    els.customStudyFront.textContent = card.front;
    fitFront(els.customStudyFront, card.front);
    els.customStudyBackSections.innerHTML = sectionsToHtml(card.sections);
    els.customStudyCard.classList.toggle("flipped", customStudyFlipped);
    els.customFlashAgainBtn.disabled = !customStudyFlipped;
    els.customFlashGotItBtn.disabled = !customStudyFlipped;
  }

  function flipCustomCard() {
    if (customStudyFlipped) return;
    customStudyFlipped = true;
    renderCustomStudy();
  }

  function resolveCustomCard(correct) {
    if (!customStudyFlipped) return;
    const card = customStudyCards[customStudyIndex];
    applyCustomSrsResult(customStudyDeck, card.front, correct);
    const nextIndex = customStudyIndex + 1;
    if (nextIndex >= customStudyCards.length) {
      showCustomDeckComplete(customStudyDeck, customStudyMode, customStudyCards.length);
      return;
    }
    customStudyIndex = nextIndex;
    customStudyFlipped = false;
    renderCustomStudy();
  }

  els.customStudyCard.addEventListener("click", () => {
    if (!customStudyFlipped) flipCustomCard();
  });

  els.customStudyCard.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (!customStudyFlipped) flipCustomCard();
    } else if (e.code === "ArrowLeft" && customStudyFlipped) {
      resolveCustomCard(false);
    } else if (e.code === "ArrowRight" && customStudyFlipped) {
      resolveCustomCard(true);
    }
  });

  els.customFlashAgainBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    resolveCustomCard(false);
  });

  els.customFlashGotItBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    resolveCustomCard(true);
  });

  els.customStudyBackBtn.addEventListener("click", () => {
    customStudyDeck = null;
    customStudyCards = [];
    renderCustomDecksList();
    showScreen("customDecks");
  });

  // ---------- custom deck study: type answer (sequential, typo + plural tolerant) ----------

  // Typed modes (Type Answer, Quiz, Review) ask every section (reading,
  // meaning, ...) of each card as its own question, shuffled with a term's
  // questions kept apart where possible.
  function buildTypedQuestions(cards, fullyRandom = false) {
    const questions = cards.flatMap((card) => card.sections.map((section) => ({ card, section })));
    return fullyRandom ? shuffle(questions) : spreadQuestions(questions, (q) => q.card);
  }

  function startCustomTypeSession(deck, questions, mode) {
    customTypeDeck = deck;
    customTypeCards = questions.map((q) => q.card);
    customTypeAsked = questions.map((q) => q.section);
    // A term is graded once per session however many questions it has.
    customTermState = new Map();
    questions.forEach((q) => {
      const state = customTermState.get(q.card.front);
      if (state) state.left++;
      else customTermState.set(q.card.front, { left: 1, wrongs: 0, graded: null });
    });
    customTypeMode = mode;
    customTypeIndex = 0;
    customScore = { attempted: new Set(), right: 0, wrong: 0 };
    customTypeDone = 0;
    customTypeTotal = questions.length;
    customQuizKnown = 0;
    showScreen("customType");
    renderCustomType();
  }

  function startCustomDeckType(deck) {
    startCustomTypeSession(
      deck,
      buildTypedQuestions(deck.cards.filter((c) => c.sections.length)),
      "type"
    );
  }

  // Typed-answer placement quiz, played in fixed-size rounds (the Quiz
  // Questions setting). Each round draws whole cards, never-reviewed ones
  // first, until it has at least that many questions. Answers are saved as
  // they happen (a miss immediately, a pass once all of a card's questions
  // are right), so quitting mid-round loses nothing and the next round
  // continues with whatever is still unreviewed.
  function startCustomDeckQuiz(deck) {
    const cards = [];
    let questionCount = 0;
    for (const card of buildQuizQueue(deck)) {
      if (questionCount >= settings.quizQuestions) break;
      cards.push(card);
      questionCount += card.sections.length;
    }
    startCustomTypeSession(deck, buildTypedQuestions(cards), "quiz");
  }

  // The custom-deck counterpart of alignLessonDueTimes (not for the quiz).
  function alignCustomDueTimes() {
    const deck = customTypeDeck;
    if (!deck || customTypeMode === "quiz") return;
    const end = Date.now();
    let changed = false;
    customTermState.forEach((state, front) => {
      if (!state.graded) return;
      stampDue(deck.srs && deck.srs[front], state.graded === "right", end);
      changed = true;
    });
    if (changed) {
      deck.updatedAt = new Date(end).toISOString();
      saveCustomDecks();
    }
  }

  function gradeCustomTerm(deck, card, correct) {
    if (customTypeMode === "quiz") applyCustomQuizResult(deck, card, correct);
    else applyCustomSrsResult(deck, card.front, correct);
  }

  function renderCustomType() {
    const deck = customTypeDeck;
    const idx = customTypeIndex;
    if (idx >= customTypeCards.length) {
      alignCustomDueTimes();
      showCustomDeckComplete(deck, customTypeMode, customTermState.size);
      return;
    }
    const card = customTypeCards[idx];
    customTypeCurrentSection = customTypeAsked[idx];
    customTypeAnswering = true;
    els.customTypeCard.classList.remove("answer-wrong", "answer-right");
    lockAnswerInput(els.customTypeInput, false);
    bindKanaInput(els.customTypeInput, kanaModeFor(customTypeCurrentSection.value));
    els.customTypeInput.value = "";
    els.customTypeFeedback.hidden = true;
    els.customTypeSubmitBtn.textContent = "確認";
    els.customTypeBadge.textContent = displayLabel(customTypeCurrentSection.label, customTypeCurrentSection.value);
    setQuestionTone(els.screenCustomType, kindOfLabel(customTypeCurrentSection.label));
    const badgeClass = badgeClassForLabel(customTypeCurrentSection.label);
    els.customTypeBadge.className = "question-type-badge" + (badgeClass ? ` ${badgeClass}` : "");
    els.customTypeFront.textContent = card.front;
    fitFront(els.customTypeFront, card.front);
    els.customTypeProgress.textContent =
      customTypeMode === "quiz"
        ? `${idx + 1} / ${customTypeCards.length} · 新規${getUnreviewedCustomCards(deck).length}`
        : `${customTypeDone} / ${customTypeTotal}`;
    els.customTypeInput.focus();
    updateCustomScore(false);
  }

  function updateCustomTypeFeedbackResult(correct, raw, fuzzy) {
    els.customTypeCard.classList.toggle("answer-wrong", !correct);
    els.customTypeCard.classList.toggle("answer-right", correct);
    els.customTypeFeedbackResult.textContent = correct
      ? fuzzy
        ? "✓ 正解！（ほぼ一致 — 軽いタイプミス）"
        : "✓ 正解！"
      : ""; // a miss is shown by the red bar and the answer below
    els.customTypeFeedbackResult.className =
      "type-feedback-result " + (correct ? "feedback-good" : "feedback-bad");
  }

  function updateCustomAddAnswerButton() {
    const canAdd = !pendingCustomTypeCorrect && Boolean(pendingCustomTypeRawAnswer);
    els.customAddAnswerBtn.hidden = !canAdd;
    els.customAddAnswerRow.hidden = !canAdd;
    if (canAdd) {
      els.customAddAnswerBtnText.textContent = "答えを追加";
    }
  }

  function checkCustomTypeAnswer() {
    const deck = customTypeDeck;
    const card = customTypeCards[customTypeIndex];
    const section = customTypeCurrentSection;
    const raw = els.customTypeInput.value;
    const extra = getCustomDeckAnswers(deck, card.front, section.label);
    const accepted = buildCustomAcceptedAnswers(section.value, extra);
    const { correct, fuzzy } = matchAnswer(raw, accepted, true);
    const state = customTermState.get(card.front);
    // Outside the quiz a missed question is asked again, so it isn't counted off.
    if (customTypeMode === "quiz" || correct) state.left--;
    if (!correct) {
      state.wrongs++;
      if (!state.graded) {
        // Kept so the miss can be taken back if it is ruled a typo.
        const key = `${deck.id}|${card.front}`;
        state.undo = {
          srs: deck.srs && deck.srs[card.front] ? { ...deck.srs[card.front] } : null,
          leech: leeches[key] ? { ...leeches[key] } : null,
        };
        if (customTypeMode === "review") noteLeechAnswer(key, false, false);
        gradeCustomTerm(deck, card, false);
        state.graded = "wrong";
      }
    }
    if (state.left === 0 && state.wrongs === 0 && !state.graded) {
      if (customTypeMode === "review") noteLeechAnswer(`${deck.id}|${card.front}`, true, true);
      gradeCustomTerm(deck, card, true);
      state.graded = "right";
      if (customTypeMode === "quiz") customQuizKnown++;
    }

    customTypeAnswering = false;
    pendingCustomTypeCorrect = correct;
    pendingCustomTypeRawAnswer = raw.trim();
    updateCustomScore(true);
    lockAnswerInput(els.customTypeInput, true);
    els.customTypeSubmitBtn.textContent = "次へ";

    els.customTypeFeedback.hidden = false;
    els.customTypeFeedback.classList.toggle("quick", correct);
    els.customTypeFeedback.classList.remove("revealed");
    els.customTypeMnemonic.hidden = true;
    updateCustomTypeFeedbackResult(correct, pendingCustomTypeRawAnswer, fuzzy);
    customTypeInfoRevealed = false;
    els.customTypeSections.innerHTML = sectionsToHtml(correct ? card.sections : [section]);
    updateCustomAddAnswerButton();

    if (correct) {
      customTypeAutoAdvanceTimer = window.setTimeout(() => {
        customTypeAutoAdvanceTimer = null;
        if (!customTypeAnswering && pendingCustomTypeCorrect) advanceCustomTypeCard();
      }, AUTO_ADVANCE_MS);
    } else {
      els.customTypeInput.focus();
    }
  }

  function customQuestionKey() {
    return `${customTypeCards[customTypeIndex].front}|${customTypeAsked[customTypeIndex].label}`;
  }

  function updateCustomScore(answeredNow) {
    let pending = null;
    if (answeredNow && customTypeCards[customTypeIndex] && !customScore.attempted.has(customQuestionKey())) {
      pending = pendingCustomTypeCorrect;
    }
    renderScore(els.customTypeScore, customScore.right, customScore.wrong, pending);
  }

  function advanceCustomTypeCard() {
    window.clearTimeout(customTypeAutoAdvanceTimer);
    customTypeAutoAdvanceTimer = null;
    // Each question counts once, by its first answer.
    const scoreKey = customQuestionKey();
    if (!customScore.attempted.has(scoreKey)) {
      customScore.attempted.add(scoreKey);
      if (pendingCustomTypeCorrect) customScore.right++;
      else customScore.wrong++;
    }
    if (customTypeMode !== "quiz") {
      if (pendingCustomTypeCorrect) {
        customTypeDone++;
        if (customTypeMode === "review") addReviewPoint();
      } else {
        const at = Math.min(customTypeCards.length, customTypeIndex + 1 + REQUEUE_GAP);
        customTypeCards.splice(at, 0, customTypeCards[customTypeIndex]);
        customTypeAsked.splice(at, 0, customTypeAsked[customTypeIndex]);
      }
    }
    customTypeIndex++;
    renderCustomType();
  }

  els.customTypeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (customTypeAnswering) {
      if (!els.customTypeInput.value.trim()) return;
      checkCustomTypeAnswer();
    } else {
      advanceCustomTypeCard();
    }
  });

  // Rules the missed question correct, either because the player's answer was
  // added to the card (`addToCard`) or because it was only a typo.
  function acceptCustomMiss(addToCard) {
    if (customTypeAnswering || pendingCustomTypeCorrect || !pendingCustomTypeRawAnswer) return;
    const deck = customTypeDeck;
    const card = customTypeCards[customTypeIndex];
    if (addToCard) addCustomDeckAnswer(deck, card.front, customTypeCurrentSection.label, pendingCustomTypeRawAnswer);
    const state = customTermState.get(card.front);
    state.wrongs--;
    if (customTypeMode !== "quiz") state.left--;
    if (state.wrongs === 0 && state.graded === "wrong" && state.undo) {
      // The miss was already saved as this card's first grade; now that the
      // answer has been accepted, take it back.
      const key = `${deck.id}|${card.front}`;
      deck.srs = deck.srs || {};
      if (state.undo.srs) deck.srs[card.front] = state.undo.srs;
      else delete deck.srs[card.front];
      deck.updatedAt = new Date().toISOString();
      saveCustomDecks();
      if (customTypeMode === "review") {
        if (state.undo.leech) leeches[key] = { ...state.undo.leech, at: Date.now() };
        else delete leeches[key];
        saveLeeches();
      }
      state.graded = null;
    }
    if (state.left === 0 && state.wrongs === 0 && !state.graded) {
      if (customTypeMode === "review") noteLeechAnswer(`${deck.id}|${card.front}`, true, true);
      gradeCustomTerm(deck, card, true);
      state.graded = "right";
      if (customTypeMode === "quiz") customQuizKnown++;
    }
    pendingCustomTypeCorrect = true;
    updateCustomScore(true);
    updateCustomTypeFeedbackResult(true, pendingCustomTypeRawAnswer, !addToCard);
    els.customAddAnswerBtn.hidden = true;
    els.customAddAnswerRow.hidden = true;
    window.clearTimeout(customTypeAutoAdvanceTimer);
    customTypeAutoAdvanceTimer = window.setTimeout(() => {
      customTypeAutoAdvanceTimer = null;
      if (!customTypeAnswering && pendingCustomTypeCorrect) advanceCustomTypeCard();
    }, AUTO_ADVANCE_MS);
  }

  els.customAddAnswerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    acceptCustomMiss(true);
  });

  els.customTypoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    acceptCustomMiss(false);
  });

  els.customTypeBackBtn.addEventListener("click", () => {
    window.clearTimeout(customTypeAutoAdvanceTimer);
    customTypeAutoAdvanceTimer = null;
    alignCustomDueTimes();
    customTypeDeck = null;
    renderCustomDecksList();
    showScreen("customDecks");
  });

  // ---------- settings ----------

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return {
        stylizedFont:
          typeof parsed.stylizedFont === "boolean" ? parsed.stylizedFont : true,
        fontScale:
          typeof parsed.fontScale === "number" && parsed.fontScale > 0
            ? parsed.fontScale
            : 1,
        defaultDailyMinutes:
          Number.isFinite(parsed.defaultDailyMinutes) &&
          parsed.defaultDailyMinutes >= MIN_MINUTES &&
          parsed.defaultDailyMinutes <= MAX_MINUTES
            ? parsed.defaultDailyMinutes
            : DEFAULT_MINUTES,
        quizQuestions: Number.isFinite(parsed.quizQuestions)
          ? Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, parsed.quizQuestions))
          : DEFAULT_QUESTIONS,
        theme: THEMES.includes(parsed.theme) ? parsed.theme : DEFAULT_THEME,
        lessonDeck: typeof parsed.lessonDeck === "string" ? parsed.lessonDeck : "n2-kanji",
        marathonDeck: typeof parsed.marathonDeck === "string" ? parsed.marathonDeck : "n2-kanji",
      };
    } catch (err) {
      return null;
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      /* localStorage unavailable (private mode, quota, etc.) */
    }
  }

  function applySettings() {
    document.documentElement.style.setProperty(
      "--font-scale",
      String(settings.fontScale)
    );
    document.body.classList.toggle("no-stylized-font", !settings.stylizedFont);
    document.documentElement.setAttribute("data-theme", settings.theme);
  }

  function refreshSettingsUI() {
    els.stylizedFontToggle.checked = settings.stylizedFont;
    const pct = Math.round(settings.fontScale * 100);
    els.fontSizeSlider.value = String(pct);
    els.fontSizeValue.textContent = `${pct}%`;
    els.quizQuestionsValue.textContent = String(settings.quizQuestions);
    if (els.themeOptions) {
      els.themeOptions.querySelectorAll(".theme-option").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.themeValue === settings.theme);
      });
    }
  }

  els.settingsBtn.addEventListener("click", () => {
    refreshSettingsUI();
    showScreen("settings");
  });

  if (els.themeOptions) {
    els.themeOptions.addEventListener("click", (event) => {
      const btn = event.target.closest(".theme-option");
      if (!btn || !els.themeOptions.contains(btn)) return;
      const value = btn.dataset.themeValue;
      if (!THEMES.includes(value) || value === settings.theme) return;
      settings.theme = value;
      applySettings();
      refreshSettingsUI();
      saveSettings();
    });
  }

  els.stylizedFontToggle.addEventListener("change", () => {
    settings.stylizedFont = els.stylizedFontToggle.checked;
    applySettings();
    saveSettings();
  });

  els.fontSizeSlider.addEventListener("input", () => {
    const pct = Number(els.fontSizeSlider.value);
    settings.fontScale = pct / 100;
    els.fontSizeValue.textContent = `${pct}%`;
    applySettings();
    saveSettings();
  });

  function changeQuestionSetting(name, amount) {
    settings[name] = Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, settings[name] + amount));
    refreshSettingsUI();
    saveSettings();
  }

  els.quizQuestionsDownBtn.addEventListener("click", () => changeQuestionSetting("quizQuestions", -1));
  els.quizQuestionsUpBtn.addEventListener("click", () => changeQuestionSetting("quizQuestions", 1));

  // ---------- shared flashcard engine ----------

  function render() {
    if (queue.length === 0) {
      if (mode === "daily") {
        endDailyChallenge();
        return;
      }
      els.kanji.textContent = "完";
      els.frontHint.hidden = true;
      els.congratsMsg.hidden = false;
      els.newDeckBtn.hidden = false;
      els.card.classList.add("complete");
      els.card.classList.remove("flipped");
      els.progress.textContent = `${masteredCount} / ${totalCount} · 完了！`;
      els.againBtn.disabled = true;
      els.gotItBtn.disabled = true;
      if (mode === "marathon") saveState();
      return;
    }
    const item = queue[0];
    els.kanji.textContent = item.kanji;
    els.frontHint.hidden = false;
    els.frontHint.textContent = "タップして答えを見る";
    els.congratsMsg.hidden = true;
    els.newDeckBtn.hidden = true;
    els.card.classList.remove("complete");
    els.kanjiBack.textContent = item.kanji;
    fitFront(els.kanji, item.kanji);
    els.cardLegacyRows.hidden = Boolean(item.sections);
    els.cardSections.hidden = !item.sections;
    if (item.sections) {
      els.cardSections.innerHTML = sectionsToHtml(item.sections);
    } else {
      els.onyomi.textContent = item.onyomi || "—";
      els.kunyomi.textContent = item.kunyomi || "—";
      els.meaning.textContent = item.meaning || "—";
      els.cardWordBlock.hidden = !item.word;
      if (item.word) els.cardWord.textContent = `${item.word}（${item.wordReading}）${item.wordMeaning}`;
    }
    els.cardStats.hidden = Boolean(item.sections);
    const cardStats = getCardStats(item.num);
    els.cardStatsRight.textContent = String(cardStats.right);
    els.cardStatsWrong.textContent = String(cardStats.wrong);
    const customSummary = formatCustomAnswersSummary(item.num);
    if (customSummary) {
      els.cardCustomAnswersList.textContent = customSummary;
      els.cardCustomAnswers.hidden = false;
    } else {
      els.cardCustomAnswers.hidden = true;
    }
    if (mode === "marathon") {
      els.progress.textContent = `${masteredCount} / ${totalCount} · 残り${queue.length}`;
    }
    els.card.classList.toggle("flipped", flipped);
    els.againBtn.disabled = !flipped;
    els.gotItBtn.disabled = !flipped;
    if (mode === "marathon" || mode === "daily") saveState();
  }

  function flipCard() {
    if (queue.length === 0 || flipped || animating) return;
    flipped = true;
    render();
  }

  function resolveCard(correct) {
    if (queue.length === 0 || !flipped || animating) return;
    animating = true;
    els.card.classList.add(correct ? "fly-right" : "fly-left");
    window.setTimeout(() => {
      const item = queue.shift();
      if (correct) {
        masteredCount++;
      }
      recordItemResult(item, correct);
      if (mode === "daily") {
        dailyTally.seen++;
        if (correct) dailyTally.right++;
        else dailyTally.wrong++;
      }
      flipped = false;
      els.card.style.transition = "none";
      els.card.classList.remove("fly-right", "fly-left");
      render();
      void els.card.offsetWidth;
      els.card.style.transition = "";
      animating = false;
    }, 240);
  }

  els.card.addEventListener("click", () => {
    if (animating) return;
    if (queue.length === 0) {
      if (mode === "lesson-type") {
        finishLesson();
        return;
      }
      if (mode === "marathon") {
        reshuffleDeck();
        render();
      }
      return;
    }
    if (!flipped) flipCard();
  });

  els.card.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (queue.length === 0) {
        if (mode === "marathon") {
          reshuffleDeck();
          render();
        }
      } else if (!flipped) {
        flipCard();
      }
    } else if (e.code === "ArrowLeft" && flipped) {
      resolveCard(false);
    } else if (e.code === "ArrowRight" && flipped) {
      resolveCard(true);
    }
  });

  els.againBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    resolveCard(false);
  });

  els.gotItBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    resolveCard(true);
  });

  els.newDeckBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    reshuffleDeck();
    render();
  });

  // ---------- marathon mode ----------

  function startMarathon() {
    mode = "marathon";
    els.progress.hidden = false;
    els.timerDisplay.hidden = true;
    flipped = false;
    showScreen("play");
    render();
  }

  // ---------- deck picker ----------

  let deckPickFor = "lesson"; // "lesson" | "marathon"

  function deckPickEntries() {
    const entries = [{ id: KANJI_DECK_ID, name: "N2漢字", count: visibleKanji().length }];
    customDecks.forEach((deck) => {
      entries.push({
        id: `custom:${deck.id}`,
        name: deck.name,
        count: deck.cards.filter((card) => card.sections.length).length,
      });
    });
    return entries;
  }

  function openDeckPicker(forMode) {
    deckPickFor = forMode;
    const current = resolveDeckId(forMode === "lesson" ? settings.lessonDeck : settings.marathonDeck);
    els.deckPickTitle.textContent = forMode === "lesson" ? "レッスンのデッキ" : "すべて復習のデッキ";
    els.deckPickList.innerHTML = deckPickEntries()
      .map((entry) => {
        const usable = entry.count > 0;
        return `
      <button class="deck-pick-item${entry.id === current ? " selected" : ""}" type="button" data-deck="${escapeHtml(entry.id)}"${usable ? "" : " disabled"}>
        <span class="deck-pick-name">${escapeHtml(entry.name)}</span>
        <span class="deck-pick-meta">${usable ? `${entry.count}枚` : "出題できるカードがありません"}</span>
      </button>`;
      })
      .join("");
    els.deckPickList.style.setProperty("--mode-color", forMode === "lesson" ? "#ff5a5a" : "#4d8dff");
    showScreen("deckPick");
  }

  function chooseDeck(forMode, deckId) {
    settings[forMode === "lesson" ? "lessonDeck" : "marathonDeck"] = deckId;
    saveSettings();
    activateDeck(deckId);
    if (forMode === "lesson") {
      renderLessons();
      showScreen("lessons");
    } else {
      startAllReview();
    }
  }

  // すべて復習: every question of every term in the deck, shuffled, each asked
  // once; a report card of the mistakes follows.
  function startAllReview() {
    if (allKanji.length) beginLesson(shuffle(allKanji), "all");
  }

  els.deckPickList.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-deck]");
    if (btn && !btn.disabled) chooseDeck(deckPickFor, btn.dataset.deck);
  });

  els.modeMarathonBtn.addEventListener("click", () => {
    if (!n2Kanji.length) return;
    openDeckPicker("marathon");
  });

  els.lessonDeckBtn.addEventListener("click", () => openDeckPicker("lesson"));

  // ---------- lessons ----------

  // `placement` maps a kanji number to the preliminary test's verdict:
  // "known" (answered everything right, kept out of lessons) or "learn".
  // `today` is the day's lesson: the kanji the test caught (see below).
  function normalizeLessonHistory(raw) {
    const history = raw && typeof raw === "object" && raw.completed ? raw : { completed: {} };
    if (!history.placement || typeof history.placement !== "object") history.placement = {};
    const today = history.today;
    history.today =
      today && typeof today.date === "string" && Array.isArray(today.nums)
        ? { date: today.date, nums: today.nums.filter((n) => Number.isFinite(n)) }
        : null;
    return history;
  }

  function loadLessonHistory() {
    try {
      return normalizeLessonHistory(JSON.parse(localStorage.getItem(LESSONS_KEY) || "null"));
    } catch (err) {
      return normalizeLessonHistory(null);
    }
  }

  function saveLessonHistory() {
    try {
      localStorage.setItem(LESSONS_KEY, JSON.stringify(lessonHistory));
    } catch (err) {
      /* localStorage unavailable */
    }
  }

  // Calendar marks are per deck; the built-in deck keeps the plain date key.
  function completedKey(date) {
    return isKanjiDeck() ? date : `${date}|${activeDeckId}`;
  }

  // Today's lesson is the terms the player has selected on the chart.
  // `today.nums` holds the selection for every deck; the active deck's part is
  // whichever of them belong to it. A new day keeps selected terms that were
  // never studied.
  function ensureTodaysLesson() {
    const today = dateKey(new Date());
    if (!lessonHistory.today || lessonHistory.today.date !== today) {
      const previous = lessonHistory.today ? lessonHistory.today.nums : [];
      const carried = previous.filter((num) => {
        const item = kanjiByNum.get(num);
        return item && !isItemStudied(item);
      });
      lessonHistory.today = { date: today, nums: carried };
      saveLessonHistory();
    }
    return lessonHistory.today;
  }

  // Terms whose lesson is already done leave the chart; what is left to pick
  // from (and what counts as selected) is the terms never studied.
  function lessonPending(item) {
    return !isItemStudied(item);
  }

  function todaysNums() {
    const today = ensureTodaysLesson();
    return today.nums.filter((n) => kanjiByNum.has(n) && lessonPending(kanjiByNum.get(n)));
  }

  function todaysLessonCards() {
    return todaysNums().map((num) => kanjiByNum.get(num));
  }

  // Sets one term's selection (rather than toggling it) and returns the state.
  function setLessonSelected(num, on) {
    const today = ensureTodaysLesson();
    const at = today.nums.indexOf(num);
    if (on && at === -1) today.nums.push(num);
    else if (!on && at !== -1) today.nums.splice(at, 1);
    saveLessonHistory();
    return on;
  }

  function toggleLessonSelection(num) {
    const today = ensureTodaysLesson();
    const at = today.nums.indexOf(num);
    if (at === -1) today.nums.push(num);
    else today.nums.splice(at, 1);
    saveLessonHistory();
    return at === -1;
  }

  // Spaced-repetition review queue: any previously-attempted kanji whose SRS
  // box has come due, weakest/most-overdue first. Brand-new kanji are
  // introduced via Lessons instead, not here.
  // Reviews work on units: a kanji (meaning and onyomi) and its word (reading
  // and meaning) are separate units, each due on its own schedule.
  function getReviewUnits(items = allKanji) {
    const today = dateKey(new Date());
    const units = [];
    items.forEach((item) => {
      const entry = srsOf(item);
      if (entry && isItemStudied(item) && isDue(entry, today)) units.push({ item, part: "kanji" });
      if (item.word && !item.deckId) {
        const word = srsOf(item, "word");
        if (word && word.lastSeen && isDue(word, today)) units.push({ item, part: "word" });
      }
      if (item.noun && !item.deckId) {
        const noun = srsOf(item, "noun");
        if (noun && noun.lastSeen && isDue(noun, today)) units.push({ item, part: "noun" });
      }
    });
    return units;
  }

  const unitQuestionCount = (units) =>
    units.reduce((n, u) => n + availableQuestionTypes(u.item, u.part).length, 0);

  function startReview(units) {
    const cards = Array.from(new Set(units.map((u) => u.item)));
    beginLesson(cards, "review", units);
  }

  // Kanji studied before words had their own schedule start the word on the
  // kanji's current one.
  function migrateWordSchedules() {
    let changed = false;
    n2Kanji.forEach((item) => {
      const entry = stats.perCard[String(item.num)];
      if (!item.word || !entry || !entry.lastSeen || stats.perCard[`w${item.num}`]) return;
      stats.perCard[`w${item.num}`] = {
        right: 0,
        wrong: 0,
        box: entry.box,
        due: entry.due,
        dueAt: entry.dueAt,
        lastSeen: entry.lastSeen,
        streak: entry.streak,
      };
      changed = true;
    });
    if (changed) saveStats();
  }

  // What a chart tile shows above and below the term: for kanji the reading
  // and meaning; for a custom card its first and last columns.
  function chartParts(item) {
    if (item.sections) {
      const s = item.sections;
      return { above: s.length > 1 ? s[0].value : "", below: s[s.length - 1].value };
    }
    return { above: item.onyomi || item.kunyomi || "", below: item.meaning || "" };
  }

  function updateLessonSelection() {
    const count = todaysNums().length;
    els.startLessonBtn.textContent = count ? `レッスンを始める（${count}${deckUnit()}）` : "学習する項目を選択";
    els.startLessonBtn.disabled = count === 0;
    els.clearSelectionBtn.disabled = count === 0;
  }

  // ---- lesson filters (labels from the deck's Common / JLPT / part of speech columns)

  const lessonFilters = { common: new Set(), jlpt: new Set(), pos: new Set() };
  let lessonFilterDeckId = null;
  let lessonFilterOpen = false;

  function matchesLessonFilters(item) {
    return Object.keys(lessonFilters).every((group) => {
      const wanted = lessonFilters[group];
      if (!wanted.size) return true;
      if (!item.facets) return false;
      const value = item.facets[group];
      return Array.isArray(value) ? value.some((v) => wanted.has(v)) : wanted.has(value);
    });
  }

  function filterOptions(pending) {
    const count = (group, test) => pending.filter((item) => item.facets && test(item.facets[group])).length;
    const jlptValues = ["5", "4", "3", "2", "1", "none"];
    return [
      {
        group: "common",
        title: "共通性",
        options: [
          ["common", "Common word"],
          ["other", "Not common"],
        ].map(([value, label]) => ({ value, label, n: count("common", (v) => v === value) })),
      },
      {
        group: "jlpt",
        title: "JLPTレベル",
        options: jlptValues.map((value) => ({
          value,
          label: value === "none" ? "No JLPT level" : `JLPT N${value}`,
          n: count("jlpt", (v) => v === value),
        })),
      },
      {
        group: "pos",
        title: "品詞",
        options: POS_CATEGORIES.map(([value, label]) => ({ value, label, n: count("pos", (v) => v.includes(value)) })),
      },
    ].map((g) => ({ ...g, options: g.options.filter((o) => o.n > 0 || lessonFilters[g.group].has(o.value)) }));
  }

  function renderTermChart() {
    const selected = new Set(todaysNums());
    const pending = allKanji.filter(lessonPending);
    const tagged = pending.some((item) => item.facets);
    const visible = pending.filter(matchesLessonFilters);
    const activeCount = Object.values(lessonFilters).reduce((n, set) => n + set.size, 0);

    els.lessonFilterBar.hidden = !tagged;
    els.lessonFilterPanel.hidden = !tagged || !lessonFilterOpen;
    els.lessonFilterBtn.textContent = activeCount ? `絞り込み（${activeCount}）` : "絞り込み";
    els.selectShownBtn.hidden = !activeCount;
    if (tagged && lessonFilterOpen) {
      els.lessonFilterPanel.innerHTML =
        filterOptions(pending)
          .filter((g) => g.options.length)
          .map(
            (g) => `
        <div class="filter-group">
          <div class="filter-title">${g.title}</div>
          <div class="filter-chips">${g.options
            .map(
              (o) =>
                `<button class="filter-chip${lessonFilters[g.group].has(o.value) ? " on" : ""}" type="button" data-group="${g.group}" data-value="${escapeHtml(o.value)}">${escapeHtml(o.label)} <i>${o.n}</i></button>`
            )
            .join("")}</div>
        </div>`
          )
          .join("") +
        `<button class="secondary-btn filter-clear" type="button" data-action="clear-filters"${activeCount ? "" : " disabled"}>絞り込みを解除</button>`;
    }

    els.lessonSubtitle.textContent = !pending.length
      ? `すべての${deckNoun()}のレッスンが完了しました。復習で定着させましょう。`
      : activeCount
      ? `${visible.length}件を表示中（全${pending.length}件）。タップして選択してください。`
      : "";
    els.lessonSubtitle.hidden = !els.lessonSubtitle.textContent;
    els.termChart.innerHTML = visible.length
      ? visible
          .map((item) => {
            const parts = chartParts(item);
            const classes = `term-tile${selected.has(item.num) ? " selected" : ""}`;
            return `<button class="${classes}" type="button" data-num="${item.num}">
          <span class="term-reading">${escapeHtml(parts.above)}</span>
          <span class="term-word">${escapeHtml(item.kanji)}</span>
          <span class="term-meaning">${escapeHtml(parts.below)}</span>
          ${item.tags ? `<span class="term-tags">${termTagsHtml(item.tags)}</span>` : ""}
        </button>`;
          })
          .join("")
      : pending.length
      ? `<p class="filter-empty">条件に合う項目がありません。</p>`
      : "";
    // Long words shrink to one line once the screen is visible.
    window.requestAnimationFrame(() => {
      els.termChart.querySelectorAll(".term-word").forEach((el) => fitFront(el, el.textContent));
    });
    updateLessonSelection();
  }

  els.lessonFilterBtn.addEventListener("click", () => {
    lessonFilterOpen = !lessonFilterOpen;
    renderTermChart();
  });

  els.lessonFilterPanel.addEventListener("click", (event) => {
    if (event.target.closest("[data-action='clear-filters']")) {
      Object.values(lessonFilters).forEach((set) => set.clear());
      renderTermChart();
      return;
    }
    const chip = event.target.closest(".filter-chip");
    if (!chip) return;
    const set = lessonFilters[chip.dataset.group];
    if (set.has(chip.dataset.value)) set.delete(chip.dataset.value);
    else set.add(chip.dataset.value);
    renderTermChart();
  });

  // Selects every term the filters currently show.
  els.selectShownBtn.addEventListener("click", () => {
    const today = ensureTodaysLesson();
    allKanji
      .filter((item) => lessonPending(item) && matchesLessonFilters(item))
      .forEach((item) => {
        if (!today.nums.includes(item.num)) today.nums.push(item.num);
      });
    saveLessonHistory();
    renderTermChart();
  });

  function renderLessons() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const todayKey = dateKey(today);
    ensureTodaysLesson();
    els.lessonDeckBtn.textContent = `デッキ: ${deckName(activeDeckId)}`;
    els.lessonMonthLabel.textContent = today.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
    els.lessonTitle.textContent = "今日のレッスン";

    if (lessonFilterDeckId !== activeDeckId) {
      lessonFilterDeckId = activeDeckId;
      Object.values(lessonFilters).forEach((set) => set.clear());
      lessonFilterOpen = false;
    }
    els.termChart.parentElement.scrollTop = 0;
    renderTermChart();

    const headings = ["日", "月", "火", "水", "木", "金", "土"];
    let html = headings.map((day) => `<span class="calendar-heading">${day}</span>`).join("");
    for (let i = 0; i < firstDay.getDay(); i++) html += `<span class="calendar-day calendar-empty"></span>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const key = dateKey(new Date(today.getFullYear(), today.getMonth(), day));
      const completed = Boolean(lessonHistory.completed[completedKey(key)]);
      html += `<span class="calendar-day${key === todayKey ? " calendar-today" : ""}${completed ? " calendar-complete" : ""}">${day}</span>`;
    }
    els.lessonCalendar.innerHTML = html;
    const reviewCount = getReviewUnits().length;
    els.startReviewBtn.disabled = reviewCount === 0;
  }

  // Lessons are typed: every kanji gets a question per available answer type
  // (meaning and onyomi reading), all shuffled together.
  // Lessons keep a term's questions apart; a review (復習 or リーチ) is shuffled
  // completely, so any question can follow any other.
  function buildLessonQuestions(cards, fullyRandom = false, units = null) {
    const list = units || cards.map((item) => ({ item, part: "all" }));
    const questions = list.flatMap(({ item, part }) =>
      availableQuestionTypes(item, part).map((type) => ({ item, type }))
    );
    return fullyRandom ? shuffle(questions) : spreadQuestions(questions, (q) => q.item);
  }

  // ---------- lesson: study a batch of five, then quiz on it ----------
  // The selected terms are taken five at a time. Each batch is first shown
  // term by term (meaning, readings and example sentences on tabs), then asked
  // as the usual typed quiz; the next batch follows until all are done.

  const LESSON_BATCH_SIZE = 5;
  const STUDY_TABS = [
    ["meaning", "Meaning"],
    ["readings", "Readings"],
    ["examples", "Examples"],
  ];
  let lessonRun = null; // { batches, index, seen, right, wrong }
  let study = null; // { batch, index, tab }
  const exampleCache = new Map();

  function startLesson(cards) {
    const batches = [];
    for (let i = 0; i < cards.length; i += LESSON_BATCH_SIZE) batches.push(cards.slice(i, i + LESSON_BATCH_SIZE));
    lessonRun = { batches, index: 0, seen: 0, right: 0, wrong: 0 };
    startStudy();
  }

  function startStudy() {
    // The five kanji come first, then the word (verb or adjective) that goes
    // with each of them, shown the same way as separate entries.
    const batch = lessonRun.batches[lessonRun.index];
    const entries = [
      ...batch.map((item) => ({ view: item })),
      ...batch
        .filter((item) => item.word)
        .map((item) => ({
          kind: "word",
          view: {
            front: item.word,
            kanji: item.word,
            wordEntry: true,
            entryKind: "word",
            parent: item,
            meaning: item.wordMeaning,
            wordReading: item.wordReading,
          },
        })),
      // the noun made of just the kanji, read as a kunyomi
      ...batch
        .filter((item) => item.noun)
        .map((item) => ({
          kind: "noun",
          view: {
            front: item.noun,
            kanji: item.noun,
            wordEntry: true,
            entryKind: "noun",
            parent: item,
            meaning: item.nounMeaning,
            wordReading: item.nounReading,
          },
        })),
    ];
    study = { batch, entries, index: 0, tab: "meaning", openWord: null };
    showScreen("lessonStudy");
    renderStudy();
  }

  const termText = (item) => item.front || item.kanji;

  function studyReadingParts(item) {
    if (item.wordEntry) return item.wordReading ? [[item.entryKind === "noun" ? "訓読み" : "読み方", item.wordReading]] : [];
    if (!item.sections) {
      const parts = [];
      if (item.onyomi) parts.push(["音読み", item.onyomi]);
      if (item.kunyomi) parts.push(["訓読み", item.kunyomi]);
      if (item.word) parts.push(["単語", `${item.word}（${item.wordReading}）`]);
      return parts;
    }
    return item.sections.filter((s) => kindOfLabel(s.label) === "reading").map((s) => [s.label, s.value]);
  }

  function studyMeaningParts(item) {
    if (!item.sections) {
      const parts = [["Meaning", item.meaning || "—"]];
      if (item.word) parts.push(["単語", `${item.word}: ${item.wordMeaning}`]);
      return parts;
    }
    const rest = item.sections.filter((s) => kindOfLabel(s.label) !== "reading");
    return (rest.length ? rest : item.sections).map((s) => [displayLabel(s.label, s.value), s.value]);
  }

  function studyTabsFor(item) {
    return STUDY_TABS.filter(([id]) => id !== "readings" || studyReadingParts(item).length);
  }

  function studyGloss(item) {
    const first = studyMeaningParts(item)[0];
    return first ? splitOutsideParens(first[1], ";,")[0].trim() : "";
  }

  // Jotoba's "[担当者|たん|とう|しゃ]" furigana markup as ruby text.
  function furiganaHtml(markup) {
    let html = "";
    let last = 0;
    const pattern = /\[([^\]|]+)\|([^\]]+)\]/g;
    let match;
    while ((match = pattern.exec(markup))) {
      html += escapeHtml(markup.slice(last, match.index));
      html += `<ruby>${escapeHtml(match[1])}<rt>${escapeHtml(match[2].split("|").join(""))}</rt></ruby>`;
      last = match.index + match[0].length;
    }
    return html + escapeHtml(markup.slice(last));
  }

  // `strict` keeps only sentences that contain the query exactly; a word's
  // sentences are matched by Jotoba on its dictionary form (so a verb may show
  // up conjugated) and are kept as they come.
  async function loadExamples(query, strict = true) {
    const cacheKey = strict ? query : `${query}|loose`;
    if (exampleCache.has(cacheKey)) return exampleCache.get(cacheKey);
    const res = await fetch("https://jotoba.de/api/search/sentences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, language: "English", no_english: false }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const sentences = (Array.isArray(data) ? data : data.sentences || [])
      .filter((x) => x && x.content && x.translation && (!strict || x.content.includes(query)))
      .slice(0, 3);
    exampleCache.set(cacheKey, sentences);
    return sentences;
  }

  // The N2 kanji's Examples tab lists words that contain the kanji, with their
  // English definitions; tapping one shows example sentences for it.
  const MAX_EXAMPLE_WORDS = 8;
  const exampleWordsCache = new Map();

  async function loadExampleWords(kanji) {
    if (exampleWordsCache.has(kanji)) return exampleWordsCache.get(kanji);
    // The wildcard search returns the words that contain the kanji anywhere.
    const words = (await lookupWords(`*${kanji}*`))
      .filter((w) => wordFront(w).includes(kanji) && w.senses.length)
      .sort((a, b) => Number(Boolean(b.common)) - Number(Boolean(a.common)))
      .slice(0, MAX_EXAMPLE_WORDS);
    exampleWordsCache.set(kanji, words);
    return words;
  }

  function exampleSentencesHtml(front) {
    const sentences = exampleCache.get(`${front}|loose`);
    if (!sentences) return `<div class="study-status">読み込み中…</div>`;
    if (!sentences.length) return `<div class="study-status">例文が見つかりませんでした。</div>`;
    return sentences
      .map(
        (x) =>
          `<div class="study-example"><div class="study-example-ja">${furiganaHtml(x.furigana || x.content)}</div><div class="study-example-en">${escapeHtml(x.translation)}</div></div>`
      )
      .join("");
  }

  function kanjiExamplesHtml(item) {
    const words = exampleWordsCache.get(termText(item));
    if (!words) return `<div class="study-status">読み込み中…</div>`;
    if (!words.length) return `<div class="study-status">この漢字を含む単語が見つかりませんでした。</div>`;
    return `<div class="study-words">${words
      .map((w) => {
        const front = wordFront(w);
        const open = study.openWord === front;
        const reading = w.reading.kanji ? w.reading.kana : "";
        return `<div class="study-word-item">
          <button class="study-word${open ? " open" : ""}" type="button" data-word="${escapeHtml(front)}">
            <span class="study-word-form">${escapeHtml(front)}</span>
            ${reading ? `<span class="study-word-reading">${escapeHtml(reading)}</span>` : ""}
            <span class="study-word-gloss">${escapeHtml(wordMeaning(w))}</span>
          </button>
          ${open ? `<div class="study-word-examples">${exampleSentencesHtml(front)}</div>` : ""}
        </div>`;
      })
      .join("")}</div>`;
  }

  function mnemonicKey(item, tab) {
    const base = item.wordEntry ? `${leechKey(item.parent)}|${item.entryKind}` : leechKey(item);
    return `${base}|${tab}`;
  }

  function mnemonicFieldHtml(item, tab) {
    const saved = mnemonics[mnemonicKey(item, tab)];
    return `<div class="study-mnemonic">
      <div class="study-label">Mnemonic</div>
      <textarea class="study-mnemonic-input" rows="3" data-tab="${tab}" placeholder="語呂合わせやメモを入力" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" enterkeyhint="done">${escapeHtml(saved ? saved.text : "")}</textarea>
    </div>`;
  }

  function studyPanelHtml(item, tab) {
    const block = ([label, value]) =>
      `<div class="study-block"><div class="study-label">${escapeHtml(label)}</div><div class="study-value">${escapeHtml(value)}</div></div>`;
    if (tab === "meaning") return `<div class="study-blocks">${studyMeaningParts(item).map(block).join("")}</div>${mnemonicFieldHtml(item, tab)}`;
    if (tab === "readings") return `<div class="study-blocks study-blocks-row">${studyReadingParts(item).map(block).join("")}</div>${mnemonicFieldHtml(item, tab)}`;
    if (item.wordEntry) return exampleSentencesHtml(item.front);
    if (!item.sections) return kanjiExamplesHtml(item);
    const cached = exampleCache.get(termText(item));
    if (!cached) return `<div class="study-status">読み込み中…</div>`;
    if (!cached.length) return `<div class="study-status">例文が見つかりませんでした。</div>`;
    return cached
      .map(
        (x) =>
          `<div class="study-example"><div class="study-example-ja">${furiganaHtml(x.furigana || x.content)}</div><div class="study-example-en">${escapeHtml(x.translation)}</div></div>`
      )
      .join("");
  }

  function renderStudy() {
    if (!study) return;
    const entry = study.entries[study.index];
    const item = entry.view;
    const tabs = studyTabsFor(item);
    if (!tabs.some(([id]) => id === study.tab)) study.tab = "meaning";
    // Pink for the kanji itself, purple for its word and noun; a custom deck's
    // readings are pink and its meanings purple.
    setQuestionTone(
      els.screenLessonStudy,
      item.sections
        ? study.tab === "readings"
          ? "reading"
          : "meaning"
        : entry.kind === "noun"
        ? "noun"
        : entry.kind
        ? "meaning"
        : "reading"
    );
    els.studyProgress.textContent = `${entry.kind === "word" ? "単語 " : entry.kind === "noun" ? "名詞 " : ""}${study.index + 1} / ${study.entries.length}`;
    els.studyTerm.textContent = termText(item);
    els.studyGloss.textContent = studyGloss(item);
    els.studyTabs.innerHTML = tabs
      .map(
        ([id, label]) =>
          `<button class="study-tab${id === study.tab ? " active" : ""}" type="button" role="tab" data-tab="${id}">${label}</button>`
      )
      .join("");
    els.studyPanel.innerHTML = studyPanelHtml(item, study.tab);
    const chips = (kind) =>
      study.entries
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => e.kind === kind)
        .map(
          ({ e, i }) =>
            `<button class="study-chip${kind ? ` study-chip-${kind}` : ""}${i === study.index ? " active" : ""}" type="button" data-index="${i}">${escapeHtml(termText(e.view))}</button>`
        )
        .join("");
    els.studyStrip.innerHTML = [undefined, "word", "noun"]
      .filter((kind) => !kind || study.entries.some((e) => e.kind === kind))
      .map((kind) => `<div class="study-strip-row">${chips(kind)}</div>`)
      .join("");
    const last = study.index === study.entries.length - 1;
    els.studyPrevBtn.disabled = study.index === 0;
    els.studyNextBtn.disabled = last;
    els.studyContinueBtn.textContent = last ? "クイズを始める" : "次へ";
    window.requestAnimationFrame(() => fitFront(els.studyTerm, termText(item)));
    if (study.tab === "examples") loadStudyExamples(item);
  }

  // Fetches what the Examples tab needs (sentences for a custom term, the word
  // list for a kanji, and the sentences of the word that is open), then draws
  // the screen again if the player is still looking at it.
  function loadStudyExamples(item) {
    const query = termText(item);
    const shown = study;
    const refresh = () => {
      if (study === shown && study.tab === "examples" && termText(study.entries[study.index].view) === query) renderStudy();
    };
    if (item.wordEntry) {
      if (!exampleCache.has(`${query}|loose`)) {
        loadExamples(query, false)
          .catch(() => exampleCache.set(`${query}|loose`, []))
          .then(refresh);
      }
      return;
    }
    if (item.sections) {
      if (!exampleCache.has(query)) {
        loadExamples(query)
          .catch(() => exampleCache.set(query, []))
          .then(refresh);
      }
      return;
    }
    if (!exampleWordsCache.has(query)) {
      loadExampleWords(query)
        .catch(() => exampleWordsCache.set(query, []))
        .then(refresh);
      return;
    }
    const open = study.openWord;
    if (open && !exampleCache.has(`${open}|loose`)) {
      loadExamples(open, false)
        .catch(() => exampleCache.set(`${open}|loose`, []))
        .then(refresh);
    }
  }

  function studyMove(step) {
    if (!study) return;
    const next = study.index + step;
    if (next < 0 || next >= study.entries.length) return;
    study.index = next;
    study.openWord = null;
    study.tab = "meaning"; // every new term starts on its meaning
    renderStudy();
  }

  function studyAdvance() {
    if (!study) return;
    if (study.index < study.entries.length - 1) {
      studyMove(1);
      return;
    }
    const batch = study.batch;
    study = null;
    beginLesson(batch, "lesson");
  }

  function studyShiftTab(step) {
    if (!study) return;
    const tabs = studyTabsFor(study.entries[study.index].view);
    const at = tabs.findIndex(([id]) => id === study.tab);
    const next = tabs[at + step];
    // Past the last tab (→) or the first (←) the arrow goes on to the next or
    // previous term, which opens on its meaning.
    if (!next) {
      // → past the last tab of the last term starts the quiz.
      if (step > 0 && study.index === study.entries.length - 1) studyAdvance();
      else studyMove(step);
      return;
    }
    study.tab = next[0];
    renderStudy();
  }

  els.studyTabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (!tab || !study) return;
    study.tab = tab.dataset.tab;
    renderStudy();
  });
  els.studyStrip.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-index]");
    if (!chip || !study) return;
    study.index = Number(chip.dataset.index);
    study.openWord = null;
    study.tab = "meaning"; // every new term starts on its meaning
    renderStudy();
  });
  // On a touch screen, while a mnemonic is being typed the screen is compacted
  // (the term shrinks and the term bubbles and button go away) so the field
  // stays above the keyboard. On a computer nothing moves.
  els.studyPanel.addEventListener("focusin", (event) => {
    const field = event.target.closest(".study-mnemonic-input");
    if (!field || !window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
    els.screenLessonStudy.classList.add("typing");
    window.setTimeout(() => field.scrollIntoView({ block: "center" }), 150);
  });
  // Enter (Shift+Enter starts a new line) or ↓ finishes the note: it is
  // already saved as it was typed, so the field just lets go of the cursor.
  els.studyPanel.addEventListener("keydown", (event) => {
    const field = event.target.closest(".study-mnemonic-input");
    if (!field || event.shiftKey || event.isComposing) return;
    if (event.key !== "Enter" && event.key !== "ArrowDown") return;
    event.preventDefault();
    field.blur();
  });
  els.studyPanel.addEventListener("focusout", (event) => {
    if (event.target.closest(".study-mnemonic-input")) els.screenLessonStudy.classList.remove("typing");
  });

  // What is typed is saved as it goes, for the term and tab being shown.
  els.studyPanel.addEventListener("input", (event) => {
    const field = event.target.closest(".study-mnemonic-input");
    if (!field || !study) return;
    const item = study.entries[study.index].view;
    mnemonics[mnemonicKey(item, field.dataset.tab)] = { text: field.value, at: Date.now() };
    saveMnemonics();
  });
  els.studyPanel.addEventListener("click", (event) => {
    const word = event.target.closest("[data-word]");
    if (!word || !study) return;
    study.openWord = study.openWord === word.dataset.word ? null : word.dataset.word;
    renderStudy();
  });
  els.studyPrevBtn.addEventListener("click", () => studyMove(-1));
  els.studyNextBtn.addEventListener("click", () => studyMove(1));
  els.studyContinueBtn.addEventListener("click", studyAdvance);
  els.studyBackBtn.addEventListener("click", () => {
    study = null;
    lessonRun = null;
    renderLessons();
    showScreen("lessons");
  });

  // ←/→ switch between Meaning, Readings and Examples (→ on the last tab and ←
  // on the first move to the next or previous term, and → on the last term's
  // last tab starts the quiz); ↓, Enter or Space goes
  // to the next term (and from the last one into the quiz). ↑ puts the cursor
  // in the mnemonic box (↓ or Enter leaves it); on Examples, which has no box,
  // ↑ goes to the previous term.
  document.addEventListener("keydown", (event) => {
    if (!study || els.screenLessonStudy.hidden) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest("textarea, input")) return; // typing a mnemonic
    const actions = {
      ArrowLeft: () => studyShiftTab(-1),
      ArrowRight: () => studyShiftTab(1),
      ArrowUp: () => {
        const field = els.studyPanel.querySelector(".study-mnemonic-input");
        if (!field) {
          studyMove(-1);
          return;
        }
        field.focus();
        field.setSelectionRange(field.value.length, field.value.length);
      },
      ArrowDown: studyAdvance,
      Enter: studyAdvance,
      " ": studyAdvance,
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  });

  window.addEventListener("resize", () => {
    if (study && !els.screenLessonStudy.hidden) fitFront(els.studyTerm, termText(study.entries[study.index].view));
  });

  function beginLesson(cards, kind, units = null) {
    savedMainSession = { queue, totalCount, masteredCount };
    const questions = buildLessonQuestions(cards, kind === "review" || kind === "leech", units);
    lessonSession = {
      date: dateKey(new Date()),
      kind,
      cards,
      total: questions.length,
      seen: 0,
      right: 0,
      wrong: 0,
      mistakes: [],
      leechCounted: new Set(),
      attempted: new Set(),
    };
    // A kanji and its word are each graded once per session: wrong as soon as
    // any of their questions is missed, right after all of them are answered
    // correctly. They are graded separately, so a missed word doesn't hold
    // back its kanji.
    lessonTermState = new Map();
    questions.forEach((q) => {
      const group = groupOfType(q.type);
      const key = `${q.item.num}:${group}`;
      const state = lessonTermState.get(key);
      if (state) state.left++;
      else lessonTermState.set(key, { item: q.item, group, left: 1, wrongs: 0, graded: null });
    });
    queue = questions.map((q) => q.item);
    lessonQuestionTypes = questions.map((q) => q.type);
    totalCount = questions.length;
    masteredCount = 0;
    mode = "lesson-type";
    showScreen("type");
    renderType();
  }

  // In すべて復習 a term only counts toward the review schedule if it was
  // already studied, and a correct run only moves it up when it was due, so
  // going through the whole deck neither marks new terms as lessoned nor
  // speeds up the schedule.
  function gradeLessonTerm(item, correct, type) {
    const group = groupOfType(type);
    const state = lessonTermState.get(`${item.num}:${group}`);
    const kind = lessonSession.kind;
    const all = kind === "all";
    const counts = kind !== "leech" && (!all || isItemStudied(item));
    // In lessons and reviews a missed question stays in the session, so it is
    // not counted off.
    if (correct || all) state.left--;
    if (!correct) {
      state.wrongs++;
      if (!state.graded) {
        // A kanji counts as one miss per session, whichever part was missed.
        if ((kind === "review" || all) && !lessonSession.leechCounted.has(leechKey(item))) {
          lessonSession.leechCounted.add(leechKey(item));
          noteLeechAnswer(leechKey(item), false, false);
        }
        if (counts) {
          gradeItemSrs(item, false, group);
          state.scheduled = true;
        }
        state.graded = "wrong";
      }
    }
    if (state.left === 0 && state.wrongs === 0 && !state.graded) {
      if ((kind === "review" || all) && group === "kanji") noteLeechAnswer(leechKey(item), true, true);
      if (counts && (!all || isDue(srsOf(item, group), dateKey(new Date())))) {
        gradeItemSrs(item, true, group);
        state.scheduled = true;
      }
      state.graded = "right";
    }
  }

  // What the right answer to a question was, for the report card.
  function expectedAnswerText(item, type) {
    if (item.sections) return item.sections[sectionIndex(type)].value;
    return {
      meaning: item.meaning,
      onyomi: item.onyomi,
      wordReading: item.wordReading,
      wordMeaning: item.wordMeaning,
      nounReading: item.nounReading,
      nounMeaning: item.nounMeaning,
    }[type] || "";
  }

  function reportCardHtml(mistakes) {
    if (!mistakes.length) return `<div class="report-perfect">全問正解！</div>`;
    const rows = mistakes
      .map(({ item, type, given }) => {
        const shown = isWordType(type) ? item.word : item.kanji;
        return `
        <div class="report-row">
          <div class="report-head"><span class="report-term">${escapeHtml(shown)}</span><span class="report-type">${escapeHtml(typeConfig(item, type).label)}</span></div>
          <div class="report-line"><span class="report-given">${given ? escapeHtml(given) : "未回答"}</span><span class="report-arrow">→</span><span class="report-answer">${escapeHtml(expectedAnswerText(item, type))}</span></div>
        </div>`;
      })
      .join("");
    return `<div class="report-title">間違えた問題（${mistakes.length}）</div>${rows}`;
  }

  let lessonResultsKind = "lesson";

  // When a lesson or review ends (or is left), the terms it graded all get
  // their next due time counted from that moment.
  function alignLessonDueTimes() {
    if (!lessonSession) return;
    const end = Date.now();
    const touched = new Set();
    lessonTermState.forEach((state) => {
      if (!state.scheduled) return;
      stampDue(srsOf(state.item, state.group), state.graded === "right", end);
      if (state.item.deckId) touched.add(state.item.deckId);
    });
    saveStats();
    touched.forEach((id) => {
      const deck = customDeckById(id);
      if (deck) deck.updatedAt = new Date(end).toISOString();
    });
    if (touched.size) saveCustomDecks();
  }

  function finishLesson() {
    alignLessonDueTimes();
    if (lessonSession.kind === "lesson") {
      const key = completedKey(lessonSession.date);
      const done = lessonHistory.completed[key] || [];
      lessonHistory.completed[key] = Array.from(new Set([...done, ...lessonSession.cards.map((item) => item.num)]));
      saveLessonHistory();
    }
    if (savedMainSession) {
      queue = savedMainSession.queue;
      totalCount = savedMainSession.totalCount;
      masteredCount = savedMainSession.masteredCount;
    }
    savedMainSession = null;
    const kind = lessonSession.kind;
    // A lesson is several batches: add this one to the running totals and go
    // on to the next batch's study screen until all are done.
    if (kind === "lesson" && lessonRun) {
      lessonRun.seen += lessonSession.seen;
      lessonRun.right += lessonSession.right;
      lessonRun.wrong += lessonSession.wrong;
      lessonSession = null;
      mode = null;
      if (lessonRun.index + 1 < lessonRun.batches.length) {
        lessonRun.index++;
        startStudy();
        return;
      }
      lessonSession = { seen: lessonRun.seen, right: lessonRun.right, wrong: lessonRun.wrong, kind };
      lessonRun = null;
    }
    lessonResultsKind = kind;
    els.lessonResultTitle.textContent =
      kind === "all" ? "すべて復習完了" : kind === "review" ? "復習完了" : kind === "leech" ? "リーチ復習完了" : "レッスン完了";
    els.lessonResultNote.hidden = true;
    els.lessonResultReport.hidden = kind !== "all";
    if (kind === "all") els.lessonResultReport.innerHTML = reportCardHtml(lessonSession.mistakes);
    els.lessonResultsLessonsBtn.textContent = kind === "all" ? "ホームに戻る" : kind === "leech" ? "復習に戻る" : "レッスンに戻る";
    els.lessonResultSeen.textContent = String(lessonSession.seen);
    els.lessonResultRight.textContent = String(lessonSession.right);
    els.lessonResultWrong.textContent = String(lessonSession.wrong);
    const accuracy = lessonSession.seen
      ? Math.round((lessonSession.right / lessonSession.seen) * 100)
      : 0;
    els.lessonResultAccuracy.textContent = `正答率 ${accuracy}%`;
    lessonSession = null;
    mode = null;
    showScreen("lessonResults");
  }

  els.modeLessonsBtn.addEventListener("click", () => {
    if (!n2Kanji.length) return;
    openDeckPicker("lesson");
  });
  // Starts a lesson on the terms selected on the chart.
  els.startLessonBtn.addEventListener("click", () => {
    const cards = todaysLessonCards();
    if (cards.length) startLesson(cards);
  });
  els.clearSelectionBtn.addEventListener("click", () => {
    const today = ensureTodaysLesson();
    today.nums = today.nums.filter((n) => !kanjiByNum.has(n));
    saveLessonHistory();
    els.termChart.querySelectorAll(".term-tile.selected").forEach((tile) => tile.classList.remove("selected"));
    updateLessonSelection();
  });
  // Quick selection: Shift+click selects (or deselects) everything from the
  // last term clicked to this one; on a touch screen, touching a term and
  // holding for a moment starts a drag that selects (or deselects) every term
  // the finger passes over.
  let lessonAnchor = null; // the last term clicked
  let lessonDragSuppressClick = false;

  function setTileSelected(tile, on) {
    setLessonSelected(Number(tile.dataset.num), on);
    tile.classList.toggle("selected", on);
  }

  els.termChart.addEventListener("mousedown", (event) => {
    if (event.shiftKey) event.preventDefault(); // no text selection while ranging
  });

  els.termChart.addEventListener("click", (event) => {
    const tile = event.target.closest(".term-tile");
    if (!tile) return;
    if (lessonDragSuppressClick) {
      lessonDragSuppressClick = false;
      return;
    }
    const tiles = Array.from(els.termChart.querySelectorAll(".term-tile"));
    const anchor = lessonAnchor && tiles.find((t) => t.dataset.num === lessonAnchor);
    if (event.shiftKey && anchor && anchor !== tile) {
      const from = tiles.indexOf(anchor);
      const to = tiles.indexOf(tile);
      const on = anchor.classList.contains("selected");
      tiles.slice(Math.min(from, to), Math.max(from, to) + 1).forEach((t) => setTileSelected(t, on));
    } else {
      setTileSelected(tile, !tile.classList.contains("selected"));
    }
    lessonAnchor = tile.dataset.num;
    updateLessonSelection();
  });

  const LESSON_DRAG_HOLD_MS = 250;
  const LESSON_DRAG_SLOP_PX = 10;
  let lessonDrag = null; // { timer, startX, startY, active, on }

  function lessonDragEnd() {
    if (!lessonDrag) return;
    window.clearTimeout(lessonDrag.timer);
    if (lessonDrag.active) lessonDragSuppressClick = true;
    lessonDrag = null;
  }

  els.termChart.addEventListener(
    "touchstart",
    (event) => {
      const tile = event.target.closest(".term-tile");
      if (!tile || event.touches.length !== 1) return;
      const touch = event.touches[0];
      lessonDrag = { startX: touch.clientX, startY: touch.clientY, active: false, on: false };
      lessonDrag.timer = window.setTimeout(() => {
        if (!lessonDrag) return;
        lessonDrag.active = true;
        lessonDrag.on = !tile.classList.contains("selected");
        setTileSelected(tile, lessonDrag.on);
        lessonAnchor = tile.dataset.num;
        updateLessonSelection();
        if (navigator.vibrate) navigator.vibrate(15);
      }, LESSON_DRAG_HOLD_MS);
    },
    { passive: true }
  );

  els.termChart.addEventListener(
    "touchmove",
    (event) => {
      if (!lessonDrag) return;
      const touch = event.touches[0];
      if (!lessonDrag.active) {
        // Moving before the hold is up means the player is scrolling.
        if (Math.hypot(touch.clientX - lessonDrag.startX, touch.clientY - lessonDrag.startY) > LESSON_DRAG_SLOP_PX) {
          window.clearTimeout(lessonDrag.timer);
          lessonDrag = null;
        }
        return;
      }
      event.preventDefault(); // dragging, not scrolling
      const over = document.elementFromPoint(touch.clientX, touch.clientY);
      const tile = over && over.closest(".term-tile");
      if (tile && els.termChart.contains(tile) && tile.classList.contains("selected") !== lessonDrag.on) {
        setTileSelected(tile, lessonDrag.on);
        lessonAnchor = tile.dataset.num;
        updateLessonSelection();
      }
    },
    { passive: false }
  );
  els.termChart.addEventListener("touchend", lessonDragEnd);
  els.termChart.addEventListener("touchcancel", lessonDragEnd);
  els.startReviewBtn.addEventListener("click", () => {
    const units = getReviewUnits();
    if (units.length) startReview(units);
  });

  els.lessonResultsLessonsBtn.addEventListener("click", () => {
    if (lessonResultsKind === "all") {
      showScreen("home");
      return;
    }
    if (lessonResultsKind === "leech") {
      renderCustomDecksList();
      showScreen("customDecks");
      return;
    }
    renderLessons();
    showScreen("lessons");
  });

  // ---------- daily challenge mode ----------

  function formatTimer(totalSeconds) {
    const s = Math.max(0, totalSeconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  function updateTimeValue() {
    els.timeValue.textContent = String(dailyMinutes);
  }

  els.timeUpBtn.addEventListener("click", () => {
    dailyMinutes = Math.min(MAX_MINUTES, dailyMinutes + 1);
    updateTimeValue();
  });

  els.timeDownBtn.addEventListener("click", () => {
    dailyMinutes = Math.max(MIN_MINUTES, dailyMinutes - 1);
    updateTimeValue();
  });

  if (els.modeDailyBtn) els.modeDailyBtn.addEventListener("click", () => {
    if (!allKanji.length) return;
    updateTimeValue();
    showScreen("dailySetup");
  });

  els.startDailyBtn.addEventListener("click", () => {
    startDailyChallenge();
  });

  function clearDailyInterval() {
    if (dailyIntervalId !== null) {
      window.clearInterval(dailyIntervalId);
      dailyIntervalId = null;
    }
  }

  function startDailyChallenge() {
    mode = "daily";
    els.progress.hidden = true;
    els.timerDisplay.hidden = false;

    dailyTimeLeft = dailyMinutes * 60;
    dailyTally = { seen: 0, right: 0, wrong: 0 };
    flipped = false;

    showScreen("play");
    render();
    els.timerDisplay.textContent = formatTimer(dailyTimeLeft);

    clearDailyInterval();
    dailyIntervalId = window.setInterval(() => {
      dailyTimeLeft--;
      els.timerDisplay.textContent = formatTimer(dailyTimeLeft);
      if (dailyTimeLeft <= 0) {
        clearDailyInterval();
        endDailyChallenge();
      }
    }, 1000);
  }

  function endDailyChallenge() {
    clearDailyInterval();
    els.resultSeen.textContent = String(dailyTally.seen);
    els.resultRight.textContent = String(dailyTally.right);
    els.resultWrong.textContent = String(dailyTally.wrong);
    const accuracy = dailyTally.seen
      ? Math.round((dailyTally.right / dailyTally.seen) * 100)
      : 0;
    els.resultAccuracy.textContent = `正答率 ${accuracy}%`;
    showScreen("dailyResults");
  }

  els.dailyAgainBtn.addEventListener("click", () => {
    updateTimeValue();
    showScreen("dailySetup");
  });

  els.dailyHomeBtn.addEventListener("click", () => {
    mode = null;
    showScreen("home");
  });

  // ---------- back navigation ----------

  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => {
      clearDailyInterval();
      lessonRun = null;
      study = null;
      if (lessonSession) {
        alignLessonDueTimes();
        if (savedMainSession) {
          queue = savedMainSession.queue;
          totalCount = savedMainSession.totalCount;
          masteredCount = savedMainSession.masteredCount;
        }
        savedMainSession = null;
        lessonSession = null;
      }
      mode = null;
      showScreen("home");
    });
  });

  // ---------- statistics ----------

  function formatDayLabel(d, isToday) {
    if (isToday) return "今日";
    return d.toLocaleDateString("ja-JP", { weekday: "short" });
  }

  // Terms per progress colour, one chart per deck.
  const STATUS_LABELS = [
    ["new", "未学習"],
    ["learning", "学習済み"],
    ["r2", "復習2"],
    ["r3", "復習3"],
    ["r4", "復習4"],
    ["r5", "復習5"],
    ["r6", "復習6"],
  ];

  function progressChartsHtml() {
    const decks = [{ id: KANJI_DECK_ID, name: "N2漢字" }].concat(
      customDecks.map((deck) => ({ id: `custom:${deck.id}`, name: deck.name }))
    );
    return decks
      .map(({ id, name }) => {
        const items = deckItems(id);
        if (!items.length) return "";
        const counts = {};
        items.forEach((item) => {
          const status = statusOfEntry(srsOf(item), isItemStudied(item));
          counts[status] = (counts[status] || 0) + 1;
        });
        const rows = STATUS_LABELS.map(([status, label]) => {
          const count = counts[status] || 0;
          const pct = Math.round((count / items.length) * 100);
          return `
        <div class="progress-row">
          <i class="status-dot status-${status}"></i>
          <span class="progress-label">${label}</span>
          <span class="progress-bar"><span class="progress-fill status-${status}" style="width:${count && pct < 2 ? 2 : pct}%"></span></span>
          <span class="progress-count">${count}</span>
        </div>`;
        }).join("");
        return `
      <div class="stats-section-title">進捗の内訳 · ${escapeHtml(name)}（${items.length}）</div>
      <div class="progress-chart">${rows}
      </div>`;
      })
      .join("");
  }

  function renderStats() {
    const rows = [];
    const today = new Date();
    for (let i = 0; i <= 6; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const key = dateKey(d);
      const entry = stats.daily[key] || { completed: 0, right: 0, wrong: 0, reviews: 0 };
      rows.push({ label: formatDayLabel(d, i === 0), ...entry });
    }

    const rowsHtml = rows
      .map(
        (r) => `
      <div class="stats-row">
        <span class="stats-cell stats-cell-date">${r.label}</span>
        <span class="stats-cell stats-cell-num">${r.completed}</span>
        <span class="stats-cell stats-cell-right">${r.right}</span>
        <span class="stats-cell stats-cell-wrong">${r.wrong}</span>
      </div>`
      )
      .join("");

    let totalCompleted = 0;
    let totalRight = 0;
    let totalWrong = 0;
    Object.keys(stats.daily).forEach((key) => {
      const v = stats.daily[key];
      totalCompleted += v.completed;
      totalRight += v.right;
      totalWrong += v.wrong;
    });
    const overallAccuracy = totalCompleted
      ? Math.round((totalRight / totalCompleted) * 100)
      : 0;
    const kanjiKeys = Object.keys(stats.perCard).filter((key) => /^\d+$/.test(key));
    const cardsAttempted = kanjiKeys.length;

    let known = 0;
    let learning = 0;
    kanjiKeys.forEach((key) => {
      if (srsTier(stats.perCard[key]) === "known") known++;
      else learning++;
    });
    const totalKanji = visibleKanji().length || n2Kanji.length || 367;
    const newCount = Math.max(totalKanji - cardsAttempted, 0);
    const dueCount = getReviewUnits().length;

    els.statsBody.innerHTML = `
      <div class="stats-section-title">過去7日間</div>
      <div class="stats-table">
        <div class="stats-row stats-header">
          <span class="stats-cell stats-cell-date">日</span>
          <span class="stats-cell stats-cell-num">合計</span>
          <span class="stats-cell stats-cell-right">覚えた</span>
          <span class="stats-cell stats-cell-wrong">もう一度</span>
        </div>
        ${rowsHtml}
      </div>
      <div class="stats-section-title">全体</div>
      <div class="stats-overall">
        <div class="overall-tile">
          <div class="overall-num">${totalCompleted}</div>
          <div class="overall-label">復習数</div>
        </div>
        <div class="overall-tile">
          <div class="overall-num">${totalRight}</div>
          <div class="overall-label">覚えた</div>
        </div>
        <div class="overall-tile">
          <div class="overall-num">${totalWrong}</div>
          <div class="overall-label">もう一度</div>
        </div>
        <div class="overall-tile">
          <div class="overall-num">${overallAccuracy}%</div>
          <div class="overall-label">正答率</div>
        </div>
      </div>
      <div class="stats-section-title">習熟度</div>
      <div class="stats-overall">
        <div class="overall-tile">
          <div class="overall-num">${newCount}</div>
          <div class="overall-label">新規</div>
        </div>
        <div class="overall-tile">
          <div class="overall-num">${learning}</div>
          <div class="overall-label">学習中</div>
        </div>
        <div class="overall-tile">
          <div class="overall-num">${known}</div>
          <div class="overall-label">習得済み</div>
        </div>
      </div>
      ${progressChartsHtml()}
      ${
        dueCount
          ? `<button class="secondary-btn stats-review-btn" type="button" data-action="review-now">${dueCount}枚が復習待ち — 今すぐ復習</button>`
          : `<div class="stats-footnote">現在復習するカードはありません。</div>`
      }
    `;
  }

  els.statsBody.addEventListener("click", (event) => {
    if (!event.target.closest("[data-action='review-now']")) return;
    const units = getReviewUnits();
    if (units.length) startReview(units);
  });

  els.modeStatsBtn.addEventListener("click", () => {
    // "Review now" on this screen reviews the Lessons deck.
    activateDeck(settings.lessonDeck);
    renderStats();
    showScreen("stats");
  });

  els.resetStatsBtn.addEventListener("click", () => {
    const ok = window.confirm(
      "Reset all statistics? Daily history, per-card right/wrong counts and your rank will be erased. This cannot be undone."
    );
    if (!ok) return;
    stats = { daily: {}, perCard: {} };
    saveStats();
    // A higher epoch makes every synced device drop its counts and schedules
    // from before the reset when it next syncs.
    syncCounts = { epoch: Date.now(), devices: {} };
    ownCounts();
    saveSyncCounts();
    renderStats();
  });

  // ---------- type answer mode ----------

  function normalize(s) {
    return s.trim().toLowerCase();
  }

  function splitReading(str) {
    return str
      .split(/[,、]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function expandParenVariants(token) {
    const variants = new Set([token]);
    if (token.includes("(") && token.includes(")")) {
      variants.add(token.replace(/[()]/g, ""));
      variants.add(token.replace(/\([^)]*\)/g, "").trim());
    }
    return variants;
  }

  function pluralVariants(word) {
    const variants = new Set();
    if (!word) return variants;
    if (/[^aeiou]y$/.test(word)) {
      variants.add(word.slice(0, -1) + "ies");
    } else if (/(s|x|z|ch|sh)$/.test(word)) {
      variants.add(word + "es");
    } else if (!word.endsWith("s")) {
      variants.add(word + "s");
    }
    if (word.endsWith("ies") && word.length > 3) {
      variants.add(word.slice(0, -3) + "y");
    } else if (/(ses|xes|zes|ches|shes)$/.test(word)) {
      variants.add(word.slice(0, -2));
    } else if (word.endsWith("s") && !word.endsWith("ss")) {
      variants.add(word.slice(0, -1));
    }
    return variants;
  }

  function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      [prev, curr] = [curr, prev];
    }
    return prev[n];
  }

  function typoThreshold(len) {
    if (len <= 3) return 0;
    if (len <= 7) return 1;
    return 2;
  }

  function isKanaOrKanji(str) {
    return /[぀-ヿ一-鿿]/.test(str);
  }

  // Exact match first; otherwise allow a small typo (bounded edit distance
  // that grows with word length) against Latin-script answers only. Kana
  // readings must match exactly — allowFuzzy is false for onyomi/kunyomi
  // questions since the input is auto-converted kana, not free-typed prose.
  function matchAnswer(raw, accepted, allowFuzzy) {
    const norm = normalize(raw);
    if (!norm) return { correct: false, fuzzy: false };
    if (accepted.has(norm)) return { correct: true, fuzzy: false };
    if (!allowFuzzy || isKanaOrKanji(norm)) return { correct: false, fuzzy: false };
    for (const candidate of accepted) {
      if (isKanaOrKanji(candidate)) continue;
      const maxLen = Math.max(norm.length, candidate.length);
      const threshold = typoThreshold(maxLen);
      if (threshold === 0) continue;
      if (Math.abs(norm.length - candidate.length) > threshold) continue;
      if (levenshtein(norm, candidate) <= threshold) {
        return { correct: true, fuzzy: true, matched: candidate };
      }
    }
    return { correct: false, fuzzy: false };
  }

  // Type Answer questions come in three flavors, each checked against only
  // the matching field on the kanji (plus any custom answers saved for that
  // same field) rather than one combined pool of everything.
  const QUESTION_TYPES = {
    meaning: {
      label: "Meaning",
      badgeClass: "",
      placeholder: "Answer",
    },
    onyomi: {
      label: "音読み",
      badgeClass: "qt-onyomi",
      placeholder: "答え",
    },
    // The kanji's verb or adjective (item.word): its reading, then its meaning.
    wordReading: {
      label: "単語の読み方",
      badgeClass: "qt-kunyomi",
      placeholder: "答え",
    },
    wordMeaning: {
      label: "Word meaning",
      badgeClass: "",
      placeholder: "Answer",
    },
    // The noun made of just the kanji, read as a kunyomi.
    nounReading: {
      label: "訓読み",
      badgeClass: "qt-kunyomi",
      placeholder: "答え",
    },
    nounMeaning: {
      label: "Noun meaning",
      badgeClass: "",
      placeholder: "Answer",
    },
  };

  const isWordType = (type) => type === "wordReading" || type === "wordMeaning";
  const isNounType = (type) => type === "nounReading" || type === "nounMeaning";

  // Where a question type's added answers are kept.
  const answerBucket = (type) => (type === "wordReading" ? "kunyomi" : type);

  // Accepted forms of one English gloss: with and without a leading "to" and
  // without parenthetical notes ("to run (a business)" -> "run").
  // Splits an answer at separators that are not inside parentheses.
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

  // The answer without its parenthetical notes: what is in parentheses is not
  // required to be typed.
  function stripParens(text) {
    return text.replace(/\s*[(（][^)）]*[)）]/g, "").replace(/\s+/g, " ").trim();
  }

  function glossVariants(part) {
    const t = normalize(part);
    const noParens = stripParens(t);
    return [t, noParens, t.replace(/^to\s+/, ""), noParens.replace(/^to\s+/, "")].filter(Boolean);
  }

  // Custom-deck items ask one question per section (type ids "s0", "s1", ...).
  const sectionIndex = (type) => Number(type.slice(1));

  // The badge above the answer bar names the question in the language of its
  // answer: English answers say "Meaning" rather than 意味.
  // Reading questions are called 読み方, whatever the column is named.
  const MEANING_LABELS = new Set(["意味", "いみ", "単語の意味"]);
  function displayLabel(label, value) {
    if (/^reading$/i.test(label) || label === "よみ" || label === "読み") return "読み方";
    if (label === "単語の読み") return "単語の読み方";
    if (!MEANING_LABELS.has(label) || isKanaOrKanji(value)) return label;
    return label === "単語の意味" ? "Word meaning" : "Meaning";
  }

  // The area above the answer bar takes a muted colour by what is asked: one
  // for readings, one for meanings (none for any other kind of column).
  function kindOfLabel(label) {
    if (READING_LABEL_PATTERN.test(label)) return "reading";
    if (MEANING_LABEL_PATTERN.test(label)) return "meaning";
    return null;
  }

  function setQuestionTone(screen, kind) {
    screen.classList.toggle("q-reading", kind === "reading");
    screen.classList.toggle("q-meaning", kind === "meaning");
    screen.classList.toggle("q-noun", kind === "noun");
  }

  // Which note a question uses: the readings' or the meaning's.
  function questionKind(item, type) {
    if (item.sections) return kindOfLabel(item.sections[sectionIndex(type)].label);
    return type === "onyomi" || type === "wordReading" || type === "nounReading" ? "reading" : "meaning";
  }

  // The colour of the screen. For the N2 kanji it follows what is asked about:
  // pink for the kanji itself (音読み and its meaning), purple for its word and
  // teal for its noun (their readings and meanings). A custom deck's readings
  // are pink and its meanings purple.
  function questionTone(item, type) {
    if (item.sections) return kindOfLabel(item.sections[sectionIndex(type)].label);
    // the noun made of just the kanji (訓読み and Noun meaning) is teal
    const group = groupOfType(type);
    return group === "kanji" ? "reading" : group === "noun" ? "noun" : "meaning";
  }

  function typeConfig(item, type) {
    if (!item.sections) return QUESTION_TYPES[type];
    const section = item.sections[sectionIndex(type)];
    return {
      label: displayLabel(section.label, section.value),
      badgeClass: badgeClassForLabel(section.label),
      placeholder: isKanaOrKanji(section.value) ? "答え" : "Answer",
    };
  }

  // One- and two-character fronts keep their normal size. Longer ones stay on
  // a single line and shrink just enough to fit the width of their container.
  function fitFront(el, text) {
    el.style.fontSize = "";
    el.style.whiteSpace = "";
    if (Array.from(text).length > 2) {
      el.style.whiteSpace = "nowrap";
      // The element can grow to fit its text, so the room is also limited by
      // its parent's width.
      const parent = el.parentElement;
      const parentStyle = parent && getComputedStyle(parent);
      const parentRoom = parent
        ? parent.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight)
        : Infinity;
      const available = Math.min(el.clientWidth, parentRoom) * 0.94;
      if (available) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const needed = range.getBoundingClientRect().width;
        if (needed > available) {
          const current = parseFloat(getComputedStyle(el).fontSize);
          el.style.fontSize = `${Math.floor((current * available) / needed)}px`;
        }
      }
    }
    capToHeight(el);
  }

  // On the typed screens the front fills whatever height is left above the
  // answer bar, which shrinks when a phone keyboard is open (or the feedback
  // shows), so the character is also scaled to fit that height.
  function capToHeight(el) {
    if (getComputedStyle(el).flexGrow !== "1") return;
    const height = el.clientHeight;
    if (!height) return;
    const current = parseFloat(getComputedStyle(el).fontSize);
    const largest = Math.max(28, Math.floor(height * 0.8));
    if (current > largest) el.style.fontSize = `${largest}px`;
  }

  if (typeof ResizeObserver !== "undefined") {
    const frontObserver = new ResizeObserver((entries) => {
      entries.forEach(({ target }) => {
        if (target.clientHeight && getComputedStyle(target).flexGrow === "1") fitFront(target, target.textContent);
      });
    });
    frontObserver.observe(els.typeKanji);
    frontObserver.observe(els.customTypeFront);
  }

  // iOS keeps the layout viewport the same size when the keyboard opens and
  // scrolls the page instead, which pushed the top of the screen out of view.
  // Size the app to the visible area and pin it to the top of that area.
  function trackViewport() {
    const vv = window.visualViewport;
    const app = document.querySelector(".app");
    if (!vv || !app) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty("--app-h", `${vv.height}px`);
      app.style.transform = vv.offsetTop ? `translateY(${vv.offsetTop}px)` : "";
      root.classList.toggle("kb-open", window.innerHeight - vv.height > 120);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
  }
  trackViewport();

  // After an answer is submitted the field is "locked": it ignores typing but is
  // never disabled or blurred, so a phone keyboard stays up for the next
  // question. (A disabled field loses focus and closes the keyboard.)
  function lockAnswerInput(input, locked) {
    input.dataset.locked = locked ? input.value : "";
    input.classList.toggle("locked", locked);
    input.readOnlyLock = locked;
  }

  [els.typeInput, els.customTypeInput].forEach((input) => {
    input.addEventListener("beforeinput", (event) => {
      if (input.readOnlyLock) event.preventDefault();
    });
    // Composition input can't be cancelled, so put the answer back instead.
    input.addEventListener("input", () => {
      if (input.readOnlyLock && input.value !== input.dataset.locked) input.value = input.dataset.locked;
    });
  });

  // Tapping the check / next button must not pull focus off the field.
  [els.typeSubmitBtn, els.customTypeSubmitBtn].forEach((btn) => {
    btn.addEventListener("pointerdown", (event) => event.preventDefault());
  });

  // After a miss, A adds the typed answer to the card, T rules it a typo (the
  // same as the two buttons, which are replaced by these keys on a computer)
  // and F shows everything about the card, not only the part that was asked.
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    const key = event.key.toLowerCase();
    if (key !== "a" && key !== "t" && key !== "f" && key !== "m") return;
    let missed = null;
    if (!els.screenType.hidden && !typeAnswering && !pendingTypeCorrect && pendingTypeRawAnswer) {
      missed = { add: els.addAnswerBtn, typo: els.typoBtn, reveal: revealTypeInfo, mnemonic: showTypeMnemonic };
    } else if (!els.screenCustomType.hidden && !customTypeAnswering && !pendingCustomTypeCorrect && pendingCustomTypeRawAnswer) {
      missed = { add: els.customAddAnswerBtn, typo: els.customTypoBtn, reveal: revealCustomTypeInfo, mnemonic: showCustomTypeMnemonic };
    }
    if (!missed) return;
    event.preventDefault();
    if (key === "f") missed.reveal();
    else if (key === "m") missed.mnemonic();
    else (key === "a" ? missed.add : missed.typo).click();
  });

  // The information under the term: everything (`full`), or after a miss just
  // the part that was asked.
  let typeInfoRevealed = false;
  let customTypeInfoRevealed = false;

  function renderTypeInfo(item, type, full) {
    if (item.sections) {
      els.typeSections.innerHTML = sectionsToHtml(full ? item.sections : [item.sections[sectionIndex(type)]]);
      return;
    }
    els.typeOnyomi.textContent = item.onyomi || "—";
    els.typeKunyomi.textContent = item.kunyomi || "—";
    els.typeMeaning.textContent = item.meaning || "—";
    els.typeOnyomiBlock.hidden = !full && type !== "onyomi";
    els.typeKunyomiBlock.hidden = !full;
    els.typeMeaning.hidden = !full && type !== "meaning";
    els.typeWordBlock.hidden = !item.word || (!full && !isWordType(type));
    if (item.word) els.typeWord.textContent = `${item.word}（${item.wordReading}）${item.wordMeaning}`;
    els.typeNounBlock.hidden = !item.noun || (!full && !isNounType(type));
    if (item.noun) els.typeNoun.textContent = `${item.noun}（${item.nounReading}）${item.nounMeaning}`;
  }

  // F shows everything about the card after a miss, and F again hides it.
  // M after a miss shows (or hides) the mnemonic written for what was asked:
  // the meaning's for a meaning question, the readings' for a reading question.
  function mnemonicText(base, kind) {
    const saved = mnemonics[`${base}|${kind === "reading" || kind === "kun" ? "readings" : "meaning"}`];
    return saved ? saved.text.trim() : "";
  }

  function toggleMnemonic(note, text) {
    if (!note.hidden) {
      note.hidden = true;
      return;
    }
    note.innerHTML = `<div class="mnemonic-card"><div class="study-label">Mnemonic</div><div class="mnemonic-text">${text ? escapeHtml(text) : "メモはありません"}</div></div>`;
    note.classList.toggle("empty", !text);
    note.hidden = false;
  }

  function showTypeMnemonic() {
    const item = queue[0];
    if (!item) return;
    const base =
      !item.sections && isWordType(currentQuestionType)
        ? `${leechKey(item)}|word`
        : !item.sections && isNounType(currentQuestionType)
        ? `${leechKey(item)}|noun`
        : leechKey(item);
    toggleMnemonic(els.typeMnemonic, mnemonicText(base, questionKind(item, currentQuestionType)));
  }

  function showCustomTypeMnemonic() {
    const card = customTypeCards[customTypeIndex];
    if (!card) return;
    toggleMnemonic(
      els.customTypeMnemonic,
      mnemonicText(`${customTypeDeck.id}|${card.front}`, kindOfLabel(customTypeCurrentSection.label))
    );
  }

  function revealTypeInfo() {
    const item = queue[0];
    if (!item) return;
    typeInfoRevealed = !typeInfoRevealed;
    els.typeFeedback.classList.toggle("revealed", typeInfoRevealed);
    renderTypeInfo(item, currentQuestionType, typeInfoRevealed);
  }

  function revealCustomTypeInfo() {
    const card = customTypeCards[customTypeIndex];
    if (!card) return;
    customTypeInfoRevealed = !customTypeInfoRevealed;
    els.customTypeFeedback.classList.toggle("revealed", customTypeInfoRevealed);
    els.customTypeSections.innerHTML = sectionsToHtml(
      customTypeInfoRevealed ? card.sections : [customTypeCurrentSection]
    );
  }

  // Re-fit the visible front when the window changes size.
  window.addEventListener("resize", () => {
    if (!els.screenPlay.hidden && queue[0]) fitFront(els.kanji, queue[0].kanji);
    if (!els.screenType.hidden && queue[0]) fitFront(els.typeKanji, queue[0].kanji);
    if (!els.screenCustomType.hidden && customTypeCards[customTypeIndex]) {
      fitFront(els.customTypeFront, customTypeCards[customTypeIndex].front);
    }
    if (!els.screenCustomStudy.hidden && customStudyCards[customStudyIndex]) {
      fitFront(els.customStudyFront, customStudyCards[customStudyIndex].front);
    }
  });

  // `part` limits a kanji to its own questions ("kanji"), its word's ("word")
  // or its noun's ("noun"); "all" asks everything.
  function availableQuestionTypes(item, part = "all") {
    if (item.sections) {
      return item.sections.map((s, i) => (s.value ? `s${i}` : null)).filter(Boolean);
    }
    const types = [];
    if (part === "all" || part === "kanji") {
      types.push("meaning");
      if (item.onyomi) types.push("onyomi");
    }
    if ((part === "all" || part === "word") && item.word) types.push("wordReading", "wordMeaning");
    if ((part === "all" || part === "noun") && item.noun) types.push("nounReading", "nounMeaning");
    return types;
  }

  function pickQuestionType(item) {
    const types = availableQuestionTypes(item);
    return types[Math.floor(Math.random() * types.length)];
  }

  // Typing in romaji turns into kana when a custom card's answer is written
  // in a single kana script: toKatakana or toHiragana, else null. Separators
  // between several answers ("ぶたい, ぶたい") don't count.
  function kanaModeFor(value) {
    if (typeof wanakana === "undefined") return null;
    const letters = String(value).replace(/[\s,;、，；\/／.。()（）~〜-]/g, "");
    if (!letters) return null;
    if (wanakana.isKatakana(letters)) return "toKatakana";
    // Hiragana, or a mix of the two scripts (either spelling is accepted).
    if (wanakana.isKana(letters)) return "toHiragana";
    return null;
  }

  function bindKanaInput(input, mode) {
    if (typeof wanakana === "undefined") return;
    try {
      wanakana.unbind(input);
    } catch (err) {
      /* wasn't bound; ignore */
    }
    if (mode) wanakana.bind(input, { IMEMode: mode });
  }

  function setTypeInputMode(type, item) {
    if (typeof wanakana === "undefined") return;
    try {
      wanakana.unbind(els.typeInput);
    } catch (err) {
      /* wasn't bound; ignore */
    }
    if (item && item.sections) {
      const mode = kanaModeFor(item.sections[sectionIndex(type)].value);
      if (mode) wanakana.bind(els.typeInput, { IMEMode: mode });
    } else if (type === "onyomi") {
      wanakana.bind(els.typeInput, { IMEMode: "toKatakana" });
    } else if (type === "wordReading" || type === "nounReading") {
      wanakana.bind(els.typeInput, { IMEMode: "toHiragana" });
    }
  }

  function buildAnswersForType(item, type) {
    if (item.sections) {
      const section = item.sections[sectionIndex(type)];
      const deck = customDeckById(item.deckId);
      const set = buildCustomAcceptedAnswers(
        section.value,
        deck ? getCustomDeckAnswers(deck, item.front, section.label) : []
      );
      if (typeof wanakana !== "undefined" && wanakana.isKana(section.value)) {
        set.add(wanakana.toHiragana(section.value));
        set.add(wanakana.toKatakana(section.value));
      }
      return set;
    }
    const set = new Set();
    if (type === "wordReading") {
      set.add(normalize(item.wordReading));
    } else if (type === "nounReading") {
      set.add(normalize(item.nounReading));
    } else if (type === "nounMeaning") {
      splitOutsideParens(item.nounMeaning, ";,/").forEach((part) => glossVariants(part).forEach((v) => set.add(v)));
    } else if (type === "wordMeaning") {
      splitOutsideParens(item.wordMeaning, ";,/").forEach((part) => glossVariants(part).forEach((v) => set.add(v)));
    } else if (type === "meaning") {
      splitOutsideParens(item.meaning, ";,").forEach((part) => {
        [normalize(part), stripParens(normalize(part))].forEach((t) => {
          if (t) {
            set.add(t);
            pluralVariants(t).forEach((v) => set.add(v));
          }
        });
      });
    } else {
      [item[`${type}Romaji`], item[type]].forEach((field) => {
        if (!field) return;
        splitReading(field).forEach((token) => {
          expandParenVariants(token).forEach((v) => {
            const t = normalize(v);
            if (t) set.add(t);
          });
        });
      });
    }
    getCustomAnswers(item.num, answerBucket(type)).forEach((a) => {
      const t = normalize(a);
      if (t) set.add(t);
    });
    return set;
  }

  function startTypeMode() {
    mode = "type";
    showScreen("type");
    renderType();
  }

  // The running score in the corner: ✓ right, ✕ wrong and the percentage,
  // counting each question once by its first answer (as the summary does).
  // `pending` adds the question just answered, before it has been moved on from.
  function renderScore(el, right, wrong, pending) {
    if (pending === true) right++;
    else if (pending === false) wrong++;
    const answered = right + wrong;
    const percent = answered ? `${Math.round((right / answered) * 100)}%` : "—";
    el.innerHTML =
      `<span class="score-right">✓ ${right}</span><span class="score-wrong">✕ ${wrong}</span><span class="score-percent">${percent}</span>`;
    el.hidden = false;
  }

  function updateTypeScore(answeredNow) {
    if (mode !== "lesson-type" || !lessonSession) {
      els.typeScore.hidden = true;
      return;
    }
    let pending = null;
    if (answeredNow && queue[0] && !lessonSession.attempted.has(`${queue[0].num}:${currentQuestionType}`)) {
      pending = pendingTypeCorrect;
    }
    renderScore(els.typeScore, lessonSession.right, lessonSession.wrong, pending);
  }

  function renderType() {
    typeAnswering = true;
    els.typeCard.classList.remove("answer-wrong", "answer-right");
    lockAnswerInput(els.typeInput, false);
    els.typeInput.value = "";
    els.typeFeedback.hidden = true;
    els.typeSubmitBtn.textContent = "確認";

    if (queue.length === 0) {
      if (mode === "lesson-type") {
        finishLesson();
        return;
      }
      els.questionTypeBadge.hidden = true;
      setTypeInputMode("meaning");
      els.typeKanji.textContent = "完";
      els.typeForm.hidden = true;
      els.typeCongratsMsg.hidden = false;
      els.typeNewDeckBtn.hidden = false;
      els.typeProgress.textContent = `${masteredCount} / ${totalCount} · 完了！`;
      if (mode === "type") saveState();
      return;
    }

    const item = queue[0];
    currentQuestionType =
      mode === "lesson-type" ? lessonQuestionTypes[0] : pickQuestionType(item);
    const config = typeConfig(item, currentQuestionType);

    els.questionTypeBadge.hidden = false;
    setQuestionTone(els.screenType, questionTone(item, currentQuestionType));
    els.questionTypeBadge.textContent = config.label;
    els.questionTypeBadge.className =
      "question-type-badge" + (config.badgeClass ? ` ${config.badgeClass}` : "");
    els.typeInput.placeholder = config.placeholder;
    setTypeInputMode(currentQuestionType, item);

    els.typeForm.hidden = false;
    els.typeCongratsMsg.hidden = true;
    els.typeNewDeckBtn.hidden = true;
    const shown = isWordType(currentQuestionType) ? item.word : item.kanji;
    els.typeKanji.textContent = shown;
    fitFront(els.typeKanji, shown);
    els.typeProgress.textContent =
      mode === "lesson-type"
        ? `${lessonSession.kind === "all" ? lessonSession.seen : lessonSession.right} / ${lessonSession.total}`
        : `${masteredCount} / ${totalCount} · 残り${queue.length}`;
    els.typeInput.focus();
    updateTypeScore(false);
    if (mode === "type") saveState();
  }

  function updateTypeFeedbackResult(correct, raw, fuzzy) {
    els.typeCard.classList.toggle("answer-wrong", !correct);
    els.typeCard.classList.toggle("answer-right", correct);
    els.typeFeedbackResult.textContent = correct
      ? fuzzy
        ? "✓ 正解！（ほぼ一致 — 軽いタイプミス）"
        : "✓ 正解！"
      : ""; // a miss is shown by the red bar and the answer below
    els.typeFeedbackResult.className =
      "type-feedback-result " + (correct ? "feedback-good" : "feedback-bad");
  }

  function renderTypeCustomAnswers(item, type) {
    let list;
    if (item.sections) {
      const deck = customDeckById(item.deckId);
      list = deck ? getCustomDeckAnswers(deck, item.front, item.sections[sectionIndex(type)].label) : [];
    } else {
      list = getCustomAnswers(item.num, answerBucket(type));
    }
    if (list.length) {
      els.typeCustomAnswersList.textContent = list.join(", ");
      els.typeCustomAnswers.hidden = false;
    } else {
      els.typeCustomAnswers.hidden = true;
    }
  }

  function updateAddAnswerButton() {
    const canAdd = !pendingTypeCorrect && Boolean(pendingTypeRawAnswer);
    els.addAnswerBtn.hidden = !canAdd;
    els.addAnswerRow.hidden = !canAdd;
    if (canAdd) {
      els.addAnswerBtnText.textContent = "答えを追加";
    }
  }

  function checkTypeAnswer() {
    if (queue.length === 0) return;
    const item = queue[0];
    const raw = els.typeInput.value;
    const accepted = buildAnswersForType(item, currentQuestionType);
    const { correct, fuzzy } = matchAnswer(raw, accepted, item.sections ? true : currentQuestionType === "meaning" || currentQuestionType === "wordMeaning" || currentQuestionType === "nounMeaning");

    typeAnswering = false;
    pendingTypeCorrect = correct;
    pendingTypeRawAnswer = raw.trim();
    updateTypeScore(true);
    lockAnswerInput(els.typeInput, true);
    els.typeSubmitBtn.textContent = "次へ";

    els.typeFeedback.hidden = false;
    els.typeFeedback.classList.toggle("quick", correct);
    els.typeFeedback.classList.remove("revealed");
    els.typeMnemonic.hidden = true;
    updateTypeFeedbackResult(correct, pendingTypeRawAnswer, fuzzy);
    els.typeLegacyRows.hidden = Boolean(item.sections);
    els.typeSections.hidden = !item.sections;
    els.typeCardStats.hidden = Boolean(item.sections);
    // After a miss only the part that was asked is shown, to keep it short
    // (F shows the rest).
    typeInfoRevealed = false;
    renderTypeInfo(item, currentQuestionType, correct);
    renderTypeCustomAnswers(item, currentQuestionType);
    updateAddAnswerButton();
    const cardStats = getCardStats(item.num);
    els.typeCardStatsRight.textContent = String(cardStats.right);
    els.typeCardStatsWrong.textContent = String(cardStats.wrong);

    if (correct) {
      typeAutoAdvanceTimer = window.setTimeout(() => {
        typeAutoAdvanceTimer = null;
        if (!typeAnswering && pendingTypeCorrect) advanceTypeCard();
      }, AUTO_ADVANCE_MS);
    } else {
      // The disabled input drops focus; park it on Next so Enter continues.
      els.typeInput.focus();
    }
  }

  function advanceTypeCard() {
    window.clearTimeout(typeAutoAdvanceTimer);
    typeAutoAdvanceTimer = null;
    const item = queue.shift();
    if (pendingTypeCorrect) {
      masteredCount++;
    }
    if (mode === "lesson-type") {
      const type = lessonQuestionTypes.shift();
      const all = lessonSession.kind === "all";
      if (!pendingTypeCorrect) {
        if (all) {
          lessonSession.mistakes.push({ item, type, given: pendingTypeRawAnswer });
        } else {
          const at = Math.min(queue.length, REQUEUE_GAP);
          queue.splice(at, 0, item);
          lessonQuestionTypes.splice(at, 0, type);
        }
      }
      if (!all || isItemStudied(item)) recordItemResult(item, pendingTypeCorrect, false);
      if (pendingTypeCorrect && (all || lessonSession.kind === "review" || lessonSession.kind === "leech")) addReviewPoint();
      gradeLessonTerm(item, pendingTypeCorrect, type);
      // The summary counts each question once, by its first answer: a question
      // missed and later answered right still counts as incorrect only.
      const questionKey = `${item.num}:${type}`;
      if (!lessonSession.attempted.has(questionKey)) {
        lessonSession.attempted.add(questionKey);
        lessonSession.seen++;
        if (pendingTypeCorrect) lessonSession.right++;
        else lessonSession.wrong++;
      }
    } else {
      recordItemResult(item, pendingTypeCorrect);
    }
    renderType();
  }

  els.typeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (queue.length === 0) return;
    if (typeAnswering) {
      // Enter on an empty field does nothing; it is not an answer.
      if (!els.typeInput.value.trim()) return;
      checkTypeAnswer();
    } else {
      advanceTypeCard();
    }
  });

  els.addAnswerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (queue.length === 0 || typeAnswering || !pendingTypeRawAnswer) return;
    const item = queue[0];
    if (item.sections) {
      const deck = customDeckById(item.deckId);
      if (deck) addCustomDeckAnswer(deck, item.front, item.sections[sectionIndex(currentQuestionType)].label, pendingTypeRawAnswer);
    } else {
      addCustomAnswer(item.num, answerBucket(currentQuestionType), pendingTypeRawAnswer);
    }
    pendingTypeCorrect = true;
    updateTypeScore(true);
    updateTypeFeedbackResult(true, pendingTypeRawAnswer);
    renderTypeCustomAnswers(item, currentQuestionType);
    els.addAnswerBtn.hidden = true;
    els.addAnswerRow.hidden = true;
    scheduleTypeAdvance();
  });

  // A miss ruled correct moves on after the same short pause as a right answer.
  function scheduleTypeAdvance() {
    window.clearTimeout(typeAutoAdvanceTimer);
    typeAutoAdvanceTimer = window.setTimeout(() => {
      typeAutoAdvanceTimer = null;
      if (!typeAnswering && pendingTypeCorrect) advanceTypeCard();
    }, AUTO_ADVANCE_MS);
  }

  // Rules a missed answer correct without saving it as an accepted answer.
  els.typoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (queue.length === 0 || typeAnswering || pendingTypeCorrect || !pendingTypeRawAnswer) return;
    pendingTypeCorrect = true;
    updateTypeScore(true);
    updateTypeFeedbackResult(true, pendingTypeRawAnswer, true);
    els.addAnswerBtn.hidden = true;
    els.addAnswerRow.hidden = true;
    scheduleTypeAdvance();
  });

  els.typeNewDeckBtn.addEventListener("click", () => {
    reshuffleDeck();
    renderType();
  });

  if (els.modeTypeBtn) els.modeTypeBtn.addEventListener("click", () => {
    if (!allKanji.length) return;
    startTypeMode();
  });

  // ---------- export / import ----------

  function buildLocalProfileSnapshot() {
    return {
      settings,
      customAnswers,
      stats,
      lessons: lessonHistory,
      leeches,
      mnemonics,
      deck: {
        queueNums: queue.map((item) => item.num),
        masteredCount,
        totalCount,
      },
    };
  }

  // Applies a profile snapshot (from an import, or a merge result) to local
  // state. Uses the existing save*() functions so persistence stays in one
  // place.
  function applyProfileSnapshot(profile) {
    if (!profile) return;
    if (profile.settings) {
      settings = { ...settings, ...profile.settings };
      applySettings();
      refreshSettingsUI();
      saveSettings();
    }
    if (profile.customAnswers) {
      customAnswers = normalizeCustomAnswersShape(profile.customAnswers);
      saveCustomAnswers();
    }
    if (profile.stats) {
      stats = profile.stats;
      saveStats();
    }
    if (profile.mnemonics) {
      mnemonics = KanjiFlashSync.mergeMnemonics({}, profile.mnemonics);
      saveMnemonics();
    }
    if (profile.leeches) {
      leeches = KanjiFlashSync.mergeLeeches({}, profile.leeches);
      saveLeeches();
    }
    if (profile.lessons) {
      lessonHistory = normalizeLessonHistory(profile.lessons);
      saveLessonHistory();
    }
    if (profile.deck && Array.isArray(profile.deck.queueNums)) {
      const nums = profile.deck.queueNums.filter((n) => kanjiByNum.has(n));
      if (nums.length) {
        queue = nums.map((n) => kanjiByNum.get(n));
        totalCount = profile.deck.totalCount || allKanji.length;
        masteredCount = profile.deck.masteredCount || 0;
        saveState();
      }
    }
  }

  // Custom decks are keyed by id; on conflict (same deck edited on two
  // devices before syncing) the most recently updated copy wins, matching
  // how a replace/rename should behave rather than trying to merge card lists.
  function mergeCustomDecksLists(a, b) {
    const byId = new Map();
    (a || []).forEach((d) => byId.set(d.id, d));
    (b || []).forEach((d) => {
      const existing = byId.get(d.id);
      if (!existing || (d.updatedAt || "") > (existing.updatedAt || "")) {
        byId.set(d.id, d);
      }
    });
    return Array.from(byId.values());
  }

  function mergeAnswerLists(a, b) {
    const seen = new Set();
    const merged = [];
    [...a, ...b].forEach((answer) => {
      const norm = normalize(answer);
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        merged.push(answer);
      }
    });
    return merged;
  }

  function mergeCustomAnswerEntries(a, b) {
    return {
      wordMeaning: mergeAnswerLists((a && a.wordMeaning) || [], (b && b.wordMeaning) || []),
      meaning: mergeAnswerLists((a && a.meaning) || [], (b && b.meaning) || []),
      onyomi: mergeAnswerLists((a && a.onyomi) || [], (b && b.onyomi) || []),
      kunyomi: mergeAnswerLists((a && a.kunyomi) || [], (b && b.kunyomi) || []),
      nounReading: mergeAnswerLists((a && a.nounReading) || [], (b && b.nounReading) || []),
      nounMeaning: mergeAnswerLists((a && a.nounMeaning) || [], (b && b.nounMeaning) || []),
    };
  }

  function mergeProfiles(local, incoming) {
    const localAnswers = normalizeCustomAnswersShape(local.customAnswers || {});
    const incomingAnswers = normalizeCustomAnswersShape(incoming.customAnswers || {});
    const customAnswersMerged = {};
    new Set([
      ...Object.keys(localAnswers),
      ...Object.keys(incomingAnswers),
    ]).forEach((key) => {
      customAnswersMerged[key] = mergeCustomAnswerEntries(
        localAnswers[key],
        incomingAnswers[key]
      );
    });

    const daily = {};
    new Set([
      ...Object.keys((local.stats && local.stats.daily) || {}),
      ...Object.keys((incoming.stats && incoming.stats.daily) || {}),
    ]).forEach((key) => {
      const a = (local.stats && local.stats.daily && local.stats.daily[key]) || {
        completed: 0,
        right: 0,
        wrong: 0,
      };
      const b = (incoming.stats && incoming.stats.daily && incoming.stats.daily[key]) || {
        completed: 0,
        right: 0,
        wrong: 0,
      };
      daily[key] = {
        completed: a.completed + b.completed,
        right: a.right + b.right,
        wrong: a.wrong + b.wrong,
        reviews: (a.reviews || 0) + (b.reviews || 0),
      };
    });

    const perCard = {};
    new Set([
      ...Object.keys((local.stats && local.stats.perCard) || {}),
      ...Object.keys((incoming.stats && incoming.stats.perCard) || {}),
    ]).forEach((key) => {
      const a = (local.stats && local.stats.perCard && local.stats.perCard[key]) || {
        right: 0,
        wrong: 0,
      };
      const b = (incoming.stats && incoming.stats.perCard && incoming.stats.perCard[key]) || {
        right: 0,
        wrong: 0,
      };
      // right/wrong are lifetime counters, safe to sum; box/due/streak are
      // point-in-time state, so the more recently-graded side wins instead.
      perCard[key] = {
        right: a.right + b.right,
        wrong: a.wrong + b.wrong,
        ...pickNewerSrs(a, b),
      };
    });

    const completed = {};
    new Set([
      ...Object.keys((local.lessons && local.lessons.completed) || {}),
      ...Object.keys((incoming.lessons && incoming.lessons.completed) || {}),
    ]).forEach((key) => {
      const a = (local.lessons && local.lessons.completed && local.lessons.completed[key]) || [];
      const b = (incoming.lessons && incoming.lessons.completed && incoming.lessons.completed[key]) || [];
      completed[key] = Array.from(new Set([...a, ...b]));
    });
    const localEpoch = local.lessons && local.lessons.epoch;
    const incomingEpoch = incoming.lessons && incoming.lessons.epoch;
    const epoch =
      localEpoch && incomingEpoch
        ? localEpoch < incomingEpoch
          ? localEpoch
          : incomingEpoch
        : localEpoch || incomingEpoch;

    // A kanji either side wants to learn stays "learn"; otherwise known wins.
    const placement = {};
    new Set([
      ...Object.keys((local.lessons && local.lessons.placement) || {}),
      ...Object.keys((incoming.lessons && incoming.lessons.placement) || {}),
    ]).forEach((key) => {
      const a = local.lessons && local.lessons.placement && local.lessons.placement[key];
      const b = incoming.lessons && incoming.lessons.placement && incoming.lessons.placement[key];
      placement[key] = a === "learn" || b === "learn" ? "learn" : a || b;
    });

    const todayA = local.lessons && local.lessons.today;
    const todayB = incoming.lessons && incoming.lessons.today;
    let today = todayA || todayB || null;
    if (todayA && todayB) {
      if (todayA.date === todayB.date) {
        today = { date: todayA.date, nums: Array.from(new Set([...todayA.nums, ...todayB.nums])) };
      } else {
        today = todayA.date > todayB.date ? todayA : todayB;
      }
    }

    return {
      customAnswers: customAnswersMerged,
      stats: { daily, perCard },
      lessons: { completed, epoch, placement, today },
      leeches: KanjiFlashSync.mergeLeeches(local.leeches, incoming.leeches),
      mnemonics: KanjiFlashSync.mergeMnemonics(local.mnemonics, incoming.mnemonics),
      settings: incoming.settings || local.settings,
      deck: incoming.deck || local.deck,
    };
  }

  // ---------- device sync ----------

  let syncPairing = null; // room watcher that joins new devices to the group
  let syncSession = null; // running group sync
  let peerLoadPromise = null;
  let syncVerify = null; // resolver for the open "same number on both?" question
  let syncStages = [];

  // The last few connection steps, shown small under the status so a stalled
  // attempt shows where it stopped.
  function setSyncTech(stage) {
    if (stage === null) syncStages = [];
    else syncStages = [...syncStages, stage].slice(-5);
    els.syncTech.textContent = syncStages.join(" → ");
  }

  // Steps of the same-network search, shown for a device already in a group
  // (its main status line shows the sync itself).
  let roomStages = [];

  function setRoomTech(stage) {
    roomStages = [...roomStages, stage].slice(-4);
    els.syncRoomTech.textContent = "近くの検索: " + roomStages.join(" → ");
  }

  function setNearbyStatus(text) {
    els.syncNearbyStatus.textContent = text;
  }

  function resolveSyncVerify(same) {
    els.syncSasBox.hidden = true;
    if (syncVerify) {
      const resolve = syncVerify;
      syncVerify = null;
      resolve(same);
    }
  }

  const VERIFY_QUESTION = "もう一方の画面にも同じ番号が表示されていますか？";

  function askToVerifyNumber(number, info) {
    const hasMine = Boolean(info && info.hasMine);
    const hasTheirs = Boolean(info && info.hasTheirs);
    els.syncSas.textContent = number;
    if (hasMine && hasTheirs) {
      els.syncSasTitle.textContent = "別のグループのデバイスが見つかりました";
      els.syncSasHint.textContent = `${VERIFY_QUESTION}「同じ」を押すと、2つのグループが1つに統合されます。`;
    } else if (hasMine) {
      els.syncSasTitle.textContent = "新しいデバイスが見つかりました";
      els.syncSasHint.textContent = `${VERIFY_QUESTION}「同じ」を押すと、そのデバイスがグループに追加されます。`;
    } else {
      els.syncSasTitle.textContent = "近くのデバイスが見つかりました";
      els.syncSasHint.textContent = hasTheirs
        ? `${VERIFY_QUESTION}「同じ」を押すと、そのデバイスのグループに参加します。`
        : `${VERIFY_QUESTION}「同じ」を押すと、2台でグループを作成します。`;
      setNearbyStatus("近くのデバイスが見つかりました。");
    }
    els.syncSasBox.hidden = false;
    return new Promise((resolve) => {
      syncVerify = resolve;
    });
  }

  // Finds devices on the same network. A device that is not in a group yet
  // joins (or starts) one after both people confirm the same number; a device
  // that is in a group keeps watching quietly so it can add newcomers.
  function startNearby() {
    const group = loadSyncGroup();
    if (syncPairing) {
      syncPairing.cancel();
      syncPairing = null;
    }
    resolveSyncVerify(false);
    roomStages = [];
    els.syncRoomTech.textContent = "";
    if (!group) {
      setSyncTech(null);
      setSyncStatus("");
      setNearbyStatus("近くのデバイスを探しています…");
    }
    ensurePeerLoaded()
      .then(() => {
        if (els.screenSync.hidden || Boolean(loadSyncGroup()) !== Boolean(group)) return;
        syncPairing = KanjiFlashSync.nearbyPairing(
          {
            onStage: group ? setRoomTech : setSyncTech,
            onWaiting: () => {
              resolveSyncVerify(false);
              if (!group) {
                setNearbyStatus("近くのデバイスを探しています…もう一方のデバイスでもこの画面を開いてください。");
              }
            },
            onVerify: askToVerifyNumber,
            onVerifyCancelled: () => resolveSyncVerify(false),
            onRejected: (who) =>
              setSyncStatus(
                group
                  ? "キャンセルしました。"
                  : who === "remote"
                  ? "相手のデバイスがキャンセルしました。もう一度探しています…"
                  : "キャンセルしました。もう一度探しています…"
              ),
            onMemberSeen: addGroupMember,
            onJoined: ({ key, members }) => joinGroup(key, members),
            onError: (err) => {
              if (group) return;
              const type = typeof err === "string" ? err : err && err.type;
              setNearbyStatus(
                type === "no-network-id"
                  ? "ネットワークを特定できませんでした。ネットワークを確認して、もう一度お試しください。"
                  : describeSyncError(err)
              );
            },
          },
          {
            key: group ? group.key : undefined,
            roomSalt: loadJson("kanjiFlashN2.testRoomSalt", ""), // testing only
            deviceId: getDeviceId(),
            getMembers: () => {
              const current = loadSyncGroup();
              return current ? current.members : {};
            },
          }
        );
      })
      .catch(() => {
        if (!group) setNearbyStatus("同期の準備に失敗しました。ネットワークを確認してください。");
      });
  }

  function setSyncStatus(text, tone) {
    els.syncStatus.textContent = text;
    els.syncStatus.className = "sync-status" + (tone ? ` sync-${tone}` : "");
  }

  function ensurePeerLoaded() {
    if (window.Peer) return Promise.resolve();
    if (peerLoadPromise) return peerLoadPromise;
    peerLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PEERJS_SRC;
      script.integrity = PEERJS_SRI;
      script.crossOrigin = "anonymous";
      script.onload = () => resolve();
      script.onerror = () => {
        peerLoadPromise = null;
        reject(new Error("Failed to load PeerJS"));
      };
      document.head.appendChild(script);
    });
    return peerLoadPromise;
  }

  // The group this device belongs to: a shared secret key and the ids of its
  // devices (including this one), or null if not in a group yet.
  function loadSyncGroup() {
    const group = loadJson(SYNC_GROUP_KEY, null);
    if (!group || typeof group.key !== "string") return null;
    return { key: group.key, members: isPlainObject(group.members) ? group.members : {} };
  }

  function saveSyncGroup(group) {
    saveJson(SYNC_GROUP_KEY, group);
  }

  // Devices only connect to members they know about, so every member must
  // list itself and learn the others. A device is added once it has proved it
  // holds the group key (by answering the keyed challenge).
  function addGroupMember(deviceId) {
    const group = loadSyncGroup();
    if (!group || typeof deviceId !== "string" || !deviceId || group.members[deviceId]) return;
    group.members[deviceId] = new Date().toISOString();
    saveSyncGroup(group);
    refreshSyncUI();
  }

  function ensureSelfInGroup() {
    const group = loadSyncGroup();
    const id = getDeviceId();
    if (group && !group.members[id]) {
      group.members[id] = new Date().toISOString();
      saveSyncGroup(group);
    }
  }

  // Devices paired with the earlier two-device version keep working: its pair
  // key becomes the group key, and the partner (if known) becomes a member.
  function migrateOldPairing() {
    if (loadSyncGroup()) return;
    const old = loadJson(OLD_SYNC_PAIR_KEY, null);
    if (!old || typeof old.key !== "string") return;
    const base = loadJson(OLD_SYNC_BASE_KEY, null);
    const now = new Date().toISOString();
    const members = { [getDeviceId()]: now };
    if (base && typeof base.with === "string") members[base.with] = now;
    saveSyncGroup({ key: old.key, members });
    try {
      localStorage.removeItem(OLD_SYNC_PAIR_KEY);
      localStorage.removeItem(OLD_SYNC_BASE_KEY);
    } catch (err) {
      /* ignore */
    }
  }

  function stopSyncActivity() {
    resolveSyncVerify(false);
    if (syncPairing) {
      syncPairing.cancel();
      syncPairing = null;
    }
    if (syncSession) {
      syncSession.stop();
      syncSession = null;
    }
  }

  function refreshSyncUI() {
    const group = loadSyncGroup();
    els.syncUnpaired.hidden = Boolean(group);
    els.syncPaired.hidden = !group;
    els.syncSasBox.hidden = true;
    if (group) {
      els.syncGroupTitle.textContent = `同期グループ（${Math.max(Object.keys(group.members).length, 1)}台）`;
    }
  }

  function describeSyncError(err) {
    const type = typeof err === "string" ? err : err && err.type;
    if (type === "ice-failed") {
      return "デバイス間の直接接続に失敗しました。VPNや、端末同士の通信を制限するWi-Fi（ゲストWi-Fiなど）が原因かもしれません。";
    }
    if (type === "guest-left" || type === "closed") {
      return "相手のデバイスとの接続が切れました。もう一度お試しください。";
    }
    if (type === "network" || type === "server-error" || type === "socket-error" || type === "socket-closed") {
      return "同期サーバーに接続できません。ネットワークを確認してください。";
    }
    return "接続できませんでした。同じWi-Fiに接続して、もう一度お試しください。";
  }

  // A random id for this browser; it names this device within a group.
  function getDeviceId() {
    let id = loadJson(DEVICE_ID_KEY, null);
    if (typeof id !== "string" || id.length < 16) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      saveJson(DEVICE_ID_KEY, id);
    }
    return id;
  }

  const SRS_FIELD_NAMES = ["box", "due", "dueAt", "lastSeen", "streak"];

  function buildSyncState() {
    const group = loadSyncGroup();
    const srs = {};
    Object.keys(stats.perCard || {}).forEach((key) => {
      const entry = stats.perCard[key];
      const fields = {};
      SRS_FIELD_NAMES.forEach((name) => {
        if (entry[name] !== undefined) fields[name] = entry[name];
      });
      if (Object.keys(fields).length) srs[key] = fields;
    });
    return {
      deviceId: getDeviceId(),
      members: group ? group.members : {},
      counts: syncCounts,
      srs,
      customAnswers,
      lessons: {
        completed: lessonHistory.completed,
        placement: lessonHistory.placement,
        today: lessonHistory.today,
        ...(lessonHistory.epoch ? { epoch: lessonHistory.epoch } : {}),
      },
      customDecks,
      deletedDecks: loadJson(DECK_TOMBSTONES_KEY, {}),
      kanjiRemovals,
      leeches,
      mnemonics,
    };
  }

  // Same content regardless of key order, to tell whether a merge changed
  // anything (so changes are only passed on when there is something new).
  function canonicalJson(value) {
    if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
    if (value && typeof value === "object") {
      return (
        "{" +
        Object.keys(value)
          .sort()
          .filter((key) => value[key] !== undefined)
          .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
          .join(",") +
        "}"
      );
    }
    return JSON.stringify(value);
  }

  // Shows the summed counters, with each kanji's review schedule alongside.
  function applyCountsToStats(srs) {
    const total = KanjiFlashSync.totalCounts(syncCounts);
    const perCard = {};
    new Set([...Object.keys(total.perCard), ...Object.keys(srs || {})]).forEach((key) => {
      perCard[key] = {
        right: (total.perCard[key] && total.perCard[key].right) || 0,
        wrong: (total.perCard[key] && total.perCard[key].wrong) || 0,
        ...((srs && srs[key]) || {}),
      };
    });
    stats = { daily: total.daily, perCard };
    saveStats();
  }

  // Merges another device's state into this one. Returns true if anything here
  // changed (the sync layer then passes the news on to other devices).
  function applySyncState(remote) {
    if (!remote || typeof remote !== "object" || JSON.stringify(remote).includes('"__proto__"')) {
      throw new Error("Invalid sync data");
    }
    const before = buildSyncState();
    const merged = KanjiFlashSync.mergeState(before, remote);
    if (canonicalJson(before) === canonicalJson(merged)) return false;

    syncCounts = { epoch: merged.counts.epoch, devices: merged.counts.devices };
    ownCounts(); // recreated if a reset elsewhere dropped it
    saveSyncCounts();
    applyCountsToStats(merged.srs);
    customAnswers = normalizeCustomAnswersShape(merged.customAnswers);
    saveCustomAnswers();
    lessonHistory = normalizeLessonHistory({ ...merged.lessons });
    saveLessonHistory();
    customDecks = merged.customDecks;
    saveCustomDecks();
    saveJson(DECK_TOMBSTONES_KEY, merged.deletedDecks);
    kanjiRemovals = merged.kanjiRemovals || {};
    saveKanjiRemovals();
    leeches = merged.leeches || {};
    saveLeeches();
    mnemonics = merged.mnemonics || {};
    saveMnemonics();
    const group = loadSyncGroup();
    if (group) {
      group.members = merged.members;
      saveSyncGroup(group);
      refreshSyncUI();
    }
    return true;
  }

  // ---------- manual sync by code ----------
  // For when two devices can't reach each other. The code is this device's sync
  // state (what device sync sends), compressed and as text. Importing one
  // merges it the same way a connection would, so counts are never doubled.

  const SYNC_CODE_RE = /^KFS([01]):([A-Za-z0-9+/=_-]+)$/;

  function bytesToBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }

  const base64ToBytes = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

  async function encodeSyncCode(state) {
    let bytes = new TextEncoder().encode(JSON.stringify(state));
    let tag = "0";
    if (typeof CompressionStream !== "undefined") {
      const packed = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
      bytes = new Uint8Array(await new Response(packed).arrayBuffer());
      tag = "1";
    }
    return `KFS${tag}:${bytesToBase64(bytes)}`;
  }

  async function decodeSyncCode(code) {
    const match = SYNC_CODE_RE.exec(code.replace(/\s+/g, ""));
    if (!match) throw new Error("Not a sync code");
    let bytes = base64ToBytes(match[2]);
    if (match[1] === "1") {
      if (typeof DecompressionStream === "undefined") throw new Error("This browser can't read this code");
      const unpacked = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
      bytes = new Uint8Array(await new Response(unpacked).arrayBuffer());
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function setCodeStatus(text, tone) {
    els.syncCodeStatus.textContent = text;
    els.syncCodeStatus.className = "sync-hint" + (tone ? ` sync-${tone}` : "");
  }

  // The code goes into the box; on a computer it is also selected. On a touch
  // screen the box is left alone, so the keyboard doesn't open.
  async function fillOwnSyncCode() {
    const code = await encodeSyncCode(buildSyncState());
    els.syncCode.value = code;
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      els.syncCode.focus();
      els.syncCode.select();
    }
    return code;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      return false;
    }
  }

  els.syncCodeCopyBtn.addEventListener("click", async () => {
    try {
      const code = await fillOwnSyncCode();
      setCodeStatus(
        (await copyToClipboard(code))
          ? "コードをコピーしました。もう一方の端末で「コピーしたコードを取り込む」を押してください。"
          : "コードを欄に出しました。欄を長押ししてコピーし、もう一方の端末で取り込んでください。",
        "ok"
      );
    } catch (err) {
      setCodeStatus("コードを作れませんでした。", "bad");
    }
  });

  // Merges a pasted code, then puts this device's updated code in the box and
  // on the clipboard, ready to be imported on the other device.
  async function importSyncCode(text) {
    try {
      const changed = applySyncState(await decodeSyncCode(text));
      const copied = await copyToClipboard(await fillOwnSyncCode());
      setCodeStatus(
        (changed ? "取り込みました。" : "新しい内容はありませんでした。") +
          (copied
            ? "更新後のコードをコピーしました。もう一方の端末でも「コピーしたコードを取り込む」を押してください。"
            : "欄に更新後のコードが入っています。欄を長押ししてコピーし、もう一方の端末で取り込んでください。"),
        "ok"
      );
    } catch (err) {
      setCodeStatus("コードを読み取れませんでした。最後までコピーできているか確認してください。", "bad");
    }
  }

  els.syncCodeImportBtn.addEventListener("click", () => {
    const text = els.syncCode.value.trim();
    if (!text) {
      setCodeStatus("別の端末のコードを欄に貼り付けてください。", "bad");
      return;
    }
    importSyncCode(text);
  });

  els.syncCodePasteBtn.addEventListener("click", async () => {
    let text = "";
    try {
      text = (await navigator.clipboard.readText()).trim();
    } catch (err) {
      setCodeStatus("クリップボードを読めませんでした。貼り付けの許可を確認するか、欄を長押しして貼り付け、「欄のコードを取り込む」を押してください。", "bad");
      return;
    }
    if (!text) {
      setCodeStatus("クリップボードが空です。もう一方の端末でコードをコピーしてください。", "bad");
      return;
    }
    importSyncCode(text);
  });

  function startSyncSession() {
    const group = loadSyncGroup();
    if (!group) return;
    if (syncSession) {
      syncSession.stop();
      syncSession = null;
    }
    setSyncTech(null);
    setSyncStatus("準備中…");
    ensurePeerLoaded()
      .then(() =>
        KanjiFlashSync.startGroupSync({
          key: group.key,
          deviceId: getDeviceId(),
          getMembers: () => {
            const current = loadSyncGroup();
            return current ? current.members : group.members;
          },
          getState: buildSyncState,
          onRemoteState: applySyncState,
          onMember: addGroupMember,
          onStage: setSyncTech,
          onStatus: ({ connected }) =>
            setSyncStatus(
              connected
                ? `${connected}台のデバイスと接続中…`
                : "同じグループの他のデバイスを待っています…（待機中）"
            ),
          onSynced: ({ connected }) => setSyncStatus(`同期が完了しました。（接続中: ${connected}台）`, "ok"),
          onError: (err) => setSyncStatus(describeSyncError(err), "bad"),
        })
      )
      .then((session) => {
        if (els.screenSync.hidden) session.stop();
        else syncSession = session;
      })
      .catch(() => setSyncStatus("同期の準備に失敗しました。ネットワークを確認してください。", "bad"));
  }

  // Called when this device has been added to a group (or two groups merged).
  function joinGroup(key, members) {
    const current = loadSyncGroup();
    const merged = { ...(current ? current.members : {}), ...members };
    const id = getDeviceId();
    if (!merged[id]) merged[id] = new Date().toISOString();
    saveSyncGroup({ key, members: merged });
    refreshSyncUI();
    setSyncStatus("グループに参加しました。", "ok");
    startSyncSession();
    startNearby(); // keep watching for new devices, now with the group's key
  }

  els.openSyncBtn.addEventListener("click", () => {
    showScreen("sync");
    refreshSyncUI();
    setSyncStatus("");
    if (loadSyncGroup()) startSyncSession();
    startNearby(); // in a group: admits newcomers; otherwise finds a device to join
  });

  els.syncSasYesBtn.addEventListener("click", () => resolveSyncVerify(true));
  els.syncSasNoBtn.addEventListener("click", () => resolveSyncVerify(false));

  els.syncNowBtn.addEventListener("click", () => {
    if (syncSession) syncSession.syncNow();
    else startSyncSession();
  });

  // ---------- export / import ----------

  function buildExportData() {
    return {
      app: EXPORT_APP_ID,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      profile: buildLocalProfileSnapshot(),
      customDecks,
    };
  }

  function setDataStatus(message) {
    els.dataStatus.textContent = message;
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(buildExportData())], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kanji-flash-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDataStatus("Backup file downloaded.");
  }

  function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  // Returns { profile, decks } or null if the file isn't a Kanji Flash backup.
  function parseImportText(text) {
    // Keys like __proto__ have no business in a backup and would be unsafe
    // as object keys in the merge below.
    if (text.includes('"__proto__"')) return null;
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      return null;
    }
    if (!isPlainObject(data) || data.app !== EXPORT_APP_ID) return null;
    if (data.version !== EXPORT_VERSION || !isPlainObject(data.profile)) return null;
    const decks = (Array.isArray(data.customDecks) ? data.customDecks : []).filter(
      (d) =>
        isPlainObject(d) &&
        typeof d.id === "string" &&
        typeof d.name === "string" &&
        Array.isArray(d.cards)
    );
    return { profile: data.profile, decks };
  }

  function finishImport(profile, decks) {
    applyProfileSnapshot(profile);
    reconcileOwnWithStats();
    customDecks = decks;
    saveCustomDecks();
    pendingImport = null;
    setDataStatus("Backup imported.");
    showScreen("home");
  }

  els.exportDataBtn.addEventListener("click", exportData);
  els.importDataBtn.addEventListener("click", () => els.importFileInput.click());

  els.importFileInput.addEventListener("change", () => {
    const file = els.importFileInput.files && els.importFileInput.files[0];
    els.importFileInput.value = "";
    if (!file) return;
    file
      .text()
      .then((text) => {
        const parsed = parseImportText(text);
        if (!parsed) {
          setDataStatus("This file is not a valid Kanji Flash backup.");
          return;
        }
        pendingImport = parsed;
        showScreen("importChoice");
      })
      .catch(() => setDataStatus("Could not read the file."));
  });

  els.importMergeBtn.addEventListener("click", () => {
    if (!pendingImport) return;
    const local = buildLocalProfileSnapshot();
    finishImport(
      mergeProfiles(local, pendingImport.profile),
      mergeCustomDecksLists(customDecks, pendingImport.decks)
    );
  });

  els.importReplaceBtn.addEventListener("click", () => {
    if (!pendingImport) return;
    finishImport(pendingImport.profile, pendingImport.decks);
  });

  els.importCancelBtn.addEventListener("click", () => {
    pendingImport = null;
    showScreen("settings");
  });

  // The title plate keeps one line: its font shrinks until it fits between
  // the corner button and the matching empty space on the other side.
  function fitBrand() {
    const brand = document.querySelector("#screen-home .brand");
    if (!brand || els.screenHome.hidden) return;
    brand.style.fontSize = "";
    const bar = brand.parentElement;
    const sideWidth = Math.max(0, ...Array.from(bar.querySelectorAll(".icon-btn")).map((el) => el.offsetWidth));
    const available = bar.clientWidth - 2 * sideWidth - 16;
    const needed = brand.getBoundingClientRect().width;
    if (available > 0 && needed > available) {
      const current = parseFloat(getComputedStyle(brand).fontSize);
      brand.style.fontSize = `${Math.floor((current * available) / needed)}px`;
    }
  }
  window.addEventListener("resize", fitBrand);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBrand);

  // ---------- boot ----------

  stats = loadStats();
  initSyncCounts();
  settings = loadSettings() || settings;
  lessonHistory = loadLessonHistory();
  customAnswers = normalizeCustomAnswersShape(loadCustomAnswers());
  saveCustomAnswers();
  customDecks = loadCustomDecks();
  migrateTodaysMisses();
  alignDueTimesTo6am();
  kanjiRemovals = loadJson(KANJI_REMOVALS_KEY, {}) || {};
  leeches = loadJson(LEECHES_KEY, {}) || {};
  mnemonics = loadJson(MNEMONICS_KEY, {}) || {};
  applySettings();
  dailyMinutes = settings.defaultDailyMinutes;

  fetch("data/n2-kanji.json")
    .then((res) => res.json())
    .then((data) => {
      n2Kanji = data;
      migrateWordSchedules();
      allKanji = visibleKanji();
      kanjiByNum = new Map(allKanji.map((item) => [item.num, item]));
      applyDeckState();

      showScreen("home");
    })
    .catch((err) => {
      console.error("Failed to load kanji data", err);
    });
})();
