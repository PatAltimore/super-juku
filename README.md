# Kanji Flash

A dependency-free, mobile-friendly flashcard app for studying the 367 kanji in the JLPT N2 deck.

## Features

- **Rank**: every correct answer in 復習 or すべて復習 counts as a review. Ranks follow sumo: 前相撲, 序ノ口, 序二段, 三段目, 幕下, 十両, 前頭, 小結, 関脇, 大関, 横綱, each with 5 levels. A level takes 100 reviews in 前相撲, 200 in 序ノ口, 300 in 序二段 and so on up to 1100 in 横綱. The rank sits next to the daily streak on the home screen.
- **Labels on terms**: an uploaded deck can include a `Common` column (`Common word` or `Uncommon`) and a `JLPT` column (`N3`), as exported by cave-story-assist. A `Part of speech` column is read the same way. They are shown as Jisho-style badges on the lesson buttons and in 編集, are not asked as questions, and the lesson chart can be filtered by them (common word, JLPT level, part of speech).
- **Leeches (リーチ)**: a term answered wrongly twice in 復習 or すべて復習 becomes a leech and is collected in its own optional deck at the bottom of 復習, across all decks. The deck shows its own リーチ待ち count; leeches also stay in the normal review queue. A leech leaves the deck once it has been answered correctly twice in a normal 復習 or すべて復習; answers in the leech review itself don't count towards that and don't change the review schedule.
- **Add terms (編集 > deck > 用語を追加)**: search JMdict by Japanese or English and add a word to a custom deck with its reading, meaning, common flag, JLPT level (from a bundled word list, where the word is on one) and part of speech. Searches go to [Jotoba](https://jotoba.de) (a JMdict front end), so this needs a connection; the rest of the app works offline.
- **Words are reviewed apart from their kanji**: an N2 kanji (its meaning and onyomi) and the verb or adjective that goes with it (its reading and meaning) each have their own review schedule. A kanji answered right moves up even when its word was missed, and the missed word stays at its level and returns at 6:00 the next morning, Pacific time.
- **Single-kanji nouns**: for 150 of the N2 kanji there is also a noun made of just that kanji and read as one of its kunyomi (跡 あと, 川 かわ). It is shown as its own bubble on the lesson study screen, asked as a 訓読み and a Noun meaning question, and scheduled apart from the kanji and its word. Questions are colored by what they ask about: pink for the kanji itself (its 音読み and meaning), purple for its word (verb or adjective) and teal for its noun (its 訓読み and Noun meaning).
- **Reviews arrive at 6:00 AM**: every review is delivered at 6:00 in the morning, Pacific time, on the day it is scheduled for. A term answered right is due that many days later (counted from the day the session ended), and one answered wrong the next morning. Existing schedules are moved to 6:00 AM on their day when the app loads.
- **Missed terms**: a term answered wrongly in a session leaves the due count for the rest of that day and is due again at 6:00 the next morning, Pacific time. A miss does not move it down a level: it stays where it was. A correct answer moves it to its normal next interval.
- **Fill in labels (編集 > deck > ラベルを取得)**: looks up each card of a custom deck that has no labels in JMdict and adds its common flag, part of speech and JLPT level, so the lesson filters work on decks uploaded without those columns. A card is only labelled when a result matches its written form exactly (and its reading, if the deck has one).
- **Added answers (編集 > 答え)**: each term row has a 答え button that lists the answers added with 答えを追加 for each of its questions, lets you add one by hand and remove any. Added answers are shared between devices by merging, so a removal on one device can come back from another that still has the answer.
- **Review All (すべて復習)**: pick a deck and answer every reading and meaning question for every term in it once, typed; a report card at the end lists what was wrong, with your answer and the right one.
- **Daily Challenge**: review as many cards as possible before the selected time limit expires.
- **タイピング (`game.html`)**: a typing test where terms fall from the top of the screen and are cleared by typing their reading (romaji turns into kana) or meaning before they reach the bottom; a term that reaches the bottom counts as wrong. Terms fall as wide karuta-style cards (paper face, coloured border, the question type at the bottom); あ in a circle marks a reading and A in a square a meaning. Card borders use the question colours: pink for a kanji itself (音読み and meaning), purple for its word, teal for its single-kanji noun (a custom deck's readings pink, meanings purple). Pick a deck (or リーチ, every question of each current leech across all decks), readings/meanings/both, 10–80 questions (or 全部, every question in the deck once) and a speed; it speeds up as you go, scores combos and terms caught high up, and ends with the misses, which can be replayed on their own. Answers added in the app (答えを追加, 編集 > 答え) also count as correct; they are tidied as they are read (blanks and duplicates dropped, spacing fixed) and the saved answers are not changed. Results are not added to the review schedule or statistics.
- **Typed answer screens**: on a computer the question sits in a colored band (pink for readings, purple for meanings) with the answer bar about halfway down; after a miss, A adds the typed answer to the card, T rules it a typo, and F shows (or hides) everything about the card. Phones show buttons for A and T instead. Text in parentheses never has to be typed.
- **Type Answer**: enter an onyomi reading or English meaning and receive immediate feedback.
- **Lessons**: pick a deck (the N2 kanji or any custom deck) and choose the terms to study from a chart of every term, with the reading above and the meaning below; selected terms light up. Shift+click selects everything between the last term clicked and this one, and on a touch screen touching a term and holding for a moment starts a drag that selects every term the finger passes over (the first term decides whether the drag selects or deselects). The terms are taken five at a time: each batch is shown one term at a time on a study screen (Meaning, Readings and Examples tabs; ←/→ switch tab (past the first or last tab they move to the previous or next term, and → past the last term starts the quiz), ↓/Enter/Space next term, ↑ types in the mnemonic box, which ↓ or Enter leaves), then asked as typed questions on those terms before the next batch. An N2 kanji's Examples tab lists words that contain it (tap one for example sentences); a custom term shows sentences for the term itself. Completion is tracked on a monthly calendar, and due terms can be reviewed the same way.
- **Custom Decks Quiz**: a typed-answer placement quiz for an uploaded deck, played in fixed-size rounds (Quiz Questions setting). Unreviewed cards come first (shuffled), each answer is saved immediately so you can stop at any time, and correct cards are placed ahead in the review schedule.
- **Statistics**: view a seven-day activity summary, overall accuracy, and per-card results.
- **Settings**: change kanji typography, scale the interface text, set the quiz question count, or reset statistics.
- Persistent progress, statistics, and settings stored locally in the browser, with Export/Import (Settings > Backup) to move them to another device.
- Automatic light and dark color schemes with mobile safe-area support.

## Run Locally

This project has no build step or package dependencies. Serve the project directory with any static HTTP server so the app can load its JSON deck:

```powershell
py -m http.server 8000
```

Open <http://localhost:8000> in a browser. Do not open `index.html` directly from the file system, because the app fetches `data/n2-kanji.json` at startup.

## Project Structure

```text
.
|- index.html                     App markup and screens
|- styles.css                     Responsive visual design
|- app.js                         Flashcard behavior and browser persistence
|- data/n2-kanji.json             JLPT N2 kanji deck (generated)
|- data/jlpt-vocab.json           JLPT level of ~8,300 words, for 用語を追加
|- tools/build-kanji-data.mjs     Script that generates the deck from open sources
|- tools/build-kanji-words.mjs    Adds each kanji's verb/adjective (from JMdict) to the deck
|- LICENSE                        MIT license (code)
|- NOTICE.md                      Data sources, attribution, and data license
`- .github/workflows/pages.yml    GitHub Pages deployment workflow
```

## Data and Persistence

Each deck entry in `data/n2-kanji.json` includes a kanji character, onyomi and kunyomi readings (including romaji), and English meanings. The app stores the active deck, result history, and settings in `localStorage`; clearing site data resets this information. There is no server or account: use Settings > Backup > Export to download a JSON file and Import on another device, choosing to merge with or replace that device's data.

## Deployment

The included GitHub Actions workflow publishes the repository root to GitHub Pages whenever changes are pushed to `main`. In the repository settings, set Pages > Source to "GitHub Actions". The app uses only relative paths, so it works under the `/kanji-flashcards/` project URL.

## License

The code is released under the [MIT License](LICENSE). The kanji data in `data/n2-kanji.json` is derived from KANJIDIC2 and JMdict and is licensed separately under CC BY-SA 4.0; see [NOTICE.md](NOTICE.md) for sources and attribution.

## Syncing between devices

Settings > Device sync links any number of devices (phones, PCs, tablets) into a sync group over direct WebRTC connections using [PeerJS](https://peerjs.com/). To add a device, open the screen on it while another device is on the same network: they find each other, both show a number, and once you confirm the numbers match the new device joins the group (two separate groups merge the same way). From then on, devices in the group connect to each other whenever the sync screen is open, on any network, and merge progress (statistics, review schedule, lessons, custom answers, custom decks). Nothing is stored on a server: PeerJS's free public broker only introduces devices, and the data travels between them encrypted. Devices need to be online with the sync screen open at the same time (they pass changes along, so every device you open it on catches up), and connections can fail across some mobile networks without a relay. Settings and marathon progress stay per device.

If two devices can't connect (the public relay servers PeerJS falls back on are no longer available, so some networks never connect), the sync screen has a manual option: copy a code from one device and import it on the other, then copy the code the other device shows back to the first. Importing merges exactly as a connection does, so counts are never doubled.

Counters are kept per device and totalled across the group, so syncing in any order, any number of times, never double counts. "Reset statistics" is spread to every device the next time it syncs. Importing a backup that has lower counts than the group's totals won't lower them.

`sync.js` holds the merge logic; its tests run with `node tools/sync-merge.test.cjs`.
