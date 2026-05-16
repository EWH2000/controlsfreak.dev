// Site-wide unit system. Two states: 'us' (default) and 'metric'.
// Persists across visits via localStorage; first visit defaults to US.
//
// Internal canonical values across tools are stored in US units; this script
// converts at the display boundary. The ASHRAE psychrometric equations are
// IP-native, the pump-control widgets were drafted in GPM/ft head, etc — so
// keeping the math layer in US and converting on the way out avoids a rewrite.
//
// Public API (window.Units):
//   current()                              → 'us' | 'metric'
//   set(units)                             → updates state, persists, broadcasts
//   onChange(cb)                           → subscribe to changes
//   suffix.<quantity>()                    → unit-suffix string for labels
//   display.<quantity>(usValue)            → number in display units
//   toCanonical.<quantity>(displayValue)   → number in canonical US units
//   applyToDOM(root)                       → walk a subtree for prose spans
//
// DOM convention for prose: <span data-us="100 GPM" data-metric="6.3 L/s">.
// The walker swaps textContent based on the current state.
//
// Custom event: 'unitschange' on document, detail = { units }.

(function () {
    'use strict';

    var STORAGE_KEY = 'cf_units';

    function load() {
        try {
            var v = localStorage.getItem(STORAGE_KEY);
            return v === 'metric' ? 'metric' : 'us';
        } catch (e) {
            return 'us';
        }
    }

    function save(u) {
        try { localStorage.setItem(STORAGE_KEY, u); } catch (e) { /* private mode etc. */ }
    }

    var units = load();

    // ── Conversion primitives ──────────────────────────────────────────
    // Constants chosen to match common ASHRAE / NIST tables to the displayed
    // precision; absolute conversion factors are documented inline.

    var F2C    = function (f)  { return (f - 32) * 5 / 9; };
    var C2F    = function (c)  { return c * 9 / 5 + 32; };
    var dF2dC  = function (df) { return df * 5 / 9; };          // delta (no offset)
    var dC2dF  = function (dc) { return dc * 9 / 5; };

    // Humidity ratio. 7000 gr water per lb water, 1000 g per kg — so the ratio
    // of mass-ratios is 1000/7000 ≈ 0.1429 g/kg per gr/lb.
    var grPerLb_to_gPerKg = function (w) { return w * (1000 / 7000); };
    var gPerKg_to_grPerLb = function (w) { return w * 7; };

    var btuPerLb_to_kJPerKg = function (h) { return h * 2.326; };
    var kJPerKg_to_btuPerLb = function (h) { return h / 2.326; };

    var ft3PerLb_to_m3PerKg = function (v) { return v * 0.0624280; };
    var m3PerKg_to_ft3PerLb = function (v) { return v / 0.0624280; };

    var psia_to_kPa = function (p) { return p * 6.89475729; };
    var kPa_to_psia = function (p) { return p / 6.89475729; };

    var ft_to_m = function (x) { return x * 0.3048; };
    var m_to_ft = function (x) { return x / 0.3048; };

    // Airflow — user picked m³/h over L/s (closer to European AHU specs).
    // 1 CFM = 0.471948 L/s = 1.699011 m³/h.
    var cfm_to_m3PerH = function (q) { return q * 1.699010796; };
    var m3PerH_to_cfm = function (q) { return q / 1.699010796; };

    // Water flow — US gallons. 1 GPM = 3.78541 L/min = 0.0630902 L/s.
    var gpm_to_LPerS = function (q) { return q * 0.0630902; };
    var LPerS_to_gpm = function (q) { return q / 0.0630902; };

    // Pump head — user picked m of water (matches EU field practice).
    // Head is a length, so it's the straight ft↔m conversion.
    var ftHead_to_mHead = ft_to_m;
    var mHead_to_ftHead = m_to_ft;

    // Heat capacity. 1 MBH = 1000 BTU/hr; 1 BTU/hr = 0.293071 W.
    var mbh_to_kW = function (q) { return q * 0.293071; };
    var kW_to_mbh = function (q) { return q / 0.293071; };

    // Small static pressure (fast-loop / duct work). 1 in. w.c. = 248.84 Pa.
    var inWC_to_Pa = function (p) { return p * 248.84; };
    var Pa_to_inWC = function (p) { return p / 248.84; };

    var isUS = function () { return units === 'us'; };

    // ── Suffix labels (drive rebuilds of page labels) ──────────────────
    var suffix = {
        temp:           function () { return isUS() ? '°F'   : '°C'; },
        deltaTemp:      function () { return isUS() ? '°F'   : '°C'; },
        humidityRatio:  function () { return isUS() ? 'gr/lb'    : 'g/kg'; },
        enthalpy:       function () { return isUS() ? 'Btu/lb'   : 'kJ/kg'; },
        specificVolume: function () { return isUS() ? 'ft³/lb' : 'm³/kg'; },
        pressure:       function () { return isUS() ? 'psia'     : 'kPa'; },
        altitude:       function () { return isUS() ? 'ft'       : 'm'; },
        airflow:        function () { return isUS() ? 'CFM'      : 'm³/h'; },
        waterFlow:      function () { return isUS() ? 'GPM'      : 'L/s'; },
        pumpHead:       function () { return isUS() ? 'ft'       : 'm'; },
        heatCapacity:   function () { return isUS() ? 'MBH'      : 'kW'; },
        staticPressure: function () { return isUS() ? 'in. w.c.' : 'Pa'; }
    };

    // ── Display conversion (canonical US → display value) ──────────────
    var display = {
        temp:           function (f)  { return isUS() ? f  : F2C(f); },
        deltaTemp:      function (df) { return isUS() ? df : dF2dC(df); },
        humidityRatio:  function (w)  { return isUS() ? w  : grPerLb_to_gPerKg(w); },
        enthalpy:       function (h)  { return isUS() ? h  : btuPerLb_to_kJPerKg(h); },
        specificVolume: function (v)  { return isUS() ? v  : ft3PerLb_to_m3PerKg(v); },
        pressure:       function (p)  { return isUS() ? p  : psia_to_kPa(p); },
        altitude:       function (a)  { return isUS() ? a  : ft_to_m(a); },
        airflow:        function (q)  { return isUS() ? q  : cfm_to_m3PerH(q); },
        waterFlow:      function (q)  { return isUS() ? q  : gpm_to_LPerS(q); },
        pumpHead:       function (h)  { return isUS() ? h  : ftHead_to_mHead(h); },
        heatCapacity:   function (q)  { return isUS() ? q  : mbh_to_kW(q); },
        staticPressure: function (p)  { return isUS() ? p  : inWC_to_Pa(p); }
    };

    // Per-quantity conversion functions, keyed for the convert() helper below.
    // Each entry is { toCanonical: fn(metricValue) → US, fromCanonical: fn(usValue) → metric }.
    var Q = {
        temp:           { toCanonical: C2F,                     fromCanonical: F2C },
        deltaTemp:      { toCanonical: dC2dF,                   fromCanonical: dF2dC },
        humidityRatio:  { toCanonical: gPerKg_to_grPerLb,       fromCanonical: grPerLb_to_gPerKg },
        enthalpy:       { toCanonical: kJPerKg_to_btuPerLb,     fromCanonical: btuPerLb_to_kJPerKg },
        specificVolume: { toCanonical: m3PerKg_to_ft3PerLb,     fromCanonical: ft3PerLb_to_m3PerKg },
        pressure:       { toCanonical: kPa_to_psia,             fromCanonical: psia_to_kPa },
        altitude:       { toCanonical: m_to_ft,                 fromCanonical: ft_to_m },
        airflow:        { toCanonical: m3PerH_to_cfm,           fromCanonical: cfm_to_m3PerH },
        waterFlow:      { toCanonical: LPerS_to_gpm,            fromCanonical: gpm_to_LPerS },
        pumpHead:       { toCanonical: mHead_to_ftHead,         fromCanonical: ftHead_to_mHead },
        heatCapacity:   { toCanonical: kW_to_mbh,               fromCanonical: mbh_to_kW },
        staticPressure: { toCanonical: Pa_to_inWC,              fromCanonical: inWC_to_Pa }
    };

    // Direct conversion between unit systems for a single quantity. Useful when
    // responding to a 'unitschange' event and you need to rewrite an input
    // field's text from the old display value to the new display value.
    function convert(value, fromUnits, toUnits, quantity) {
        if (!isFinite(value) || fromUnits === toUnits) return value;
        var q = Q[quantity];
        if (!q) return value;
        var canonical = (fromUnits === 'us') ? value : q.toCanonical(value);
        return (toUnits === 'us') ? canonical : q.fromCanonical(canonical);
    }

    // ── Canonicalization (display input → canonical US value) ──────────
    var toCanonical = {
        temp:           function (x) { return isUS() ? x : C2F(x); },
        deltaTemp:      function (x) { return isUS() ? x : dC2dF(x); },
        humidityRatio:  function (x) { return isUS() ? x : gPerKg_to_grPerLb(x); },
        enthalpy:       function (x) { return isUS() ? x : kJPerKg_to_btuPerLb(x); },
        specificVolume: function (x) { return isUS() ? x : m3PerKg_to_ft3PerLb(x); },
        pressure:       function (x) { return isUS() ? x : kPa_to_psia(x); },
        altitude:       function (x) { return isUS() ? x : m_to_ft(x); },
        airflow:        function (x) { return isUS() ? x : m3PerH_to_cfm(x); },
        waterFlow:      function (x) { return isUS() ? x : LPerS_to_gpm(x); },
        pumpHead:       function (x) { return isUS() ? x : mHead_to_ftHead(x); },
        heatCapacity:   function (x) { return isUS() ? x : kW_to_mbh(x); },
        staticPressure: function (x) { return isUS() ? x : Pa_to_inWC(x); }
    };

    // ── DOM walker for static prose ────────────────────────────────────
    // <span data-us="100 GPM" data-metric="6.3 L/s">100 GPM</span>
    function applyToDOM(root) {
        var r = root || document.body;
        if (!r) return;
        var nodes = r.querySelectorAll('[data-us][data-metric]');
        for (var i = 0; i < nodes.length; i++) {
            nodes[i].textContent = nodes[i].dataset[units];
        }
    }

    // ── Toggle UI ──────────────────────────────────────────────────────
    function syncToggleAria() {
        var btns = document.querySelectorAll('.units-btn[data-units]');
        for (var i = 0; i < btns.length; i++) {
            btns[i].setAttribute('aria-pressed', btns[i].dataset.units === units ? 'true' : 'false');
        }
    }

    function wireToggle() {
        var btns = document.querySelectorAll('.units-btn[data-units]');
        for (var i = 0; i < btns.length; i++) {
            (function (btn) {
                btn.addEventListener('click', function () { setUnits(btn.dataset.units); });
            })(btns[i]);
        }
        syncToggleAria();
    }

    function setUnits(newUnits) {
        if (newUnits !== 'us' && newUnits !== 'metric') return;
        if (newUnits === units) return;
        var previous = units;
        units = newUnits;
        save(units);
        document.documentElement.dataset.units = units;
        syncToggleAria();
        applyToDOM();
        document.dispatchEvent(new CustomEvent('unitschange', {
            detail: { units: units, previous: previous }
        }));
    }

    function onChange(cb) {
        document.addEventListener('unitschange', function (e) { cb(e.detail.units); });
    }

    // Sync the <html data-units> attribute. A tiny inline script in <head>
    // sets this before first paint to avoid flashing the wrong toggle state;
    // we re-sync here so the page is correct even if that script is absent.
    if (document.documentElement.dataset.units !== units) {
        document.documentElement.dataset.units = units;
    }

    function onReady() {
        wireToggle();
        applyToDOM();
    }
    // The script tag is placed near the end of <body> on every page, so
    // document.body is normally already parsed by the time we run; calling
    // onReady() immediately walks the in-main prose before first paint and
    // avoids a US→metric flash for returning metric visitors. The
    // DOMContentLoaded path is a safety net for the case where this script
    // is later moved into <head>.
    if (document.body) {
        onReady();
    } else {
        document.addEventListener('DOMContentLoaded', onReady);
    }

    window.Units = {
        current: function () { return units; },
        set: setUnits,
        onChange: onChange,
        suffix: suffix,
        display: display,
        toCanonical: toCanonical,
        convert: convert,
        applyToDOM: applyToDOM
    };
})();
