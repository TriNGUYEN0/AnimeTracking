# Anime Tracking

**Live:** https://tringuyen0.github.io/AnimeTracking/

A fully static anime explorer built with Angular and data from [MyAnimeList](https://myanimelist.net) via the
unofficial [Jikan API](https://jikan.moe). Hosted on GitHub Pages: no backend server; GitHub Actions refreshes the data on a schedule.

## Features

| Page | What it does |
|---|---|
| **Home** (`#/`) | #1 anime hero, mood filters, top-anime carousel, Omikuji draw (御神籤) |
| **Anime pages** (`#/anime/:id`) | Instant offline details + live Jikan data: trailer, opening/ending songs, characters and Japanese voices, *Score DNA* (vote distribution, drop rate), relations, recommendations, where to watch |
| **Search** | Press `/` or `Ctrl+K` anywhere: typo-tolerant search across 20,000+ titles |
| **Airing radar** (`#/airing`) | Countdown to the next episodes, converted from Japanese broadcast slots to your time zone; follow shows, weekly `.ics` reminders |
| **Animedle** (`#/dle`) | Daily guessing game: same anime for everyone each day, Wordle-style hints, streaks, shareable result |
| **Dashboard** (`#/dashboard`) | Cross-filtering charts: score by year, studios, genres, formats; PDF export |
| **Graph** (`#/graphe`) | Force graph of anime linked by studio / year + genre |

## Architecture

```
GitHub Actions (cron, every 6 h)          GitHub Pages (static)              Browser
pipeline/crawl.py ── Jikan API ──►  front/public/data/                 DataStore: index.json once
  ~55 req/min, backoff,               index.json   (~730 KB gzip)     synopsis shards on demand
  stops if Jikan is down              syn/00..ff.json (synopses)  ──►  JikanClient: live extras
  commits data + redeploys            airing.json, meta.json            (<=50 req/min, 24 h cache,
                                                                         circuit breaker, offline-safe)
```

- **Rate limits:** Jikan allows 3 requests/s and 60/min. The pipeline stays at ~55/min. The browser client queues
  requests at ≥400 ms intervals, ≤50/min, caches responses for 24 h and falls back to the static snapshot when the API is unavailable.
- **SFW only:** adult entries are filtered out at crawl time.
- **Data refresh:** `.github/workflows/data.yml` runs every 6 hours (airing schedule) and re-crawls the whole catalogue
  when it is older than 7 days; `deploy.yml` builds and publishes to the `gh-pages` branch.

## Development

```bash
cd front
npm ci
npm start            # http://localhost:4200
```

Refresh the data locally (from the repository root, Python 3.10+):

```bash
pip install -r pipeline/requirements.txt
python pipeline/crawl.py --airing --catalogue
```

The improvement plan behind this version is in [`docs/AnimeTracking_KeHoach_Wow.pdf`](docs/AnimeTracking_KeHoach_Wow.pdf) (Vietnamese).

---
Data © MyAnimeList, served by Jikan. This project is not affiliated with MyAnimeList. Made by Tri NGUYEN.
