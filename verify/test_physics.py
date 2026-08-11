"""Cross-checks the closed-form quantum formulas in index_rabi.html and
index_ramsey.html against a full QuTiP Lindblad master-equation simulation.

Findings baked into the test design below (see verify/README.md for the
full writeup):

  1. Rabi, coherent (no T2*): the generalized-Rabi formula is EXACT --
     matches qutip.mesolve to ~1e-8.
  2. Rabi, with continuous T2* dephasing: the app's naive
     P(t)*exp(-t/T2*) envelope is only an approximation. On resonance the
     true oscillation decays at 1/(2*T2*), not 1/T2*, and settles toward a
     mixed steady state (~0.5) rather than decaying back to 0. This is a
     real, sizeable gap (tens of percent) even at the app's own default
     slider settings -- verified both numerically (qutip) and analytically
     (Bloch-matrix eigenvalues).
  3. Ramsey, coherent: EXACT match (~1e-7).
  4. Ramsey, with T2* dephasing confined to the free-evolution window
     (matching the app's own "microwave OFF during tau" framing): EXACT
     match (~1e-7) -- this case is analytically solvable because the
     dephasing generator commutes with the free-evolution Hamiltonian.
  5. ODMR steady-state lineshape: with ONLY the app's stated T2* dephasing
     channel (no T1), the unique Lindblad steady state is EXACTLY the
     maximally-mixed state for any nonzero drive/detuning -- provably, no
     CW ODMR dip is possible without an (unmodeled) population-relaxation
     channel. An illustrative added T1 produces a comparable dip, but its
     physical linewidth scales far faster with Omega0 than the app's
     heuristic linear power-broadening term.
"""
import re
from pathlib import Path

import numpy as np
import pytest

import closed_form as cf
import qutip_reference as qt

REPO_ROOT = Path(__file__).resolve().parent.parent
T_WINDOW = np.linspace(0, 3.0, 61)   # matches the Rabi panel's Twin=3.0us display window
TAU_WINDOW = np.linspace(0, 3.0, 51)  # matches the Ramsey panel's TAUMAX=3.0us display window

EXACT_TOL = 1e-5  # generous vs. observed ~1e-7/1e-8 errors, to absorb grid/solver-tolerance changes


# ---------------------------------------------------------------------------
# Case 1: Rabi, coherent (unitary) -- exact match expected
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("rabi0", [1, 6, 20])
@pytest.mark.parametrize("det", [0, 5, 20, 50, -30])
def test_rabi_coherent_matches_qutip(rabi0, det):
    cf_p = cf.rabi_population(T_WINDOW, rabi0, det)
    qt_p = qt.rabi_unitary(T_WINDOW, rabi0, det)
    assert np.max(np.abs(cf_p - qt_p)) < EXACT_TOL


# ---------------------------------------------------------------------------
# Dephasing-convention sanity: confirms c_op = sqrt(1/(2*T2*))*sigmaz() gives
# coherence decay at EXACTLY rate 1/T2*, independent of any drive.
# ---------------------------------------------------------------------------
def test_dephasing_convention_gives_exact_t2star_decay():
    from qutip import basis, sigmax, mesolve
    t2star = 2.0
    psi0 = (basis(2, 0) + basis(2, 1)).unit()  # equatorial
    res = mesolve(0*qt.sigmaz(), psi0, T_WINDOW, qt.dephasing_c_ops(t2star),
                   e_ops=[sigmax()], options=qt.OPTS)
    sx = np.array(res.expect[0])
    assert np.max(np.abs(sx - np.exp(-T_WINDOW/t2star))) < EXACT_TOL


