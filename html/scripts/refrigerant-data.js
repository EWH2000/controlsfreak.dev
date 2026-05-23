// ──────────────────────────────────────────────────────────────────────
// refrigerant-data.js — saturation P-T tables for /tools/refrigerant-pt.html
//
// Loaded as a *classic* script (no type="module"), same pattern as
// /scripts/thermistor-data.js and /scripts/pid-engine.js: it exposes one
// global, REFRIGERANT_TYPES, so the page's IIFE-wrapped inline <script> can
// reach it by name. Load it with
//
//     <script src="/scripts/refrigerant-data.js"></script>
//
// before the page's own inline <script>. The 11ty build templates the HTML
// chrome and copies this file through unchanged; the browser loads it
// directly, nothing transpiles or bundles.
//
// ──────────────────────────────────────────────────────────────────────
// DATA PROVENANCE — READ BEFORE TRUSTING ANY NUMBER HERE
//
// Unlike thermistor-data.js (which *generates* its tables from a curve
// model), every row below is *transcribed* from a published manufacturer
// pressure-temperature chart. The page interpolates linearly between rows,
// exactly as a tech reads between the lines of the paper chart. The thing
// to audit is therefore the transcription — proofread each table against
// its source PDF — not a model.
//
// All pressures are GAUGE (psig), matching manifold gauges and the source
// charts. All temperatures are °F. For a glide blend the saturation curve
// splits in two: the BUBBLE point (saturated liquid, used for subcooling)
// and the DEW point (saturated vapor, used for superheat). Pure and
// near-azeotropic refrigerants have bubble ≈ dew.
//
// Per-refrigerant source + confidence:
//   r410a  HIGH  iGas "R410A Pressure-Temperature Chart" (Liquid/Vapor
//                columns, −49…150 °F). Near-azeotropic — ~0.2 °F glide.
//                Transcribed at 5 °F steps.
//   r22    HIGH  Honeywell "PT Charts for A/C and Refrigeration",
//                G525-710, Aug 2017 — Genetron 22. Single component,
//                zero glide.
//   r134a  HIGH  Honeywell G525-710 — Genetron 134a. Single component,
//                zero glide.
//   r407c  HIGH  Honeywell G525-710 (A/C page) — Genetron 407C.
//                Zeotropic blend, large glide (~8–13 °F).
//   r404a  HIGH  Honeywell G525-710 — Genetron 404A. Near-azeotropic
//                blend, small glide (~1 °F).
//   r454b  HIGH  Honeywell "PT Chart Solstice 454B", TCS-24-09-EN,
//                May 2024. Zeotropic blend, small glide (~2 °F).
//
// REFRIGERANT_TYPES = {
//   <id>: {
//     name:    short label for the dropdown,
//     safety:  ASHRAE 34 safety class (A1, A2L, …) — shown in the About card,
//     blend:   ASHRAE classification — true for any zeotropic or near-
//              azeotropic blend, false only for a single component. Drives
//              a note only; the page always shows bubble+dew. Note that a
//              near-azeotropic blend with ≤ 1 °F glide behaves effectively
//              pure for superheat/subcooling math — that practical
//              distinction lives in `glide`, not `blend`.
//     glide:   nominal temperature glide in °F (display/About only; also
//              the practical "is this a glide blend?" filter — `blend`
//              alone doesn't tell you whether the glide matters in the
//              field),
//     note:    one-line field context,
//     ref:     the source-chart citation,
//     bubble:  [[psig, °F], ...] — saturated-liquid curve, ascending by psig,
//     dew:     [[psig, °F], ...] — saturated-vapor curve, ascending by psig,
//   }
// }
// The bubble/dew arrays are NORMALIZED at load time from the raw transcribed
// `table` in each entry (see the `index` field + normalize() below), so the
// raw block stays a faithful row-for-row copy of the source PDF.
// ──────────────────────────────────────────────────────────────────────

'use strict';

