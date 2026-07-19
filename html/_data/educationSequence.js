// Education curriculum sequence, exposed to Nunjucks as
// `educationSequence.*`. The order matches the card grid on
// education/index.html (which is the visible curriculum) so the two
// can't drift silently — if you reorder one, reorder the other in
// the same PR.
//
// Used by head.njk to emit <link rel="prev"> / <link rel="next">
// tags on each education page. Helps search-engine sequence
// understanding (treats the lessons as an ordered series) and gives
// assistive-tech link-relations navigation a real target.
//
// Pre-computes a lookup keyed by output URL so the template just
// reads `educationSequence[page.url]` — no filtering needed in
// Nunjucks. URLs match the `.html`-extension convention enforced by
// html.11tydata.js.
//
// MEMBERSHIP is now guarded at build time: `educationSequenceGuard`
// in .eleventy.js fails the build if any `nav: education` page is
// absent from `order` (or `order` lists a URL no education page
// claims). That guard caught the original drift — controller-wiring
// and bacnet-mstp shipped as full lessons but were never added here,
// so both emitted zero rel=prev/next and the chain skipped them
// (codebase-issues #93). The guard checks set membership, not order;
// keeping `order` in lockstep with the index.html grid order is still
// a by-hand discipline (the grid order isn't machine-readable here).

const order = [
    "/education/pid-basics.html",
    "/education/controller-wiring.html",
    // ── Signals & Sensing ─ controller-wiring leads the chapter; insert
    // new lesson URLs here, in curriculum order (mirror the
    // education/index.html grid) ──
    "/education/analog-sensing.html",
    "/education/temperature-sensors.html",
    "/education/controls-commissioning.html",
    "/education/hydronic-loops.html",
    "/education/load-piping.html",
    "/education/vfds.html",
    "/education/pump-control.html",
    "/education/equipment-staging.html",
    "/education/balancing.html",
    "/education/coil-selection.html",
    "/education/refrigerant-cycle-basics.html",
    "/education/superheat-subcooling.html",
    "/education/metering-devices-txv-eev.html",
    "/education/psychrometrics-basics.html",
    "/education/air-handlers.html",
    "/education/economizers.html",
    "/education/building-pressure.html",
    "/education/air-unit-identification.html",
    "/education/vav-systems.html",
    "/education/duct-static-control.html",
    "/education/air-balancing.html",
    "/education/dedicated-outdoor-air.html",
    "/education/function-blocks.html",
    // ── Programming ─ function-blocks leads the chapter; insert new
    // lesson URLs here, in curriculum order (mirror the
    // education/index.html grid) ──
    "/education/modbus-basics.html",
    "/education/modbus-decoding.html",
    "/education/bacnet-vs-modbus.html",
    "/education/bacnet-basics.html",
    "/education/bacnet-services.html",
    "/education/bacnet-networking.html",
    "/education/bacnet-mstp.html",
];

const sequence = {};
order.forEach((url, i) => {
    sequence[url] = {
        prev: i > 0 ? order[i - 1] : null,
        next: i < order.length - 1 ? order[i + 1] : null,
    };
});

module.exports = sequence;
