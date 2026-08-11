"""Generates verify/report.json: the numeric evidence behind the
closed-form-vs-QuTiP comparison (overlay curves + error grids), consumed
by the published summary artifact and uploaded as a CI build artifact.

Run: python verify/make_report.py
"""
import json
import time
from pathlib import Path

import numpy as np

import closed_form as cf
import qutip_reference as qt

OUT = Path(__file__).resolve().parent/"report.json"


def rabi_coherent_section():
    t = np.linspace(0, 3.0, 61)
    grid_err = []
    for rabi0 in [1, 6, 20]:
        for det in [0, 5, 20, 50, -30]:
            err = float(np.max(np.abs(cf.rabi_population(t, rabi0, det) - qt.rabi_unitary(t, rabi0, det))))
            grid_err.append({"rabi0_MHz": rabi0, "det_MHz": det, "max_abs_err": err})
    example = {"rabi0_MHz": 6, "det_MHz": 0}
    t_curve = np.linspace(0, 3.0, 121)
    return {
        "max_abs_err_over_grid": max(g["max_abs_err"] for g in grid_err),
        "grid": grid_err,
        "example_curve": {
            "t_us": t_curve.tolist(),
            "closed_form": cf.rabi_population(t_curve, **example).tolist(),
            "qutip": qt.rabi_unitary(t_curve, **example).tolist(),
            "params": example,
        },
    }


def rabi_dephased_section():
    t = np.linspace(0, 3.0, 61)
    grid_err = []
    for rabi0 in [1, 3, 6, 10, 20]:
        for t2s in [0.3, 1, 2, 4, 6]:
            for det in [0, 5, 15, 30, 50]:
                cf_p = cf.rabi_population(t, rabi0, det, t2s)
                qt_p = qt.rabi_dephased(t, rabi0, det, t2s)
                err = float(np.max(np.abs(cf_p-qt_p)))
                grid_err.append({"rabi0_MHz": rabi0, "t2star_us": t2s, "det_MHz": det, "max_abs_err": err})
    example = {"rabi0_MHz": 6, "det_MHz": 0, "t2star_us": 2}
    t_curve = np.linspace(0, 3.0, 121)
    steady_t = np.linspace(0, 10, 51)
    return {
        "max_abs_err_over_grid": max(g["max_abs_err"] for g in grid_err),
        "median_abs_err_over_grid": float(np.median([g["max_abs_err"] for g in grid_err])),
        "grid": grid_err,
        "resonant_decay_rate": {
            "naive_1_over_T2star": 1/2.0,
            "true_1_over_2T2star": 1/(2*2.0),
            "note": "eigenvalue of resonant Bloch matrix; see test_resonant_dephased_decay_rate_is_half_of_naive",
        },
        "example_curve": {
            "t_us": t_curve.tolist(),
            "closed_form": cf.rabi_population(t_curve, **example).tolist(),
            "qutip": qt.rabi_dephased(t_curve, **example).tolist(),
            "params": example,
        },
        "long_time_trend": {
            "t_us": steady_t.tolist(),
            "closed_form": cf.rabi_population(steady_t, **example).tolist(),
            "qutip": qt.rabi_dephased(steady_t, **example).tolist(),
            "note": "shows qutip trending toward the mixed steady state (~0.5) while the naive envelope decays to 0",
        },
    }


def ramsey_section():
    tau = np.linspace(0, 3.0, 51)
    coherent_err = []
    for det in [0, 1, 5, 20, 50, -30]:
        err = float(np.max(np.abs(cf.ramsey_population(tau, det) - qt.ramsey(tau, det))))
        coherent_err.append({"det_MHz": det, "max_abs_err": err})
    dephased_err = []
    for det in [0, 1, 5, 20, 50]:
        for t2s in [0.3, 1, 2, 4, 6]:
            cf_p = cf.ramsey_population(tau, det, t2s)
            qt_p = qt.ramsey(tau, det, t2s)
            err = float(np.max(np.abs(cf_p-qt_p)))
            dephased_err.append({"det_MHz": det, "t2star_us": t2s, "max_abs_err": err})
    example = {"det_MHz": 5, "t2star_us": 2}
    tau_curve = np.linspace(0, 3.0, 121)
    return {
        "coherent": {
            "max_abs_err_over_grid": max(g["max_abs_err"] for g in coherent_err),
            "grid": coherent_err,
        },
        "dephased": {
            "max_abs_err_over_grid": max(g["max_abs_err"] for g in dephased_err),
            "grid": dephased_err,
        },
        "example_curve": {
            "tau_us": tau_curve.tolist(),
            "closed_form": cf.ramsey_population(tau_curve, **example).tolist(),
            "qutip": qt.ramsey(tau_curve, **example).tolist(),
            "params": example,
        },
    }


def odmr_section():
    det = np.linspace(-20, 20, 41)
    pure_dephasing_pops = []
    for det_v in [0, 5, 20, 50]:
        for rabi0 in [1, 6, 20]:
            pop = qt.odmr_dark_population(det_v, rabi0, t2star_us=2.0, t1_us=None)
            pure_dephasing_pops.append({"det_MHz": det_v, "rabi0_MHz": rabi0, "dark_pop": pop})

    t1_us = 100.0
    illustrative = []
    for rabi0 in [1, 3, 6, 10, 15, 20]:
        det_wide = np.linspace(-60, 60, 61)
        pop = np.array([qt.odmr_dark_population(d, rabi0, t2star_us=2.0, t1_us=t1_us) for d in det_wide])
        half = pop.max()/2
        above = np.where(pop >= half)[0]
        fwhm = float(det_wide[above[-1]] - det_wide[above[0]]) if len(above) >= 2 else None
        app_width = 0.0016 + rabi0*0.00016  # GHz
        app_fwhm = 2*app_width*1000  # MHz
        illustrative.append({
            "rabi0_MHz": rabi0, "peak_dark_pop": float(pop.max()),
            "qutip_fwhm_MHz": fwhm, "app_fwhm_MHz": app_fwhm,
        })

    example_rabi0 = 6.0
    det_curve = np.linspace(-20, 20, 81)
    qutip_curve = [qt.odmr_dark_population(d, example_rabi0, t2star_us=2.0, t1_us=t1_us) for d in det_curve]
    # single-dip reduction of the app's own heuristic (index_rabi.html:562-574),
    # evaluated as a "dip" (1-fluorescence) so it's on the same 0..1 population-like axis
    app_width_mhz = (0.0016 + example_rabi0*0.00016)*1000
    app_curve = (0.62/(1+(det_curve/app_width_mhz)**2)).tolist()

    return {
        "pure_dephasing_no_t1": {
            "pops": pure_dephasing_pops,
            "note": "exactly 0.5 for all params -- see test_odmr_pure_dephasing_steady_state_is_exactly_mixed",
        },
        "illustrative_t1_us": t1_us,
        "illustrative_linewidth_scaling": illustrative,
        "example_curve": {
            "det_MHz": det_curve.tolist(),
            "qutip_dark_pop": qutip_curve,
            "app_heuristic_dip": app_curve,
            "params": {"rabi0_MHz": example_rabi0, "t2star_us": 2.0, "t1_us": t1_us},
        },
    }


def main():
    t0 = time.time()
    report = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "rabi_coherent": rabi_coherent_section(),
        "rabi_dephased": rabi_dephased_section(),
        "ramsey": ramsey_section(),
        "odmr": odmr_section(),
    }
    OUT.write_text(json.dumps(report, indent=2))
    print(f"wrote {OUT} in {time.time()-t0:.1f}s")


if __name__ == "__main__":
    main()
