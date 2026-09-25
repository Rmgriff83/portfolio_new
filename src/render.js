// Builds every data-driven part of the page from the JSON files.
// Markup and inline styles match the design's <sc-for> templates exactly.
import config from './config.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad2 = n => String(n).padStart(2, '0');

const HERO_FILTERS = {
  'Brand duotone': 'grayscale(1) contrast(1.12) brightness(1.04)',
  'Soft muted': 'saturate(.6) contrast(1.06) brightness(1.03)',
  'Black & white': 'grayscale(1)',
  'B&W high contrast': 'grayscale(1) contrast(1.25) brightness(1.05)',
  'Muted': 'saturate(.45) contrast(1.05)',
  'Warm film': 'sepia(.35) saturate(.8) contrast(1.05)',
  'None': 'none'
};

const SLOT_ICON = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';

// Chip colors come from whichever toolbelt group lists the skill (the design's tag() helper)
export const makeTag = toolbelt => label => {
  const key = ({ WCAG: 'Accessibility', SEO: 'Google Analytics' })[label] || label;
  const g = toolbelt.find(t => t.items.some(it => it.toLowerCase() === key.toLowerCase())) || toolbelt[2];
  return { label, bg: g.chipBg, ink: g.chipInk };
};

const chip = (k, pad, size) => `<span style="background:${k.bg};color:${k.ink};border-radius:999px;padding:${pad};font-size:${size};font-weight:500">${esc(k.label)}</span>`;

export function renderPage(projects, toolbelt) {
  const tag = makeTag(toolbelt);
  const $ = s => document.querySelector(s);

  // Rail stops
  $('[data-rail-dot]').insertAdjacentHTML('beforebegin', config.labels.map((label, i) => `
    <button data-stop="" data-go="${i}" aria-label="Go to ${esc(label)}" style="position:absolute;left:0;top:${(i / (config.labels.length - 1)) * 100}%;transform:translateY(-50%);display:flex;align-items:center;gap:12px;background:none;border:0;padding:6px 0;cursor:pointer;pointer-events:auto">
      <span data-stop-dot="" style="width:10px;height:10px;margin-left:2px;border-radius:50%;border:2px solid #9ca3af;background:#f9fafb;box-sizing:border-box"></span>
    </button>`).join(''));

  // Hero photo filter
  const heroImg = $('[data-hero-img]');
  heroImg.style.filter = HERO_FILTERS[config.heroFilter] || 'none';
  if (config.heroFilter === 'Brand duotone') heroImg.insertAdjacentHTML('afterend',
    '<div style="position:absolute;inset:0;background:#1d4ed8;mix-blend-mode:color;opacity:.55;pointer-events:none"></div>' +
    '<div style="position:absolute;inset:0;background:#5eead4;mix-blend-mode:soft-light;opacity:.25;pointer-events:none"></div>');

  // Branch stops: one per project
  $('[data-branch-dot]').insertAdjacentHTML('beforebegin', projects.map(() =>
    '<span data-bstop="" style="position:absolute;left:0;top:2px;width:10px;height:10px;margin-left:-5px;border-radius:50%;border:2px solid #9ca3af;background:#f9fafb;box-sizing:border-box"></span>').join(''));

  $('[data-ptotal]').textContent = pad2(projects.length);

  // Project cards
  $('[data-track]').innerHTML = projects.map((p, i) => {
    const media = p.image
      ? `<img src="${esc(p.image)}" alt="${esc(p.imageAlt || p.name)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block">`
      : `<div class="slot-empty">${SLOT_ICON}<div class="cap">Drop a screenshot of ${esc(p.name)}</div><div class="ring"></div></div>`;
    const href = p.link ? `href="${esc(p.link)}" target="_blank" rel="noopener" data-card-link=""` : 'href="#"';
    return `
      <article data-card="" data-index="${i}" style="cursor:pointer;flex:none;position:relative;width:clamp(320px,62vw,960px);height:100%;border-radius:12px;overflow:hidden;background:#e5e7eb;box-shadow:0 16px 40px rgba(31,41,55,.14)">
        ${media}
        <div style="position:absolute;left:0;right:0;bottom:0;height:70%;background:linear-gradient(to top,rgba(17,24,39,.92) 0%,rgba(17,24,39,.6) 40%,rgba(17,24,39,0) 100%);pointer-events:none"></div>
        <div style="position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;gap:12px;padding:clamp(20px,2.6vw,36px);pointer-events:none">
          <div style="display:flex;align-items:baseline;gap:14px"><span style="font:500 12px 'JetBrains Mono',monospace;color:#d1d5db">${pad2(i + 1)}</span><a ${href} class="hv-card-title" style="font:700 clamp(24px,2.6vw,38px)/1.15 'Inter';letter-spacing:-.02em;color:#ffffff;pointer-events:auto">${esc(p.name)} →</a></div>
          <p style="margin:0;font-size:17px;line-height:1.5;color:#e5e7eb">${esc(p.desc)}</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px">${p.skills.map(s => chip(tag(s), '5px 12px', '14px')).join('')}</div>
        </div>
      </article>`;
  }).join('');

  // Toolbelt
  $('[data-toolbelt]').innerHTML = toolbelt.map(g => `
    <div data-reveal="" style="display:flex;flex-direction:column;gap:18px;border-top:1.5px solid #1f2937;padding-top:18px">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font:700 24px 'Inter';letter-spacing:-.01em">${esc(g.title)}</span><span style="font:500 12px 'JetBrains Mono',monospace;color:#6b7280">${pad2(g.items.length)}</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${g.items.map(t =>
        `<span data-chip="" style="background:${g.chipBg};color:${g.chipInk};border-radius:999px;padding:7px 14px;font-size:15px;font-weight:500">${esc(t)}</span>`).join('')}</div>
    </div>`).join('');
}

