// Port of the design's Component class (Portfolio.dc.html). The GSAP logic is kept line-for-line;
// only the Claude Design runtime pieces changed: setState → explicit render calls, this.props → config.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { SplitText } from 'gsap/SplitText';
import config from './config.js';
import { renderModal, renderTab } from './render.js';

export default class Portfolio {
  constructor(projects, toolbelt) {
    this.projects = projects;
    this.toolbelt = toolbelt;
    this.props = config;
    this.state = { sel: 0, tab: 0 };
  }

  bind() {
    document.addEventListener('click', e => {
      const t = e.target.closest ? e.target : e.target.parentElement;
      const go = t.closest('[data-go]');
      if (go) return this.go(+go.dataset.go, e);
      const tab = t.closest('[data-tab]');
      if (tab) return this.selectTab(+tab.dataset.tabIndex);
      if (t.closest('[data-modal-close]') || t.closest('[data-modal-backdrop]')) return this.closeProject();
      const card = t.closest('[data-card]');
      // A card title with a real link navigates instead of opening the modal
      if (card && !t.closest('[data-card-link]')) this.openProject(+card.dataset.index, card, e);
    });
  }

  openProject(i, card, e) {
    if (e) e.preventDefault();
    if (this._modalBusy || this._modalOpen) return;
    this._modalBusy = true;
    this.state = { sel: i, tab: 0 };
    renderModal(this.projects[i], i, 0, this.toolbelt);
    this.updateInk();
    const m = document.querySelector('[data-modal]'), media = m.querySelector('[data-modal-media]');
    const body = m.querySelector('[data-modal-body]'), close = m.querySelector('[data-modal-close]');
    const bd = document.querySelector('[data-modal-backdrop]');
    const r = card.getBoundingClientRect();
    const w = Math.min(innerWidth * 0.92, 1120), h = innerHeight * 0.9;
    this._card = card; this._modalOpen = true;
    this._lock = ev => { if (!(ev.target.closest && ev.target.closest('[data-modal-body]'))) ev.preventDefault(); };
    window.addEventListener('wheel', this._lock, { passive: false });
    window.addEventListener('touchmove', this._lock, { passive: false });
    this._esc = ev => { if (ev.key === 'Escape') this.closeProject(); else if ([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(ev.key) && !(ev.target.closest && ev.target.closest('[data-modal-body]'))) ev.preventDefault(); };
    window.addEventListener('keydown', this._esc);
    body.scrollTop = 0;
    gsap.set(m, { visibility: 'visible', left: r.left, top: r.top, width: r.width, height: r.height });
    gsap.set(media, { height: r.height }); gsap.set([body, close], { opacity: 0 });
    gsap.set(card, { visibility: 'hidden' });
    gsap.timeline({ onComplete: () => { this._modalBusy = false; this._inkSel = null; this.updateInk(); } })
      .to(bd, { autoAlpha: 1, duration: 0.4 }, 0)
      .to(m, { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2, width: w, height: h, duration: 0.75, ease: 'power3.inOut' }, 0)
      .to(media, { height: Math.round(h * 0.42), duration: 0.75, ease: 'power3.inOut' }, 0)
      .add(() => { this._inkSel = null; this.updateInk(); }, 0.55)
      .to([body, close], { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.55);
  }

  selectTab(k) {
    if ((this.state?.tab ?? 0) === k) return;
    this.state = { ...this.state, tab: k };
    renderTab(this.projects[this.state.sel], k);
    this.updateInk();
    const panel = document.querySelector('[data-tab-panel]');
    if (panel) gsap.fromTo(panel, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
  }

  // Was componentDidUpdate in the design: slides the tab underline to the active tab
  updateInk() {
    const ink = document.querySelector('[data-tab-ink]');
    const btn = document.querySelectorAll('[data-tab]')[this.state?.tab ?? 0];
    if (!ink || !btn) return;
    const first = this._inkSel !== this.state?.sel; this._inkSel = this.state?.sel;
    gsap.to(ink, { x: btn.offsetLeft, width: btn.offsetWidth, y: btn.offsetTop + btn.offsetHeight - ink.parentNode.offsetHeight, duration: first ? 0 : 0.35, ease: 'power3.out' });
  }

  closeProject() {
    if (!this._modalOpen || this._modalBusy) return;
    this._modalBusy = true;
    const m = document.querySelector('[data-modal]'), media = m.querySelector('[data-modal-media]');
    const body = m.querySelector('[data-modal-body]'), close = m.querySelector('[data-modal-close]');
    const bd = document.querySelector('[data-modal-backdrop]'), card = this._card;
    const r = card.getBoundingClientRect();
    window.removeEventListener('wheel', this._lock); window.removeEventListener('touchmove', this._lock);
    window.removeEventListener('keydown', this._esc);
    gsap.timeline({ onComplete: () => {
        gsap.set(card, { visibility: 'visible' }); gsap.set(m, { visibility: 'hidden' });
        this._modalOpen = false; this._modalBusy = false;
      } })
      .to([body, close], { opacity: 0, duration: 0.2 }, 0)
      .to(m, { left: r.left, top: r.top, width: r.width, height: r.height, duration: 0.65, ease: 'power3.inOut' }, 0.1)
      .to(media, { height: r.height, duration: 0.65, ease: 'power3.inOut' }, 0.1)
      .to(bd, { autoAlpha: 0, duration: 0.4 }, 0.35);
  }

  go(i, e) {
    if (e) e.preventDefault();
    const p = this.pos && this.pos[i];
    const sec = document.querySelector('[data-sec="' + i + '"]');
    const top = p ? p.start : sec ? sec.offsetTop : 0;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  mount() {
    this.bind();
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => this.init());
  }

  init() {
    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, SplitText);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

    this.ctx = gsap.context(() => {
      // Rail: dot rides the path via MotionPath, scrubbed to page scroll
      const rail = $('[data-rail]'), path = $('[data-rail-path]'), dot = $('[data-rail-dot]');
      const setPath = () => path.setAttribute('d', 'M7 0 L7 ' + rail.offsetHeight);
      setPath();
      ScrollTrigger.addEventListener('refreshInit', setPath);
      const dotTween = gsap.to(dot, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5] }, ease: 'none', paused: true });
      const fill = $('[data-rail-fill]');
      const proxy = { p: 0 };
      const apply = () => gsap.set(fill, { scaleY: proxy.p });
      // The dot only travels once a section is actually reached; the line fill tracks scroll continuously
      const dotP = { p: 0 };
      this._activeSec = -1;
      const railPos = [0, 0.25, 0.5, 0.75, 1];
      // While scrolling: only switch when a section start is actually reached (either direction).
      // On scroll end: settle to whichever section range we're in.
      const arrive = (y, settled) => {
        const S = this.secStarts; if (!S) return;
        let a = -1;
        if (settled && (this.props.snap ?? true) && !reduce) {
          // Ignore pauses mid-gesture: only settle once the page has come to rest on a snap point
          const max = ScrollTrigger.maxScroll(window);
          if (!(this.snapPts || []).some(p => Math.abs(p * max - y) <= 4)) return;
        }
        if (settled) S.forEach((s, k) => { if (y >= s - 4) a = k; });
        else S.forEach((s, k) => { if (Math.abs(y - s) <= 4) a = k; });
        if (a < 0 || a === this._activeSec) return;
        this._activeSec = a;
        gsap.to(dotP, { p: railPos[a], duration: 0.6, ease: 'power3.inOut', overwrite: true, onUpdate: () => dotTween.progress(dotP.p) });
        $$('[data-stop-dot]').forEach((el, k) => gsap.to(el, { backgroundColor: k === a ? '#3b82f6' : k < a ? '#9ca3af' : '#f9fafb', borderColor: k === a ? '#3b82f6' : '#9ca3af', scale: k === a ? 1.3 : 1, duration: 0.35, delay: k === a ? 0.45 : 0, overwrite: true }));
      };
      const railP = y => {
        const S = this.railS; if (!S) return 0;
        if (y <= S[0][0]) return S[0][1];
        for (let k = 1; k < S.length; k++) if (y <= S[k][0]) {
          const [y0, p0] = S[k - 1], [y1, p1] = S[k];
          return y1 === y0 ? p1 : p0 + (p1 - p0) * (y - y0) / (y1 - y0);
        }
        return S[S.length - 1][1];
      };
      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => {
        gsap.to(proxy, { p: railP(s.scroll()), duration: 0.5, ease: 'power2.out', overwrite: true, onUpdate: apply });
        arrive(s.scroll(), false);
      } });
      ScrollTrigger.addEventListener('scrollEnd', () => arrive(window.scrollY, true));
      this._dotTween = dotTween; this._railSync = () => { dotTween.invalidate(); proxy.p = railP(window.scrollY); apply(); dotTween.progress(dotP.p); this._activeSec = -1; arrive(window.scrollY, true); };

