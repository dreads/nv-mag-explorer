// Single source of truth for the "Explore the visualizers" nav + the hero
// spotlight panel on index.html (see src/app.js's renderCatalog()/
// setSpotlight()). Each entry carries both the literal English text and its
// locales/en.json key -- the literal is what actually paints on first load
// (no fetch required), the key is what translate() looks up once a
// non-English locale is active. locales/en.json must hold the same literal
// value under each key -- scripts/check-i18n-coverage.js fails the build if
// they drift.
export const CATALOG = [
  {
    id: 'ramsey',
    href: 'index_ramsey.html',
    label: 'Ramsey visualizer',
    labelKey: 'catalog.ramsey.label',
    note: 'Pulse, wait, pulse — phase accumulated during the silence, then read out.',
    noteKey: 'catalog.ramsey.note',
    detail: 'Ramsey interferometry breaks the wobble into three clean steps: a short π/2 pulse tips the spin '
      + 'onto the equator, the microwave then switches off entirely for a free-evolution window τ, and a second '
      + 'π/2 pulse converts whatever happened during that silence back into a population you can read. That '
      + "clean readout isn't free, though: bell-state-explorer's dephasing slider makes the same trade visible "
      + 'on a two-qubit density matrix — damping the off-diagonal coherences by a factor of (1 − p) leaves the '
      + "populations untouched, but erases exactly the information that made the state's correlations legible.",
    detailKey: 'catalog.ramsey.detail',
    spotlight: {
      type: 'image',
      src: 'doc/bloch_ramsey.jpg',
      caption: 'Accumulated phase φ = δτ traced across many runs of the free-evolution window τ — captured live '
        + 'from the Ramsey visualizer, not a rendered mockup.',
      captionKey: 'catalog.ramsey.spotlightCaption',
    },
  },
  {
    id: 'rabi',
    default: true,
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
];