// Fills the modal with one project's content (the design's `modal` render values)
export function renderModal(p, i, tab, toolbelt) {
  const tag = makeTag(toolbelt);
  const m = document.querySelector('[data-modal]');
  const q = s => m.querySelector(s);
  m.setAttribute('aria-label', p.name);
  q('[data-modal-num]').textContent = pad2(i + 1);
  q('[data-modal-name]').textContent = p.name;
  q('[data-modal-desc]').textContent = p.desc;
  q('[data-modal-role]').textContent = p.role;
  q('[data-modal-tags]').innerHTML = p.tags.map(t => chip(tag(t), '6px 13px', '14px')).join('');
  const img = q('[data-modal-img]');
  img.style.display = p.image ? 'block' : 'none';
  if (p.image) { img.src = p.image; img.alt = p.imageAlt || p.name; } else img.removeAttribute('src');
  const list = q('[data-tablist]');
  list.querySelectorAll('[data-tab]').forEach(b => b.remove());
  q('[data-tab-ink]').insertAdjacentHTML('beforebegin', p.tabs.map((t, k) =>
    `<button data-tab="" data-tab-index="${k}" role="tab" aria-selected="false" class="hv-tab" style="background:none;border:0;padding:0 0 12px;cursor:pointer;font:500 12px 'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:#6b7280">${esc(t.label)}</button>`).join(''));
  renderTab(p, tab);
}

export function renderTab(p, tab) {
  const t = Math.min(tab, p.tabs.length - 1);
  document.querySelectorAll('[data-tab]').forEach((b, k) => {
    b.setAttribute('aria-selected', String(k === t));
    b.style.color = k === t ? '#1f2937' : '#6b7280';
  });
  document.querySelector('[data-tab-panel]').innerHTML = p.tabs[t].paras.map(para =>
    `<p style="margin:0;font-size:17px;line-height:1.65;color:#374151;text-wrap:pretty">${esc(para)}</p>`).join('');
}
