"""Pure-Python transcription of the closed-form quantum formulas used in
index_rabi.html and index_ramsey.html.

Each function's docstring names the exact source line(s) it mirrors, so
drift between the shipped JS and this port is easy to spot on review.
test_physics.py additionally pins literal snippets of the JS as a
"canary" (test_source_canary) so an edit to the HTML math that isn't
mirrored here fails CI loudly instead of silently going stale.
"""
import numpy as np

TWO_PI = 2*np.pi


def rabi_population(t_us, rabi0_MHz, det_MHz, t2star_us=None):
    """Mirrors index_rabi.html drawRabi() (~line 397-421):
        const O0 = S.rabi0*TWO_PI;                // rad/us
        const dr = det*TWO_PI;                    // rad/us
        const Oeff = Math.sqrt(O0*O0+dr*dr);
        const amp = (O0*O0)/(O0*O0+dr*dr);
        P = amp*0.5*(1-Math.cos(Oeff*tt))*Math.exp(-tt/S.t2)

    t2star_us=None reproduces the undamped/on-resonance-reference case
    (T2* -> infinity).
    """
    O0 = rabi0_MHz*TWO_PI
    dr = det_MHz*TWO_PI
    Oeff2 = O0*O0 + dr*dr
    Oeff = np.sqrt(Oeff2)
    amp = (O0*O0)/Oeff2 if Oeff2 > 0 else 0.0  # rabi0=det=0 is the only zero case; excluded from all test grids
    P = amp*0.5*(1-np.cos(Oeff*t_us))
    if t2star_us is not None:
        P = P*np.exp(-t_us/t2star_us)
    return P


def ramsey_population(tau_us, det_MHz, t2star_us=None):
    """Mirrors index_ramsey.html drawFringe() (~line 392):
        const P=0.5*(1+Math.cos(d*tt))*Math.exp(-tt/S.t2)
               +0.5*(1-Math.exp(-tt/S.t2));
    where d = TWO_PI*det_MHz (rad/us, see detuning()).
    t2star_us=None gives the pure-coherent limit (T2* -> infinity), which
    algebraically reduces the two-term blend to 0.5*(1+cos(d*tau)).
    """
    d = det_MHz*TWO_PI
    if t2star_us is None:
        return 0.5*(1+np.cos(d*tau_us))
    return (0.5*(1+np.cos(d*tau_us))*np.exp(-tau_us/t2star_us)
            + 0.5*(1-np.exp(-tau_us/t2star_us)))


def odmr_fluorescence(f_GHz, fp_GHz, fm_GHz, rabi0_MHz):
    """Mirrors index_rabi.html drawODMR() (~line 562-574): a hand-tuned demo
    heuristic (fixed 0.62 contrast, linear-in-rabi0 power-broadening term),
    NOT derived from any rate/master equation -- see README.md:90 ("no
    explicit laser-pumping rate equations"). Included for comparison against
    the physical steady-state lineshape, not as an "exact match" claim.
    """
    width = 0.0016 + rabi0_MHz*0.00016  # GHz
    contrast = 0.62
    L1 = contrast/(1+((f_GHz-fp_GHz)/width)**2)
    L2 = contrast/(1+((f_GHz-fm_GHz)/width)**2)
    return 1 - np.minimum(0.62, L1+L2)
