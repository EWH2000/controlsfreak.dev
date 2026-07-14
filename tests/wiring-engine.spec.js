// Engine-direct tests for /scripts/wiring-engine.js (codebase-issues
// #95). Same vm loader trick as fbe-engine.spec.js / psychro-engine.spec.js:
// Playwright workers are Node processes, the `page` fixture is unused.
//
// wiring-engine.js ends with `const Wiring = (function(){…})();` plus
// window/module guards. A trailing `; Wiring;` makes runInNewContext
// return the engine; the guards skip (no window/module in the vm).
//
// Before this spec the engine — a 542-line union-find circuit solver with
// a large fault tree — was exercised only by two UI presets in
// smoke.spec.js (clean AHU + broken-fuse short). The reversed / open-common
// / overload branches and the union-find merge logic were reachable nowhere,
// and the engine fails soft (no console error), so a fault-class mislabel or
// threshold drift produced no CI signal.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

function loadEngine() {
    const src = fs.readFileSync(
        path.join(__dirname, '..', 'html', 'scripts', 'wiring-engine.js'),
        'utf8',
    );
    return vm.runInNewContext(src + '\n; Wiring;', {});
}

// A wire joins two [node, terminal] endpoints. `node` is 'ctlr' or a
// device id; `term` is a terminal id on that node.
const W = (a, b) => ({ a, b });

// Convenience: collect the fault ids an evaluation produced.
const faultIds = (r) => r.faults.map((f) => f.id);

// Minimal clean landing: a transformer powering the controller, plus a
// thermistor read correctly on UI1. Built fresh per call so a test can
// mutate it without bleed.
function cleanPanel(Wiring) {
    return {
        devices: [
            Wiring.createDevice('xfmr', 'x1'),
            Wiring.createDevice('therm10k', 't1'),
        ],
        wires: [
            W(['x1', 'hot'], ['ctlr', '24v']),
            W(['x1', 'com'], ['ctlr', '24com']),
            W(['t1', 'l1'],  ['ctlr', 'ui1']),
            W(['t1', 'l2'],  ['ctlr', 'com-a']),
        ],
    };
}

test.describe('wiring-engine: catalog + device factory', () => {

    test('createDevice copies the default field; unknown type → null', () => {
        const Wiring = loadEngine();
        const t = Wiring.createDevice('therm10k', 't1');
        expect(t).toEqual({ type: 'therm10k', id: 't1', field: { tempF: 72.4 } });
        // Deep copy — mutating the instance can't reach the catalog default.
        t.field.tempF = 0;
        expect(Wiring.createDevice('therm10k', 't2').field.tempF).toBe(72.4);
        // A transformer has no field; createDevice omits it.
        expect(Wiring.createDevice('xfmr', 'x1')).toEqual({ type: 'xfmr', id: 'x1' });
        // Unknown type fails soft (the same null contract evaluate's deref lacks).
        expect(Wiring.createDevice('no-such-device', 'z')).toBeNull();
    });

    test('the catalog and controller model expose the documented shape', () => {
        const Wiring = loadEngine();
        expect(Wiring.CONTROLLER.id).toBe('ctlr');
        expect(Wiring.CONTROLLER.terminals.length).toBeGreaterThan(0);
        for (const type of Wiring.CATALOG_ORDER) {
            expect(Wiring.DEVICES[type], type + ' in DEVICES').toBeTruthy();
            expect(Array.isArray(Wiring.DEVICES[type].terminals), type + ' terminals').toBe(true);
        }
    });
});

