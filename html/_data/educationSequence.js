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

const order = [
    "/education/pid-basics.html",
    "/education/hydronic-loops.html",
    "/education/load-piping.html",
    "/education/vfds.html",
    "/education/pump-control.html",
    "/education/equipment-staging.html",
    "/education/balancing.html",
    "/education/refrigerant-cycle-basics.html",
    "/education/psychrometrics-basics.html",
    "/education/function-blocks.html",
    "/education/modbus-basics.html",
    "/education/modbus-decoding.html",
    "/education/bacnet-basics.html",
    "/education/bacnet-networking.html",
];

const sequence = {};
order.forEach((url, i) => {
    sequence[url] = {
        prev: i > 0 ? order[i - 1] : null,
        next: i < order.length - 1 ? order[i + 1] : null,
    };
});

module.exports = sequence;