# ---------------------------------------------------------------------------
# Case 2: Rabi + continuous T2* dephasing -- the naive envelope is NOT exact.
# ---------------------------------------------------------------------------
def test_resonant_dephased_decay_rate_is_half_of_naive():
    """On resonance (delta=0), the Bloch-equation matrix for (sy,sz) is
    [[-1/T2*, -Omega0], [Omega0, 0]]; its eigenvalues have real part
    -1/(2*T2*), not the naive formula's -1/T2*. Pure linear algebra, no
    ODE solve -- an independent, assumption-free confirmation of the gap
    characterized numerically below."""
    t2star = 2.0
    om0 = 6.0*cf.TWO_PI
    A = np.array([[-1/t2star, -om0], [om0, 0]])
    eigs = np.linalg.eigvals(A)
    decay_rates = -eigs.real
    assert np.allclose(sorted(decay_rates), [1/(2*t2star), 1/(2*t2star)], atol=1e-9)


@pytest.mark.parametrize("rabi0", [1, 3, 6, 10, 20])
@pytest.mark.parametrize("t2star", [0.3, 1, 2, 4, 6])
@pytest.mark.parametrize("det", [0, 5, 15, 30, 50])
def test_rabi_dephased_error_is_physically_bounded(rabi0, t2star, det):
    """Sanity/robustness gate, not an accuracy claim: the naive-envelope vs.
    true-Lindblad gap is real (see test below) but must stay within [0,1]
    (a population-probability sanity bound) -- catches solver blowups/NaNs,
    not approximation quality."""
    cf_p = cf.rabi_population(T_WINDOW, rabi0, det, t2star)
    qt_p = qt.rabi_dephased(T_WINDOW, rabi0, det, t2star)
    err = np.max(np.abs(cf_p - qt_p))
    assert np.isfinite(err)
    assert 0 <= err <= 1.0


def test_rabi_dephased_diverges_from_naive_envelope_at_app_defaults():
    """Regression guard for a real, documented physics gap (see module
    docstring, case 2): at the app's own default slider settings
    (rabi0=6MHz, T2*=2us, on resonance), the naive exp(-t/T2*) envelope
    and the true Lindblad solution disagree by close to half the
    population range within the visible 3us window. This asserts the gap
    stays large so the finding can't silently disappear (e.g. from an
    unnoticed convention change) without a test failure calling it out."""
    cf_p = cf.rabi_population(T_WINDOW, 6.0, 0.0, 2.0)
    qt_p = qt.rabi_dephased(T_WINDOW, 6.0, 0.0, 2.0)
    err = np.max(np.abs(cf_p - qt_p))
    assert err > 0.3, (
        f"expected the known naive-envelope/Lindblad gap at app defaults to exceed 0.3 "
        f"(measured {err:.3f}); if this shrank, the physics-gap finding in verify/README.md "
        f"needs re-checking, not just this threshold"
    )


# ---------------------------------------------------------------------------
# Case 3 & 4: Ramsey -- exact match expected both with and without dephasing
# (dephasing confined to the free-evolution window, matching the app).
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("det", [0, 1, 5, 20, 50, -30])
def test_ramsey_coherent_matches_qutip(det):
    cf_p = cf.ramsey_population(TAU_WINDOW, det)
    qt_p = qt.ramsey(TAU_WINDOW, det)
    assert np.max(np.abs(cf_p - qt_p)) < EXACT_TOL


@pytest.mark.parametrize("det", [0, 1, 5, 20, 50])
@pytest.mark.parametrize("t2star", [0.3, 1, 2, 4, 6])
def test_ramsey_dephased_matches_qutip(det, t2star):
    cf_p = cf.ramsey_population(TAU_WINDOW, det, t2star)
    qt_p = qt.ramsey(TAU_WINDOW, det, t2star)
    assert np.max(np.abs(cf_p - qt_p)) < EXACT_TOL


