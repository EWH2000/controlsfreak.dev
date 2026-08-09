// ──────────────────────────────────────────────────────────────────────
// ddcw-session.js — per-tab session persistence for the DDC Workbench
// (codebase-issues #275). The workbench held its whole simulation in the
// createWorkbench closure, and the arc's own navigation model — click the
// DX coil, walk into the refrigerant loop — threw all of it away. This
// module is the serialisation layer the shell boots through.
//
// Loaded as a *classic* script, same convention as the rest of the ddcw-*
// / fbe-* family, BEFORE /scripts/ddcw-shell.js. Nothing here reaches the
// DOM and nothing here logs: the workbench specs fail on a console error,
// and every failure path in this file is a path a visitor can reach with
// a full quota or a private-mode window. Silence is the contract.
//
// ── WHAT IT SAVES ──
//
// The envelope is
//
//     { v, unit, fp, simSpeed, programKey, graph, cmd, plant }
//
// under sessionStorage key `cf_ddcw_<unit.id>` — one key per unit, so the
// AHU and FCU snapshots are independent and a hop between the two pages
// restores each into its own state. sessionStorage, not local: the reader's
// staged situation is a scratchpad for THIS tab, and a forced sensor that
// outlived the browser session would teach the page's own stale-override
// lesson by accident, to someone who was never told a lesson was running.
//
// ── THE FINGERPRINT, WHICH IS THE WHOLE SAFETY STORY ──
//
// `fp` is a shape digest computed FROM LIVE CODE at save and again at
// restore: the point roster, the plant's key shape two levels deep, and
// the authored program literals. Any mismatch is a silent pristine boot
// plus a removeItem — never a partial restore.
//
// That is what makes a future model change self-invalidating instead of
// half-landing. PR #488 added `plant.lls` and `plant.oaTarget` to the AHU
// between this module being designed and being written; both are covered
// with no edit here, because the digest walks the plant rather than
// listing it. The same holds for a new point, a renamed point, a new
// program, or a re-authored sheet.
//
// Two consequences worth naming rather than discovering:
//   • A DEPLOY invalidates in-flight snapshots. Acceptable — sessionStorage
//     dies with the tab anyway, so the window in which a reader holds a
//     snapshot across a deploy is small, and a half-restored simulation is
//     a worse outcome than a clean boot by a wide margin.
//   • The digest is deliberately AGGRESSIVE (a moved block in an authored
//     sheet changes it). A re-laid-out sheet IS a different sheet, and the
//     cost of over-invalidating is one pristine boot.
//
// ── WHAT DOES NOT TRAVEL, AND WHY ──
//
//   • `cmd[id].rd` — Relinquish_Default comes from the point config alone
//     (the shell's own invariant: no fallback table, a missing one fails
//     loudly). Restoring a stored `rd` would let a stale snapshot invent
//     a resting value the roster no longer agrees with. Slots only.
//   • Wire `id`s — those are EDITOR RENDER KEYS, not data. setGraph resets
//     `wireSeq` to 0 and re-issues w1..wN, so a restored `w3` would collide
//     with the next wire the reader draws. Stripped at save, re-issued at
//     mount. Block ids DO travel: point id === block id is the shell's
//     load-bearing binding invariant.
//   • `plant.derived` / `plant.anim` and every block's `in` — all rebuilt
//     from the first tick, so storing them is bytes for nothing.
//
// Block `state` and `out` DO travel, so an SR latch that was set is still
// set and a PID integrator resumes where it was. `FBE.makeGraph` strips
// both (it re-initialises them), so `rebuildGraph` copies them back after
// the graph has come through the same validated construction path a
// program switch uses.
//
// ── PURE / IO SPLIT ──
//
// Everything except read / write / clear is pure and DOM-free, so a spec
// can load this source into a bare vm and exercise the whole round trip
// with no browser. The three IO functions own the sessionStorage
// try/catch — the /scripts/theme.js idiom, minus the console.
//
// API (window.DDCWSession):
//   fingerprint(unit)              → string    (pure)
//   encode(unit, parts)            → envelope  (pure)
//   validate(snap, unit)           → snap|null (pure)
//   rebuildGraph(FBE, savedGraph)  → graph     (pure; THROWS on a bad graph)
//   applyPlant(fresh, savedPlant)  → fresh     (pure; merge-onto-fresh)
//   applyCmd(cmd, savedCmd)                    (mutates the shell's store)
//   read(unitId) / write(unitId, env) / clear(unitId)          (IO)
//
// Consumers: /scripts/ddcw-shell.js (both workbench pages).
// Tests: tests/ddc-workbench-session.spec.js.
// ──────────────────────────────────────────────────────────────────────

