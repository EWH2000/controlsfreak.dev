# Build-doc — Mock Function-Block Editor

Working notes for a multi-session build. **Temporary** — when the feature
ships, the decisions here graduate into a `site-ideas-and-friction.md`
entry and this file is deleted in the final commit.

## What it is

A graphical function-block / wiresheet sandbox in the spirit of Niagara
wiresheet and EBO function diagrams. Drag logic/math/timer/control blocks
onto a canvas, wire output pins to input pins, watch a live tick loop
light the wires with their current values. Same `mock` framing as
`vfd-mock.html`: feels like the real thing, doesn't replace it.

Paired with an Education page (`education/function-blocks.html`) the way
`vfd-mock.html` pairs with `vfds.html`.

## Locked decisions

- Page: `html/tools/function-block-editor.html`, id-prefix `fbe-`, custom
  layout, `nav: tools`, nav-card tag `Logic`.
- Engine: `html/scripts/fbe-engine.js` — pure, no DOM, `window.FBE`.
- Persistence: **session-only**. No save/load/export.
- Interaction: **desktop-only** (drag-wiring on touch is out of scope);
  narrow viewports get a graceful "wider screen" message.
- Visual: on-brand controlsfreak look — not a Niagara/EBO chrome copy.
- PID: a **real** per-tick PID block in v1 (timers + SR latch already
  force a stateful-block engine, so PID is the same category).
- Example programs: 5 (see below).

## Block roster (28 blocks)

Pin `kind` is `'bool'` or `'number'`. `evaluate(ins, state, dt) → {out, state}`.

**Boolean** (bool → bool)
- `and` `or` `xor` — 2 in → 1 out · `not` — 1 in → 1 out
- `sr` — SR latch, **set-dominant**. in: S, R → out: Q. stateful.

**Comparators** (2 number → 1 bool)
- `gt` `lt` `ge` `le` `eq` `ne`. `eq`/`ne` use a small epsilon (1e-9).

**Math** (2 number → 1 number)
- `add` `sub` `mul` `div` `min` `max`. `div` guards /0 → 0.

**Timers** (stateful) — param `pt` (preset, seconds)
- `ton` — on-delay. in: IN → out: Q (bool), ET (number elapsed).
- `tof` — off-delay. in: IN → out: Q, ET.

**Selection**
- `select` — in: SEL (bool), IN0, IN1 (number) → OUT = SEL ? IN1 : IN0.
- `limit` — in: IN (number) → OUT clamped to params `lo`/`hi`.

**Sources / sinks**
- `const` — param `value` → OUT (number).
- `ai` — analog input stub, param `value` → OUT (number). "a sensor".
- `bi` — binary input stub, param `state` (bool) → OUT (bool). "a contact".
- `ao` — analog output stub, in: IN (number). sink, displays value.
- `bo` — binary output stub, in: IN (bool). sink, displays value.
- `readout` — in: IN (number). sink, displays an intermediate value.

**Control** (stateful)
- `pid` — in: SP, PV (number) → OUT (number, 0–100). params: `kc`, `ti`,
  `td`, `action` (`direct`|`reverse`). error = action==='direct' ?
  PV−SP : SP−PV. Conditional-integration anti-windup (clamp integral on
  output saturation). Distinct from `pid-engine.js`'s `simulatePid`.

## Tick semantics

One tick = topological sort on the wire DAG; pure combinational chains
settle in dependency order within the tick. Feedback edges (cycles) are
detected and read the **previous tick's** value (one-tick delay).
Stateful blocks (`sr`, `ton`, `tof`, `pid`) hold their own state, so
feedback is stable. Page drives the loop: `setInterval` at fixed 100 ms
dt; pause on `visibilitychange` hidden.

## Example programs (5)

1. **Freeze-stat shutdown chain** — `bi`(freeze) → S, `bi`(reset) → R of
   `sr`; Q → `not` → `bo`(fan run); Q → `bo`(alarm).
2. **Economizer enable** — `ai`(OAT), `const`(OAT setpoint) → `lt`;
   `bi`(cooling mode); `and` → `bo`(econ enable).
3. **Direct-acting thermostat (cooling)** — `ai`(space temp),
   `const`(setpoint), `const`(deadband); `add`(sp,db) → upper,
   `sub`(sp,db) → lower; `gt`(temp,upper) → S, `lt`(temp,lower) → R;
   `sr` → `bo`(cooling). Output rises with temp.
4. **Reverse-acting thermostat (heating)** — same shape, `lt`(temp,lower)
   → S, `gt`(temp,upper) → R; `sr` → `bo`(heating). Output rises as temp
   falls. The pair teaches the direct/reverse-acting terms.
5. **PID loop** — `ai`(PV), `const`(setpoint) → `pid` → `ao`(output) +
   `readout`.

Canned graph = `{ blocks: [{id,type,x,y,params}], wires:
[{from:[blockId,pin], to:[blockId,pin]}] }`. Loaded via a `Try this:`
chip row (`.widget-try` idiom).

## Phase checklist

- [x] **P0 Scaffold** — branch, this doc, stub page.
- [x] **P1 Engine** — `fbe-engine.js` (registry + topo-sort tick) +
      `tests/fbe-engine.spec.js`.
- [x] **P2 Canvas (static)** — palette, click-to-add block, drag-move,
      select, inspector param edit.
- [x] **P3 Wiring** — pin→pin SVG wires, kind type-check, delete.
- [x] **P4 Simulation** — tick loop ↔ engine, live values, wire
      highlight, visibility pause.
- [x] **P5 Example programs** — 5 canned graphs + chip row.
- [x] **P6 Polish + a11y** — focus-visible, narrow-screen message, page
      prose, behavioral test in `smoke.spec.js`.
- [ ] **P7 Education page** — `function-blocks.html` + cross-links.
- [ ] **P8 Ship** — `site-ideas-and-friction.md` entry, delete this doc,
      convention sweep, PRs.

**P2–P6 notes:** layout settled as palette · canvas (2-col) with the
inspector a full-width strip below — the 3-col version left the canvas
too narrow. Blocks add by clicking a palette button (cascades into a
grid), not drag-from-palette — click-to-add is simpler and works on
touch. Canvas is 900×480 and scrolls (normal for a wiresheet); examples
laid out left→right. Default example on load: economizer. Version
bumped to 1.14.0; nav-card + `PAGES` entry added. Tool PR is ready;
P7/P8 are the Education-page PR.

## Conventions

4-space indent · kebab-case ids (`fbe-` prefix) · `'use strict';` ·
`const` default · `addEventListener`+`data-*` (no inline `on*`) ·
description 140–160 chars · one `<h1>` per page · page CSS inline in
`{% block head %}`.
