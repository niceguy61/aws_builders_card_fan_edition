#!/usr/bin/env python3
"""Card translation workflow around the canonical src/game/cards.json.

Usage (from project root):
  python scripts/cards.py export   # cards.json -> translation-template.csv
  python scripts/cards.py import   # translation-template.csv -> cards.json (text fields only)

Rules:
  - export: overwrites the CSV template from JSON (KO/EN columns).
  - import: updates ONLY name/description text pairs ({ko,en}) in JSON.
    Stats, combos structure, quantities, icons are NEVER touched.
    Rows with unknown cardId or combo-count mismatch are skipped with a warning.
"""
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "src" / "game" / "cards.json"
CSV_PATH = ROOT / "translation-template.csv"
HEADER = ["cardId", "name_KO", "name_EN", "desc_KO", "desc_EN",
          "combo1_KO", "combo1_EN", "combo2_KO", "combo2_EN"]


def load_json():
    with open(JSON_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_json(data):
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def cmd_export():
    data = load_json()
    with open(CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(HEADER)
        for c in data["cards"]:
            combos = c.get("combos", [])
            def txt(i, lang):
                if i < len(combos):
                    return combos[i].get("description", {}).get(lang, "")
                return ""
            w.writerow([
                c["cardId"],
                c.get("name", {}).get("ko", ""),
                c.get("name", {}).get("en", ""),
                c.get("description", {}).get("ko", ""),
                c.get("description", {}).get("en", ""),
                txt(0, "ko"), txt(0, "en"), txt(1, "ko"), txt(1, "en"),
            ])
    print(f"exported {len(data['cards'])} cards -> {CSV_PATH.name}")


def cmd_import():
    data = load_json()
    by_id = {c["cardId"]: c for c in data["cards"]}
    updated, skipped = 0, []
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            cid = (row.get("cardId") or "").strip()
            card = by_id.get(cid)
            if not card:
                skipped.append(cid or "?")
                continue
            combos = card.get("combos", [])
            texts = [
                (row.get("combo1_KO", ""), row.get("combo1_EN", "")),
                (row.get("combo2_KO", ""), row.get("combo2_EN", "")),
            ]
            if len(combos) > len([t for t in texts if t[0] or t[1]]) and len(combos) > 2:
                skipped.append(cid)
                continue
            card["name"] = {"ko": row.get("name_KO", ""), "en": row.get("name_EN", "")}
            card["description"] = {"ko": row.get("desc_KO", ""), "en": row.get("desc_EN", "")}
            for i in range(min(len(combos), 2)):
                ko, en = texts[i]
                if ko or en:
                    combos[i]["description"] = {"ko": ko, "en": en}
            updated += 1
    save_json(data)
    print(f"imported {updated} cards <- {CSV_PATH.name}")
    if skipped:
        print("skipped:", ", ".join(skipped))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "export"
    if cmd == "export":
        cmd_export()
    elif cmd == "import":
        cmd_import()
    else:
        sys.exit("usage: python scripts/cards.py [export|import]")