      const stops = $$('[data-stop]');

      // Projects: pin and scroll the track horizontally
      const hsec = $('[data-sec="1"]'), track = $('[data-track]');
      const cards = $$('[data-card]', track);
      const hcount = $('[data-hcount]');
      const branch = $('[data-branch]'), bFill = $('[data-branch-fill]'), bDot = $('[data-branch-dot]');
      const clip = $('[data-clip]');
      const dist = () => Math.max(0, track.scrollWidth - clip.clientWidth);
      const pad = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;
      const cardX = c => c.offsetLeft - pad();
      this.dist = dist;
      const comp = this;
      this.fillBStops = pr => (this.bStopFr || []).forEach((fr, k) => {
        const el = this.bStopEls[k]; if (!el || fr == null) return;
        const st = Math.abs(fr - pr) < 0.001 ? 'cur' : fr < pr ? 'past' : 'off';
        if (el._on === st) return; el._on = st;
        gsap.to(el, { backgroundColor: st === 'cur' ? '#2dd4bf' : st === 'past' ? '#9ca3af' : '#f9fafb', borderColor: st === 'cur' ? '#2dd4bf' : '#9ca3af', scale: st === 'cur' ? 1.3 : 1, duration: 0.35, delay: st === 'cur' ? 0.45 : 0, overwrite: true });
      });
      const htween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        onUpdate: function () {
          const pr = this.progress();
          gsap.set(bFill, { scaleX: pr });
          // Teal dot hops to a project stop only once that card is reached; it emerges from the blue dot
          // Switch only when a stop is actually reached, in either direction
          let tgt = comp._bTgt === undefined ? 0 : comp._bTgt;
          if (pr < 0.005) tgt = 0;
          (comp.bStopFr || []).forEach(fr => { if (fr != null && fr > 0.001 && Math.abs(pr - fr) < 0.008) tgt = fr; });
          if (tgt !== comp._bTgt) {
            comp._bTgt = tgt;
            gsap.to(bDot, { x: tgt * branch.offsetWidth, scale: tgt > 0 ? 1 : 0, opacity: tgt > 0 ? 1 : 0, duration: 0.6, ease: 'power3.inOut', overwrite: true });
            comp.fillBStops(tgt);
          }
          const d = dist(), x = pr * d, off = c => Math.min(d, cardX(c));
          let best = 0;
          cards.slice(0, comp.projects.length).forEach((c, k) => { if (Math.abs(off(c) - x) < Math.abs(off(cards[best]) - x)) best = k; });
          hcount.textContent = String(best + 1).padStart(2, '0');
        },
        scrollTrigger: {
          trigger: hsec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true
        }
      });
      this.hST = htween.scrollTrigger;

      if (!reduce) cards.forEach(c => gsap.from(c, {
        y: 40, opacity: 0.25, duration: 0.7, ease: 'power3.out',
        scrollTrigger: { containerAnimation: htween, trigger: c, start: 'left 92%', toggleActions: 'play none none reverse' }
      }));
      this.cards = cards;

      gsap.set('[data-marker]', { scaleX: 0, rotation: -1, transformOrigin: 'left center' });

      // Hero intro: name + description slide out of the vanishing point (40px right of the rail), buttons from the right
      if (!reduce) {
        const clip = $('[data-hero-clip]');
        const fade = 'linear-gradient(to right,transparent 0,rgba(0,0,0,.08) 24px,rgba(0,0,0,.3) 56px,rgba(0,0,0,.65) 88px,#000 120px)';
        Object.assign(clip.style, { overflow: 'hidden', webkitMaskImage: fade, maskImage: fade });
        const cr = clip.getBoundingClientRect();
        const left = $$('[data-hero-left]'), right = $('[data-hero-right]');
        gsap.timeline({ delay: 0.15, onComplete: () => Object.assign(clip.style, { overflow: '', webkitMaskImage: '', maskImage: '' }) })
          .from(left, { x: i => -(left[i].getBoundingClientRect().right - cr.left), duration: 1.2, ease: 'power4.out', stagger: 0.12 })
          .from(right, { x: () => cr.right - right.getBoundingClientRect().left, duration: 0.9, ease: 'power4.out' }, '-=0.55');
      }

      this.pos = [];
      $$('[data-sec]').forEach((sec, i) => {
        const stop = stops[i];
        this.pos[i] = i === 1 ? this.hST : ScrollTrigger.create({ trigger: sec, start: 'top top' });
        const tl = gsap.timeline({ paused: true })
          .to($('[data-marker]', sec), { scaleX: 1, duration: 0.7, ease: 'power3.inOut' }, i === 0 && !reduce ? 1.4 : 0.15);
        ScrollTrigger.create({
          trigger: sec, start: 'top 55%', end: i === 1 ? () => '+=' + (innerHeight * 1.1 + dist()) : 'bottom 45%',
          onToggle: s => (s.isActive ? tl.play() : tl.reverse())
        });
        const rev = $$('[data-reveal]', sec);
        if (rev.length && !reduce) gsap.from(rev, {
          y: 28, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07,
          delay: i === 0 ? 0.5 : 0,
          scrollTrigger: { trigger: sec, start: 'top 70%', once: true }
        });
      });

      // Toolbelt chips
      if (!reduce) gsap.from('[data-chip]', {
        scale: 0.6, opacity: 0, duration: 0.4, ease: 'back.out(2)', stagger: 0.015,
        scrollTrigger: { trigger: '[data-sec="3"]', start: 'top 60%', once: true }
      });

      // Counters
      $$('[data-count]').forEach(el => {
        const o = { v: 0 }, to = +el.dataset.count;
        gsap.to(o, { v: to, duration: 1.4, ease: 'power2.out',
          onUpdate: () => (el.textContent = Math.round(o.v)),
          scrollTrigger: { trigger: '[data-sec="2"]', start: 'top 55%', once: true } });
      });

      // Top bar slides in once the hero is left behind
      const topbar = $('[data-topbar]');
      ScrollTrigger.create({ trigger: '[data-sec="0"]', start: 'bottom 60%',
        onEnter: () => gsap.to(topbar, { yPercent: 0, y: 0, duration: 0.45, ease: 'power3.out', overwrite: true }),
        onLeaveBack: () => gsap.to(topbar, { yPercent: -100, duration: 0.35, ease: 'power3.in', overwrite: true }) });
      gsap.set(topbar, { yPercent: -100, y: 0 });

      // Resume pulse when the dot lands on contact
      ScrollTrigger.create({ trigger: '[data-sec="4"]', start: 'top 40%', onEnter: () =>
        gsap.fromTo('[data-resume]', { boxShadow: '0 0 0 0 rgba(59,130,246,.55)' }, { boxShadow: '0 0 0 16px rgba(59,130,246,0)', duration: 1, ease: 'power2.out' }) });

      // Rail stops sit where each section actually starts in the scroll
      const layout = () => {
        const max = ScrollTrigger.maxScroll(window) || 1;
        const P = this.pos;
        this.secStarts = [0, this.hST.start, P[2].start, P[3].start, Math.min(P[4].start, max)];
        this.railS = [[0, 0], [this.hST.start, 0.25], [this.hST.end, 0.25], [P[2].start, 0.5], [P[3].start, 0.75], [Math.min(P[4].start, max), 1]];
        this._railSync();
        const pts = this.pos.map(p => p.start);
        const tb = $('[data-sec="3"]');
        if (tb.offsetHeight > innerHeight + 40) pts.push(this.pos[3].start + tb.offsetHeight - innerHeight);
        const d = dist();
        if (d > 0) cards.forEach(c => pts.push(this.hST.start + Math.min(d, cardX(c))));
        // One branch stop per card, at the point where that card snaps; cards that clamp to the end share it
        this.bStopEls = $$('[data-bstop]');
        const seen = new Set();
        this.bStopFr = cards.map((c, k) => {
          if (k >= this.projects.length) return null;
          const fr = d > 0 ? Math.min(1, cardX(c) / d) : 0, key = fr.toFixed(3);
          if (seen.has(key)) return null; seen.add(key); return fr;
        });
        this.bStopEls.forEach((el, k) => {
          const fr = this.bStopFr[k];
          el.style.display = fr == null || fr < 0.001 ? 'none' : '';
          if (fr != null) el.style.left = fr * 100 + '%';
          el._on = undefined;
        });
        this._bTgt = undefined;
        if (this.hST.animation) this.hST.animation.vars.onUpdate.call(this.hST.animation);
        this.snapPts = pts.map(v => v / max).sort((a, b) => a - b);
      };
      ScrollTrigger.addEventListener('refresh', layout);

      // GSAP snapping: section starts + each project card
      if (!reduce) ScrollTrigger.create({
        start: 0, end: 'max',
        snap: {
          snapTo: v => {
            if (!(this.props.snap ?? true) || !this.snapPts) return v;
            return this.snapPts.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
          },
          duration: { min: 0.3, max: 0.8 }, delay: 0.1, ease: 'power2.inOut'
        }
      });
    });

    // Ambient dot grid in hero, bends away from cursor
    const cv = $('[data-grid]'), cx = cv.getContext('2d');
    let t = 0;
    this._tick = () => {
      const r = cv.getBoundingClientRect();
      if (r.bottom < 0 || !(this.props.ambientGrid ?? true)) { cx.clearRect(0, 0, cv.width, cv.height); return; }
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(r.width * dpr)) { cv.width = r.width * dpr; cv.height = r.height * dpr; }
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.clearRect(0, 0, r.width, r.height);
      t += reduce ? 0 : 0.012;
      const gap = 30;
      cx.fillStyle = 'rgba(59,130,246,.28)';
      for (let y = gap / 2; y < r.height; y += gap) for (let x = gap / 2; x < r.width; x += gap) {
        let px = x + Math.sin(t + y * 0.02) * 3, py = y + Math.cos(t + x * 0.015) * 3;
        cx.beginPath(); cx.arc(px, py, 1.3, 0, 6.283); cx.fill();
      }
    };
    gsap.ticker.add(this._tick);
    ScrollTrigger.refresh();
  }
}
