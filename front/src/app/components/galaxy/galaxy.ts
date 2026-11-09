import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataStore, Anime, posterUrl } from '../../services/data-store';

interface Star { a: Anime; x: number; y: number; r: number; color: string; vec: Float32Array }

const MAX_STARS = 3000;
const PALETTE: Record<string, string> = {
  Action: '#ff5d8f', Comedy: '#ffc24b', Drama: '#b18cff', Romance: '#ff9ecb', Fantasy: '#7c9cff',
  'Sci-Fi': '#2ee6d0', 'Slice of Life': '#8fe6b0', Sports: '#ff9e6b', Mystery: '#c9a8ff', Horror: '#ff6b6b',
  Adventure: '#6fd3ff', Supernatural: '#d68bff',
};
const OTHER = '#8a86a0';

/** Deterministic pseudo-random in [0,1) from an integer (stable layout between visits). */
function rand(n: number): number {
  let x = Math.imul(n ^ 0x5bd1e995, 0x27d4eb2d);
  x ^= x >>> 15;
  return ((Math.imul(x, 0x165667b1) >>> 0) % 100000) / 100000;
}

/** Top-2 principal components by power iteration (dims are small: genres + themes). */
function pca2(vecs: Float32Array[], dims: number): [Float32Array, Float32Array] {
  const n = vecs.length;
  const mean = new Float32Array(dims);
  for (const v of vecs) for (let d = 0; d < dims; d++) mean[d] += v[d] / n;
  const cov = new Float64Array(dims * dims);
  for (const v of vecs) {
    for (let i = 0; i < dims; i++) {
      const vi = v[i] - mean[i];
      if (!vi) continue;
      for (let j = 0; j < dims; j++) cov[i * dims + j] += (vi * (v[j] - mean[j])) / n;
    }
  }
  const comps: Float32Array[] = [];
  for (let c = 0; c < 2; c++) {
    let b = new Float64Array(dims).map((_, i) => rand(i + 7 * c) - 0.5);
    for (let it = 0; it < 80; it++) {
      const nb = new Float64Array(dims);
      for (let i = 0; i < dims; i++) for (let j = 0; j < dims; j++) nb[i] += cov[i * dims + j] * b[j];
      for (const prev of comps) {
        const dot = nb.reduce((s, x, i) => s + x * prev[i], 0);
        for (let i = 0; i < dims; i++) nb[i] -= dot * prev[i];
      }
      const norm = Math.hypot(...nb) || 1;
      b = nb.map((x) => x / norm);
    }
    comps.push(Float32Array.from(b));
  }
  const project = (axis: Float32Array) => Float32Array.from(vecs.map((v) => v.reduce((s, x, d) => s + (x - mean[d]) * axis[d], 0)));
  return [project(comps[0]), project(comps[1])];
}

