"""Turn slim anime records into the static files the Angular app reads (front/public/data)."""
import json
import os
import re
from datetime import datetime, timezone

FIELDS = ["id", "title", "titleEn", "year", "score", "members", "episodes", "type",
          "genres", "studios", "themes", "img", "rank", "yt", "airing", "aired"]
SHARDS = 256
IMG_RE = re.compile(r"/images/anime/(\d+/\d+)")
ADULT = {"Hentai", "Erotica"}


def img_path(url):
    m = IMG_RE.search(url or "")
    return m.group(1) if m else ""


def year_of(a):
    if a.get("year"):
        return a["year"]
    prop = (a.get("aired") or {}).get("prop") or {}
    return (prop.get("from") or {}).get("year")


def slim(a):
    """Jikan anime object -> compact dict (also used for the airing list)."""
    images = (a.get("images") or {}).get("jpg") or {}
    aired_from = (a.get("aired") or {}).get("from") or ""
    return {
        "id": a["mal_id"],
        "title": a.get("title") or "",
        "titleEn": a.get("title_english") or "",
        "year": year_of(a) or 0,
        "score": a.get("score") or 0,
        "members": a.get("members") or 0,
        "episodes": a.get("episodes") or 0,
        "type": a.get("type") or "",
        "genres": [g["name"] for g in a.get("genres") or []],
        "studios": [s["name"] for s in a.get("studios") or []],
        "themes": [t["name"] for t in (a.get("themes") or []) + (a.get("demographics") or [])],
        "img": img_path(images.get("image_url")),
        "rank": a.get("rank") or 0,
        "yt": ((a.get("trailer") or {}).get("youtube_id")) or "",
        "airing": 1 if a.get("airing") else 0,
        "aired": aired_from[:10],
        "synopsis": a.get("synopsis") or "",
        "broadcast": a.get("broadcast") or {},
    }


def _dump(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))


def _load_meta(out_dir):
    path = os.path.join(out_dir, "meta.json")
    return json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}


def write_catalogue(records, out_dir, source):
    """records: iterable of slim dicts. Writes index.json, syn/xx.json and meta.json."""
    by_id = {}
    for r in records:
        if set(r["genres"]) & ADULT:
            continue
        by_id[r["id"]] = r
    rows = sorted(by_id.values(), key=lambda r: (r["rank"] or 10 ** 9, -r["members"], r["id"]))
    tables = {k: sorted({v for r in rows for v in r[k]}) for k in ("genres", "studios", "themes")}
    tables["types"] = sorted({r["type"] for r in rows if r["type"]})
    idx = {k: {v: i for i, v in enumerate(vals)} for k, vals in tables.items()}

    def encode(r):
        return [r["id"], r["title"], r["titleEn"] if r["titleEn"] != r["title"] else "", r["year"],
                round(r["score"], 2), r["members"], r["episodes"], idx["types"].get(r["type"], -1),
                [idx["genres"][g] for g in r["genres"]], [idx["studios"][s] for s in r["studios"]],
                [idx["themes"][t] for t in r["themes"]], r["img"], r["rank"], r["yt"], r["airing"],
                r["aired"]]

    _dump(os.path.join(out_dir, "index.json"),
          {"v": 1, "fields": FIELDS, **tables, "rows": [encode(r) for r in rows]})

    shards = {}
    for r in rows:
        if r["synopsis"]:
            shards.setdefault(r["id"] % SHARDS, {})[r["id"]] = r["synopsis"]
    for n in range(SHARDS):
        _dump(os.path.join(out_dir, "syn", f"{n:02x}.json"), shards.get(n, {}))

    meta = _load_meta(out_dir)
    meta.update({"updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                 "count": len(rows), "source": source})
    _dump(os.path.join(out_dir, "meta.json"), meta)
    return len(rows)


def write_airing(records, out_dir):
    items, seen = [], set()
    for r in records:
        if r["id"] in seen or set(r["genres"]) & ADULT:
            continue
        seen.add(r["id"])
        b = r["broadcast"]
        items.append({"id": r["id"], "title": r["title"], "titleEn": r["titleEn"], "img": r["img"],
                      "score": r["score"], "members": r["members"], "episodes": r["episodes"],
                      "yt": r["yt"], "genres": r["genres"], "day": b.get("day") or "",
                      "time": b.get("time") or "", "tz": b.get("timezone") or ""})
    items.sort(key=lambda x: -x["members"])
    _dump(os.path.join(out_dir, "airing.json"), items)
    meta = _load_meta(out_dir)
    meta["airingUpdatedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    _dump(os.path.join(out_dir, "meta.json"), meta)
    return len(items)