# ---------------------------------------------------------------------------
# Case 5: ODMR steady state
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("det", [0, 5, 20, 50])
@pytest.mark.parametrize("rabi0", [1, 6, 20])
def test_odmr_pure_dephasing_steady_state_is_exactly_mixed(det, rabi0):
    """Assumption-free: with ONLY the app's stated T2* channel (no T1), the
    Lindblad steady state is provably the maximally mixed state for any
    nonzero drive/detuning (Bloch matrix is full-rank, det=-Omega0^2/T2*!=0
    for Omega0!=0 -- see test_resonant_dephased_decay_rate_is_half_of_naive
    for the same matrix used differently). I.e. a CW ODMR dip fundamentally
    requires a population-relaxation channel this app's model doesn't
    define."""
    pop = qt.odmr_dark_population(det, rabi0, t2star_us=2.0, t1_us=None)
    assert abs(pop - 0.5) < 1e-6


def test_odmr_illustrative_t1_peak_is_at_zero_detuning():
    """With an ADDED, clearly-not-in-the-app T1 (illustrative only, standing
    in for the laser repumping the app's two-level model omits), the
    steady-state dip's peak lands exactly at zero detuning -- the one part
    of the ODMR formula that's pure Zeeman algebra, not a decoherence
    claim."""
    det_grid = np.linspace(-15, 15, 31)
    pop = np.array([qt.odmr_dark_population(d, 6.0, t2star_us=2.0, t1_us=100.0) for d in det_grid])
    assert abs(det_grid[np.argmax(pop)]) <= (det_grid[1]-det_grid[0])


def test_odmr_width_diverges_from_app_heuristic():
    """Regression guard: the app's ODMR width term (index_rabi.html:564,
    linear in rabi0) is a demo heuristic (README.md:90), not derived from
    this master equation. With an illustrative T1=100us, the true
    steady-state FWHM at rabi0=1MHz is already several times the app's
    heuristic width -- documenting that gap rather than asserting the
    heuristic is wrong (it was never meant to be a literal fit)."""
    det_grid = np.linspace(-20, 20, 41)
    pop = np.array([qt.odmr_dark_population(d, 1.0, t2star_us=2.0, t1_us=100.0) for d in det_grid])
    half = pop.max()/2
    above = np.where(pop >= half)[0]
    qutip_fwhm = det_grid[above[-1]] - det_grid[above[0]]
    app_fwhm = 2*(0.0016 + 1.0*0.00016)*1000  # GHz -> MHz, *2 since app's "width" is Lorentzian HWHM
    assert qutip_fwhm > 2*app_fwhm


# ---------------------------------------------------------------------------
# Source canary: pins literal snippets of the shipped JS formulas so an
# edit to the HTML math that isn't mirrored in closed_form.py fails loudly
# here instead of silently going stale.
# ---------------------------------------------------------------------------
RABI_HTML = (REPO_ROOT/"index_rabi.html").read_text()
RAMSEY_HTML = (REPO_ROOT/"index_ramsey.html").read_text()

CANARY_SNIPPETS = [
    (RABI_HTML, "Math.sqrt(O0*O0+dr*dr)"),
    (RABI_HTML, "(O0*O0)/(O0*O0+dr*dr)"),
    (RABI_HTML, "amp*0.5*(1-Math.cos(Oeff*tt))*Math.exp(-tt/S.t2)"),
    (RABI_HTML, "0.0016 + S.rabi0*0.00016"),
    (RABI_HTML, "contrast=0.62"),
    (RABI_HTML, "1-Math.min(0.62, L1+L2)"),
    (RAMSEY_HTML, "0.5*(1+Math.cos(d*tt))*Math.exp(-tt/S.t2)+0.5*(1-Math.exp(-tt/S.t2))"),
]


@pytest.mark.parametrize("html_text,snippet", CANARY_SNIPPETS, ids=[s for _, s in CANARY_SNIPPETS])
def test_source_canary(html_text, snippet):
    assert snippet in html_text, (
        f"Closed-form source line changed: {snippet!r} no longer found. "
        f"Update verify/closed_form.py (and re-run the QuTiP comparison) to match, "
        f"then update this canary string."
    )
