import { Component, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DataStore, Anime, posterUrl } from '../../services/data-store';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Characters of `q` appear in order in `s` (tolerates missing letters: "frirn" -> "frieren"). */
function isSubsequence(q: string, s: string): boolean {
  let i = 0;
  for (let j = 0; j < s.length && i < q.length; j++) if (s[j] === q[i]) i++;
  return i === q.length;
}

/** Command palette: "/" or Ctrl/Cmd+K anywhere, fuzzy title search over the whole snapshot. */
@Component({
  selector: 'app-search',
  standalone: true,
  templateUrl: './search.html',
  styleUrl: './search.css',
})
export class SearchComponent {
  @ViewChild('box') box?: ElementRef<HTMLInputElement>;
  private store = inject(DataStore);
  private router = inject(Router);
  readonly posterUrl = posterUrl;

  readonly open = signal(false);
  readonly query = signal('');
  readonly active = signal(0);

  private readonly searchable = computed(() =>
    this.store.animes().map((a) => ({ a, t: norm(a.title), e: norm(a.titleEn) })),
  );

  readonly results = computed<Anime[]>(() => {
    const q = norm(this.query());
    if (q.length < 2) return [];
    const compact = q.replace(/ /g, '');
    const scored: { a: Anime; s: number }[] = [];
    for (const { a, t, e } of this.searchable()) {
      let s = 0;
      if (t.startsWith(q) || e.startsWith(q)) s = 3;
      else if (t.includes(q) || e.includes(q)) s = 2;
      else if (compact.length >= 3 && (isSubsequence(compact, t.replace(/ /g, '')) || isSubsequence(compact, e.replace(/ /g, '')))) s = 1;
      if (s) scored.push({ a, s });
    }
    // Best match type first, then the most popular / best ranked titles.
    scored.sort((x, y) => y.s - x.s || (x.a.rank || 1e9) - (y.a.rank || 1e9) || y.a.members - x.a.members);
    return scored.slice(0, 8).map((x) => x.a);
  });

  @HostListener('document:keydown', ['$event'])
  onKey(ev: KeyboardEvent) {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((ev.target as HTMLElement)?.tagName ?? '');
    if ((ev.key === 'k' && (ev.ctrlKey || ev.metaKey)) || (ev.key === '/' && !typing)) {
      ev.preventDefault();
      this.show();
    } else if (this.open()) {
      if (ev.key === 'Escape') this.close();
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); this.active.update((i) => Math.min(i + 1, this.results().length - 1)); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); this.active.update((i) => Math.max(i - 1, 0)); }
      else if (ev.key === 'Enter' && this.results()[this.active()]) this.go(this.results()[this.active()]);
    }
  }

  show() {
    this.open.set(true);
    setTimeout(() => this.box?.nativeElement.focus());
  }

  close() {
    this.open.set(false);
    this.query.set('');
    this.active.set(0);
  }

  onInput(v: string) {
    this.query.set(v);
    this.active.set(0);
  }

  go(a: Anime) {
    this.close();
    this.router.navigate(['/anime', a.id]);
  }
}
