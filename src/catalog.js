// Single source of truth for the "Explore the visualizers" nav + the hero
// spotlight panel on index.html (see src/app.js's renderCatalog()/
// setSpotlight()). Each entry carries both the literal English text and its
// locales/en.json key -- the literal is what actually paints on first load
// (no fetch required), the key is what translate() looks up once a
// non-English locale is active. locales/en.json must hold the same literal
// value under each key -- scripts/check-i18n-coverage.js fails the build if
// they drift. Array order is display order.
export const CATALOG = [
  {
    id: 'golf',
    href: 'index_nv_bloch_golf.html',
    label: 'Bloch golf',
    labelKey: 'catalog.golf.label',
    note: 'An NV Single Qubit gate-navigation puzzle.',
    noteKey: 'catalog.golf.note',
    detail: 'X, Y, and Z pulses rotate the spin toward a randomly placed target in as few strokes as par '
      + 'allows. Unlike the other two pages, nothing here is driven continuously or measured with noise — every '
      + 'move is an exact rotation.',
    detailKey: 'catalog.golf.detail',
    spotlight: {
      type: 'image',
      src: 'doc/bloch_golf.jpg',
      caption: 'Every stroke is an exact rotation — X, Y, and Z pulses walking the spin to a randomly placed '
        + 'target — captured live from the Bloch golf visualizer, not a rendered mockup.',
      captionKey: 'catalog.golf.spotlightCaption',
    },
  },
  {
    id: 'ramsey',
    href: 'index_ramsey.html',
    label: 'Ramsey visualizer',
    labelKey: 'catalog.ramsey.label',
    // glossaryNote: renderCatalog() renders this entry's note as a
    // <details><summary> disclosure instead of a plain <span>, with detail
    // as the hidden-until-hovered/focused popup body -- see CLAUDE.md's
    // Visualizer catalog section. Any future entry can opt into the same
    // pattern by setting this flag.
    glossaryNote: false,
    note: 'Like a vehicle sensing the terrain shift beneath it, the spin senses the field shift during free '
      + 'evolution — Ramsey interferometry at the quantum level.',
    noteKey: 'catalog.ramsey.note',
    detail: 'Using a toy vehicle, observe the NV magnetic field detection detection sequence revealed on a Bloch sphere.',
    detailKey: 'catalog.ramsey.detail',
    spotlight: {
      type: 'video',
      src: 'doc/media/ramsey.mp4',
      caption: 'The Ramsey pulse sequence and Bloch-sphere response as the vehicle crosses terrain — captured '
        + 'live from the Ramsey visualizer, not a rendered mockup.',
      captionKey: 'catalog.ramsey.spotlightCaption',
    },
  },
  {
    id: 'rabi',
    href: 'index_rabi.html',
    label: 'Rabi & Zeeman visualizer',
    labelKey: 'catalog.rabi.label',
    note: 'The continuously-driven oscillation.',
    noteKey: 'catalog.rabi.note',
    detail: 'A view of Rabi oscillations, phase accumulation, and fringe visibility. Here you drag a variable '
      + 'and watch the whole time-domain picture — the oscillation, the Bloch vector, the fringe pattern — '
      + 'respond continuously.',
    detailKey: 'catalog.rabi.detail',
    spotlight: {
      type: 'video',
      src: 'doc/media/bloch-sweep.mp4',
      caption: 'The Bloch vector precessing as the magnet auto-sweeps its full range — captured live from the '
        + 'Rabi visualizer, not a rendered mockup.',
      captionKey: 'catalog.rabi.spotlightCaption',
    },
  },
];

// Shown in the hero panel when nothing is hovered/focused -- not tied to any
// one visualizer, so it doesn't read as favoring one entry over the others.
// Same shape as an entry's `spotlight` field.
export const DEFAULT_SPOTLIGHT = {
  type: 'image',
  src: 'doc/bloch_golf.jpg',
  caption: 'This is a toolbox for exploring quantum-sensing concepts as intuitively as possible — hover or '
    + 'focus a visualizer to preview it here.',
  captionKey: 'ui.toolboxCaption',
};
