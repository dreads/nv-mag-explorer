"""QuTiP Lindblad master-equation ground truth for the two-level NV model
that index_rabi.html / index_ramsey.html claim closed-form solutions for.

Conventions (chosen to match the app's own Bloch-sphere sequencing, see
index_rabi.html drawBloch() / index_ramsey.html blochVec()):
  - |0> = basis(2,0), the +z pole ("m=0" bright state).
  - Rotating-frame drive Hamiltonian H = (delta/2)*sigmaz() + (Omega0/2)*sigmax(),
    delta/Omega0 in rad/us (MHz values are converted with TWO_PI).
  - Pure dephasing is the app's only stated decay channel (T2*; no T1 is
    ever defined). Collapse operator c = sqrt(gamma)*sigmaz() with
    gamma = 1/(2*T2*) -- this prefactor is what makes the coherence decay
    at rate exactly 1/T2*; verified numerically in
    test_physics.py::test_dephasing_convention.
  - Population reported as (1 - <sigmaz>)/2. For the Ramsey sequence this
    sign is what reproduces the app's own two-RY(pi/2) composition (see
    test_physics.py for the derivation/check).
"""
import numpy as np
from qutip import basis, sigmax, sigmay, sigmaz, sigmap, mesolve, steadystate

TWO_PI = 2*np.pi
OPTS = {"atol": 1e-12, "rtol": 1e-10, "nsteps": 100000}


def dephasing_c_ops(t2star_us):
    gamma = 1.0/(2*t2star_us)
    return [np.sqrt(gamma)*sigmaz()]


def rabi_unitary(t_us, rabi0_MHz, det_MHz):
    """Unitary (no decay) reference for the Rabi visualizer's coherent limit."""
    O0 = rabi0_MHz*TWO_PI
    dr = det_MHz*TWO_PI
    H = (dr/2)*sigmaz() + (O0/2)*sigmax()
    psi0 = basis(2, 0)
    res = mesolve(H, psi0, t_us, [], e_ops=[sigmaz()], options=OPTS)
    sz = np.array(res.expect[0])
    return (1-sz)/2


def rabi_dephased(t_us, rabi0_MHz, det_MHz, t2star_us):
    """Full Lindblad reference for continuous drive + continuous T2* dephasing
    -- the case the app approximates with a naive exp(-t/T2*) envelope."""
    O0 = rabi0_MHz*TWO_PI
    dr = det_MHz*TWO_PI
    H = (dr/2)*sigmaz() + (O0/2)*sigmax()
    psi0 = basis(2, 0)
    res = mesolve(H, psi0, t_us, dephasing_c_ops(t2star_us), e_ops=[sigmaz()], options=OPTS)
    sz = np.array(res.expect[0])
    return (1-sz)/2


def _ry(theta):
    """exp(-i*theta/2*sigmay): standard active Bloch-vector rotation about Y,
    (x,z) -> (x*cos+z*sin, -x*sin+z*cos) -- matches the JS RY(theta) used for
    both pi/2 pulses in blochVec()."""
    return (-1j*theta/2*sigmay()).expm()


def ramsey(tau_us, det_MHz, t2star_us=None):
    """Ideal instantaneous RY(pi/2) - free evolution (H=(delta/2)sz, dephasing
    only if t2star_us given) - RY(pi/2), matching index_ramsey.html's own
    idealization ('microwave OFF during tau', pulses treated as instant
    rotations elsewhere in blochVec()). tau_us must be an array."""
    d = det_MHz*TWO_PI
    U = _ry(np.pi/2)
    psi_eq = U*basis(2, 0)
    rho_eq = psi_eq*psi_eq.dag()
    H = (d/2)*sigmaz()
    c_ops = dephasing_c_ops(t2star_us) if t2star_us is not None else []
    tau_us = np.asarray(tau_us, dtype=float)
    out = np.zeros_like(tau_us)
    for i, tt in enumerate(tau_us):
        if tt == 0:
            rho_free = rho_eq
        else:
            res = mesolve(H, rho_eq, [0, tt], c_ops, options=OPTS)
            rho_free = res.states[-1]
        rho_f = U*rho_free*U.dag()
        sz = np.real((rho_f*sigmaz()).tr())
        out[i] = (1-sz)/2
    return out


def odmr_dark_population(det_MHz, rabi0_MHz, t2star_us, t1_us=None):
    """Steady-state dark-state population under CW drive.

    t1_us=None uses ONLY the app's own T2* dephasing channel (no population
    relaxation at all, since the app never defines one -- see
    index_ramsey.html footer: "T2* dephasing is the one open-system effect").
    This is a deliberate, exact, assumption-free check: for ANY nonzero
    Omega0 and ANY detuning, the unique steady state of (drive + pure
    dephasing, no T1) is the maximally mixed state (population = 0.5),
    provable directly from the Bloch-equation matrix having full rank
    (det = -Omega0^2/T2* != 0 for Omega0 != 0) -- i.e. a CW ODMR dip is
    fundamentally impossible without *some* population-relaxation channel.
    Real NV ODMR gets that channel from continuous laser repumping, which
    this app's two-level model doesn't include (README.md:90).

    t1_us, if given, is an ADDED modeling assumption (a sqrt(1/T1)*sigmap()
    collapse operator relaxing the dark state back to |0>, standing in for
    that repumping) not present anywhere in the app -- used only to produce
    an illustrative, comparable Lorentzian lineshape."""
    d = det_MHz*TWO_PI
    O0 = rabi0_MHz*TWO_PI
    H = (d/2)*sigmaz() + (O0/2)*sigmax()
    c_ops = dephasing_c_ops(t2star_us)
    if t1_us is not None:
        c_ops = c_ops + [np.sqrt(1.0/t1_us)*sigmap()]
    rho_ss = steadystate(H, c_ops)
    sz = np.real((rho_ss*sigmaz()).tr())
    return (1-sz)/2