test.describe('wiring-engine: power solver', () => {

    test('a correct landing powers the controller and reads its sensor', () => {
        const Wiring = loadEngine();
        const r = Wiring.evaluate(cleanPanel(Wiring), { uiMode: { ui1: 'r' } });
        expect(r.power.powered).toBe(true);
        expect(r.power.shorted).toBe(false);
        expect(r.power.reversed).toBe(false);
        expect(r.power.openCommon).toBe(false);
        expect(r.power.overload).toBe(false);
        expect(r.faults).toEqual([]);
        expect(r.points.ui1.state).toBe('ok');
        expect(r.points.ui1.led).toBe('run');
    });

    test('dead short across the transformer blows the fuse', () => {
        const Wiring = loadEngine();
        const panel = {
            devices: [Wiring.createDevice('xfmr', 'x1')],
            wires: [W(['x1', 'hot'], ['x1', 'com'])],  // hot tied straight to com
        };
        const r = Wiring.evaluate(panel, {});
        expect(r.power.shorted).toBe(true);
        expect(r.power.powered).toBe(false);
        expect(faultIds(r)).toContain('short-xfmr');
        expect(r.cues.blownFuse).toBe(true);
    });

    test('a lone reversed controller runs (no spark) with a warn advisory (#40)', () => {
        const Wiring = loadEngine();
        const panel = {
            devices: [Wiring.createDevice('xfmr', 'x1')],
            wires: [
                W(['x1', 'com'], ['ctlr', '24v']),    // R/C swapped
                W(['x1', 'hot'], ['ctlr', '24com']),
            ],
        };
        const r = Wiring.evaluate(panel, {});
        expect(r.power.reversed).toBe(true);
        expect(r.power.powered).toBe(true);            // 24 VAC has no polarity — it just runs
        expect(r.power.shorted).toBe(false);
        expect(faultIds(r)).toContain('reversed');
        expect(r.faults.find((f) => f.id === 'reversed').severity).toBe('warn');
        expect(r.cues.spark).not.toContain('24v');     // no spark on a lone reversal
    });

    test('a reversed controller sharing a common back to the true COM leg dead-shorts (#40)', () => {
        const Wiring = loadEngine();
        // Reversed at the controller (24V~/24COM swapped), then a "common" wire
        // run back to the transformer's real COM leg ties HOT to COM: a dead short.
        const panel = {
            devices: [Wiring.createDevice('xfmr', 'x1')],
            wires: [
                W(['x1', 'com'], ['ctlr', '24v']),
                W(['x1', 'hot'], ['ctlr', '24com']),
                W(['ctlr', 'com-a'], ['x1', 'com']),   // shared common bridges the legs
            ],
        };
        const r = Wiring.evaluate(panel, {});
        expect(r.power.shorted).toBe(true);
        expect(faultIds(r)).toContain('short-xfmr');
        expect(r.cues.blownFuse).toBe(true);
    });

    test('hot landed but common floating is an open common', () => {
        const Wiring = loadEngine();
        const panel = {
            devices: [Wiring.createDevice('xfmr', 'x1')],
            wires: [W(['x1', 'hot'], ['ctlr', '24v'])],  // 24com never landed
        };
        const r = Wiring.evaluate(panel, {});
        expect(r.power.openCommon).toBe(true);
        expect(r.power.powered).toBe(false);
        expect(faultIds(r)).toContain('open-common');
    });

    test('no transformer at all is an unpowered warning, not a crash', () => {
        const Wiring = loadEngine();
        const r = Wiring.evaluate({ devices: [], wires: [] }, {});
        expect(r.power.hasXfmr).toBe(false);
        expect(r.power.powered).toBe(false);
        expect(faultIds(r)).toContain('no-power');
    });
});

test.describe('wiring-engine: union-find nets', () => {

    // A thermistor reads OK only if its return lead (l2) reaches the
    // transformer common. Here l2 reaches COM only TRANSITIVELY — through an
    // intermediate terminal (ui4) wired on to com-a — so the point reads OK
    // only when the union-find merges the whole chain into one net. Drop the
    // last hop and the same panel reads OPEN.
    function chainPanel(Wiring, joinReturnToCom) {
        const wires = [
            W(['x1', 'hot'], ['ctlr', '24v']),
            W(['x1', 'com'], ['ctlr', '24com']),
            W(['t1', 'l1'],  ['ctlr', 'ui1']),
            W(['t1', 'l2'],  ['ctlr', 'ui4']),   // return parked on a spare terminal
        ];
        if (joinReturnToCom) wires.push(W(['ctlr', 'ui4'], ['ctlr', 'com-a']));
        return {
            devices: [Wiring.createDevice('xfmr', 'x1'), Wiring.createDevice('therm10k', 't1')],
            wires,
        };
    }

    test('a transitive wire chain merges into one net (return reaches COM)', () => {
        const Wiring = loadEngine();
        const r = Wiring.evaluate(chainPanel(Wiring, true), { uiMode: { ui1: 'r' } });
        expect(r.points.ui1.state).toBe('ok');          // l2 → ui4 → com-a → COM
    });

    test('removing the last hop splits the nets (return floats → OPEN)', () => {
        const Wiring = loadEngine();
        const r = Wiring.evaluate(chainPanel(Wiring, false), { uiMode: { ui1: 'r' } });
        expect(r.points.ui1.state).toBe('open');         // chain no longer reaches COM
        expect(faultIds(r)).toContain('ui-open-ui1');
    });
});

test.describe('wiring-engine: fault classification', () => {

    test('a 10K thermistor on a Voltage input is a wrong-mode fault', () => {
        const Wiring = loadEngine();
        const r = Wiring.evaluate(cleanPanel(Wiring), { uiMode: { ui1: 'v' } });  // should be 'r'
        expect(r.points.ui1.state).toBe('fault');
        expect(faultIds(r)).toContain('ui-mode-ui1');
    });

    test('both thermistor leads on one input reads as a short', () => {
        const Wiring = loadEngine();
        const panel = {
            devices: [Wiring.createDevice('xfmr', 'x1'), Wiring.createDevice('therm10k', 't1')],
            wires: [
                W(['x1', 'hot'], ['ctlr', '24v']),
                W(['x1', 'com'], ['ctlr', '24com']),
                W(['t1', 'l1'],  ['ctlr', 'ui1']),
                W(['t1', 'l2'],  ['ctlr', 'ui1']),   // both leads on ui1
            ],
        };
        const r = Wiring.evaluate(panel, { uiMode: { ui1: 'r' } });
        expect(r.points.ui1.state).toBe('fault');
        expect(faultIds(r)).toContain('ui-short-ui1');
    });
});

