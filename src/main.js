import './styles.css';
import projects from './data/projects.json';
import toolbelt from './data/toolbelt.json';
import { renderPage } from './render.js';
import Portfolio from './animations.js';

// Render all data-driven markup first, then start the animations (same order as the design)
renderPage(projects, toolbelt);
const site = new Portfolio(projects, toolbelt);
site.mount();

// Dev-only handle for poking at animations from the console (stripped from production builds)
if (import.meta.env.DEV) window.__portfolio = { site, ...(await import('gsap')), ...(await import('gsap/ScrollTrigger')) };
