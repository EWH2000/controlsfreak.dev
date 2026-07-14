// ──────────────────────────────────────────────────────────────────────
// wiring-engine.js — circuit-validation core for the Controller Wiring
// Simulator (/simulators/controller-wiring.html).
//
// Loaded as a *classic* script (no type="module"): the page's logic lives
// in an IIFE-wrapped inline <script> whose bindings can't be reached from
// outside, so the engine exposes its API as a plain global. Same
// convention as /scripts/fbe-engine.js, /scripts/pid-engine.js, and
// /scripts/psychro-engine.js. A page that wants the engine adds
//
//     <script src="/scripts/wiring-engine.js"></script>
//
// before its own inline <script>. The 11ty build copies this through
// unchanged — nothing transpiles or bundles.
//
// PURE — no DOM. The page owns the canvas, the click-to-wire UI, the
// faceplate, and the fault/animation rendering; the engine owns only the
// terminal model, the device catalog, and the per-evaluation circuit
// solver.
//
// Unlike fbe-engine.js (a directional dataflow graph + per-tick
// evaluator), conductors here are *undirected*: a wire is a length of
// copper between two terminals, and evaluation is circuit-level —
// union-find the terminals into nets, classify nets as HOT / COM off the
// transformer, then walk each field device to decide what its controller
// point reads (or how it fails). 24 VAC is abstracted as a DC-style
// +24 / 0 reference so "short", "reversed", and "open common" fall out of
// simple net math; this is a teaching model, not SPICE. The controller also
// exposes a DC LOOP+ terminal (its own loop-power supply) that sources 2-wire
// 4-20 mA current loops — DC by nature, kept distinct from the AC hot leg.
//
// API (window.Wiring):
//
//   Wiring.CONTROLLER          the DDC-8 terminal model { id, label, terminals[] }
//   Wiring.DEVICES             field-device catalog: type → definition
//   Wiring.createDevice(type, id)   fresh instance (copies default field value)
//   Wiring.evaluate(panel, state) → { power, points, faults, cues }
//
// A panel is { devices:[{type,id,field}], wires:[{a:[node,term], b:[node,term]}] }
// where `node` is 'ctlr' or a device id, and `term` is a terminal id on
// that node. `state` is the live controller faceplate state:
//   { uiMode:{ui1:'r'|'v'|'ma',…}, ao:{ao1:0..100,…}, bo:{bo1:bool,…} }
//
// evaluate() returns:
//   power  { powered, reversed, shorted, openCommon, overload, vaUsed, vaBudget, hasXfmr }
//   points { <termId>: { state, display, led } }   one per UI/BI/AO/BO
//   faults [ { id, term, severity:'short'|'fault'|'warn', text } ]
//   cues   { blownFuse, spark:[term…], dead:[term…] }   page animates these
// ──────────────────────────────────────────────────────────────────────

'use strict';