test.describe('wiring-engine: VA budget', () => {

    // Build a fully-loaded, CORRECTLY-wired panel: 4 0-10V transmitters on
    // the UIs (1.5 VA each), 2 actuators on the AOs (4 VA), and `fans` relay
    // contactors on the BOs (10 VA). The controller itself draws 8 VA on a
    // 40 VA transformer. One fan → 32 VA (under budget); two → 42 VA (over).
    function loadedPanel(Wiring, fans) {
        const devices = [Wiring.createDevice('xfmr', 'x1')];
        const wires = [
            W(['x1', 'hot'], ['ctlr', '24v']),
            W(['x1', 'com'], ['ctlr', '24com']),
            W(['ctlr', 'boc'], ['ctlr', '24v']),     // BO-C fed hot so relays pass power
        ];
        const uiMode = {}, ao = {}, bo = {};
        ['ui1', 'ui2', 'ui3', 'ui4'].forEach((ui, i) => {
            const id = 'xv' + i;
            devices.push(Wiring.createDevice('xmtr010', id));
            wires.push(W([id, 'pwr'], ['ctlr', '24v']));
            wires.push(W([id, 'com'], ['ctlr', '24com']));
            wires.push(W([id, 'sig'], ['ctlr', ui]));
            uiMode[ui] = 'v';
        });
        ['ao1', 'ao2'].forEach((aoT) => {
            const id = 'act-' + aoT;
            devices.push(Wiring.createDevice('act010', id));
            wires.push(W([id, 'pwr'],  ['ctlr', '24v']));
            wires.push(W([id, 'com'],  ['ctlr', '24com']));
            wires.push(W([id, 'sig'],  ['ctlr', aoT]));
            wires.push(W([id, 'scom'], ['ctlr', '24com']));
            ao[aoT] = 50;
        });
        ['bo1', 'bo2'].slice(0, fans).forEach((boT) => {
            const id = 'fan-' + boT;
            devices.push(Wiring.createDevice('relayFan', id));
            wires.push(W([id, 'l1'], ['ctlr', boT]));
            wires.push(W([id, 'l2'], ['ctlr', '24com']));
            bo[boT] = true;
        });
        return { panel: { devices, wires }, state: { uiMode, ao, bo } };
    }

    test('a load under the transformer budget runs clean', () => {
        const Wiring = loadEngine();
        const { panel, state } = loadedPanel(Wiring, 1);   // 32 VA on a 40 VA xfmr
        const r = Wiring.evaluate(panel, state);
        expect(r.power.vaUsed).toBeLessThanOrEqual(r.power.vaBudget);
        expect(r.power.overload).toBe(false);
        expect(r.power.powered).toBe(true);
        expect(r.cues.blownFuse).toBe(false);
    });

    test('a load over the budget trips overload and blows the fuse', () => {
        const Wiring = loadEngine();
        const { panel, state } = loadedPanel(Wiring, 2);   // 42 VA on a 40 VA xfmr
        const r = Wiring.evaluate(panel, state);
        expect(r.power.vaUsed).toBeGreaterThan(r.power.vaBudget);
        expect(r.power.overload).toBe(true);
        expect(faultIds(r)).toContain('overload');
        expect(r.cues.blownFuse).toBe(true);
    });
});

test.describe('wiring-engine: malformed-input guards', () => {

    test('an unknown device type is skipped, not crashed on (#99)', () => {
        // deviceOn() dereferences DEVICES[d.type].terminals; an unknown type
        // would throw and abort the whole public evaluate(). The top-of-
        // evaluate filter drops it, mirroring createDevice's null contract.
        const Wiring = loadEngine();
        const panel = {
            devices: [
                Wiring.createDevice('xfmr', 'x1'),
                { type: 'gremlin', id: 'g1' },        // not in the catalog
            ],
            wires: [
                W(['x1', 'hot'], ['ctlr', '24v']),
                W(['x1', 'com'], ['ctlr', '24com']),
            ],
        };
        expect(() => Wiring.evaluate(panel, {})).not.toThrow();
        expect(Wiring.evaluate(panel, {}).power.powered).toBe(true);  // the valid xfmr still powers it
    });

    test('a NaN AO command clamps to 0%, not "NaN%" (#100)', () => {
        // clampPct now uses isFinite: typeof NaN === 'number' let NaN slip
        // through the old type check and an AO point rendered 'NaN%'.
        const Wiring = loadEngine();
        const panel = {
            devices: [Wiring.createDevice('xfmr', 'x1'), Wiring.createDevice('act010', 'a1')],
            wires: [
                W(['x1', 'hot'],  ['ctlr', '24v']),
                W(['x1', 'com'],  ['ctlr', '24com']),
                W(['a1', 'pwr'],  ['ctlr', '24v']),
                W(['a1', 'com'],  ['ctlr', '24com']),
                W(['a1', 'sig'],  ['ctlr', 'ao1']),
                W(['a1', 'scom'], ['ctlr', '24com']),
            ],
        };
        const r = Wiring.evaluate(panel, { ao: { ao1: NaN } });
        expect(r.points.ao1.display).toBe('0%');
    });
});
