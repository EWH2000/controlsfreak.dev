// ──────────────────────────────────────────────────────────────────────
// hydronic-engine.js — steady-state hydraulic + thermal solver for the
// Hydronic Loop Builder (/simulators/hydronic-loop-builder.html).
//
// Loaded as a *classic* script (no type="module"): the page's logic lives
// in an IIFE-wrapped inline <script> whose bindings can't be reached from
// outside, so the engine exposes its API as a plain global. Same
// convention as /scripts/fbe-engine.js, /scripts/wiring-engine.js,
// /scripts/pid-engine.js, and /scripts/psychro-engine.js. A page that wants
// the engine adds
//
//     <script src="/scripts/hydronic-engine.js"></script>
//
// before its own inline <script>. The 11ty build copies this through
// unchanged — nothing transpiles or bundles.
//
// PURE — no DOM. The page owns the elevation canvas, the drag/pipe UI, and
// the tick *loop*; the engine owns only the component catalog and the
// per-tick solve.
//
// API (window.HYDRO):
//
//   HYDRO.COMPONENTS               catalog: type → component definition
//   HYDRO.CATEGORIES               palette group order
//   HYDRO.createComponent(type,id,x,z)   fresh instance with default params
//   HYDRO.makeSystem(def)          deep-clone a system literal into a runnable
//                                  system (example literals are never mutated)
//   HYDRO.tick(system, dt)         flatten → solve hydraulics → thermal sweep →
//                                  write per-pipe / per-component results back
//   HYDRO.solve(system)            hydraulics only (no thermal); returns the
//                                  flatten model + convergence info. For tests.
//   HYDRO.SETTINGS                 solver tunables (read-only, for tests)
//
// A system is { components:[...], pipes:[...], meta:{...} }:
//   component = { id, type, pos:{x,y,z}, rot, params, out, state }
//   pipe      = { id, from:[compId,port], to:[compId,port], k_pipe?,
//                 Q, dir, T, length, dH }
//     // Q/dir/T/length/dH are mutated per tick for the render. k_pipe is an
//     // OPTIONAL manual resistance override; absent (the normal case), pipe
//     // resistance is derived each solve from the 3D developed length (below).
//     // pos.y (depth) is live now — it sets the east-elevation view and the
//     // 3D pipe length; phase 1 only used x and z.
//
// ── Physics, in one breath ──────────────────────────────────────────────
// Everything computes in canonical US units (GPM, ft-of-head, °F, Btu/h);
// the page converts at the display boundary via window.Units. The hydraulic
// network is solved like a nonlinear resistor network: union-find merges
// component junctions (a tee) into pressure NODES, every flow path (a
// component's internal branch, and every pipe) is a BRANCH carrying a signed
// flow Q, and a linearized nodal system G·P = I is solved and iterated until
// the flows stop moving. Then a one-pass thermal sweep transports temperature
// on the known flows (loops read last tick's upstream temp — the FBE
// one-tick-delay convention — so a cold loop visibly warms up over a few
// ticks). Site-canonical constants are reused so the numbers agree with the
// valve-cv / waterside-load / affinity-laws tools:
//   • waterside heat:  Q[Btu/h] = 500 · GPM · ΔT°F        (waterside-load.html)
//   • valve Cv:        ΔP[psi]  = (Q / Cv)²  (water, SG=1) (valve-cv.html)
//   • pump/affinity:   H = H₀·(speed/100)² − a·Q²          (affinity-laws.html)
// Head and valve ΔP are bridged with 1 psi ≈ 2.31 ft of water (no existing
// tool sets this precedent — introduced here, standard 62.3 lb/ft³ water), so
// a valve's head loss is ΔH[ft] = 2.31 · (Q/Cv)² = k·Q² with k = 2.31/Cv².
//
// ── Branch law (signed, flow positive = from→to) ───────────────────────
//   P_from − P_to = k·Q·|Q| − hsrc(Q) + (Z_to − Z_from)
// k·Q·|Q| is friction (always opposes flow), hsrc is pump head added on the
// from→to path, and the elevation term makes static head fall out of pipe
// geometry. Elevation (the STATIC term) CANCELS around any closed loop —
// correct physics, not a bug; it only nets out in an open system (the
// expansion-tank reference node, still deferred). FRICTION does NOT cancel:
// each pipe's k now scales with its 3D developed length (k = max(K_PIPE,
// K_PER_FT·L)), so a taller riser or a longer run is real head loss even as
// its static lift cancels on the return — the layout's footage matters.
// ──────────────────────────────────────────────────────────────────────

'use strict';

