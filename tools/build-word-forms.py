"""Builds data/word-forms.json: which common words are transitive or
intransitive verbs, or polite, humble or honorific, from JMdict (CC BY-SA 4.0,
EDRDG) in the jmdict-simplified JSON form.

Usage:
  python tools/build-word-forms.py jmdict-eng.json

Only words JMdict marks as common, on a JLPT list (data/jlpt-vocab.json) or
in the N2 deck are kept. The result maps "written|reading" to letters:
t transitive, i intransitive, p polite, h humble, o honorific.
"""
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ORDER = "tipho"


def applies(restriction, text):
    return restriction == ["*"] or text in restriction


def letters_for(senses):
    """Transitivity from the first two verb senses, politeness from the first."""
    found = set()
    verbs = [s for s in senses if "vt" in s["partOfSpeech"] or "vi" in s["partOfSpeech"]]
    for sense in verbs[:2]:
        if "vt" in sense["partOfSpeech"]:
            found.add("t")
        if "vi" in sense["partOfSpeech"]:
            found.add("i")
    if senses:
        misc = senses[0]["misc"]
        for tag, letter in (("pol", "p"), ("hum", "h"), ("hon", "o")):
            if tag in misc:
                found.add(letter)
    return found


def main(dictionary):
    jm = json.load(open(dictionary, encoding="utf-8"))
    vocab = json.load(open(os.path.join(ROOT, "data", "jlpt-vocab.json"), encoding="utf-8"))
    jlpt = {key for keys in vocab.values() for key in keys}
    # The N2 deck's own words count too, common or not.
    for item in json.load(open(os.path.join(ROOT, "data", "n2-kanji.json"), encoding="utf-8")):
        if item.get("word"):
            jlpt.add(f"{item['word']}|{item['wordReading']}")
    out = {}

    def add(written, reading, found):
        if found:
            out.setdefault(f"{written}|{reading}", set()).update(found)

    for entry in jm["words"]:
        for kana in entry["kana"]:
            reading = kana["text"]
            writings = [k for k in entry["kanji"] if applies(kana["appliesToKanji"], k["text"])]
            kana_senses = [s for s in entry["sense"] if applies(s["appliesToKana"], reading)]
            pairs = [(k["text"], k["common"] or kana["common"]) for k in writings]
            # Written in kana: words with no kanji, or usually written in kana.
            polite = {"pol", "hum", "hon"}
            if not entry["kanji"] or any("uk" in s["misc"] or polite & set(s["misc"]) for s in kana_senses[:1]):
                pairs.append((reading, kana["common"]))
            for written, common in pairs:
                listed = f"{written}|{reading}" in jlpt
                if not (common or listed):
                    continue
                senses = [
                    s for s in kana_senses
                    if written == reading or applies(s["appliesToKanji"], written)
                ]
                add(written, reading, letters_for(senses))
                # 勉強する and the like take their labels from the する sense.
                suru = [s for s in senses if "vs" in s["partOfSpeech"]]
                if suru:
                    add(written + "する", reading + "する", letters_for(suru))

    result = {key: "".join(c for c in ORDER if c in found) for key, found in sorted(out.items())}
    path = os.path.join(ROOT, "data", "word-forms.json")
    with open(path, "w", encoding="utf-8", newline="") as handle:
        json.dump(result, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")
    print(len(result), "words,", os.path.getsize(path), "bytes")


if __name__ == "__main__":
    main(sys.argv[1])
