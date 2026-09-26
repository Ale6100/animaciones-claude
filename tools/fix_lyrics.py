"""Puts corrected lyrics onto the word timings of a lyrics script written by tools/sync_lyrics.py.

Usage:
    python tools/fix_lyrics.py projects/my_video.lyrics.js corrected.txt

corrected.txt has one line per transcribed line, as `<start time> | <corrected text>` (the start times printed by the
transcription, so each correction lands on its line). Words that still match keep their exact timing, and so do
words swapped one for one; when a correction has more or fewer words than what it replaces, the new words share
that time span, split by length. Lines not listed are kept.
"""
import difflib
import json
import os
import re
import sys


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


def retime(old, new_words):
    """old: [[t0, t1, word], ...]; returns the new words with timings aligned to the old ones."""
    a, b = [norm(w[2]) for w in old], [norm(w) for w in new_words]
    out = []
    for op, i0, i1, j0, j1 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if op == "equal":
            out += [[old[i0 + k][0], old[i0 + k][1], new_words[j0 + k]] for k in range(j1 - j0)]
            continue
        if j1 == j0:
            continue
        if i1 - i0 == j1 - j0:
            # misheard words swapped one for one keep their own timing (a held word stays held)
            out += [[old[i0 + k][0], old[i0 + k][1], new_words[j0 + k]] for k in range(j1 - j0)]
            continue
        # the span these new words take: the replaced words, or the gap between neighbours for an insertion
        if i1 > i0:
            s0, s1 = old[i0][0], old[i1 - 1][1]
        elif i0 == 0:
            s1 = old[0][0]
            s0 = s1 - .15 * (j1 - j0)
        else:
            s0 = old[i0 - 1][1]
            s1 = old[i0][0] if i0 < len(old) else old[-1][1]
            if s1 - s0 < .12 * (j1 - j0):
                s1 = s0 + .12 * (j1 - j0)
        chunk = new_words[j0:j1]
        total = sum(max(1, len(w)) for w in chunk)
        t = s0
        for w in chunk:
            d = (s1 - s0) * max(1, len(w)) / total
            out.append([round(t, 3), round(t + d, 3), w])
            t += d
    return out


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    script, fixes = sys.argv[1], sys.argv[2]
    src = open(script, encoding="utf-8").read()
    m = re.search(r"registerLyrics\((\"[^\"]+\"), (.*)\);\s*$", src, re.S)
    if not m:
        sys.exit(f"{script}: no registerLyrics(...) call found")
    lyric_id, lines = m.group(1), json.loads(m.group(2))
    corrections = {}
    for raw in open(fixes, encoding="utf-8"):
        if "|" in raw:
            t, txt = raw.split("|", 1)
            words = txt.split()
            if not words:
                sys.exit(f"{fixes}: the correction for {t.strip()} is empty (remove the line to keep it as it is)")
            corrections[round(float(t), 2)] = words
    changed = 0
    for line in lines:
        new = corrections.pop(round(line["t0"], 2), None)
        if new is None:
            continue
        before = [w[2] for w in line["words"]]
        line["words"] = retime(line["words"], new)
        line["t0"], line["t1"] = line["words"][0][0], line["words"][-1][1]
        changed += before != new
    if corrections:
        sys.exit(f"no transcribed line starts at: {', '.join(str(t) for t in corrections)}")
    header = src[:m.start()]
    with open(script, "w", encoding="utf-8") as f:
        f.write(header + f"registerLyrics({lyric_id}, {json.dumps(lines, ensure_ascii=False, indent=1)});\n")
    print(f"{os.path.basename(script)}: {changed} lines corrected")


if __name__ == "__main__":
    main()