'use strict';

const DDCWSession = (function () {
    'use strict';

    const VERSION    = 1;
    const KEY_PREFIX = 'cf_ddcw_';
    const SLOT_MAX   = 16;

    // ── shape digest ────────────────────────────────────────────────
    // FNV-1a, 32-bit, rendered base36. Not a security hash and not
    // trying to be: it turns a few kilobytes of shape into a short
    // string that changes when the shape changes. A collision costs a
    // half-restore, which is why the digest covers three independent
    // inputs joined with separators rather than one blob.
    function hash(str) {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
        }
        return h.toString(36);
    }

    // The plant's KEY SHAPE, two levels deep. One level would miss a
    // sub-key landing inside an existing bag — `lls.defeated` on the
    // AHU's hardwired stat is the live example — and three would start
    // reporting the override map's per-entry fields, which are fixed by
    // construction. Two is where the shape stops being interesting.
    function plantShape(p) {
        const parts = [];
        Object.keys(p).sort().forEach(function (k) {
            const v = p[k];
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                parts.push(k + '{' + Object.keys(v).sort().join(',') + '}');
            } else {
                parts.push(k);
            }
        });
        return parts.join('|');
    }

    function fingerprint(unit) {
        const points   = JSON.stringify(unit.points);
        const programs = JSON.stringify(unit.programs);
        const shape    = plantShape(unit.createPlant());
        return ['v' + VERSION, unit.id, hash(points), hash(shape), hash(programs)].join('.');
    }

    // ── encode (pure) ───────────────────────────────────────────────
    function clone(v) { return JSON.parse(JSON.stringify(v)); }
    function isPlainObject(v) {
        return !!v && typeof v === 'object' && !Array.isArray(v);
    }

    function encodeGraph(g) {
        const blocks = (g && Array.isArray(g.blocks) ? g.blocks : []).map(function (b) {
            const o = { id: b.id, type: b.type, x: b.x, y: b.y };
            if (b.name) o.name = b.name;
            o.params = isPlainObject(b.params) ? clone(b.params) : {};
            if (isPlainObject(b.state) && Object.keys(b.state).length) o.state = clone(b.state);
            if (isPlainObject(b.out)   && Object.keys(b.out).length)   o.out   = clone(b.out);
            return o;
        });
        const wires = (g && Array.isArray(g.wires) ? g.wires : []).map(function (w) {
            // `id` deliberately absent — see the header.
            return { from: clone(w.from), to: clone(w.to) };
        });
        return { blocks: blocks, wires: wires };
    }

    function encodeCmd(cmd) {
        const out = {};
        Object.keys(cmd || {}).forEach(function (id) {
            const st = cmd[id];
            if (!st || !Array.isArray(st.slots)) return;
            out[id] = { slots: clone(st.slots) };   // slots ONLY — never rd
        });
        return out;
    }

    // Everything except the two rebuilt-every-tick bags. `derived` is the
    // verdict ladder's publish target and `anim` is paint state; both are
    // written before they are read on the first tick.
    const PLANT_SKIP = { derived: true, anim: true };

    function encodePlant(plant) {
        const out = {};
        Object.keys(plant || {}).forEach(function (k) {
            if (PLANT_SKIP[k]) return;
            const v = plant[k];
            if (v === undefined || typeof v === 'function') return;
            out[k] = isPlainObject(v) || Array.isArray(v) ? clone(v) : v;
        });
        return out;
    }

    // parts = { fp, simSpeed, programKey, graph, cmd, plant }
    function encode(unit, parts) {
        return {
            v: VERSION,
            unit: unit.id,
            fp: parts.fp,
            simSpeed: parts.simSpeed,
            programKey: parts.programKey === undefined ? null : parts.programKey,
            graph: encodeGraph(parts.graph),
            cmd: encodeCmd(parts.cmd),
            plant: encodePlant(parts.plant),
        };
    }

    // ── validate (pure) ─────────────────────────────────────────────
    // Structural only. Anything that survives this still goes through
    // rebuildGraph / applyPlant / applyCmd, each of which is total or
    // throws into the shell's pristine-boot catch.
    function validate(snap, unit) {
        if (!isPlainObject(snap)) return null;
        if (snap.v !== VERSION) return null;
        if (snap.unit !== unit.id) return null;
        if (typeof snap.fp !== 'string' || snap.fp !== fingerprint(unit)) return null;
        if (!isPlainObject(snap.graph) || !Array.isArray(snap.graph.blocks)) return null;
        if (!isPlainObject(snap.plant)) return null;
        if (!isPlainObject(snap.cmd)) return null;
        if (snap.programKey !== null && typeof snap.programKey !== 'string') return null;
        if (snap.simSpeed !== undefined && !isFinite(snap.simSpeed)) return null;
        return snap;
    }

    // ── rebuildGraph (pure; throws) ─────────────────────────────────
    // Goes through FBE.makeGraph, so an unknown block type throws exactly
    // as it does on a program switch — the snapshot gets no privileged
    // construction path of its own. State and out are copied back after,
    // because makeGraph re-initialises them.
    function rebuildGraph(FBE, saved) {
        if (!isPlainObject(saved) || !Array.isArray(saved.blocks)) {
            throw new Error('ddcw-session: malformed graph');
        }
        const g = FBE.makeGraph({
            blocks: saved.blocks,
            wires: Array.isArray(saved.wires) ? saved.wires : [],
        });
        const byId = {};
        g.blocks.forEach(function (b) { byId[b.id] = b; });
        saved.blocks.forEach(function (sb) {
            const b = byId[sb.id];
            if (!b) return;
            if (isPlainObject(sb.state)) b.state = clone(sb.state);
            if (isPlainObject(sb.out))   b.out   = clone(sb.out);
        });
        return g;
    }

    // ── applyPlant (pure) ───────────────────────────────────────────
    // MERGE ONTO FRESH, driven by the FRESH plant's own keys. A key the
    // running model has gained since the snapshot keeps its default; a
    // key the model has dropped is ignored. That asymmetry is the point:
    // the live plant defines the shape, the snapshot only supplies values
    // for the slots it recognises. Recurses through plain objects (the
    // override map is two deep), copies arrays and scalars wholesale.
    function applyPlant(fresh, saved) {
        if (!isPlainObject(saved)) return fresh;
        Object.keys(fresh).forEach(function (k) {
            if (PLANT_SKIP[k]) return;
            if (!Object.prototype.hasOwnProperty.call(saved, k)) return;
            const fv = fresh[k];
            const sv = saved[k];
            if (isPlainObject(fv) && isPlainObject(sv)) {
                applyPlant(fv, sv);
            } else if (Array.isArray(fv) && Array.isArray(sv)) {
                fresh[k] = clone(sv);
            } else if (sv === null || typeof sv === 'number' || typeof sv === 'boolean'
                       || typeof sv === 'string') {
                fresh[k] = sv;
            }
            // Anything else (a function, a mismatched shape) is dropped —
            // the fresh default stands rather than a type change landing
            // in the physics.
        });
        return fresh;
    }

    // ── applyCmd (mutates the shell's store) ────────────────────────
    // Driven by the SHELL's own store, which is built from unit.points —
    // so a snapshot naming a point that no longer exists writes nothing,
    // and `rd` is never touched. Total: never throws.
    function applyCmd(cmd, saved) {
        if (!isPlainObject(saved)) return;
        Object.keys(cmd || {}).forEach(function (id) {
            const st = cmd[id];
            const sv = saved[id];
            if (!st || !Array.isArray(st.slots) || !isPlainObject(sv) || !Array.isArray(sv.slots)) return;
            for (let n = 1; n <= SLOT_MAX; n++) {
                const v = sv.slots[n];
                if (v === undefined) continue;
                if (v === null || typeof v === 'number' || typeof v === 'boolean') {
                    st.slots[n] = v;
                }
            }
        });
    }

    // ── IO (the only impure half) ───────────────────────────────────
    // The theme.js storage idiom, minus the console: sessionStorage
    // access throws outright in some privacy modes, and setItem throws on
    // quota. Every path returns rather than reports — a workbench spec
    // fails on a console error, and so would a reader's devtools.
    function key(unitId) { return KEY_PREFIX + unitId; }

    function read(unitId) {
        try {
            const raw = window.sessionStorage.getItem(key(unitId));
            if (!raw) return null;
            const o = JSON.parse(raw);
            return isPlainObject(o) ? o : null;
        } catch (e) {
            return null;
        }
    }

    function write(unitId, envelope) {
        try {
            window.sessionStorage.setItem(key(unitId), JSON.stringify(envelope));
            return true;
        } catch (e) {
            return false;
        }
    }

    function clear(unitId) {
        try {
            window.sessionStorage.removeItem(key(unitId));
        } catch (e) { /* private mode, disabled storage — nothing to undo */ }
    }

    return {
        VERSION: VERSION,
        KEY_PREFIX: KEY_PREFIX,
        fingerprint: fingerprint,
        encode: encode,
        validate: validate,
        rebuildGraph: rebuildGraph,
        applyPlant: applyPlant,
        applyCmd: applyCmd,
        read: read,
        write: write,
        clear: clear,
    };
})();

if (typeof window !== 'undefined') { window.DDCWSession = DDCWSession; }
