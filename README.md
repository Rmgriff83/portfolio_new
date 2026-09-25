# Ross Griffus · Portfolio

Personal portfolio site. Vite + vanilla JS + GSAP 3.13 (ScrollTrigger, MotionPathPlugin, SplitText), ported from the Claude Design file `Portfolio.dc.html`.

```bash
npm install
npm run dev       # local dev server
npm run build     # production build → dist/
npm run preview   # serve the production build
```

## Editing projects

All project content lives in **`src/data/projects.json`**. Array order is display order. Numbering (01, 02…), the `0N / 0N` counter, branch stops, and scroll snap points are all computed from the array, so adding, removing, or reordering projects needs no code changes.

```json
{
  "id": "specht-properties",
  "name": "Specht Properties",
  "desc": "Full WordPress site build",
  "image": "/assets/projects/specht-properties.jpg",
  "imageAlt": "Specht Properties home page",
  "link": "https://example.com",
  "role": "Design & development",
  "skills": ["WordPress", "PHP", "UX/UI"],
  "tags": ["WordPress", "PHP", "HTML5", "CSS3"],
  "tabs": [
    { "label": "Overview", "paras": ["First paragraph.", "Second paragraph."] },
    { "label": "Design Decisions", "paras": ["…"] }
  ]
}
```

| Field | Used for |
| --- | --- |
| `name`, `desc` | Card and modal header |
| `image` | Card background and modal header. Put files in `public/assets/projects/`. Leave `""` for the placeholder. |
| `imageAlt` | Alt text for the image (falls back to `name`) |
| `link` | Optional. When set, the card title links out in a new tab instead of opening the modal. |
| `role` | Modal sidebar |
| `skills` | Chips on the card (keep it to ~3) |
| `tags` | "Skills & Tools" chips in the modal |
| `tabs` | Modal tabs; each tab is a label plus paragraphs |

Chip colors come from **`src/data/toolbelt.json`**: a skill takes the color of the toolbelt group that lists it (Development blue, Design purple, Workflow green). `WCAG` maps to Accessibility and `SEO` maps to Google Analytics. Anything unlisted falls back to Workflow green.

## Other settings

`src/config.js` holds the design's tweakable options: hero photo filter, snapping on/off, the hero dot grid, and rail labels.

## Structure

- `index.html`: page markup, carried over from the design
- `src/render.js`: builds cards, rail/branch stops, toolbelt, and modal content from the JSON
- `src/animations.js`: all GSAP scroll/modal logic (port of the design's component)
- `src/styles.css`: base styles and hover states

## Deploying (Cloudflare Pages)

Connect the GitHub repo in the Cloudflare Pages dashboard with:

- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `NODE_VERSION` = `20` (or newer)

Every push to `main` deploys automatically.
