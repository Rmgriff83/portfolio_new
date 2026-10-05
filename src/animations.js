// Port of the design's Component class (Portfolio.dc.html). The GSAP logic is kept line-for-line;
// only the Claude Design runtime pieces changed: setState → explicit render calls, this.props → config.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import config from './config.js';
import { renderModal, renderTab, applyLayout, layoutKey } from './render.js';

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
      if (card) this.openProject(+card.dataset.index, card, e);
    });

    document.addEventListener('keydown', e => {
      const t = e.target;
      if (!t.closest) return;
      // Card titles that open the dialog are role="button" links: Space should activate them like a button
      if (e.key === ' ' && t.matches('[data-card-title][role="button"]')) { e.preventDefault(); t.click(); return; }
      // Tabs: arrow keys / Home / End move between tabs (ARIA tabs pattern, automatic activation)
      if (t.matches('[data-tab]')) {
        const tabs = [...document.querySelectorAll('[data-tab]')], k = tabs.indexOf(t), n = tabs.length;
        const next = { ArrowRight: (k + 1) % n, ArrowLeft: (k - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        this.selectTab(next);
        tabs[next].focus();
      }
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
    // Everything behind the dialog goes inert (unfocusable, hidden from screen readers); focus returns here on close
    this._returnFocus = card.querySelector('[data-card-title]') || document.activeElement;
    this._inert = [...document.querySelectorAll('body > :not([data-modal]):not([data-modal-backdrop]):not(script)')];
    this._inert.forEach(el => { el.inert = true; });
    this._lock = ev => { if (!(ev.target.closest && ev.target.closest('[data-modal-body]'))) ev.preventDefault(); };
    window.addEventListener('wheel', this._lock, { passive: false });
    window.addEventListener('touchmove', this._lock, { passive: false });
    this._esc = ev => { if (ev.key === 'Escape') this.closeProject(); else if ([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(ev.key) && !(ev.target.closest && ev.target.closest('[data-modal-body], button, a'))) ev.preventDefault(); };
    window.addEventListener('keydown', this._esc);
    // Keep Tab / Shift+Tab inside the dialog (the inert background also keeps focus off the page)
    const title = m.querySelector('#modal-title');
    this._trap = ev => {
      if (ev.key !== 'Tab') return;
      const f = [...m.querySelectorAll('a[href], button, [tabindex]')].filter(el => el.tabIndex >= 0 && el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (ev.shiftKey && (a === first || a === title || !m.contains(a))) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && (a === last || !m.contains(a))) { ev.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', this._trap);
    body.scrollTop = 0;
    gsap.set(m, { visibility: 'visible', left: r.left, top: r.top, width: r.width, height: r.height });
    gsap.set(media, { height: r.height }); gsap.set([body, close], { opacity: 0 });
    gsap.set(card, { visibility: 'hidden' });
    // Screen readers announce "<project>, dialog" and its heading as soon as it opens
    title.focus({ preventScroll: true });
    const tl = gsap.timeline({ onComplete: () => { this._modalBusy = false; this._inkSel = null; this.updateInk(); } })
      .to(bd, { autoAlpha: 1, duration: 0.4 }, 0)
      .to(m, { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2, width: w, height: h, duration: 0.75, ease: 'power3.inOut' }, 0)
      .to(media, { height: Math.round(h * 0.42), duration: 0.75, ease: 'power3.inOut' }, 0)
      .add(() => { this._inkSel = null; this.updateInk(); }, 0.55)
      .to([body, close], { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.55);
    // Reduced motion: no morph, the dialog simply appears
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) tl.progress(1);
  }

  selectTab(k) {
    if ((this.state?.tab ?? 0) === k) return;
    this.state = { ...this.state, tab: k };
    renderTab(this.projects[this.state.sel], k);
    this.updateInk();
    const panel = document.querySelector('[data-tab-panel]');
    if (panel && !matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.fromTo(panel, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
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
    window.removeEventListener('keydown', this._esc); window.removeEventListener('keydown', this._trap);
    const tl = gsap.timeline({ onComplete: () => {
        gsap.set(card, { visibility: 'visible' }); gsap.set(m, { visibility: 'hidden' });
        this._modalOpen = false; this._modalBusy = false;
        (this._inert || []).forEach(el => { el.inert = false; });
        if (this._returnFocus) this._returnFocus.focus({ preventScroll: true });
      } })
      .to([body, close], { opacity: 0, duration: 0.2 }, 0)
      .to(m, { left: r.left, top: r.top, width: r.width, height: r.height, duration: 0.65, ease: 'power3.inOut' }, 0.1)
      .to(media, { height: r.height, duration: 0.65, ease: 'power3.inOut' }, 0.1)
      .to(bd, { autoAlpha: 0, duration: 0.4 }, 0.35);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) tl.progress(1);
  }

  go(i, e) {
    if (e) e.preventDefault();
    const p = this.pos && this.pos[i];
    const sec = document.querySelector('[data-sec="' + i + '"]');
    const top = p ? p.start : sec ? sec.offsetTop : 0;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    // Keyboard and screen reader users land in the section they picked
    if (sec) { if (!sec.hasAttribute('tabindex')) sec.setAttribute('tabindex', '-1'); sec.focus({ preventScroll: true }); }
  }

  mount() {
    this.bind();
    // Re-lay out the hero/About when crossing a breakpoint, then let ScrollTrigger re-measure
    this._bp = layoutKey();
    this._onResize = () => { if (layoutKey() !== this._bp) { this._bp = applyLayout(); ScrollTrigger.refresh(); } };
    window.addEventListener('resize', this._onResize);
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => this.init());
  }

  init() {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    ScrollTrigger.config({ ignoreMobileResize: true });
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

    this.ctx = gsap.context(() => {
      // Horizontal scroller: pins a section and slides its track sideways while the page scrolls,
      // with the 01 / 0N counter.
      // Used by Projects (cards) and Toolbelt (panels); everything is scoped to its own section.
      const makeHScroll = (sec, itemSel) => {
        const track = $('[data-track]', sec), clip = $('[data-clip]', sec);
        const items = $$(itemSel, track);
        const hcount = $('[data-hcount]', sec);
        const dist = () => Math.max(0, track.scrollWidth - clip.clientWidth);
        const pad = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;
        const cardX = c => c.offsetLeft - pad();
        const h = { sec, items, dist, cardX };

        h.tween = gsap.to(track, {
          x: () => -dist(), ease: 'none',
          onUpdate: function () {
            // Counter shows whichever item is closest to its resting position
            const pr = this.progress();
            const d = dist(), x = pr * d, off = c => Math.min(d, cardX(c));
            let best = 0;
            items.forEach((c, k) => { if (Math.abs(off(c) - x) < Math.abs(off(items[best]) - x)) best = k; });
            hcount.textContent = String(best + 1).padStart(2, '0');
          },
          scrollTrigger: {
            trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true
          }
        });
        h.st = h.tween.scrollTrigger;

        if (!reduce) items.forEach(c => gsap.from(c, {
          y: 40, opacity: 0.25, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { containerAnimation: h.tween, trigger: c, start: 'left 92%', toggleActions: 'play none none reverse' }
        }));
        // Keyboard focus on an item: bring it on screen by scrolling to its snap point (the browser would
        // otherwise scroll the overflow-hidden clip sideways and desync the track)
        track.addEventListener('focusin', e => {
          const c = e.target.closest(itemSel); if (!c) return;
          clip.scrollLeft = 0; requestAnimationFrame(() => { clip.scrollLeft = 0; });
          const y = h.st.start + Math.min(dist(), cardX(c));
          if (Math.abs(window.scrollY - y) > 2) window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
        });
        // Where each item snaps into place
        h.snapPoints = () => { const d = dist(); return d > 0 ? items.map(c => h.st.start + Math.min(d, cardX(c))) : []; };
        return h;
      };

      const hs = this.hs = [makeHScroll($('[data-sec="1"]'), '[data-card]')];
      this.hST = hs[0].st; this.dist = hs[0].dist; this.cards = hs[0].items;

      gsap.set('[data-marker]', { scaleX: 0, rotation: -1, transformOrigin: 'left center' });

      // Hero intro: name + description slide out of the vanishing point at the left edge, buttons from the right
      if (!reduce) {
        const clip = $('[data-hero-clip]');
        const fade = 'linear-gradient(to right,transparent 0,rgba(0,0,0,.08) 24px,rgba(0,0,0,.3) 56px,rgba(0,0,0,.65) 88px,#000 120px)';
        Object.assign(clip.style, { overflow: 'hidden', webkitMaskImage: fade, maskImage: fade });
        const cr = clip.getBoundingClientRect();
        const left = $$('[data-hero-left]'), right = $$('[data-hero-right]');
        gsap.timeline({ delay: 0.15, onComplete: () => Object.assign(clip.style, { overflow: '', webkitMaskImage: '', maskImage: '' }) })
          .from(left, { x: i => -(left[i].getBoundingClientRect().right - cr.left), duration: 1.2, ease: 'power4.out', stagger: 0.12 })
          .from(right, { x: k => cr.right - right[k].getBoundingClientRect().left, duration: 0.9, ease: 'power4.out', stagger: 0.1 }, '-=0.55');
      }

      this.pos = [];
      $$('[data-sec]').forEach((sec, i) => {
        const h = i === 1 ? hs[0] : null;
        this.pos[i] = h ? h.st : ScrollTrigger.create({ trigger: sec, start: 'top top' });
        const tl = gsap.timeline({ paused: true }), marker = $('[data-marker]', sec);
        // Not every section has a marker (Toolbelt has no visible title)
        if (marker) tl.to(marker, { scaleX: 1, duration: 0.7, ease: 'power3.inOut' }, i === 0 && !reduce ? 1.4 : 0.15);
        ScrollTrigger.create({
          trigger: sec, start: 'top 55%', end: h ? () => '+=' + (innerHeight * 1.1 + h.dist()) : 'bottom 45%',
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
      let barShown = false;
      const showBar = () => gsap.to(topbar, { yPercent: 0, y: 0, duration: 0.45, ease: 'power3.out', overwrite: true });
      const hideBar = () => gsap.to(topbar, { yPercent: -100, duration: 0.35, ease: 'power3.in', overwrite: true });
      ScrollTrigger.create({ trigger: '[data-sec="0"]', start: 'bottom 60%',
        onEnter: () => { barShown = true; showBar(); },
        onLeaveBack: () => { barShown = false; if (!topbar.contains(document.activeElement)) hideBar(); } });
      gsap.set(topbar, { yPercent: -100, y: 0 });
      // Keyboard users can tab into the bar while it's tucked away: slide it in while it has focus
      topbar.addEventListener('focusin', showBar);
      topbar.addEventListener('focusout', e => { if (!barShown && !topbar.contains(e.relatedTarget)) hideBar(); });

      // Resume pulse when the dot lands on contact
      ScrollTrigger.create({ trigger: '[data-sec="4"]', start: 'top 40%', onEnter: () =>
        gsap.fromTo('[data-resume]', { boxShadow: '0 0 0 0 rgba(37,99,235,.55)' }, { boxShadow: '0 0 0 16px rgba(37,99,235,0)', duration: 1, ease: 'power2.out' }) });

      // Snap points: section starts, the end of any section taller than the screen, and each horizontal item
      const layout = () => {
        const max = ScrollTrigger.maxScroll(window) || 1;
        const pts = this.pos.map(p => p.start);
        // Sections taller than the screen (common on phones) get an end snap point and scroll freely in between
        // (the pinned Projects section is always exactly one screen tall)
        this.tall = [];
        [0, 2, 3, 4].forEach(k => {
          // End point = where the section's bottom meets the bottom of the screen, measured from its real top
          const el = $('[data-sec="' + k + '"]'), s = this.pos[k].start, top = el.getBoundingClientRect().top + window.scrollY, e = Math.min(max, top + el.offsetHeight - innerHeight);
          if (el.offsetHeight > innerHeight + 40) { pts.push(e); this.tall.push([s, e]); }
        });
        hs.forEach(h => { pts.push(...h.snapPoints()); h.st.animation.vars.onUpdate.call(h.st.animation); });
        this.snapPts = pts.map(v => v / max).sort((a, b) => a - b);
      };
      ScrollTrigger.addEventListener('refresh', layout);

      // GSAP snapping: section starts + each project card
      if (!reduce) ScrollTrigger.create({
        start: 0, end: 'max',
        snap: {
          snapTo: v => {
            if (!(this.props.snap ?? true) || !this.snapPts) return v;
            const y = v * ScrollTrigger.maxScroll(window), m = innerHeight * 0.2;
            if ((this.tall || []).some(([s, e]) => y > s + m && y < e - m)) return v;
            return this.snapPts.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
          },
          duration: { min: 0.3, max: 0.8 }, delay: 0.1, ease: 'power2.inOut'
        }
      });
    });

    // Ambient dot grid behind the hero and contact sections (every [data-grid] canvas)
    const grids = $$('[data-grid]').map(cv => ({ cv, cx: cv.getContext('2d') }));
    let t = 0;
    this._tick = () => {
      t += reduce ? 0 : 0.012;
      grids.forEach(({ cv, cx }) => {
        const r = cv.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight || !(this.props.ambientGrid ?? true)) { cx.clearRect(0, 0, cv.width, cv.height); return; }
        const dpr = Math.min(devicePixelRatio || 1, 2);
        if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = r.width * dpr; cv.height = r.height * dpr; }
        cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx.clearRect(0, 0, r.width, r.height);
        const gap = 30;
        cx.fillStyle = 'rgba(37,99,235,.28)';
        for (let y = gap / 2; y < r.height; y += gap) for (let x = gap / 2; x < r.width; x += gap) {
          let px = x + Math.sin(t + y * 0.02) * 3, py = y + Math.cos(t + x * 0.015) * 3;
          cx.beginPath(); cx.arc(px, py, 1.3, 0, 6.283); cx.fill();
        }
      });
    };
    gsap.ticker.add(this._tick);
    ScrollTrigger.refresh();
  }
}
