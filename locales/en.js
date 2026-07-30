// English is the source-of-truth locale: every key any other bundle can
// translate must exist here first. Ships as a static ES module import
// (rather than fetched JSON like PR-contributed locales) so the default
// language never costs a network round-trip and works offline / from
// file://. See README.md's "i18n / l10n / a11y" section.
export const STRINGS_VERSION = '1';

export default {
  meta: {
    code: 'en',
    endonym: 'English',
    englishName: 'English',
    direction: 'ltr',
    targetsVersion: STRINGS_VERSION,
  },
  strings: {
    ui: {
      docTitle: 'NV Magnetometry — Why Ramsey?',
      metaDescription:
        'Why a real NV-diamond magnetometer measures with Ramsey interferometry instead of reading Rabi oscillations directly, and how the same coherence budget that limits entanglement in bell-state-explorer limits this measurement too.',
      languageLabel: 'Language',
      skipLink: 'Skip to content',
      heading: 'Why Ramsey Interferometry',
      subtitle:
        "The Rabi visualizer shows a magnetometer's raw quantum wobble. A real device doesn't read that wobble directly — it runs a smarter two-pulse sequence called Ramsey interferometry. This page explains why, and how the same coherence budget that limits entanglement in bell-state-explorer limits this measurement too.",
      navHeading: 'Explore the visualizers',
      navRabiLabel: 'Rabi & Zeeman visualizer',
      navRabiNote: 'The continuously-driven oscillation.',
      navDesignLabel: 'Ramsey visualizer',
      navDesignNote: 'In design — pulse-sequence timeline, fringe plot, and a phase-accumulating Bloch sphere.',
    },
    hero: {
      blochCaption:
        'The Bloch vector precessing as the magnet auto-sweeps its full range — captured live from the Rabi ' +
        'visualizer, not a rendered mockup.',
    },
    purpose: {
      heading: 'A lab bench, not a nav demo',
      body:
        'A view of Rabi oscillations, phase accumulation, and fringe visibility. Here you drag a variable and ' +
        'watch the whole time-domain picture — the oscillation, the Bloch vector, the fringe pattern — respond ' +
        'continuously.',
    },
    rabiProblem: {
      heading: 'The problem with reading Rabi directly',
      body:
        'Sweep the microwave off resonance in the Rabi visualizer and two things happen at once: the oscillation ' +
        'speeds up, since the effective Rabi frequency is Ω = √(Ω₀² + δ²), and its amplitude shrinks, since the ' +
        'flip probability scales with Ω₀²/Ω². Both signatures move together, driven by the same detuning δ you are ' +
        'trying to measure. Fit a Rabi curve to recover the field and you are extracting one number, δ, from a shape ' +
        'that also depends on the drive strength Ω₀ — a fine way to explore the physics, a clumsy way to build an instrument.',
    },
    ramseyPayoff: {
      heading: 'What Ramsey buys you',
      body:
        'Ramsey interferometry breaks the wobble into three clean steps: a short π/2 pulse tips the spin onto the ' +
        'equator, the microwave then switches off entirely for a free-evolution window τ, and a second π/2 pulse ' +
        'converts whatever happened during that silence back into a population you can read.',
    },
    coherenceBudget: {
      heading: 'The coherence budget',
      body:
        "That clean readout isn't free. bell-state-explorer's dephasing slider makes the same trade visible on a " +
        'two-qubit density matrix: damping the off-diagonal coherences by a factor of (1 − p) leaves the populations ' +
        "untouched, but it erases exactly the information that made the state's correlations legible.",
    },
    diagram: {
      heading: 'Drive timelines, side by side',
      rabiCaption: 'Rabi: continuous drive',
      rabiOnLabel: 'drive on — the whole time',
      ramseyCaption: 'Ramsey: pulse, wait, pulse',
      ramseyPulseLabel: 'π/2',
      ramseyWaitLabel: 'drive off — free evolution τ',
      rabiLinkLabel: 'Open the Rabi visualizer →',
      ramseyLinkLabel: 'Open the Ramsey visualizer →',
      srDescription:
        'Two horizontal timelines compared. The Rabi timeline is a single unbroken bar labeled drive on for its ' +
        'entire length. The Ramsey timeline has three segments: a short pulse labeled pi over two, a much longer ' +
        'gap labeled drive off, free evolution tau, and a second short pulse labeled pi over two.',
    },
    footer: {
      physicsNote:
        'Physics: generalized Rabi frequency Ω = √(Ω₀² + δ²); Ramsey readout P(τ) = ½(1 + cos δτ)·e^(−τ/T₂*); ' +
        'accumulated phase φ = δτ. Zeeman splitting of the NV ground-state triplet: f± = 2.87 GHz ± γB, ' +
        'γ ≈ 28 MHz/mT. All closed-form, computed client-side, GitHub Pages-ready.',
      companionNote:
        "The Rabi visualizer's own numbers are grounded in that page's footer; the dephasing/coherence framing " +
        "above follows bell-state-explorer's density-matrix explorer.",
    },
  },
};