const Wiring = (function () {
    'use strict';

    // ── controller terminal model (GENERIC DDC-8) ───────────────────
    // group: power | pwrdc | ui | bi | ao | bo | boc | com | net
    // All com* terminals (and 24com) are one internal node — a DDC's
    // signal reference is its power common. The LOOP+ terminal (group
    // 'pwrdc') is the controller's internal DC loop-power supply, referenced
    // to that common; it sources 2-wire 4-20 mA loops (DC), never the AC hot
    // leg. NET terminals are greyed 'future' (the bus simulator owns
    // networking) and never wire.
    const CONTROLLER = {
        id: 'ctlr',
        label: 'GENERIC DDC-8',
        terminals: [
            { id: '24v',   label: '24V~',  group: 'power' },
            { id: '24com', label: '24COM', group: 'power' },
            { id: 'loop',  label: 'LOOP+', group: 'pwrdc' },
            { id: 'com-a', label: 'COM',   group: 'com' },
            { id: 'com-b', label: 'COM',   group: 'com' },
            { id: 'ui1',   label: 'UI1',   group: 'ui' },
            { id: 'ui2',   label: 'UI2',   group: 'ui' },
            { id: 'ui3',   label: 'UI3',   group: 'ui' },
            { id: 'ui4',   label: 'UI4',   group: 'ui' },
            { id: 'bi1',   label: 'BI1',   group: 'bi' },
            { id: 'bi2',   label: 'BI2',   group: 'bi' },
            { id: 'ao1',   label: 'AO1',   group: 'ao' },
            { id: 'ao2',   label: 'AO2',   group: 'ao' },
            { id: 'boc',   label: 'BO-C',  group: 'boc' },
            { id: 'bo1',   label: 'BO1',   group: 'bo' },
            { id: 'bo2',   label: 'BO2',   group: 'bo' },
            { id: 'net+',  label: 'NET+',  group: 'net', disabled: true },
            { id: 'net-',  label: 'NET−', group: 'net', disabled: true },
            { id: 'ref',   label: 'REF',   group: 'net', disabled: true },
        ],
    };

    // The com node members — pre-bonded into one net every evaluation.
    const COM_TERMS = ['24com', 'com-a', 'com-b'];
    const UI_TERMS = ['ui1', 'ui2', 'ui3', 'ui4'];
    const BI_TERMS = ['bi1', 'bi2'];
    const AO_TERMS = ['ao1', 'ao2'];
    const BO_TERMS = ['bo1', 'bo2'];

    // ── field-device catalog ────────────────────────────────────────
    // Each device declares its terminals and a small physical model.
    // `va` is the VA it pulls from the transformer *when energized*.
    // `field` is the default sensed/true value the page can override.
    const DEVICES = {
        xfmr: {
            label: '24 VAC XFMR',
            blurb: 'Control transformer',
            va: 0,                       // the *source*, not a load
            vaBudget: 40,                // VA it can supply
            terminals: [
                { id: 'hot', label: '24V~', kind: 'hot' },
                { id: 'com', label: 'COM',  kind: 'xcom' },
            ],
        },
        therm10k: {
            label: '10K THERMISTOR',
            blurb: 'Temp sensor (resistance)',
            sensor: 'r',                 // controller UI must be in 'r' mode
            va: 0,
            field: { tempF: 72.4 },
            terminals: [
                { id: 'l1', label: 'S', kind: 'sig' },
                { id: 'l2', label: 'C', kind: 'ret' },
            ],
        },
        xmtr010: {
            label: '0-10V XMTR',
            blurb: 'Pressure transmitter (3-wire)',
            sensor: 'v',                 // controller UI must be in 'v' mode
            va: 1.5,                     // self-powered, light draw
            field: { pct: 46 },          // % of range → volts
            terminals: [
                { id: 'pwr', label: '+24', kind: 'pwr' },
                { id: 'sig', label: 'OUT', kind: 'sig' },
                { id: 'com', label: 'COM', kind: 'ret' },
            ],
        },
        xmtr420: {
            label: '4-20mA XMTR',
            blurb: 'Pressure transmitter (2-wire loop)',
            sensor: 'ma',                // controller UI must be in 'ma' mode
            va: 0,                       // loop-powered, trivial
            field: { pct: 62 },          // % of range → mA
            terminals: [
                { id: 'plus',  label: '+', kind: 'loop+' },
                { id: 'minus', label: '−', kind: 'loop-' },
            ],
        },
        dryContact: {
            label: 'DRY CONTACT',
            blurb: 'Status / proof (BI)',
            va: 0,
            field: { closed: true },
            terminals: [
                { id: 'a', label: '1', kind: 'dc' },
                { id: 'b', label: '2', kind: 'dc' },
            ],
        },
        act010: {
            label: '0-10V ACTUATOR',
            blurb: 'Damper / valve (modulating)',
            va: 4,
            terminals: [
                { id: 'pwr', label: '24V~', kind: 'pwr' },
                { id: 'com', label: '24COM', kind: 'pcom' },
                { id: 'sig', label: 'Y',  kind: 'ain' },
                { id: 'scom', label: 'COM', kind: 'ret' },
            ],
        },
        relayFan: {
            label: 'FAN CONTACTOR',
            blurb: '24 VAC load (switched by BO)',
            va: 10,
            terminals: [
                { id: 'l1', label: 'A', kind: 'load' },
                { id: 'l2', label: 'B', kind: 'load' },
            ],
        },
    };

    const CATALOG_ORDER = ['xfmr', 'therm10k', 'xmtr010', 'xmtr420', 'dryContact', 'act010', 'relayFan'];

    function createDevice(type, id) {
        const def = DEVICES[type];
        if (!def) return null;
        const inst = { type: type, id: id };
        if (def.field) inst.field = JSON.parse(JSON.stringify(def.field));
        return inst;
    }

    // ── union-find over terminal keys ───────────────────────────────
    // A terminal key is `${nodeId}|${termId}`.
    function key(node, term) { return node + '|' + term; }

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

    // ── the solver ──────────────────────────────────────────────────
    function evaluate(panel, state) {
        panel = panel || { devices: [], wires: [] };
        state = state || {};
        // Drop any device whose type isn't in the catalog before the
        // passes run — deviceOn() dereferences DEVICES[d.type].terminals
        // with no guard, so an unknown type (a corrupted persisted panel
        // or a future API consumer) would otherwise crash the whole public
        // evaluate(). createDevice() already returns null for unknown
        // types; this gives evaluate() the same graceful-skip contract.
        // (codebase-issues #99)
        const devices = (panel.devices || []).filter((d) => DEVICES[d.type]);
        const wires = panel.wires || [];
        const uiMode = state.uiMode || {};
        const ao = state.ao || {};
        const bo = state.bo || {};

        const uf = makeUF();

        // 1. user wires
        wires.forEach((w) => uf.union(key(w.a[0], w.a[1]), key(w.b[0], w.b[1])));

        // 2. controller internal bonds: all coms are one net.
        COM_TERMS.forEach((t) => uf.union(key('ctlr', '24com'), key('ctlr', t)));

        // 3. BO relays: a commanded-ON relay bonds BO-C to its BOn.
        BO_TERMS.forEach((t) => { if (bo[t]) uf.union(key('ctlr', 'boc'), key('ctlr', t)); });

        // 4. closed dry contacts bond their two leads.
        devices.forEach((d) => {
            if (d.type === 'dryContact' && d.field && d.field.closed) {
                uf.union(key(d.id, 'a'), key(d.id, 'b'));
            }
        });

        const root = (node, term) => uf.find(key(node, term));
        const same = (n1, t1, n2, t2) => root(n1, t1) === root(n2, t2);

        // ── classify nets as HOT / COM off the transformer(s) ───────
        const xfmrs = devices.filter((d) => d.type === 'xfmr');
        const hasXfmr = xfmrs.length > 0;
        const hotRoots = new Set();
        const comRoots = new Set();
        xfmrs.forEach((x) => {
            hotRoots.add(root(x.id, 'hot'));
            comRoots.add(root(x.id, 'com'));
        });
        const isHot = (node, term) => hotRoots.has(root(node, term));
        const isCom = (node, term) => comRoots.has(root(node, term));

        const faults = [];
        const cues = { blownFuse: false, spark: [], dead: [] };
        const addFault = (id, term, severity, text) => faults.push({ id: id, term: term, severity: severity, text: text });

        // ── POWER PASS ──────────────────────────────────────────────
        // Dead short: any transformer whose hot and com land in one net.
        let shorted = false;
        xfmrs.forEach((x) => {
            if (root(x.id, 'hot') === root(x.id, 'com')) {
                shorted = true;
                addFault('short-xfmr', '24v', 'short',
                    'Dead short across the transformer — 24V~ tied straight to COM. The fuse blows.');
            }
        });
        // Two transformers paralleled onto one net (phasing fight).
        if (xfmrs.length > 1 && (hotRoots.size < xfmrs.length || comRoots.size < xfmrs.length)) {
            // Some hot or com legs share a net across different transformers.
            const crossed = xfmrs.some((x) =>
                xfmrs.some((y) => x !== y && (root(x.id, 'hot') === root(y.id, 'hot') ||
                                              root(x.id, 'hot') === root(y.id, 'com'))));
            if (crossed) {
                shorted = true;
                addFault('xfmr-fight', '24v', 'short',
                    'Two transformers tied together — mismatched phase fights across the trunk. The fuse blows.');
            }
        }

        const ctlrHotOn24v = isHot('ctlr', '24v');
        const ctlrComOn24com = isCom('ctlr', '24com');
        // A short ties hot+com into one net, which would also read as
        // "reversed"; let the short own that case.
        const reversed = !shorted && hasXfmr && isCom('ctlr', '24v') && isHot('ctlr', '24com');
        let openCommon = false;
        let powered = false;

        if (reversed) {
            addFault('reversed', '24v', 'fault',
                'Power reversed — 24V~ and 24COM are swapped. The controller common rides the hot leg. ' +
                'Alone on its own transformer this can even run — the danger is sharing: any common wire ' +
                'to a correctly-phased device now bridges the two secondary legs, a dead short.');
            cues.spark.push('24v');
        } else if (ctlrHotOn24v && ctlrComOn24com && !shorted) {
            powered = true;
        } else if (ctlrHotOn24v && !ctlrComOn24com && hasXfmr) {
            openCommon = true;
            addFault('open-common', '24com', 'fault',
                '24COM is not landed back to the transformer — the controller has no common reference. Nothing reads.');
        } else if (!hasXfmr) {
            addFault('no-power', '24v', 'warn',
                'No transformer wired — land 24V~ and 24COM from a control transformer to power the controller.');
        } else if (!ctlrHotOn24v) {
            addFault('no-hot', '24v', 'warn',
                '24V~ is not landed from the transformer hot leg — the controller is unpowered.');
        }

        // ── VA budget ───────────────────────────────────────────────
        const vaBudget = xfmrs.reduce((s, x) => s + DEVICES.xfmr.vaBudget, 0);
        let vaUsed = powered ? 8 : 0;            // controller's own draw
        // (loads tallied during the point pass below, then checked.)

        // ── helpers for point readings ──────────────────────────────
        const live = powered && !shorted;
        // DC LOOP+ sources the 4-20 mA loop only when the controller is
        // powered (it's the controller's internal DC supply, referenced to
        // COM) — never the AC hot leg.
        const isLoopPower = (node, term) => live && root(node, term) === root('ctlr', 'loop');
        // A point is "dead" when the controller has no power to read/drive it.
        function deadPoint(term) {
            cues.dead.push(term);
            return { state: 'dead', display: '———', led: 'off' };
        }

        const points = {};

        // Find a device terminal that shares a net with a controller terminal.
        function deviceOn(ctlrTerm) {
            // returns array of {device, term} whose net == ctlrTerm's net
            const r = root('ctlr', ctlrTerm);
            const hits = [];
            devices.forEach((d) => {
                const def = DEVICES[d.type];
                def.terminals.forEach((t) => {
                    if (root(d.id, t.id) === r) hits.push({ device: d, term: t.id });
                });
            });
            return hits;
        }

        // ── INPUT PASS: UI ──────────────────────────────────────────
        // A sensor is "home" on the UI its SIGNAL lead lands on (not its
        // return) — so a return miswired to another input doesn't make a
        // phantom second sensor.
        const SIG_TERM = { therm10k: 'l1', xmtr010: 'sig', xmtr420: 'minus' };
        UI_TERMS.forEach((ui) => {
            const mode = uiMode[ui] || 'r';
            if (!live) { points[ui] = deadPoint(ui); return; }
            const dev = devices.find((d) =>
                SIG_TERM[d.type] && root(d.id, SIG_TERM[d.type]) === root('ctlr', ui));
            if (!dev) { points[ui] = { state: 'idle', display: 'no sensor', led: 'off' }; return; }
            const ddef = DEVICES[dev.type];

            // short: both thermistor leads share this UI net
            const bothLeads = dev.type === 'therm10k' &&
                root(dev.id, 'l1') === root('ctlr', ui) && root(dev.id, 'l2') === root('ctlr', ui);
            if (bothLeads) {
                addFault('ui-short-' + ui, ui, 'fault',
                    ui.toUpperCase() + ': both thermistor leads on the same point — shorted, reads full-scale hot.');
                points[ui] = { state: 'fault', display: 'SHORT', led: 'alarm' };
                return;
            }

            if (dev.type === 'therm10k') {
                const retOk = ddef.terminals.some((t) => t.id === 'l2' && isCom(dev.id, 'l2'));
                if (!retOk) {
                    addFault('ui-open-' + ui, ui, 'fault',
                        ui.toUpperCase() + ': thermistor return not landed on COM — open circuit, reads full-scale cold.');
                    points[ui] = { state: 'open', display: 'OPEN', led: 'alarm' };
                    return;
                }
                if (mode !== 'r') {
                    addFault('ui-mode-' + ui, ui, 'fault',
                        ui.toUpperCase() + ' is set to ' + modeName(mode) + ' but a 10K thermistor is a resistance sensor — set the input to Resistance.');
                    points[ui] = { state: 'fault', display: badRead(mode), led: 'warn' };
                    return;
                }
                points[ui] = { state: 'ok', display: fmtTemp(dev.field.tempF), led: 'run' };
                return;
            }

            if (dev.type === 'xmtr010') {
                const pwrOk = isHot(dev.id, 'pwr');
                const comOk = isCom(dev.id, 'com');
                if (!pwrOk || !comOk) {
                    addFault('ui-unpwr-' + ui, ui, 'fault',
                        ui.toUpperCase() + ': 0-10V transmitter has no power — land +24 to the hot leg and COM to the common. Reads 0.');
                    points[ui] = { state: 'fault', display: '0.0 V', led: 'alarm' };
                    return;
                }
                if (mode !== 'v') {
                    addFault('ui-mode-' + ui, ui, 'fault',
                        ui.toUpperCase() + ' is set to ' + modeName(mode) + ' but the transmitter is a 0-10V signal — set the input to Voltage.');
                    points[ui] = { state: 'fault', display: badRead(mode), led: 'warn' };
                    return;
                }
                vaUsed += ddef.va;
                points[ui] = { state: 'ok', display: fmtVolt(dev.field.pct), led: 'run' };
                return;
            }

            if (dev.type === 'xmtr420') {
                // 2-wire loop: + must come from the DC LOOP+ terminal, - must
                // reach this UI (current mode). A real loop is DC loop-powered;
                // landing + on the AC 24V~ hot leg is the classic mistake.
                const loopPowered = isLoopPower(dev.id, 'plus');
                const onAcHot = isHot(dev.id, 'plus');
                const minusOnUi = root(dev.id, 'minus') === root('ctlr', ui);
                if (!minusOnUi) {
                    points[ui] = { state: 'idle', display: 'no sensor', led: 'off' };
                    return;
                }
                if (!loopPowered) {
                    addFault('ui-loop-' + ui, ui, 'fault', onAcHot
                        ? ui.toUpperCase() + ': a 4-20mA loop needs DC loop power — land + on LOOP+, not the 24 VAC hot leg. Reads 0 mA.'
                        : ui.toUpperCase() + ': 4-20mA loop has no power — the + leg must come from the LOOP+ (DC loop-power) terminal. Reads 0 mA.');
                    points[ui] = { state: 'fault', display: '0.0 mA', led: 'alarm' };
                    return;
                }
                if (mode !== 'ma') {
                    addFault('ui-mode-' + ui, ui, 'fault',
                        ui.toUpperCase() + ' is set to ' + modeName(mode) + ' but this is a 4-20mA loop — set the input to Current.');
                    points[ui] = { state: 'fault', display: badRead(mode), led: 'warn' };
                    return;
                }
                points[ui] = { state: 'ok', display: fmtMa(dev.field.pct), led: 'run' };
                return;
            }

            points[ui] = { state: 'idle', display: 'no sensor', led: 'off' };
        });

        // ── INPUT PASS: BI ──────────────────────────────────────────
        BI_TERMS.forEach((bi) => {
            const hits = deviceOn(bi).filter((h) => h.device.type === 'dryContact');
            if (!live) { points[bi] = deadPoint(bi); return; }
            if (hits.length === 0) { points[bi] = { state: 'idle', display: 'no input', led: 'off' }; return; }
            const dev = hits[0].device;
            const retOk = isCom(dev.id, 'a') || isCom(dev.id, 'b');
            if (!retOk) {
                addFault('bi-open-' + bi, bi, 'fault',
                    bi.toUpperCase() + ': contact return not landed on COM — the input can never make. Stuck OPEN.');
                points[bi] = { state: 'open', display: 'OPEN', led: 'warn' };
                return;
            }
            const closed = dev.field && dev.field.closed;
            points[bi] = { state: 'ok', display: closed ? 'CLOSED' : 'OPEN', led: closed ? 'run' : 'off' };
        });

        // ── OUTPUT PASS: AO ─────────────────────────────────────────
        AO_TERMS.forEach((aoT) => {
            const cmd = clampPct(ao[aoT]);
            const hits = deviceOn(aoT).filter((h) => h.device.type === 'act010');
            if (!live) { points[aoT] = deadPoint(aoT); return; }
            if (hits.length === 0) { points[aoT] = { state: 'idle', display: cmd + '%', led: 'off' }; return; }
            const dev = hits[0].device;
            const sigOk = root(dev.id, 'sig') === root('ctlr', aoT);
            if (!sigOk) { points[aoT] = { state: 'idle', display: cmd + '%', led: 'off' }; return; }
            const pwrOk = isHot(dev.id, 'pwr') && isCom(dev.id, 'com');
            const scomOk = isCom(dev.id, 'scom');
            if (!pwrOk) {
                addFault('ao-unpwr-' + aoT, aoT, 'fault',
                    aoT.toUpperCase() + ': actuator has no 24 VAC power — it sees the signal but can\'t drive. Dead at 0%.');
                points[aoT] = { state: 'fault', display: 'DEAD', led: 'alarm' };
                return;
            }
            if (!scomOk) {
                addFault('ao-scom-' + aoT, aoT, 'fault',
                    aoT.toUpperCase() + ': actuator signal common not landed on COM — no shared reference, the command floats.');
                points[aoT] = { state: 'fault', display: '~~~', led: 'warn' };
                return;
            }
            vaUsed += DEVICES.act010.va;
            points[aoT] = { state: 'ok', display: cmd + '%', led: cmd > 0 ? 'run' : 'off', drive: cmd };
        });

        // ── OUTPUT PASS: BO ─────────────────────────────────────────
        BO_TERMS.forEach((boT) => {
            const on = !!bo[boT];
            const hits = deviceOn(boT).filter((h) => h.device.type === 'relayFan');
            if (!live) { points[boT] = deadPoint(boT); return; }
            if (hits.length === 0) { points[boT] = { state: 'idle', display: on ? 'ON' : 'OFF', led: on ? 'run' : 'off' }; return; }
            const dev = hits[0].device;
            // load other leg must return to COM
            const otherCom = isCom(dev.id, 'l1') || isCom(dev.id, 'l2');
            // BO-C must be fed from the hot leg for the relay to pass power
            const bocHot = isHot('ctlr', 'boc');
            if (!otherCom) {
                addFault('bo-noret-' + boT, boT, 'fault',
                    boT.toUpperCase() + ': the load has no return to COM — the circuit never completes.');
                points[boT] = { state: 'fault', display: 'DEAD', led: 'warn' };
                return;
            }
            if (!bocHot) {
                addFault('bo-unpwr-' + boT, boT, 'fault',
                    boT.toUpperCase() + ': BO-C is not fed from 24V~ — the relay clicks but no power reaches the load. Commands but stays dead.');
                points[boT] = { state: 'fault', display: on ? 'NO PWR' : 'OFF', led: 'alarm' };
                return;
            }
            // energized only when relay closed (on) — BO-C bonds to BOn in step 3,
            // putting the load across hot↔com.
            const running = on;
            if (running) vaUsed += DEVICES.relayFan.va;
            points[boT] = { state: 'ok', display: running ? 'ON' : 'OFF', led: running ? 'run' : 'off' };
        });

        // ── VA overload ─────────────────────────────────────────────
        const overload = powered && hasXfmr && vaUsed > vaBudget;
        if (overload) {
            cues.blownFuse = true;
            addFault('overload', '24v', 'short',
                'Transformer overloaded — ' + Math.round(vaUsed) + ' VA on a ' + vaBudget + ' VA transformer. The fuse blows.');
        }
        if (shorted) cues.blownFuse = true;

        // When the fuse blows, every point drops dead.
        if (cues.blownFuse) {
            Object.keys(points).forEach((p) => {
                if (points[p].state !== 'idle') { points[p] = { state: 'dead', display: '———', led: 'off' }; }
            });
            cues.dead = Object.keys(points);
        }

        return {
            power: {
                powered: powered && !cues.blownFuse,
                reversed: reversed,
                shorted: shorted,
                openCommon: openCommon,
                overload: overload,
                vaUsed: vaUsed,
                vaBudget: vaBudget,
                hasXfmr: hasXfmr,
                blownFuse: cues.blownFuse,
            },
            points: points,
            faults: faults,
            cues: cues,
        };
    }

    // ── small formatters ────────────────────────────────────────────
    // isFinite, not a typeof check: typeof NaN === 'number' is true, so the
    // old `typeof x === 'number' ? x : 0` let NaN through and an AO point
    // rendered 'NaN%'. CLAUDE.md's JS-patterns calls for !isFinite over a
    // NaN-prone type check on numeric inputs. (codebase-issues #100)
    const clampPct = (x) => {
        const n = Math.round(x);
        return isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
    };
    function fmtTemp(f) { return (Math.round(f * 10) / 10).toFixed(1) + '°F'; }
    // 0-10V transmitter: % of range maps to volts.
    function fmtVolt(pct) { return (pct / 10).toFixed(1) + ' V'; }
    // 4-20mA: 0% → 4 mA, 100% → 20 mA.
    function fmtMa(pct) { return (4 + pct / 100 * 16).toFixed(1) + ' mA'; }
    function modeName(m) { return m === 'r' ? 'Resistance' : m === 'v' ? 'Voltage' : 'Current'; }
    // What the wrong-mode read looks like — a believable-but-wrong number.
    function badRead(m) { return m === 'r' ? '∞ Ω' : m === 'v' ? '10.0 V' : '20.0 mA'; }

    return {
        CONTROLLER: CONTROLLER,
        DEVICES: DEVICES,
        CATALOG_ORDER: CATALOG_ORDER,
        createDevice: createDevice,
        evaluate: evaluate,
    };
})();

if (typeof window !== 'undefined') window.Wiring = Wiring;
if (typeof module !== 'undefined' && module.exports) module.exports = Wiring;
