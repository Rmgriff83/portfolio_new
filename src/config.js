// Site-wide switches. These were the design's editable props (Claude Design "tweaks").
export default {
  // Hero photo treatment: 'None' | 'Brand duotone' | 'Soft muted' | 'Black & white' | 'B&W high contrast' | 'Muted' | 'Warm film'
  heroFilter: 'None',
  // GSAP snapping to section starts and to each project card
  snap: true,
  // Animated dot grid behind the hero
  ambientGrid: true,
  // Rail stop labels, one per [data-sec] section, in order
  labels: ['Intro', 'Projects', 'About', 'Toolbelt', 'Contact']
};
