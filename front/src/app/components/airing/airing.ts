import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DataStore, posterUrl } from '../../services/data-store';

interface AiringItem {
  id: number; title: string; titleEn: string; img: string; score: number; members: number;
  episodes: number; yt: string; genres: string[]; day: string; time: string; tz: string;
}
interface Slot extends AiringItem { next: Date; local: string }

const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const HOUR = 3_600_000;
const WEEK = 7 * 24 * HOUR;
const JST_OFFSET = 9 * HOUR; // Japan has no daylight saving time

/** Next broadcast instant for a weekly JST slot ("Saturdays", "23:00"). */
function nextBroadcast(day: string, time: string, now: number): Date | null {
  const dow = DAYS.indexOf(day);
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (dow < 0 || !m) return null;
  const jstNow = new Date(now + JST_OFFSET);
  const startOfJstDay = Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate()) - JST_OFFSET;
  let t = startOfJstDay + ((dow - jstNow.getUTCDay() + 7) % 7) * 24 * HOUR + (+m[1] * 60 + +m[2]) * 60_000;
  if (t < now - 30 * 60_000) t += WEEK; // keep "on air" for 30 min after start
  return new Date(t);
}

const FOLLOW_KEY = 'airing:follow';
function loadFollow(): number[] {
  try {
    return JSON.parse(localStorage.getItem(FOLLOW_KEY) ?? '[]');
  } catch {
    return [];
  }
}

@Component({
  selector: 'app-airing',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './airing.html',
  styleUrl: './airing.css',
})
export class AiringComponent implements OnDestroy {
  readonly store = inject(DataStore);
  readonly posterUrl = posterUrl;
  readonly items = signal<AiringItem[] | null>(null);
  readonly failed = signal(false);
  readonly now = signal(Date.now());
  readonly follow = signal<number[]>(loadFollow());
  readonly onlyFollowed = signal(false);
  readonly tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
  private timer = setInterval(() => this.now.set(Date.now()), 1000);
  private fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });

  readonly slots = computed<Slot[]>(() => {
    const now = this.now();
    const follow = new Set(this.follow());
    return (this.items() ?? [])
      .filter((a) => !this.onlyFollowed() || follow.has(a.id))
      .map((a) => ({ a, next: nextBroadcast(a.day, a.time, now) }))
      .filter((x): x is { a: AiringItem; next: Date } => !!x.next)
      .map(({ a, next }) => ({ ...a, next, local: this.fmt.format(next) }))
      .sort((x, y) => x.next.getTime() - y.next.getTime());
  });

  readonly onAir = computed(() => this.slots().filter((s) => s.next.getTime() <= this.now()));
  readonly upNext = computed(() => this.slots().filter((s) => s.next.getTime() > this.now()).slice(0, 6));

  /** Week grid in the viewer's own time zone (Mon..Sun). */
  readonly week = computed(() => {
    const cols = Array.from({ length: 7 }, (_, i) => ({ label: '', items: [] as Slot[] }));
    const names = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
    const monday = new Date(2024, 0, 1); // a Monday
    cols.forEach((c, i) => (c.label = names.format(new Date(monday.getTime() + i * 24 * HOUR))));
    for (const s of this.slots()) cols[(s.next.getDay() + 6) % 7].items.push(s);
    cols.forEach((c) => c.items.sort((x, y) => x.next.getHours() * 60 + x.next.getMinutes() - (y.next.getHours() * 60 + y.next.getMinutes())));
    return cols;
  });

  constructor() {
    inject(HttpClient).get<AiringItem[]>('data/airing.json').subscribe({
      next: (d) => this.items.set(d),
      error: () => {
        this.items.set([]);
        this.failed.set(true);
      },
    });
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  countdown(d: Date): string {
    const ms = Math.max(0, d.getTime() - this.now());
    const days = Math.floor(ms / (24 * HOUR));
    const h = Math.floor((ms % (24 * HOUR)) / HOUR);
    const m = Math.floor((ms % HOUR) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    const hms = [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
    return days ? `${days}d ${hms}` : hms;
  }

  isFollowed(id: number) {
    return this.follow().includes(id);
  }

  toggleFollow(id: number) {
    this.follow.update((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
    try {
      localStorage.setItem(FOLLOW_KEY, JSON.stringify(this.follow()));
    } catch {
      /* ignore */
    }
  }

  /** Weekly calendar event (.ics) generated client-side. */
  downloadIcs(s: Slot) {
    const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const end = new Date(s.next.getTime() + 30 * 60_000);
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AnimeTracking//Airing//EN', 'BEGIN:VEVENT',
      `UID:airing-${s.id}@animetracking`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(s.next)}`, `DTEND:${stamp(end)}`,
      'RRULE:FREQ=WEEKLY', `SUMMARY:${s.title.replace(/[,;]/g, ' ')} (new episode)`,
      `URL:https://myanimelist.net/anime/${s.id}`, 'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = `${s.title.replace(/[^\w]+/g, '_').slice(0, 40)}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
