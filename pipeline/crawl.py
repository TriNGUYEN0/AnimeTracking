"""Refresh the static data of the site.

  python pipeline/crawl.py --airing            # currently airing + broadcast schedule (~10-20 requests)
  python pipeline/crawl.py --catalogue         # whole SFW catalogue (~1,100 requests, ~20 min)
  python pipeline/crawl.py --from-legacy FILE  # rebuild from the old animes_graphe.json (no network)

Exit code 2 = Jikan unreachable: previous data is left untouched.
"""
import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export import slim, write_airing, write_catalogue  # noqa: E402
from jikan import Jikan, JikanDown  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "front", "public", "data")


def from_legacy(path):
    data = json.load(open(path, encoding="utf-8"))
    seen, records = set(), []
    for x in data:
        if x["id"] in seen:
            continue
        seen.add(x["id"])
        img = (x.get("image_url") or "").split("/images/anime/")[-1].rsplit(".", 1)[0]
        records.append({
            "id": x["id"], "title": x.get("titre") or "", "titleEn": "", "year": x.get("annee") or 0,
            "score": x.get("score") or 0, "members": 0, "episodes": x.get("episodes") or 0, "type": "",
            "genres": x.get("genres") or [], "studios": x.get("studios") or [], "themes": [],
            "img": img, "rank": 0, "yt": "", "airing": 0, "aired": "",
            "synopsis": x.get("synopsis") or "", "broadcast": {}})
    rank = 0
    for r in records:  # the legacy file was crawled from /top/anime, i.e. in rank order
        if r["score"]:
            rank += 1
            r["rank"] = rank
    return records


def catalogue_is_stale(out, days):
    path = os.path.join(out, "meta.json")
    if not os.path.exists(path):
        return True
    meta = json.load(open(path, encoding="utf-8"))
    if meta.get("source") != "jikan":
        return True
    updated = datetime.fromisoformat(meta["updatedAt"])
    return datetime.now(timezone.utc) - updated > timedelta(days=days)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--airing", action="store_true")
    ap.add_argument("--catalogue", action="store_true")
    ap.add_argument("--catalogue-if-stale", type=float, metavar="DAYS",
                    help="crawl the catalogue only if it was never crawled from Jikan or is older than DAYS")
    ap.add_argument("--from-legacy")
    ap.add_argument("--out", default=OUT)
    args = ap.parse_args()
    out = os.path.abspath(args.out)

    if args.from_legacy:
        n = write_catalogue(from_legacy(args.from_legacy), out, "legacy-snapshot")
        print(f"legacy -> {n} anime")
        return 0

    do_catalogue = args.catalogue or (args.catalogue_if_stale is not None
                                      and catalogue_is_stale(out, args.catalogue_if_stale))
    jk = Jikan()
    try:
        if args.airing:  # small and most time-sensitive: first
            recs = [slim(a) for a in jk.paged("/schedules", {"sfw": "true", "limit": 25}, max_pages=40)]
            n = write_airing(recs, out)
            print(f"airing -> {n} anime ({jk.calls} requests)")
        if do_catalogue:
            params = {"order_by": "mal_id", "sort": "asc", "sfw": "true", "limit": 25}
            recs = [slim(a) for a in jk.paged("/anime", params)]
            n = write_catalogue(recs, out, "jikan")
            print(f"catalogue -> {n} anime ({jk.calls} requests)")
    except JikanDown as exc:
        print(f"Jikan unavailable, keeping previous data: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