const REFRIGERANT_TYPES = (function () {

    // Raw transcribed tables. `index` says how to read each row:
    //   'pressure' → [psig, bubble °F, dew °F]   (dew omitted ⇒ single component)
    //   'temp'     → [°F, bubble psig, dew psig]
    const RAW = {

        // ── R-410A — iGas R410A P-T Chart (temp-indexed, Liquid/Vapor psig) ──
        'r410a': {
            name: 'R-410A', safety: 'A1', blend: true, glide: 0.2,
            note: 'The dominant refrigerant in commercial RTUs and splits. Near-azeotropic — bubble and dew sit ~0.2 °F apart, so it behaves like a pure refrigerant.',
            ref: 'iGas R410A Pressure-Temperature Chart',
            index: 'temp',
            table: [
                [-45, 7.7, 7.6], [-40, 10.8, 10.7], [-35, 14.1, 14.0],
                [-30, 17.8, 17.7], [-25, 21.9, 21.8], [-20, 26.3, 26.2],
                [-15, 31.2, 31.0], [-10, 36.5, 36.3], [-5, 42.2, 42.0],
                [0, 48.4, 48.2], [5, 55.2, 54.9], [10, 62.4, 62.2],
                [15, 70.3, 70.0], [20, 78.7, 78.4], [25, 87.7, 87.4],
                [30, 97.4, 97.0], [35, 107.7, 107.3], [40, 118.8, 118.4],
                [45, 130.6, 130.1], [50, 143.2, 142.6], [55, 156.5, 156.0],
                [60, 170.7, 170.1], [65, 185.8, 185.2], [70, 201.8, 201.1],
                [75, 218.7, 217.9], [80, 236.5, 235.8], [85, 255.4, 254.6],
                [90, 275.4, 274.5], [95, 296.4, 295.5], [100, 318.6, 317.6],
                [105, 341.9, 340.9], [110, 366.4, 365.4], [115, 392.3, 391.2],
                [120, 419.4, 418.3], [125, 447.9, 446.8], [130, 477.9, 476.8],
                [135, 509.4, 508.3], [140, 542.5, 541.4], [145, 577.3, 576.3],
                [150, 613.9, 613.0],
            ],
        },

        // ── R-22 — Honeywell G525-710, Genetron 22 (single component) ──
        'r22': {
            name: 'R-22', safety: 'A1', blend: false, glide: 0,
            note: 'Legacy HCFC, phased out of new equipment but still everywhere in retrofit and service work. Single component — one saturation temperature at each pressure.',
            ref: 'Honeywell PT Charts G525-710 (Genetron 22)',
            index: 'pressure',
            table: [
                [0, -41.5], [1, -38.9], [2, -36.5], [3, -34.2], [4, -32.0],
                [5, -29.9], [6, -27.8], [7, -25.9], [8, -24.0], [9, -22.1],
                [10, -20.4], [11, -18.7], [12, -17.0], [13, -15.4], [14, -13.8],
                [16, -10.8], [18, -7.9], [20, -5.2], [22, -2.6], [24, 0.0],
                [26, 2.4], [28, 4.7], [29, 5.8], [31, 8.0], [34, 11.2],
                [37, 14.2], [40, 17.1], [43, 19.9], [46, 22.6], [49, 25.2],
                [52, 27.6], [55, 30.0], [59, 33.1], [63, 36.1], [67, 38.9],
                [83, 49.4], [101, 59.7], [121, 69.8], [142, 79.3], [154, 84.3],
                [167, 89.5], [181, 94.7], [196, 100.0], [212, 105.4], [229, 110.8],
                [246, 116.0], [264, 121.1], [284, 126.6], [304, 131.8], [325, 137.0],
                [348, 142.5], [349, 142.7], [372, 147.9], [397, 153.3], [423, 158.6],
                [450, 163.9],
            ],
        },

        // ── R-134a — Honeywell G525-710, Genetron 134a (single component) ──
        'r134a': {
            name: 'R-134a', safety: 'A1', blend: false, glide: 0,
            note: 'Single-component HFC, common in centrifugal chillers and medium-temperature work. One saturation temperature at each pressure.',
            ref: 'Honeywell PT Charts G525-710 (Genetron 134a)',
            index: 'pressure',
            table: [
                [0, -14.9], [5, -3.1], [10, 6.7], [15, 14.9], [20, 22.2],
                [22, 24.9], [24, 27.4], [26, 29.9], [28, 32.3], [30, 34.6],
                [32, 36.8], [34, 38.9], [36, 41.0], [38, 43.0], [40, 45.0],
                [42, 46.9], [44, 48.7], [46, 50.5], [48, 52.3], [50, 54.0],
                [55, 58.1], [60, 62.0], [70, 69.2], [80, 75.9], [90, 82.0],
                [100, 87.7], [105, 90.4], [110, 93.0], [115, 95.5], [120, 98.0],
                [125, 100.4], [130, 102.7], [135, 105.0], [140, 107.2], [145, 109.4],
                [150, 111.5], [155, 113.6], [160, 115.6], [165, 117.6], [170, 119.6],
                [175, 121.5], [180, 123.3], [185, 125.2], [190, 127.0], [195, 128.7],
                [200, 130.4], [205, 132.1], [210, 133.8], [215, 135.5], [220, 137.1],
                [230, 140.2], [240, 143.3], [250, 146.3], [260, 149.2], [270, 152.0],
                [280, 154.7],
            ],
        },

        // ── R-407C — Honeywell G525-710 A/C page, Genetron 407C (zeotropic) ──
        'r407c': {
            name: 'R-407C', safety: 'A1', blend: true, glide: 10,
            note: 'Zeotropic R-22-replacement blend with large glide — bubble and dew sit ~8–13 °F apart, so superheat and subcooling must reference different temperatures. Charge as a liquid.',
            ref: 'Honeywell PT Charts G525-710 (Genetron 407C)',
            index: 'pressure',
            table: [
                [0, -46.5, -33.9], [10, -26.0, -13.8], [20, -11.2, 0.7],
                [30, 0.6, 12.3], [40, 10.4, 21.9], [45, 14.9, 26.3],
                [50, 19.0, 30.3], [55, 22.9, 34.2], [60, 26.7, 37.8],
                [65, 30.2, 41.3], [70, 33.6, 44.5], [75, 36.8, 47.7],
                [80, 39.9, 50.7], [85, 42.8, 53.6], [90, 45.7, 56.4],
                [95, 48.4, 59.1], [100, 51.1, 61.6], [105, 53.7, 64.2],
                [110, 56.2, 66.6], [120, 61.0, 71.2], [130, 65.5, 75.6],
                [140, 69.8, 79.8], [150, 73.9, 83.8], [160, 77.8, 87.6],
                [170, 81.5, 91.2], [180, 85.2, 94.7], [185, 86.9, 96.4],
                [190, 88.6, 98.0], [195, 90.3, 99.6], [200, 92.0, 101.2],
                [205, 93.6, 102.8], [210, 95.2, 104.4], [215, 96.8, 105.9],
                [220, 98.3, 107.4], [225, 99.9, 108.8], [230, 101.4, 110.3],
                [235, 102.8, 111.7], [240, 104.3, 113.1], [245, 105.7, 114.5],
                [250, 107.2, 115.8], [255, 108.6, 117.2], [260, 109.9, 118.5],
                [265, 111.3, 119.8], [270, 112.6, 121.1], [275, 114.0, 122.4],
                [280, 115.3, 123.6], [285, 116.6, 124.8], [290, 117.8, 126.1],
                [295, 119.1, 127.3], [300, 120.4, 128.4], [305, 121.6, 129.6],
                [310, 122.8, 130.8], [315, 124.0, 131.9], [320, 125.2, 133.1],
                [325, 126.4, 134.2], [330, 127.5, 135.3], [335, 128.7, 136.4],
                [345, 131.0, 138.5], [355, 133.2, 140.6], [365, 135.4, 142.7],
                [375, 137.5, 144.7], [385, 139.6, 146.7], [395, 141.7, 148.6],
                [405, 143.7, 150.5], [415, 145.7, 152.3], [425, 147.6, 154.1],
            ],
        },

        // ── R-404A — Honeywell G525-710, Genetron 404A (near-azeotropic) ──
        'r404a': {
            name: 'R-404A', safety: 'A1', blend: true, glide: 1,
            note: 'Near-azeotropic HFC blend for low- and medium-temperature refrigeration. Small glide (~1 °F) — bubble and dew sit close together.',
            ref: 'Honeywell PT Charts G525-710 (Genetron 404A)',
            index: 'pressure',
            table: [
                [0, -51.2, -49.9], [1, -48.7, -47.4], [2, -46.3, -45.0],
                [3, -44.1, -42.8], [4, -41.9, -40.6], [5, -39.9, -38.6],
                [6, -37.9, -36.6], [7, -35.9, -34.7], [8, -34.1, -32.8],
                [9, -32.3, -31.1], [10, -30.6, -29.3], [11, -28.9, -27.7],
                [12, -27.3, -26.1], [13, -25.7, -24.5], [14, -24.1, -23.0],
                [16, -21.2, -20.0], [18, -18.4, -17.2], [20, -15.7, -14.6],
                [22, -13.1, -12.0], [24, -10.7, -9.6], [26, -8.3, -7.2],
                [28, -6.0, -4.9], [29, -4.9, -3.8], [31, -2.8, -1.7],
                [34, 0.4, 1.4], [37, 3.3, 4.4], [40, 6.2, 7.2],
                [43, 8.9, 9.9], [46, 11.5, 12.5], [49, 14.0, 15.0],
                [52, 16.4, 17.4], [55, 18.8, 19.8], [59, 21.8, 22.8],
                [63, 24.7, 25.7], [67, 27.5, 28.4], [83, 37.7, 38.6],
                [101, 47.8, 48.6], [121, 57.7, 58.5], [142, 67.0, 67.8],
                [154, 71.9, 72.6], [167, 76.9, 77.6], [181, 82.0, 82.7],
                [196, 87.2, 87.9], [212, 92.4, 93.1], [229, 97.7, 98.3],
                [246, 102.7, 103.3], [264, 107.7, 108.3], [284, 113.0, 113.6],
                [304, 118.0, 118.6], [325, 123.1, 123.6], [348, 128.3, 128.8],
                [349, 128.5, 129.0], [372, 133.5, 134.0], [397, 138.7, 139.1],
                [423, 143.8, 144.1], [450, 148.8, 149.1],
            ],
        },

        // ── R-454B — Honeywell TCS-24-09-EN, Solstice 454B (zeotropic A2L) ──
        'r454b': {
            name: 'R-454B', safety: 'A2L', blend: true, glide: 2,
            note: 'A2L (mildly flammable) blend, the leading R-410A replacement in new equipment. Small glide (~2 °F). Charge as a liquid.',
            ref: 'Honeywell PT Chart Solstice 454B, TCS-24-09-EN',
            index: 'pressure',
            table: [
                [0, -59.0, -57.3], [20, -25.2, -23.3], [40, -4.6, -2.6],
                [60, 10.9, 13.0], [70, 17.4, 19.6], [80, 23.4, 25.6],
                [90, 29.0, 31.1], [95, 31.6, 33.8], [100, 34.1, 36.3],
                [105, 36.6, 38.8], [110, 38.9, 41.1], [115, 41.2, 43.4],
                [120, 43.5, 45.7], [125, 45.6, 47.9], [130, 47.7, 50.0],
                [135, 49.8, 52.1], [140, 51.8, 54.1], [145, 53.8, 56.0],
                [150, 55.7, 58.0], [155, 57.6, 59.8], [160, 59.4, 61.7],
                [170, 63.0, 65.2], [180, 66.4, 68.6], [190, 69.6, 71.9],
                [200, 72.8, 75.1], [210, 75.9, 78.1], [220, 78.8, 81.1],
                [240, 84.5, 86.7], [260, 89.8, 92.0], [270, 92.3, 94.6],
                [280, 94.8, 97.0], [290, 97.2, 99.5], [300, 99.6, 101.8],
                [310, 101.9, 104.1], [320, 104.2, 106.3], [330, 106.4, 108.5],
                [340, 108.5, 110.7], [345, 109.6, 111.7], [350, 110.6, 112.8],
                [355, 111.7, 113.8], [360, 112.7, 114.8], [365, 113.7, 115.8],
                [370, 114.7, 116.8], [375, 115.7, 117.8], [380, 116.7, 118.8],
                [385, 117.7, 119.8], [390, 118.7, 120.7], [395, 119.6, 121.7],
                [400, 120.6, 122.6], [405, 121.5, 123.6], [410, 122.5, 124.5],
                [415, 123.4, 125.4], [420, 124.3, 126.3], [425, 125.2, 127.2],
                [430, 126.1, 128.1], [435, 127.0, 129.0], [440, 127.9, 129.9],
                [445, 128.8, 130.7], [450, 129.7, 131.6], [460, 131.4, 133.3],
                [470, 133.1, 135.0], [480, 134.7, 136.6], [490, 136.4, 138.2],
                [500, 138.0, 139.8], [510, 139.6, 141.4], [520, 141.2, 142.9],
                [530, 142.7, 144.5],
            ],
        },
    };

    // Normalize each raw table into ascending-by-pressure bubble/dew curves,
    // each a list of [psig, °F] points the page interpolates over.
    function normalize(entry) {
        const bubble = [], dew = [];
        for (const row of entry.table) {
            if (entry.index === 'pressure') {
                const p = row[0], bub = row[1], dw = (row.length > 2 ? row[2] : row[1]);
                bubble.push([p, bub]);
                dew.push([p, dw]);
            } else {                       // index === 'temp'
                const t = row[0], pBub = row[1], pDew = row[2];
                bubble.push([pBub, t]);
                dew.push([pDew, t]);
            }
        }
        bubble.sort((a, b) => a[0] - b[0]);
        dew.sort((a, b) => a[0] - b[0]);
        return { bubble, dew };
    }

    const out = {};
    for (const id in RAW) {
        const e = RAW[id];
        const n = normalize(e);
        out[id] = {
            name: e.name, safety: e.safety, blend: e.blend, glide: e.glide,
            note: e.note, ref: e.ref, bubble: n.bubble, dew: n.dew,
        };
    }
    return out;
})();
