// ──────────────────────────────────────────────────────────────────────
// psy-widget.js — Define-by widget helpers for psychrometric tools.
//
// Three psych tools (psychrometric-chart, air-mixing, economizer-ratio)
// each surface the same "Define by RH / WB / DP / W / H" widget: a
// select that picks the second-property mode, plus a number input
// whose label and step depend on the active mode + unit system, plus
// a small converter that takes the display-units value and returns
// the canonical-US-units value Psychro.solveState expects.
//
// API (classic-script globals on window.PsyWidget):
//
//   PsyWidget.buildSecondProp()
//       Returns { rh, wb, dp, w, h } — per-mode { label, step }
//       catalog keyed by mode code. Labels include the active unit
//       suffix from window.Units; call this on initial paint AND
//       from each unitschange listener so labels and input steps
//       track the toggle. Pages can extend each entry with
//       page-local fields (defaults, formatters) by spreading the
//       returned object — psychrometric-chart does this.
//
//   PsyWidget.secondToCanonical(mode, value)
//       Converts the user's display-unit second-value input to
//       canonical IP (°F / gr/lb / Btu/lb / %) so the value can
//       pass straight to Psychro.solveState's `second` argument.
//       Returns the value unchanged when it's not finite —
//       validate-and-mute on the caller side stays the source of
//       truth for non-numeric input. The 'w' branch returns gr/lb
//       (NOT lb/lb); Psychro.solveState's 'w' branch divides by
//       GR_PER_LB internally.
//
// Loaded as a *classic* script (no type="module") for the same
// reason as pid-engine.js / psychro-engine.js: each page's logic
// lives in an IIFE-wrapped inline script, and an IIFE can't see
// ES-module exports without a bundler. The 11ty build templates
// the HTML chrome and copies this file through unchanged.
//
// No DOM access here — pages own their own id-prefix-aware wiring
// (refreshSecondLabel, mode-change handlers). Pages must load
// /scripts/units.js before this file so window.Units is reachable.
// ──────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    function buildSecondProp() {
        const U = window.Units;
        const u = U.current();
        return {
            rh: { label: 'Relative humidity (%)',                          step: 1 },
            wb: { label: `Wet-bulb (${U.suffix.temp()})`,                  step: u === 'us' ? 0.5 : 0.25 },
            dp: { label: `Dew point (${U.suffix.temp()})`,                 step: u === 'us' ? 0.5 : 0.25 },
            w:  { label: `Humidity ratio (${U.suffix.humidityRatio()})`,   step: u === 'us' ? 1   : 0.1  },
            h:  { label: `Enthalpy (${U.suffix.enthalpy()} dry air)`,      step: 0.5 },
        };
    }

    function secondToCanonical(mode, value) {
        if (!isFinite(value)) return value;
        const U = window.Units;
        switch (mode) {
            case 'rh': return value;
            case 'wb':
            case 'dp': return U.toCanonical.temp(value);
            case 'w':  return U.toCanonical.humidityRatio(value);
            case 'h':  return U.toCanonical.enthalpy(value);
            default:   return value;
        }
    }

    window.PsyWidget = { buildSecondProp, secondToCanonical };
})();