@Component({
  selector: 'app-galaxy',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './galaxy.html',
  styleUrl: './galaxy.css',
})
export class GalaxyComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cv', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private data = inject(DataStore);
  private router = inject(Router);
  private zone = inject(NgZone);
  readonly posterUrl = posterUrl;
  readonly palette = Object.entries(PALETTE);

  readonly hovered = signal<Star | null>(null);
  readonly selected = signal<Star | null>(null);
  readonly neighbours = signal<Star[]>([]);
  readonly query = signal('');

  private stars: Star[] = [];
  private view = { x: 0, y: 0, k: 1 }; // world -> screen: (w - x) * k + center
  private target: { x: number; y: number; k: number } | null = null;
  private images = new Map<number, HTMLImageElement>();
  private raf = 0;
  private dragging: { x: number; y: number; vx: number; vy: number; moved: boolean } | null = null;
  private pinch = 0;
  private ro?: ResizeObserver;

  readonly suggestions = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (q.length < 2) return [];
    return this.layoutVersion() >= 0
      ? this.stars.filter((s) => s.a.title.toLowerCase().includes(q) || s.a.titleEn.toLowerCase().includes(q)).slice(0, 6)
      : [];
  });
  private readonly layoutVersion = signal(-1);

  constructor() {
    effect(() => {
      const animes = this.data.animes();
      if (animes.length && !this.stars.length) this.build(animes);
    });
  }

  ngAfterViewInit() {
    const cv = this.canvasRef.nativeElement;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(cv.parentElement!);
    this.resize();
    this.zone.runOutsideAngular(() => {
      cv.addEventListener('wheel', this.onWheel, { passive: false });
      cv.addEventListener('pointerdown', this.onDown);
      window.addEventListener('pointermove', this.onMove);
      window.addEventListener('pointerup', this.onUp);
      const loop = () => {
        this.frame();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    });
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    const cv = this.canvasRef.nativeElement;
    cv.removeEventListener('wheel', this.onWheel);
    cv.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
  }

  private build(animes: Anime[]) {
    const pool = animes
      .filter((a) => a.genres.length && a.img && a.score > 0)
      .sort((a, b) => (b.members || 0) - (a.members || 0) || (a.rank || 1e9) - (b.rank || 1e9))
      .slice(0, MAX_STARS);
    const feats = [...new Set(pool.flatMap((a) => [...a.genres, ...a.themes]))];
    const fi = new Map(feats.map((f, i) => [f, i]));
    const vecs = pool.map((a) => {
      const v = new Float32Array(feats.length);
      a.genres.forEach((g) => (v[fi.get(g)!] = 1));
      a.themes.forEach((t) => (v[fi.get(t)!] = 0.8));
      const norm = Math.hypot(...v) || 1;
      return v.map((x) => x / norm);
    });
    const [px, py] = pca2(vecs, feats.length);
    const spread = (arr: Float32Array) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.95)] - sorted[Math.floor(sorted.length * 0.05)] || 1;
    };
    const sx = 900 / spread(px);
    const sy = 900 / spread(py);
    this.stars = pool.map((a, i) => {
      // Identical genre sets would stack on one point: scatter them in a small nebula around it.
      const ang = rand(a.id) * Math.PI * 2;
      const rad = Math.sqrt(rand(a.id * 31 + 7)) * 95;
      const main = a.genres.find((g) => PALETTE[g]) ?? '';
      return {
        a,
        vec: vecs[i],
        x: px[i] * sx + Math.cos(ang) * rad,
        y: py[i] * sy + Math.sin(ang) * rad,
        r: 1.2 + Math.max(0, a.score - 6) * 1.1,
        color: PALETTE[main] ?? OTHER,
      };
    });
    this.view = { x: 0, y: 0, k: 0.55 };
    this.layoutVersion.set(this.stars.length);
  }

  private resize() {
    const cv = this.canvasRef.nativeElement;
    const box = cv.parentElement!.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = box.width * dpr;
    cv.height = box.height * dpr;
    cv.style.width = box.width + 'px';
    cv.style.height = box.height + 'px';
  }

  private toScreen(s: { x: number; y: number }, w: number, h: number) {
    return { x: (s.x - this.view.x) * this.view.k + w / 2, y: (s.y - this.view.y) * this.view.k + h / 2 };
  }

  private frame() {
    const cv = this.canvasRef.nativeElement;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = cv.width / (parseFloat(cv.style.width) || cv.width);
    const w = cv.width / dpr;
    const h = cv.height / dpr;
    if (this.target) {
      const t = this.target;
      this.view.x += (t.x - this.view.x) * 0.08;
      this.view.y += (t.y - this.view.y) * 0.08;
      this.view.k *= Math.pow(t.k / this.view.k, 0.08);
      if (Math.abs(t.k - this.view.k) < 0.01 && Math.hypot(t.x - this.view.x, t.y - this.view.y) < 1) this.target = null;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    bg.addColorStop(0, '#1b1338');
    bg.addColorStop(1, '#07060c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const k = this.view.k;
    const sel = this.selected();
    const posters = k > 1.6;
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.stars) {
      const p = this.toScreen(s, w, h);
      if (p.x < -40 || p.y < -40 || p.x > w + 40 || p.y > h + 40) continue;
      const r = Math.max(0.8, s.r * Math.sqrt(k));
      ctx.fillStyle = s.color;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      if (!posters) {
        ctx.globalAlpha = 0.045;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    if (sel) {
      const p0 = this.toScreen(sel, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1;
      for (const n of this.neighbours()) {
        const p1 = this.toScreen(n, w, h);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }

    if (posters) {
      // Zoomed in: real posters for the stars on screen (closest to the centre first).
      const size = Math.min(70, 9 * Math.sqrt(k) * 3);
      const visible = this.stars
        .map((s) => ({ s, p: this.toScreen(s, w, h) }))
        .filter(({ p }) => p.x > -size && p.y > -size && p.x < w + size && p.y < h + size)
        .sort((a, b) => Math.hypot(a.p.x - w / 2, a.p.y - h / 2) - Math.hypot(b.p.x - w / 2, b.p.y - h / 2))
        .slice(0, 140);
      for (const { s, p } of visible) {
        const img = this.image(s.a);
        if (!img.complete || !img.naturalWidth) continue;
        const pw = size * 0.7;
        ctx.drawImage(img, p.x - pw / 2, p.y - size / 2, pw, size);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x - pw / 2, p.y - size / 2, pw, size);
      }
    }

    const hl = this.hovered() ?? sel;
    if (hl) {
      const p = this.toScreen(hl, w, h);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(8, hl.r * Math.sqrt(k) + 6), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private image(a: Anime): HTMLImageElement {
    let img = this.images.get(a.id);
    if (!img) {
      img = new Image();
      img.src = posterUrl(a);
      this.images.set(a.id, img);
    }
    return img;
  }

  private pick(clientX: number, clientY: number): Star | null {
    const cv = this.canvasRef.nativeElement;
    const box = cv.getBoundingClientRect();
    const mx = clientX - box.left;
    const my = clientY - box.top;
    let best: Star | null = null;
    let bestD = 14;
    for (const s of this.stars) {
      const p = this.toScreen(s, box.width, box.height);
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.target = null;
    const factor = Math.exp(-e.deltaY * 0.0015);
    this.zoomAt(e.clientX, e.clientY, factor);
  };

  private zoomAt(clientX: number, clientY: number, factor: number) {
    const box = this.canvasRef.nativeElement.getBoundingClientRect();
    const mx = clientX - box.left - box.width / 2;
    const my = clientY - box.top - box.height / 2;
    const k2 = Math.min(12, Math.max(0.15, this.view.k * factor));
    this.view.x += mx / this.view.k - mx / k2;
    this.view.y += my / this.view.k - my / k2;
    this.view.k = k2;
  }

  private pointers = new Map<number, { x: number; y: number }>();
  private onDown = (e: PointerEvent) => {
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
    this.dragging = { x: e.clientX, y: e.clientY, vx: this.view.x, vy: this.view.y, moved: false };
    this.target = null;
  };

  private onMove = (e: PointerEvent) => {
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2 && this.pinch) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      this.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / this.pinch);
      this.pinch = d;
      return;
    }
    if (this.dragging) {
      const dx = e.clientX - this.dragging.x;
      const dy = e.clientY - this.dragging.y;
      if (Math.hypot(dx, dy) > 4) this.dragging.moved = true;
      this.view.x = this.dragging.vx - dx / this.view.k;
      this.view.y = this.dragging.vy - dy / this.view.k;
    } else if (e.target === this.canvasRef.nativeElement) {
      const s = this.pick(e.clientX, e.clientY);
      if (s !== this.hovered()) this.zone.run(() => this.hovered.set(s));
    }
  };

  private onUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = 0;
    if (this.dragging && !this.dragging.moved) {
      const s = this.pick(e.clientX, e.clientY);
      this.zone.run(() => (s ? this.focus(s) : this.selected.set(null)));
    }
    this.dragging = null;
  };

  focus(s: Star) {
    this.selected.set(s);
    this.query.set('');
    // "If you like this": closest stars in feature space (cosine similarity).
    const sims = this.stars
      .filter((o) => o !== s)
      .map((o) => ({ o, d: o.vec.reduce((acc, x, i) => acc + x * s.vec[i], 0) + (o.a.studios.some((st) => s.a.studios.includes(st)) ? 0.05 : 0) }))
      .sort((a, b) => b.d - a.d)
      .slice(0, 6)
      .map((x) => x.o);
    this.neighbours.set(sims);
    this.target = { x: s.x, y: s.y, k: 3.2 };
  }

  open(s: Star) {
    this.router.navigate(['/anime', s.a.id]);
  }

  reset() {
    this.selected.set(null);
    this.neighbours.set([]);
    this.target = { x: 0, y: 0, k: 0.55 };
  }
}