const HYDRO = (function () {
    'use strict';

    // ── helpers ─────────────────────────────────────────────────────
    const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
    // Coerce a possibly-undefined / non-finite value to a finite number.
    // The mirror of fbe-engine's asNum: unwired params and overflow default
    // cleanly to a fallback instead of poisoning the solve with NaN/Infinity.
    const asNum = (v, dflt) => (typeof v === 'number' && isFinite(v) ? v : (dflt || 0));
    const isFin = (x) => typeof x === 'number' && isFinite(x);

    // ── solver tunables ─────────────────────────────────────────────
    const K_BTU       = 500;        // Q[Btu/h] = 500·GPM·ΔT°F  (waterside-load)
    const FT_PER_PSI  = 2.31;       // 1 psi ≈ 2.31 ft of water (62.3 lb/ft³)
    const Q_MIN       = 1e-3;       // GPM — divide-by-zero floor (thermal ΔT, mixing)
    const Q_COND_FLOOR = 0.05;      // GPM — floor on |Q| in the secant conductance
                                    // 1/(k|Q|). A hair above zero so g can't blow
                                    // up at near-zero flow and overshoot. Negligible
                                    // vs any real loop flow (tens of GPM) and the
                                    // floor stops binding once |Q| > 0.05. It DOES
                                    // bias the operating point of a loop whose true
                                    // flow is below 0.05 GPM — but such a flow rounds
                                    // to 0.0 at the display, and the residual-based
                                    // convergence test (solveHydraulics) reports that
                                    // case as not-settled anyway. Tames the cold-start
                                    // + stiff-loop (series-pump) iteration.
    const Q_CAP       = 1000;       // GPM — per-iteration clamp; far above any
                                    // real loop, only ever catches a cold-start
                                    // secant overshoot before it blows up. Hitting
                                    // it is treated as non-convergence (below), not
                                    // a silent result.
    const K_CLOSED    = 1e9;        // a shut valve is a LARGE FINITE resistance,
                                    // never Infinity (Infinity → g=1/(∞·|Q|)=0
                                    // would manufacture NaN downstream).
    const K_FLOOR     = 1e-6;       // min branch resistance (keeps g finite).
    const K_PIPE      = 5e-4;       // FLOOR on pipe resistance (ft per GPM²).
                                    // Pipes are real branches, not pure node-
                                    // merges (see flatten note), so each carries
                                    // a definite flow for the render. Phase 2:
                                    // pipe k is now developed-length dependent —
                                    // k = max(K_PIPE, K_PER_FT·L) — but never
                                    // DROPS below this floor, so the matrix is
                                    // never worse-conditioned than phase 1 (a
                                    // short jumper still floors at ≈0.6 ft head
                                    // at 35 GPM; long runs only ADD friction,
                                    // which improves conditioning). codebase-
                                    // issues #134's stiff regime is small-k —
                                    // length-dependence only grows k, so we
                                    // never enter it.
    const K_PER_FT    = 2.4e-5;     // pipe resistance per foot of 3D developed
                                    // run (ft per GPM², per ft). Calibrated to a
                                    // fixed ~2" nominal pipe: ≈3 ft of head per
                                    // 100 ft at 35 GPM (k·Q² = K_PER_FT·100·35²
                                    // ≈ 2.9 ft). No per-pipe diameter UI — that,
                                    // plus a dedicated pipe-sizing lesson, stays
                                    // deferred. Below the ~20 ft crossover
                                    // (K_PER_FT·L < K_PIPE) a short run just
                                    // floors at K_PIPE: physically honest, a
                                    // 5 ft jumper's friction IS negligible.
    const K_PUMP_CASE = 1e-3;       // pump casing resistance — keeps the pump
                                    // branch a finite-conductance edge, not a
                                    // pure source.
    const MAX_ITERS   = 50;         // cold start ~20–30 iters (developed-length
                                    // friction shifts the operating point a touch
                                    // vs the old flat K_PIPE), warm in 1–3 — both
                                    // comfortably under the cap.
    const TOL         = 1e-4;       // GPM — max per-branch flow change to stop.
    const RELAX       = 0.5;        // under-relaxation on the secant update.
    const PIVOT_EPS   = 1e-12;      // |pivot| below this → unknown set to 0.
    const TEMP_MIN    = 32;         // °F — sane water band; clamp every temp.
    const TEMP_MAX    = 250;
    const T_NEUTRAL   = 70;         // °F — first-tick / fill temperature.

    const SETTINGS = {
        K_BTU: K_BTU, FT_PER_PSI: FT_PER_PSI, Q_MIN: Q_MIN, Q_COND_FLOOR: Q_COND_FLOOR,
        Q_CAP: Q_CAP, K_CLOSED: K_CLOSED, K_PIPE: K_PIPE, K_PER_FT: K_PER_FT,
        K_PUMP_CASE: K_PUMP_CASE, MAX_ITERS: MAX_ITERS, TOL: TOL, RELAX: RELAX,
        TEMP_MIN: TEMP_MIN, TEMP_MAX: TEMP_MAX, T_NEUTRAL: T_NEUTRAL,
    };

    const Y_CENTER = 0;             // default depth plane for a component created
                                    // without a y (createComponent / a coerced
                                    // literal). pos.y (depth) is live now — the
                                    // page's east-elevation view edits it and 3D
                                    // pipe length reads it; this is just the
                                    // front-plane default.

    // ── component catalog ───────────────────────────────────────────
    // Each component declares:
    //   ports[]    { name, role:'inlet'|'outlet'|'bi', dx, dz }  local ft offset
    //   branches[] { from, to, kind, thermal }   internal flow paths
    //   junction[] (optional) port names merged into ONE pressure node (a tee)
    //   params[]   { name, label, kind, default, options?, min?, max?, step? }
    //              min/max/step are UI hints the inspector applies to number
    //              inputs; the engine's own branchK/branch* clamps stay the real
    //              backstop (a typed out-of-range value still solves safely).
    // `kind` on a branch selects the resistance + head model in branchK/branchHsrc;
    // `thermal` selects the temperature law in branchThermal.
    const COMPONENTS = {

        plant: {
            label: 'Plant', category: 'Plant',
            // Boiler or chiller — a resistance plus a thermal source that holds
            // the leaving-water temperature to its setpoint (capped by capacity).
            ports: [
                { name: 'in',  role: 'inlet',  dx: -0.7, dz: 0 },
                { name: 'out', role: 'outlet', dx:  0.7, dz: 0 },
            ],
            branches: [{ from: 'in', to: 'out', kind: 'plant', thermal: 'source' }],
            params: [
                { name: 'mode',    label: 'Mode',           kind: 'enum',
                  options: ['heat', 'cool'], default: 'heat' },
                { name: 'lwt',     label: 'Leaving °F',     kind: 'number', default: 180, min: 32, max: 250, step: 1 },
                { name: 'qmax',    label: 'Capacity (MBH)', kind: 'number', default: 400, min: 0, step: 10 },
                { name: 'k',       label: 'Resistance k',   kind: 'number', default: 0.01, min: 0, step: 0.001 },
                { name: 'srcmode', label: 'Source mode',    kind: 'enum',
                  options: ['setpoint', 'capacity'], default: 'setpoint' },
            ],
        },

        pump: {
            label: 'Pump', category: 'Pumps',
            // Centrifugal pump: head source H=(H₀−a·Q²)·(speed/100)² plus a small
            // casing resistance. The speed² term is the VFD / affinity lesson.
            ports: [
                { name: 'in',  role: 'inlet',  dx: -0.7, dz: 0 },
                { name: 'out', role: 'outlet', dx:  0.7, dz: 0 },
            ],
            branches: [{ from: 'in', to: 'out', kind: 'pump', thermal: 'adiabatic' }],
            params: [
                { name: 'h0',    label: 'Shutoff head (ft)', kind: 'number', default: 40, min: 0, max: 200, step: 1 },
                { name: 'a',     label: 'Curve a',           kind: 'number', default: 0.012, min: 0, max: 0.2, step: 0.001 },
                { name: 'speed', label: 'Speed (%)',         kind: 'number', default: 100, min: 0, max: 100, step: 1 },
                { name: 'on',    label: 'Enabled',           kind: 'bool',   default: true },
            ],
        },

        coil: {
            label: 'Coil', category: 'Terminals',
            // A terminal heat-exchanger with the building; resistance is k·Q².
            // Two duty models (the `coilmode` param): 'load' (default) moves the
            // water toward the space by a FIXED design Btu/h; 'ua' makes the duty
            // track the approach — q = UA·|Tin−tspace| — so it falls as the water
            // nears the space and climbs with a bigger approach, like a real coil.
            ports: [
                { name: 'in',  role: 'inlet',  dx: -0.7, dz: 0 },
                { name: 'out', role: 'outlet', dx:  0.7, dz: 0 },
            ],
            branches: [{ from: 'in', to: 'out', kind: 'resistor', thermal: 'load' }],
            params: [
                { name: 'coilmode', label: 'Heat model',     kind: 'enum',
                  options: ['load', 'ua'], default: 'load' },
                { name: 'k',        label: 'Resistance k',   kind: 'number', default: 0.02, min: 0, step: 0.001 },
                { name: 'qdesign',  label: 'Load (MBH)',     kind: 'number', default: 120, min: 0, step: 10 },
                { name: 'ua',       label: 'UA (Btu/h·°F)',  kind: 'number', default: 1000, min: 0, step: 50 },
                { name: 'tspace',   label: 'Space °F',       kind: 'number', default: 70, min: 32, max: 120, step: 1 },
            ],
        },

        valve2: {
            label: '2-Way Valve', category: 'Valves',
            // Throttles total loop flow. k = 2.31 / Cv_eff²; pos 0 → shut.
            ports: [
                { name: 'in',  role: 'inlet',  dx: -0.55, dz: 0 },
                { name: 'out', role: 'outlet', dx:  0.55, dz: 0 },
            ],
            branches: [{ from: 'in', to: 'out', kind: 'valve2', thermal: 'adiabatic' }],
            params: [
                { name: 'cv',    label: 'Cv (full)',    kind: 'number', default: 8, min: 0, step: 0.5 },
                { name: 'pos',   label: 'Position (%)',  kind: 'number', default: 100, min: 0, max: 100, step: 1 },
                { name: 'eqpct', label: 'Equal-percent', kind: 'bool',   default: false },
                { name: 'rangeability', label: 'Rangeability R', kind: 'number', default: 50, min: 2, max: 100, step: 1 },
            ],
        },

        valve3: {
            label: '3-Way Valve', category: 'Valves',
            // Diverts between a through path (b) and a bypass (c) off the common
            // (a). Complementary Cv keeps total resistance ~constant while the
            // through (coil) flow modulates — the constant-pump-flow lesson.
            ports: [
                { name: 'a', role: 'inlet',  dx: -0.55, dz: 0    },   // common
                { name: 'b', role: 'outlet', dx:  0.55, dz: 0    },   // through
                { name: 'c', role: 'outlet', dx:  0,    dz: -0.7 },   // bypass
            ],
            branches: [
                { from: 'a', to: 'b', kind: 'valve3b', thermal: 'adiabatic' },
                { from: 'a', to: 'c', kind: 'valve3c', thermal: 'adiabatic' },
            ],
            params: [
                { name: 'cv',  label: 'Cv (full)',   kind: 'number', default: 8, min: 0, step: 0.5 },
                { name: 'pos', label: 'Position (%)', kind: 'number', default: 100, min: 0, max: 100, step: 1 },
            ],
        },

        balanceValve: {
            label: 'Balance Valve', category: 'Valves',
            // A pure fixed resistor set once at commissioning — drop it on a
            // low-resistance parallel branch to even out the split.
            ports: [
                { name: 'in',  role: 'inlet',  dx: -0.55, dz: 0 },
                { name: 'out', role: 'outlet', dx:  0.55, dz: 0 },
            ],
            branches: [{ from: 'in', to: 'out', kind: 'balance', thermal: 'adiabatic' }],
            params: [
                { name: 'cv',      label: 'Cv (full)',  kind: 'number', default: 8, min: 0, step: 0.5 },
                { name: 'setting', label: 'Setting (%)', kind: 'number', default: 50, min: 0, max: 100, step: 1 },
            ],
        },

        tee: {
            label: 'Tee', category: 'Fittings',
            // A junction: all three ports are one pressure node, ~0 internal
            // resistance. The flow-weighted mix rule does its thermal work.
            ports: [
                { name: 'a', role: 'bi', dx: -0.5, dz: 0    },
                { name: 'b', role: 'bi', dx:  0.5, dz: 0    },
                { name: 'c', role: 'bi', dx:  0,   dz: -0.6 },
            ],
            branches: [],
            junction: ['a', 'b', 'c'],
            params: [],
        },
    };

    // Palette group order.
    const CATEGORIES = ['Plant', 'Pumps', 'Terminals', 'Valves', 'Fittings'];

    // ── instance + system helpers ───────────────────────────────────

    // A fresh component instance with default params filled in. Unknown type
    // returns null (the wiring-engine createDevice contract), so a corrupted
    // persisted system or a future API consumer fails soft instead of throwing.
    function createComponent(type, id, x, z) {
        const def = COMPONENTS[type];
        if (!def) return null;
        const params = {};
        (def.params || []).forEach((p) => { params[p.name] = p.default; });
        return {
            id: id,
            type: type,
            pos: { x: asNum(x), y: Y_CENTER, z: asNum(z) },
            rot: 0,
            params: params,
            out: {},
            state: {},
        };
    }

    // Deep-clone a system literal into a runnable system. Example literals stay
    // pristine — every load gets its own copy with fresh runtime fields. Unknown
    // component types are dropped (matching createComponent's soft contract);
    // pipes referencing a dropped/absent component are dropped too, so the
    // flatten pass never dereferences a missing node.
    function makeSystem(def) {
        const src = JSON.parse(JSON.stringify(def || {}));
        // Fail soft on a corrupted/hand-authored literal: a non-array list or a
        // null entry is dropped, never thrown (matching createComponent's null
        // contract). `|| []` alone wouldn't catch a truthy non-array.
        const rawComps = Array.isArray(src.components) ? src.components : [];
        const components = rawComps.filter((c) => c && COMPONENTS[c.type]);
        components.forEach((c) => {
            const cdef = COMPONENTS[c.type];
            // Coerce a missing OR truthy-non-object pos (a hand-authored `pos: 5`
            // would otherwise throw on c.pos.y = … under 'use strict'). Normalize
            // every axis so the flatten pass never reads a non-finite coordinate.
            if (!c.pos || typeof c.pos !== 'object') c.pos = { x: 0, y: Y_CENTER, z: 0 };
            if (!isFin(c.pos.x)) c.pos.x = 0;
            if (!isFin(c.pos.y)) c.pos.y = Y_CENTER;
            if (!isFin(c.pos.z)) c.pos.z = 0;
            c.params = c.params || {};
            (cdef.params || []).forEach((p) => {
                if (!(p.name in c.params)) c.params[p.name] = p.default;
            });
            c.rot = asNum(c.rot);
            c.out = {};
            c.state = {};
        });
        // Ensure every component id is present AND unique — mirrors the pipe-id
        // pass below. Two components sharing an id (or a null id) would alias their
        // branch keys (<id>#<bi>) in the warm-start / writeback caches and mirror
        // one component's flow onto another. Not reachable through the shipped UI
        // (addComponent mints monotonic ids), but an imported/persisted literal or
        // the Android wrapper could feed a collision. A rewritten id orphans any
        // pipe that named the old id, so it drops in the pipe filter below — the
        // safe outcome (an aliased-flow pipe is worse than a dropped one). Rebuild
        // `ids` from the deduped set before that filter.
        const seenCompIds = new Set();
        components.forEach((c, i) => {
            let id = (c.id === undefined || c.id === null) ? null : String(c.id);
            if (id === null || seenCompIds.has(id)) {
                let m = i;
                id = 'comp' + m;
                while (seenCompIds.has(id)) { m++; id = 'comp' + m; }
            }
            c.id = id;
            seenCompIds.add(id);
        });
        const ids = new Set(components.map((c) => c.id));
        const portsOf = (cid) => {
            const c = components.find((x) => x.id === cid);
            return c ? COMPONENTS[c.type].ports.map((p) => p.name) : [];
        };
        const rawPipes = Array.isArray(src.pipes) ? src.pipes : [];
        const pipes = rawPipes.filter((p) =>
            p && p.from && p.to &&
            ids.has(p.from[0]) && ids.has(p.to[0]) &&
            portsOf(p.from[0]).indexOf(p.from[1]) !== -1 &&
            portsOf(p.to[0]).indexOf(p.to[1]) !== -1);
        // Ensure every pipe id is present AND unique — duplicates would alias one
        // warm-start / writeback key and mirror one leg's flow onto another.
        const seenIds = new Set();
        pipes.forEach((p, i) => {
            let id = (p.id === undefined || p.id === null) ? null : String(p.id);
            if (id === null || seenIds.has(id)) {
                let m = i;
                id = 'pipe' + m;
                while (seenIds.has(id)) { m++; id = 'pipe' + m; }
            }
            p.id = id;
            seenIds.add(id);
            // k_pipe is derived each solve from the pipe's 3D developed length
            // (flatten). A literal MAY still pin a finite k_pipe as a manual
            // override; otherwise drop it so the geometry drives the resistance
            // and a stale value can't freeze (the field is also a per-tick
            // display output, so it must not double as a frozen input).
            if (!isFin(p.k_pipe)) delete p.k_pipe;
            p.Q = 0; p.dir = 0; p.T = T_NEUTRAL;
        });
        return {
            components: components,
            pipes: pipes,
            meta: src.meta || {},
            // Warm-start caches. _warm keys a branch's last flow by a stable id
            // (component id + branch index, or pipe id); _temp keys a node's
            // last temperature by a stable canonical key (its lexicographically
            // smallest member port). Both survive across ticks so steady-state
            // ticks converge in 1–3 iterations and loops carry transport lag.
            _warm: {},
            _temp: {},
        };
    }

    // ── union-find over port keys ───────────────────────────────────
    function portKey(cid, port) { return cid + '|' + port; }

    function makeUF() {
        const parent = Object.create(null);
        function find(x) {
            if (parent[x] === undefined) parent[x] = x;
            while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
            return x;
        }
        function union(a, b) { parent[find(a)] = find(b); }
        return { find: find, union: union };
    }

    // ── flatten: system → node/branch model ─────────────────────────
    // Union-find merges component junctions (a tee's three ports) into one
    // pressure node. Pipes are NOT merged — each pipe is its own branch, so it
    // carries a first-class, solver-computed flow + direction for the render
    // (a pure node-merge would leave pipes flowless, and ambiguous at a tee).
    // The small K_PIPE resistance is what lets a pipe be a branch without an
    // infinite conductance. Every component's internal branch and every pipe
    // becomes a branch between two node indices, with the world-Z of each end
    // baked in for the elevation term.
    function flatten(system) {
        // Defensive defaults: solve()/tick() are public, so a raw literal that
        // never went through makeSystem (no warm-start caches, a non-array list)
        // must still flatten instead of throwing.
        if (!system._warm) system._warm = {};
        if (!system._temp) system._temp = {};
        if (!Array.isArray(system.components)) system.components = [];
        if (!Array.isArray(system.pipes)) system.pipes = [];
        const comps = system.components;
        const byId = {};
        comps.forEach((c) => { byId[c.id] = c; });

        const uf = makeUF();
        // Component junctions: a tee's ports collapse to one node.
        comps.forEach((c) => {
            const def = COMPONENTS[c.type];
            const j = def.junction;
            if (j && j.length > 1) {
                for (let i = 1; i < j.length; i++) uf.union(portKey(c.id, j[0]), portKey(c.id, j[i]));
            }
        });

        // Enumerate every component port as a node member; map roots → indices.
        const rootIndex = {};
        const nodes = [];   // { members:[portKey], key:canonicalKey, P:0, T:prev }
        function nodeIndexForPort(cid, port) {
            const r = uf.find(portKey(cid, port));
            if (!(r in rootIndex)) {
                rootIndex[r] = nodes.length;
                nodes.push({ members: [], key: null, P: 0, T: T_NEUTRAL });
            }
            return rootIndex[r];
        }
        comps.forEach((c) => {
            COMPONENTS[c.type].ports.forEach((p) => {
                const idx = nodeIndexForPort(c.id, p.name);
                nodes[idx].members.push(portKey(c.id, p.name));
            });
        });
        // Canonical key per node = smallest member port-key (stable across ticks
        // regardless of union order) — the warm-start temperature cache key.
        nodes.forEach((nd) => {
            nd.key = nd.members.reduce((a, b) => (a < b ? a : b));
            const t = system._temp[nd.key];
            nd.T = isFin(t) ? t : T_NEUTRAL;
        });

        // World position of a port, in feet: component pos + the port's local
        // offset. Ports carry dx/dz (a box-face offset) but no dy, so a port
        // sits at its component's depth (one plane per component). A raw literal
        // fed straight to solve()/tick() may have no pos — honor the documented
        // raw-literal tolerance instead of throwing on c.pos.*.
        const worldPos = (c, portName) => {
            const def = c && COMPONENTS[c.type];
            const pd = def ? def.ports.find((p) => p.name === portName) : null;
            const base = (c && c.pos) ? c.pos : null;
            return {
                x: (base ? asNum(base.x) : 0)        + (pd ? asNum(pd.dx) : 0),
                y: (base ? asNum(base.y) : Y_CENTER),
                z: (base ? asNum(base.z) : Y_CENTER) + (pd ? asNum(pd.dz) : 0),
            };
        };
        const worldZ = (c, portName) => worldPos(c, portName).z;

        // Branches: component internal branches, then pipes.
        const branches = [];
        comps.forEach((c) => {
            COMPONENTS[c.type].branches.forEach((bd, bi) => {
                const bid = c.id + '#' + bi;
                const wq = system._warm[bid];
                branches.push({
                    id: bid,
                    comp: c,
                    kind: bd.kind,
                    thermal: bd.thermal,
                    nodeFrom: nodeIndexForPort(c.id, bd.from),
                    nodeTo: nodeIndexForPort(c.id, bd.to),
                    Zfrom: worldZ(c, bd.from),
                    Zto: worldZ(c, bd.to),
                    Q: isFin(wq) ? wq : 0,
                    k: K_FLOOR, hsrc: 0, g: 0,
                    Tin: T_NEUTRAL, Tout: T_NEUTRAL, up: 0, dn: 0,
                });
            });
        });
        system.pipes.forEach((p) => {
            const cf = byId[p.from[0]], ct = byId[p.to[0]];
            if (!cf || !ct) return;   // a pipe to a since-deleted component — skip it
            const bid = 'pipe#' + p.id;
            const wq = system._warm[bid];
            const wpf = worldPos(cf, p.from[1]);
            const wpt = worldPos(ct, p.to[1]);
            // 3D developed length, ft. Resistance scales with it (floored at
            // K_PIPE) unless the literal pins an explicit k_pipe override.
            const dx = wpt.x - wpf.x, dy = wpt.y - wpf.y, dz = wpt.z - wpf.z;
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const kPipe = isFin(p.k_pipe) ? p.k_pipe : Math.max(K_PIPE, K_PER_FT * length);
            branches.push({
                id: bid,
                comp: null, pipe: p,
                kind: 'pipe',
                thermal: 'adiabatic',
                nodeFrom: nodeIndexForPort(p.from[0], p.from[1]),
                nodeTo: nodeIndexForPort(p.to[0], p.to[1]),
                Zfrom: wpf.z,
                Zto: wpt.z,
                length: length,
                kPipe: kPipe,
                Q: isFin(wq) ? wq : 0,
                k: K_FLOOR, hsrc: 0, g: 0,
                Tin: T_NEUTRAL, Tout: T_NEUTRAL, up: 0, dn: 0,
            });
        });

        // Islands: connected components of the branch graph. One reference node
        // per island is pinned to P=0 (a closed loop's nodal matrix is singular
        // by a per-island constant; pinning one node removes exactly that null
        // space). An isolated node (a placed-but-unpiped port) is its own island.
        const islandUF = makeUF();
        branches.forEach((b) => islandUF.union('n' + b.nodeFrom, 'n' + b.nodeTo));
        const refMask = new Array(nodes.length).fill(false);
        const islandRef = {};
        for (let i = 0; i < nodes.length; i++) {
            const r = islandUF.find('n' + i);
            if (!(r in islandRef)) { islandRef[r] = i; refMask[i] = true; }
        }

        return { nodes: nodes, branches: branches, refMask: refMask, byId: byId };
    }

    // ── per-branch resistance + pump head at the current flow ───────
    function branchK(b) {
        const p = b.comp ? b.comp.params : null;
        let k;
        switch (b.kind) {
            case 'pipe':    k = isFin(b.kPipe) ? b.kPipe : K_PIPE; break;   // length-derived (flatten), floored at K_PIPE
            case 'pump':    k = K_PUMP_CASE; break;
            case 'plant':   k = asNum(p.k, 0.01); break;
            case 'resistor':k = asNum(p.k, 0.02); break;
            case 'valve2': {
                const pos = clamp(asNum(p.pos), 0, 100) / 100;
                const cv  = Math.max(asNum(p.cv, 8), 0);
                // Equal-percent: Cv = Cv·R^(pos−1); linear: Cv = Cv·pos.
                const R = Math.max(asNum(p.rangeability, 50), 1.0001);
                const cvEff = p.eqpct ? cv * Math.pow(R, pos - 1) : cv * pos;
                k = (pos <= 0 || cvEff <= K_FLOOR) ? K_CLOSED : FT_PER_PSI / (cvEff * cvEff);
                break;
            }
            case 'valve3b': {
                const pos = clamp(asNum(p.pos), 0, 100) / 100;
                const cvb = Math.max(asNum(p.cv, 8), 0) * pos;          // through opens with pos
                k = (cvb <= K_FLOOR) ? K_CLOSED : FT_PER_PSI / (cvb * cvb);
                break;
            }
            case 'valve3c': {
                const pos = clamp(asNum(p.pos), 0, 100) / 100;
                const cvc = Math.max(asNum(p.cv, 8), 0) * (1 - pos);    // bypass closes as pos opens
                k = (cvc <= K_FLOOR) ? K_CLOSED : FT_PER_PSI / (cvc * cvc);
                break;
            }
            case 'balance': {
                const set = clamp(asNum(p.setting), 0, 100) / 100;
                const cvs = Math.max(asNum(p.cv, 8), 0) * set;
                k = (cvs <= K_FLOOR) ? K_CLOSED : FT_PER_PSI / (cvs * cvs);
                break;
            }
            default: k = K_FLOOR;
        }
        if (!isFin(k)) k = K_FLOOR;
        return clamp(k, K_FLOOR, K_CLOSED);
    }

    function branchHsrc(b) {
        if (b.kind !== 'pump') return 0;
        const p = b.comp.params;
        if (!p.on) return 0;
        const h0 = asNum(p.h0, 40);
        const a  = asNum(p.a, 0.012);
        const spd = clamp(asNum(p.speed, 100), 0, 100) / 100;
        // Affinity laws: only the shutoff head H₀ scales with speed² — the
        // a·Q² curve-steepness term is UNCHANGED. That makes the operating
        // point on a k·Q² system curve move as Q ∝ speed, H ∝ speed², matching
        // affinity-laws.html. (Scaling the whole quadratic over-scales the loss
        // term and gives ~57% flow at 50% speed instead of 50%.) Clamp ≥ 0 —
        // past max flow the curve dips negative, but a pump can't add neg head.
        const h = h0 * spd * spd - a * b.Q * b.Q;
        return Math.max(0, isFin(h) ? h : 0);
    }

    // ── dense Gaussian solve with partial pivoting + pivot guard ────
    // n ≤ ~40 (one node per port). |pivot| < PIVOT_EPS → that unknown is set
    // to 0 rather than dividing by ~0 (a starved / near-singular row).
    function gaussianSolve(A, b) {
        const n = b.length;
        // operate on copies
        const M = A.map((row) => row.slice());
        const x = b.slice();
        for (let col = 0; col < n; col++) {
            // partial pivot: largest |value| in this column at or below the diagonal
            let piv = col, best = Math.abs(M[col][col]);
            for (let r = col + 1; r < n; r++) {
                const v = Math.abs(M[r][col]);
                if (v > best) { best = v; piv = r; }
            }
            if (best < PIVOT_EPS) { x[col] = 0; continue; }   // singular column → pin unknown to 0
            if (piv !== col) {
                const tm = M[piv]; M[piv] = M[col]; M[col] = tm;
                const tx = x[piv]; x[piv] = x[col]; x[col] = tx;
            }
            const diag = M[col][col];
            for (let r = 0; r < n; r++) {
                if (r === col) continue;
                const f = M[r][col] / diag;
                if (f === 0) continue;
                for (let c = col; c < n; c++) M[r][c] -= f * M[col][c];
                x[r] -= f * x[col];
            }
        }
        const out = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            const d = M[i][i];
            out[i] = (Math.abs(d) < PIVOT_EPS) ? 0 : x[i] / d;
            if (!isFin(out[i])) out[i] = 0;
        }
        return out;
    }

    // ── hydraulic solve: linearized nodal / successive substitution ─
    // Per iteration: secant conductance g = 1/(k·|Q|); assemble the nodal
    // Laplacian G with pump head + elevation entering as Norton current
    // injections; solve G·P = I (reference nodes pinned to 0); recompute each
    // branch flow Q = g·((P_from − P_to) + hsrc − ΔZ); under-relax; repeat.
    function solveHydraulics(model) {
        const nodes = model.nodes, branches = model.branches, refMask = model.refMask;
        const n = nodes.length;
        let maxDQ = Infinity, iters = 0, converged = false;
        let relax = RELAX, prevMaxDQ = Infinity;

        for (iters = 0; iters < MAX_ITERS; iters++) {
            // 1. resistance, pump head, and secant conductance at the current flow.
            //    |Q| is floored at Q_COND_FLOOR (not the tighter Q_MIN) so the
            //    secant slope can't blow up at near-zero flow. A self-loop branch
            //    (both ends on one node — e.g. a hand-authored pipe across a tee)
            //    carries no flow: zero it so a stray elevation term can't inject a
            //    phantom Q the matrix is blind to.
            for (let i = 0; i < branches.length; i++) {
                const b = branches[i];
                if (b.nodeFrom === b.nodeTo) { b.k = K_FLOOR; b.hsrc = 0; b.g = 0; b.Q = 0; continue; }
                b.k = branchK(b);
                b.hsrc = branchHsrc(b);
                const aq = Math.max(Math.abs(b.Q), Q_COND_FLOOR);
                // Secant (chord) conductance g = 1/(k|Q|) — the chord through the
                // origin, NOT the friction tangent 1/(2k|Q|). g is simultaneously
                // the linearization AND the literal Q = g·residual flow map (step 5),
                // so it must be the chord for the fixed point to land on the true
                // operating point. The pump-head slope (−2a·Q·spd²) is deliberately
                // NOT folded into g for the same reason — doing so moves the fixed
                // point and yields branch-law-violating flows (see codebase-issues:
                // steep pump curves don't converge; a true Newton step is the fix).
                b.g = 1 / (b.k * aq);
                if (!isFin(b.g)) b.g = 0;
            }
            // 2. assemble G·P = I. A branch from a→b: Q = g·((P_a−P_b)+hsrc−ΔZ).
            //    The constant part g·(hsrc−ΔZ) is a current injected at b, drawn at a.
            const G = [];
            for (let r = 0; r < n; r++) G.push(new Array(n).fill(0));
            const I = new Array(n).fill(0);
            for (let i = 0; i < branches.length; i++) {
                const b = branches[i];
                if (b.nodeFrom === b.nodeTo) continue;
                const a = b.nodeFrom, c = b.nodeTo, g = b.g;
                const inj = g * (b.hsrc - (b.Zto - b.Zfrom));
                G[a][a] += g; G[c][c] += g; G[a][c] -= g; G[c][a] -= g;
                I[a] -= inj; I[c] += inj;
            }
            // 3. pin one reference node per island: row → identity, I → 0.
            for (let i = 0; i < n; i++) {
                if (refMask[i]) {
                    for (let j = 0; j < n; j++) G[i][j] = 0;
                    G[i][i] = 1; I[i] = 0;
                }
            }
            // 4. solve for node pressures
            const P = gaussianSolve(G, I);
            for (let i = 0; i < n; i++) nodes[i].P = P[i];
            // 5. recompute flows, under-relax, clamp, track convergence.
            //    Convergence is measured on the TRUE secant residual |qSolved − Q|
            //    (pre-relaxation), NOT on the under-relaxed step |qNew − Q|. The
            //    latter is the residual scaled by `relax`, so once adaptive damping
            //    cuts relax toward its floor the loop would report converged while
            //    the branch law is still off by up to residual/relax. The relaxed
            //    qNew is still what we APPLY — only the stop metric changes.
            maxDQ = 0;
            for (let i = 0; i < branches.length; i++) {
                const b = branches[i];
                if (b.nodeFrom === b.nodeTo) continue;
                let qSolved = b.g * ((P[b.nodeFrom] - P[b.nodeTo]) + b.hsrc - (b.Zto - b.Zfrom));
                if (!isFin(qSolved)) qSolved = 0;
                const dqTrue = Math.abs(qSolved - b.Q);     // pre-relaxation residual
                let qNew = b.Q + relax * (qSolved - b.Q);
                qNew = clamp(qNew, -Q_CAP, Q_CAP);          // catch cold-start overshoot
                if (!isFin(qNew)) qNew = 0;
                if (dqTrue > maxDQ) maxDQ = dqTrue;
                b.Q = qNew;
            }
            if (maxDQ < TOL) { iters++; converged = true; break; }
            // Adaptive damping: a residual that GREW means the secant update is
            // oscillating (stiff loops — a steep pump curve, pumps in series); cut
            // the relaxation so it settles instead of limit-cycling. The 0.005 floor
            // (down from 0.05) is what lets a genuinely stiff loop — several high-
            // head pumps in series on a near-frictionless circuit — ratchet down far
            // enough to settle within MAX_ITERS instead of limit-cycling at the cap.
            // Relax is monotone-decreasing within a solve (it does NOT recover): on
            // a stiff loop a recovery step just re-amplifies the oscillation it was
            // damping. relax resets to RELAX at the top of each solve, so a warm
            // steady-state tick still starts undamped and converges in 1–3 iters.
            if (maxDQ > prevMaxDQ) relax = Math.max(relax * 0.5, 0.005);
            prevMaxDQ = maxDQ;
        }
        // final sanitize — never hand a non-finite flow back
        for (let i = 0; i < branches.length; i++) {
            if (!isFin(branches[i].Q)) branches[i].Q = 0;
        }
        // A flow pinned at the clamp ceiling means the true operating point is
        // beyond Q_CAP (a physically unreal loop) — the iteration "converged" on
        // the clamp, not the physics. Report NOT converged so a caller doesn't
        // trust a saturated flow that grossly violates the branch law.
        for (let i = 0; i < branches.length; i++) {
            if (Math.abs(branches[i].Q) >= Q_CAP * 0.999) { converged = false; break; }
        }
        return { converged: converged, iters: iters, maxDQ: maxDQ };
    }

    // ── outlet temperature law for one branch ───────────────────────
    function branchThermal(b) {
        const Tin = b.Tin;
        const aq = Math.max(Math.abs(b.Q), Q_MIN);
        if (b.thermal === 'adiabatic') return Tin;

        if (b.thermal === 'load') {            // coil — terminal exchanger with the space
            const p = b.comp.params;
            const tspace = asNum(p.tspace, 70);
            // Duty (Btu/h). 'ua' mode: q = UA·|Tin−tspace|, so the duty tracks
            // the approach (falls as the water nears the space, climbs with a
            // bigger approach) the way a real coil does. 'load' (default): a
            // fixed design Btu/h, independent of approach. Both then split the
            // duty across the flow as a temperature drop: ΔT = q/(500·GPM).
            const q = (p.coilmode === 'ua')
                ? Math.max(asNum(p.ua, 1000), 0) * Math.abs(Tin - tspace)
                : Math.abs(asNum(p.qdesign, 120)) * 1000;       // MBH → Btu/h
            const dT = q / (K_BTU * aq);
            // Water moves TOWARD the space temperature (physics-derived sign:
            // hot water cools at a heating coil, chilled water warms at a cooling
            // coil), and can't passively cross it — cap at tspace.
            if (tspace >= Tin) return clamp(Math.min(Tin + dT, tspace), TEMP_MIN, TEMP_MAX);
            return clamp(Math.max(Tin - dT, tspace), TEMP_MIN, TEMP_MAX);
        }

        if (b.thermal === 'source') {          // plant — boiler / chiller
            const p = b.comp.params;
            const lwt = asNum(p.lwt, 180);
            const qmax = Math.abs(asNum(p.qmax, 400)) * 1000;   // MBH → Btu/h
            const dTcap = qmax / (K_BTU * aq);                  // max ΔT the plant can deliver
            if (p.srcmode === 'capacity') {
                const sign = (p.mode === 'cool') ? -1 : 1;
                return clamp(Tin + sign * dTcap, TEMP_MIN, TEMP_MAX);
            }
            // setpoint: hold the leaving temp to lwt, but only on the plant's own
            // side of the water — a boiler can only ADD heat, a chiller only
            // REMOVE it. Without the mode gate, a return hotter than a heating
            // setpoint would make the "boiler" cool the loop (and vice-versa).
            // qmax caps how far it gets; off its correct side it's a pass-through.
            const want = lwt - Tin;
            const dT = (p.mode === 'cool') ? clamp(want, -dTcap, 0) : clamp(want, 0, dTcap);
            return clamp(Tin + dT, TEMP_MIN, TEMP_MAX);
        }
        return Tin;
    }

    // ── thermal sweep: transport temperature on the known flows ─────
    // Two-phase, one-tick-delay (FBE convention): (A) every branch reads its
    // UPSTREAM node's temperature from last tick and computes its outlet temp;
    // (B) every node's new temperature is the flow-weighted mix of the branches
    // flowing INTO it. A closed loop therefore warms/cools over a few ticks
    // (transport lag — pedagogically the point) and the scheme is
    // unconditionally stable (every node is a bounded flow-weighted average).
    function thermalSweep(model, system) {
        const nodes = model.nodes, branches = model.branches;

        // Phase A — branch inlet (upstream node, old temp) → branch outlet temp.
        for (let i = 0; i < branches.length; i++) {
            const b = branches[i];
            const up = b.Q >= 0 ? b.nodeFrom : b.nodeTo;
            const dn = b.Q >= 0 ? b.nodeTo : b.nodeFrom;
            b.up = up; b.dn = dn;
            b.Tin = nodes[up].T;
            const t = branchThermal(b);
            b.Tout = isFin(t) ? t : nodes[up].T;
        }

        // Phase B — node temp = Σ(|Q_in|·Tout) / Σ|Q_in| over inflowing branches.
        const newT = new Array(nodes.length);
        for (let i = 0; i < nodes.length; i++) {
            let sw = 0, swt = 0;
            for (let j = 0; j < branches.length; j++) {
                const b = branches[j];
                if (b.dn !== i) continue;
                const w = Math.abs(b.Q);
                sw += w; swt += w * b.Tout;
            }
            // Σ|Q_in| below the floor → hold previous (no divide-by-zero).
            newT[i] = (sw > Q_MIN) ? clamp(swt / sw, TEMP_MIN, TEMP_MAX) : nodes[i].T;
        }
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].T = isFin(newT[i]) ? newT[i] : nodes[i].T;
        }
    }

    // ── write per-pipe / per-component results back for the render ──
    function writeback(model, system) {
        const branches = model.branches, nodes = model.nodes;
        const branchById = {};
        branches.forEach((b) => { branchById[b.id] = b; });

        // warm-start caches for next tick
        const warm = {}, temp = {};
        branches.forEach((b) => { warm[b.id] = b.Q; });
        nodes.forEach((nd) => { temp[nd.key] = nd.T; });
        system._warm = warm;
        system._temp = temp;

        // pipes: flow magnitude/sign + water temperature (its upstream temp),
        // plus the 3D developed length and its friction head loss for the
        // readouts (length/dH are display outputs, NOT the k_pipe override input).
        system.pipes.forEach((p) => {
            const b = branchById['pipe#' + p.id];
            if (!b) { p.Q = 0; p.dir = 0; p.T = T_NEUTRAL; p.length = 0; p.dH = 0; return; }
            p.Q = Math.abs(b.Q);
            p.dir = b.Q > Q_MIN ? 1 : (b.Q < -Q_MIN ? -1 : 0);
            p.T = b.Tin;
            // a self-loop pipe (both ends on one merged node) carries no flow —
            // report 0 length too so the readout shows no phantom run for it.
            p.length = (b.nodeFrom === b.nodeTo || !isFin(b.length)) ? 0 : b.length;   // developed run, ft
            p.dH = b.k * p.Q * p.Q;                              // friction head loss, ft
        });

        // components: a per-type `out` object the page reads onto its readouts.
        system.components.forEach((c) => {
            const b0 = branchById[c.id + '#0'];
            const out = {};
            switch (c.type) {
                case 'pump': {
                    out.Q = b0 ? Math.abs(b0.Q) : 0;
                    out.head = b0 ? b0.hsrc : 0;
                    out.speed = clamp(asNum(c.params.speed, 100), 0, 100);
                    out.on = !!c.params.on;
                    break;
                }
                case 'plant': {
                    out.Q = b0 ? Math.abs(b0.Q) : 0;
                    out.ewt = b0 ? b0.Tin : T_NEUTRAL;
                    out.lwt = b0 ? b0.Tout : T_NEUTRAL;
                    out.Qheat = K_BTU * out.Q * Math.abs(out.lwt - out.ewt);   // Btu/h
                    out.mode = c.params.mode;
                    break;
                }
                case 'coil': {
                    out.Q = b0 ? Math.abs(b0.Q) : 0;
                    out.Tin = b0 ? b0.Tin : T_NEUTRAL;
                    out.Tout = b0 ? b0.Tout : T_NEUTRAL;
                    out.dT = Math.abs(out.Tin - out.Tout);
                    out.Qheat = K_BTU * out.Q * out.dT;                        // Btu/h delivered
                    break;
                }
                case 'valve2': {
                    out.Q = b0 ? Math.abs(b0.Q) : 0;
                    out.posPct = clamp(asNum(c.params.pos), 0, 100);
                    break;
                }
                case 'valve3': {
                    const bb = branchById[c.id + '#0'];   // a→b through
                    const bc = branchById[c.id + '#1'];   // a→c bypass
                    out.Qb = bb ? Math.abs(bb.Q) : 0;
                    out.Qc = bc ? Math.abs(bc.Q) : 0;
                    out.posPct = clamp(asNum(c.params.pos), 0, 100);
                    break;
                }
                case 'balanceValve': {
                    out.Q = b0 ? Math.abs(b0.Q) : 0;
                    out.setting = clamp(asNum(c.params.setting), 0, 100);
                    break;
                }
                case 'tee': {
                    const idx = model.nodes.findIndex((nd) =>
                        nd.members.indexOf(portKey(c.id, 'a')) !== -1);
                    out.T = idx >= 0 ? model.nodes[idx].T : T_NEUTRAL;
                    break;
                }
                default: break;
            }
            c.out = out;
        });
    }

    // ── public solve / tick ─────────────────────────────────────────

    // Hydraulics only (no thermal, no writeback). For unit tests that want the
    // raw node/branch model + convergence info.
    function solve(system) {
        const model = flatten(system);
        const info = solveHydraulics(model);
        model.converged = info.converged;
        model.iters = info.iters;
        model.maxDQ = info.maxDQ;
        return model;
    }

    // One full tick: flatten → hydraulics → thermal → writeback. `dt` is
    // accepted for API symmetry with fbe-engine (and future transient models);
    // the steady-state solve doesn't integrate over it, but the thermal sweep's
    // one-tick-delay already advances the loop temperature one step per call.
    function tick(system, dt) {
        const model = flatten(system);
        const info = solveHydraulics(model);
        thermalSweep(model, system);
        writeback(model, system);
        system._lastConverged = info.converged;
        system._lastIters = info.iters;
        return model;
    }

    return {
        COMPONENTS: COMPONENTS,
        CATEGORIES: CATEGORIES,
        SETTINGS: SETTINGS,
        createComponent: createComponent,
        makeSystem: makeSystem,
        solve: solve,
        tick: tick,
    };
})();

if (typeof window !== 'undefined') { window.HYDRO = HYDRO; }
if (typeof module !== 'undefined' && module.exports) { module.exports = HYDRO; }
