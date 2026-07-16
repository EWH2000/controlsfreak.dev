# controlsfreak.dev

Open calculators, converters, and practical explainers for
building-controls engineers — BACnet, Modbus, HVAC, and building
automation work. No login, no ads, no tracking, just tools that
are actually useful on a job site.

Live at [controlsfreak.dev](https://controlsfreak.dev).

## What's on the site

### Getting around

Press `/` (or `Ctrl`/`⌘-K`) anywhere for a command-palette **search**
over every page — or use the search button in the nav. The Tools,
Simulators, Education, and Practice nav items **drop down** to direct
links, so any page is one click from anywhere; on a phone the nav collapses
behind a hamburger with the search button kept in reach. The home page
leads with a quick-tools strip and a live AHU supply-air loop you can
**drive** — drag the setpoint and watch it chase, then open the full
PID Tuner to tune one yourself.

The **BACnet reference hub** at `/bacnet/` is a topic pillar — one page
that gathers the whole BACnet cluster (the five lessons in a start-here
reading order, plus the six decoders and reference tools) so the deepest
BACnet content is reachable from a single entry point. Every BACnet page
links back to it via the "Part of" slot in the related-links block.

The **forced-air reference hub** at `/forced-air/` is the second topic
pillar — one page that gathers the whole air side (seven lessons from the
air handler out to the VAV box and its commissioning, plus the airflow,
coil, and fan tools that measure, size, and check the air a system moves)
so the deepest forced-air content is reachable from a single entry point.
The air-side pages link back to it the same way.

The **hydronics reference hub** at `/hydronics/` is the third topic
pillar — one page that gathers the whole water side (five lessons from
the loop and load piping through pump control, balancing, and coil
selection, plus the valve, flow, and pump tools and a loop-builder
sandbox) so the deepest hydronic content is reachable from a single
entry point. The water-side pages link back to it the same way, and
`affinity-laws` — fan **and** pump laws — is a full member of both the
forced-air and hydronics hubs.

The three hubs sit under a **Guides** nav lane and a `/guides/` landing
that gather the topic pillars in one place — the topic axis alongside the
format sections (Tools / Simulators / Education / Practice).

### Tools

Calculators, converters, and lookups — open one, get an answer.

- **Signal Scaling** — mA / V analog signals to engineering units
  and back, plus a 2-point → slope/offset solver for `y = mx + b`.
- **Modbus Register Viewer** — Single Register tab: a 16-bit
  register as a clickable bit grid with decimal / hex / binary
  readouts plus a signed/unsigned toggle on the decimal
  interpretation. 32-bit Pair tab: feed two consecutive registers,
  see the combined value decoded as int32 / uint32 / IEEE-754 float
  across all four byte orderings (ABCD / CDAB / BADC / DCBA) — the
  word-order question that bites every Modbus tech, surfaced as a
  scannable table. "Modbus essentials" tips row beneath both tabs
  covers addressing offsets, signed/unsigned, byte order, function
  codes, and exception responses; FC01–16 reference table sits
  there too.
- **Modbus Function Codes & CRC** — filterable function-code and
  exception-code tables plus a CRC-16/MODBUS calculator, one filter
  box searching both tables by name or number. The FC table keeps
  the dec-vs-hex trap in plain sight (FC 15 = 0x0F, FC 16 = 0x10 —
  grab a hex 16 and you've got Mask Write instead); the exception
  table carries the FC + 0x80 high-bit rule, so a 0x83 reply reads
  as a failed FC 3 rather than a mystery code. The CRC tab (poly
  0xA001, init 0xFFFF) builds the two append bytes low byte first
  and also treats the last two bytes of a pasted capture as a CRC,
  with a checks-out verdict.
- **BACnet/IP Hex Converter** — paste a hex device address (with
  or without an appended UDP port), get dotted-decimal back, and
  vice versa.
- **BACnet Object Reference** — the numbers a controller, a packet
  capture, or a workstation hands you instead of names: object type 1
  is an Analog Output, property 85 is Present_Value, units enum 62 is
  degrees-Celsius. Three tabbed tables (the full 0–64 Object_Type
  list, the field-relevant Property_Identifier slice, and the Units
  enumeration grouped by domain with field symbols) share one filter
  box that searches all three at once and badges each tab with its
  live match count — hunting "85" from the Object Types tab still
  points you at Property IDs. Every code cell is click-to-copy.
  Properties stay a curated slice of an enumeration that runs past
  500; object types are complete through ASHRAE 135-2020 and its
  addenda.
- **BACnet Vendor ID Lookup** — the full ASHRAE-assigned
  `Vendor_Identifier` registry (1,600+ entries) as one searchable
  table. Type the number a device reports in its I-Am and get the
  manufacturer — with reserved, unassigned, and newer-than-snapshot
  states called out — or filter the table by ID or company name;
  every ID is click-to-copy. Imported from the official registry by
  script (only the ID and organization are republished), snapshot
  date under the table.
- **BACnet Engineering Units Decoder** — the full standard `Units`
  enumeration (property 117), values 0–254, as one filterable table
  with a reverse-decode box: paste the number a point reports for its
  units and get the name — 62 is degrees-Celsius, 84 is CFM, 95 is
  no-units — with the reserved ceiling and the proprietary/vendor
  range (256+) called out. Filter by number, name, or symbol; every
  value is click-to-copy. Deeper than the Object Reference's
  field-common slice: imported by script from bacnet-stack's enum and
  overlaid with the site's curated names/symbols so the two can't
  drift.
- **BACnet Error Code Decoder** — the numbers a device sends back when
  it refuses a request, turned into what went wrong. A mode switch
  handles all three failure PDUs: an **Error** (error class 0–7 paired
  with the code — unknown-property, write-access-denied), a **Reject**
  (a malformed-request reason), or an **Abort** (a torn-down
  transaction — segmentation, TSM timeout, APDU-too-long). Four
  reference tables (8 classes, 225 codes, 11 reject and 12 abort
  reasons) share one filter; every value is click-to-copy. Enums are
  imported by script; the field-common descriptions are hand-authored
  and were adversarially cross-checked for accuracy.
- **BACnet Priority Array** — the command stack behind every
  commandable point, made interactive: type a value into any of the 16
  priority slots, or press **×** to write NULL and release one, and
  watch `Present_Value` resolve to the lowest-numbered non-null slot —
  or `Relinquish_Default` when the array is empty. The winning slot
  highlights and the panel shows what takes over if you release it (the
  forgotten-override failure mode, live). Ships the full 16-slot
  reservation table — manual/auto life-safety, critical-equipment,
  minimum on/off, manual operator — cross-checked against ASHRAE 135
  command-prioritization references.
- **Psychrometric Chart** — walk an air handler through its
  psychrometric processes on an altitude-adjustable ASHRAE IP-unit
  chart: mix outdoor and return air, then cool, heat, and humidify.
  Step pills pick the focused stage; OA and RA are draggable on the
  chart. Process segments are color-coded (mixing, cooling/dehum,
  heating, adiabatic humidification). Optional AHU airflow input
  surfaces coil capacities in MBH with the sensible / latent split.
  For building feel, not calibrated load studies.
- **Economizer Ratio Helper** — required %OA to mix outdoor and
  return air down to a mixed-air dry-bulb setpoint, with a
  feasibility verdict ("setpoint between OA and RA — feasible",
  "OA hotter than setpoint — infeasible", "OA cool but not enough —
  damper goes 100 % OA, coil picks up the rest"). Enthalpy tab
  takes full OA/RA states (Define-by pattern, same as the chart
  tool) and adds the resulting full mixed state plus the OA-vs-RA
  enthalpy changeover verdict a high-end BAS uses to gate free
  cooling before any dry-bulb modulation runs.
- **Air-Mixing Calculator** — blend three air streams by mass flow
  (CFMs at the panel) or by mass fraction (percentages off a
  schematic) and read out the full mixed-air state — dry-bulb,
  wet-bulb, humidity, enthalpy, dew point. The mass-fraction tab
  flags fractions that don't sum to 100 % rather than silently
  renormalizing.
- **Coil-Sizing Calculator** — one coil in isolation. Capacity tab:
  entering air + leaving air + airflow → total / sensible / latent
  capacity and the sensible heat ratio. Leaving-state tab runs it
  backwards — entering air + airflow + the coil's load → the
  leaving-air state, flagging the apparatus dew point when a latent
  load drives the leaving point onto the saturation curve. Cooling
  or heating coil; sea-level pressure.
- **Coil Freeze Risk Checker** — freezestat-season triage. Place the
  mixed air (straight OAT/RAT/%OA average, or the MA-T straight off
  the trend), set it against what's actually in the tubes — plain
  water, ethylene or propylene glycol at strength (freeze *and* burst
  points — slush flows without splitting), or trapped steam
  condensate — and read a margin plus a protection verdict. The
  freezestat setpoint drives the top band, so "the stat was right to
  trip" is a possible answer; flow state is categorical (full /
  modulating low / valve closed / pump off) because tube velocity
  isn't computable without circuiting. Steam path teaches the
  vacuum-holds-condensate mechanism and its piping fixes.
- **Dew Point Calculator** — dry-bulb plus one humidity reading (RH
  off the space sensor, or wet-bulb off a sling psychrometer) → dew
  point, with wet-bulb, grains, and enthalpy alongside. The Coil
  Check field takes a supply / leaving dry-bulb (or any cold surface
  temp) and flags whether it sits below the entering dew point — the
  coil is dehumidifying — or above it, where you get sensible cooling
  only and space humidity rides up. Altitude-adjustable; sea level by
  default.
- **Thermistor / RTD Calculator** — table-driven R↔T curve for
  common sensor types (10K Type II/III, JCI 10K+8.7K shunt,
  Schneider/TAC "Type 5" 10K-3+11K shunt, 20K, 3K, 1K Balco,
  Pt100, Pt1000). Lookup mode gives temperature ↔ resistance with
  the full R/T table alongside; Identify mode ranks every type
  against measured points to name an unknown sensor. Curve
  parameters verified against BAPI, Vector Controls, Sontay, US
  Sensor, Schneider EBO, ACI, and IEC 60751 — see the data file
  header for per-type confidence and the page's "About these
  tables" card for the methodology. JCI 8.7K-shunt curve is the
  one type still nominal (no public R/T table).
- **Refrigerant P-T & Superheat Calculator** — gauge-pressure
  (psig / kPag) saturation lookup plus a superheat / subcooling
  check for R-410A, R-22, R-134a, R-407C, R-404A, and R-454B, from
  tables transcribed off published manufacturer P-T charts. Bubble
  and dew always shown with the glide between them — superheat
  references dew, subcooling bubble; a single-column pocket card
  averages the two and reads ~5 °F wrong on R-407C. The verdict pill
  names the fault direction (floodback, starved evaporator,
  undercharge) but treats targets as system-specific — a direction,
  not a setpoint. Pairs with the Superheat & Subcooling explainer.
- **Valve Cv Sizing** — the sizing equation `Cv = Q√(SG/ΔP)`
  solved in any direction (required Cv, flow through a known valve,
  or the drop it imposes), with a Kv equivalent riding along
  (`Kv ≈ 0.865 × Cv` — the tool stays US-native since Cv is defined
  in GPM/psi). Second tab computes valve authority β from the
  wide-open valve drop vs. the rest of the controlled branch, with
  a good / marginal / poor verdict — the check that catches the
  quiet oversizing trap, where a valve far bigger than the duty
  barely cracks open and the loop hunts.
- **Valve Authority Calculator** — the same `β = ΔP_valve ÷ (ΔP_valve
  + ΔP_rest)` check on its own page (the term is a common search on its
  own), with the differentiator no free HVAC page shows: a live plot of
  the installed characteristic — watch the equal-% curve pull off the
  linear diagonal and front-load as authority drops below ~0.25. Good /
  marginal / poor verdict, an FAQ, and cross-links to the Cv tool.
- **Waterside Load Calculator** — the hydronic workhorse
  `q = 500 × GPM × ΔT` solved in any direction: the load a measured
  flow and ΔT imply, the flow a scheduled load needs, or the ΔT a
  healthy loop should show — the on-the-spot check behind a low-ΔT
  diagnosis. Tons ride along when load is the answer. Computes in
  whichever unit system is active with that system's own constant
  (500 IP, 4.187 metric), so the printed formula reproduces the shown
  result from the displayed numbers. Water only, and says so up
  front — glycol lowers density and specific heat, so this shortcut
  over-reports on a glycol loop.
- **Pump & Fan Affinity Laws** — scales one operating point (flow,
  head, power — each optional) to a new speed or an impeller trim:
  flow tracks the ratio, head its square, power its *cube* — the
  energy case for variable-speed pumping. Pure ratios, so it's
  unit-agnostic: speed in RPM, Hz, or %, and Q/H/P pass through in
  whatever units you enter. Flags the field catches too — the
  cube-law payoff assumes a mostly-friction system curve (real
  static head flattens the savings), and the diameter laws drift
  past ~10–15 % trims of the same casing. Pairs with the Pump
  Control and VFDs explainers.
- **Airflow & Velocity Pressure** — both halves of the field airflow
  square-root. K-factor tab: a VAV box's `CFM = K × √VP` in either
  direction — flow from the pickup's VP, or K back-solved from a
  balancer's hood reading, the calibration move that works no matter
  whose K convention the paperwork used. Duct-velocity tab: pitot VP
  → FPM (`V = 4005 × √VP`) and rect/round duct area → CFM, with a
  traverse note keeping the one-point reading honest. US-native (a
  metric K is a different number on a different label); states its
  standard-air assumption and under-read at altitude; a negative VP
  mutes as "sensing lines swapped," not a generic error.
- **Airside Load** — the airside twin of Waterside Load: the
  pocket-card trio `qs = 1.08 × CFM × ΔT` (sensible), `0.68 × CFM ×
  Δgrains` (latent), and `4.5 × CFM × Δh` (total, with tons), each
  solved for load, airflow, or the delta. Follows the US / Metric
  toggle with each system's own first-class constants (0.34 / 0.83 /
  0.33), so the formula line always closes on the displayed operands.
  Tons ride the Total tab only — a ton is 12 MBH of *total* heat.
  Takes the deltas directly and hands full air-state work to
  Coil-Sizing; the worked example closes the loop against the
  waterside — the two sides of one coil have to agree.
- **Duct Traverse** — the full-grid companion to the airflow tool's
  one-point tab. Paste an entire pitot traverse (spaces, commas, or
  one line per duct row) and it roots every reading *before*
  averaging — `V̄ = 4005 × mean(√VP)` — then rect/round duct area →
  CFM. A live order-check line shows what averaging the pressures
  first would have read (always high; the page's teaching hook), a
  bad token mutes as "reading 7 isn't a number," and a negative point
  mutes as "relocate the plane," not a generic error. Second tab runs
  diffuser Ak-factor flow forward or back-solved against a hood, with
  the Ak-is-not-the-neck's-πr² trap called out; point-count and
  plane-location rules ride along in prose.
- **Equipment Airflow Check** — is that airflow inside what the
  machine can live with? DX tab computes CFM per *active* ton —
  capacity discounted by staging (N of M stages or capacity %),
  because a 10-ton at stage 1 of 2 moving 2,400 CFM is a healthy 480
  per active ton, not a panicked 240 — with icing / thin / healthy /
  carryover verdicts banded at 350 / 400 / 500. Gas tab turns the
  furnace nameplate's rise window into an allowable CFM band via
  `CFM = q ÷ (1.08 × ΔT)`, and a measured rise into an implied
  airflow with a limit-trip / flue-condensation verdict. The blower
  table method (the static check no generic tool can do) is taught
  in prose instead of faked.
- **Minimum Outdoor Air Calculator** — where the AHU's minimum-OA
  number is supposed to come from, instead of the 20 % inherited from
  the last contractor. ASHRAE 62.1's breathing-zone equation
  (`Vbz = Rp × Pz + Ra × Az`) with ten common occupancy presets
  (editable, edition-stamped 62.1-2022), zone air distribution
  effectiveness (heating pays a 0.8 penalty; displacement earns 1.2),
  and an optional % OA check against the zone supply. The output
  deliberately splits the DCV-resettable per-person share from the
  per-area floor a CO₂ sensor can never reset — the whole
  demand-controlled-ventilation argument in one readout pair.
  Single-zone math only; checks arithmetic, doesn't establish
  compliance — the stamped schedule and the AHJ govern.
- **Duct Sizer** — the ductulator as a diagnostic: friction rate and
  velocity from the CFM and diameter you already have (the direction
  the cardboard wheel is clumsy at), or solve for diameter or
  capacity from a target friction or velocity — Altshul-Tsal, the
  closed-form fit that reproduces the published friction chart, with
  impossible asks refused instead of silently pinned. A second tab converts
  rectangular ↔ round through Huebscher equivalent diameter and shows
  the gotcha live: equal friction is deliberately not equal area or
  equal velocity, so an area-match comes out undersized. Straight
  galvanized runs only — fittings and crushed flex are the page's
  stated blind spots.
- **Transformer VA Budget** — "does this transformer have room for
  one more actuator?" List the loads on the 24 VAC secondary (blank
  rows are spares), pick the transformer, and read total VA, percent
  loaded, headroom, and a secondary fuse suggestion — sized off the
  transformer rating, not the connected load, so it doesn't need
  touching when a device is added later. Two-tier verdict pill:
  above 80 % it could be a problem, above 100 % it is one. A
  typical-VA sanity table plus a note on the trap the steady-state
  sum can't catch — the panel that only reboots on cold mornings is
  failing on coincident inrush, not this number.
- **Wire Run & Voltage Drop** — pick the signal type, gauge, and
  one-way length; the verdict speaks that signal's language. 4-20 mA
  gets worst-case transmitter voltage at 20 mA and the max run at
  that gauge (copper costs supply headroom, not accuracy); 0-10 V
  gets the IR drop into the AI's impedance — millivolts, so suspect
  ground offsets or noise, not wire; sensor mode shows the lead
  error for 10K Type II, 1K Balco, and Pt100 side by side, slopes
  read live from the Thermistor Calculator's own R/T curves so the
  same-copper-different-lie asymmetry is computed, not asserted.
  Copper per NEC Ch. 9 Table 8; US-native (AWG, Ω/1000 ft).
- **Field Electrical Quick Calc** — the bread-and-butter electrical
  math you double-check on a service call, four tabs in one: an
  Ohm's-law wheel (enter any two of V / I / R / P, the other two
  solve), a 1φ / 3φ AC power triangle (line-to-line voltage + PF +
  one of amps / kW / kVA → the rest), motor HP ↔ kW with a
  full-load-amp estimate, and the NEMA MG-1 voltage-imbalance check
  (≤1 % OK / 1–5 % derate / >5 % don't operate). The FLA is
  deliberately an estimate — it runs 10–25 % low of the NEC tables,
  and the callout says so and points sizing at 430.250 / 430.248;
  an optional clamp reading gets a measured-vs-estimate verdict pill.
- **Power & Energy Converter** — any power or energy unit (W, kW,
  BTU/hr, MBH, MMBtu/hr, tons, hp, boiler hp; J, kWh, therms, MMBtu…)
  to every equivalent in its dimension, plus a Power × Time = Energy
  bridge that solves for any leg. Every factor derives from one
  constant (1 BTU = 1055.05585262 J) so the table can't drift, and
  the labels defuse the MBH-vs-MMBtu trap (M is the Roman thousand,
  MM the million — a 1000× misread). The Boiler / Burner tab is the
  service call that prompted the tool: effective turndown (input ÷
  burner min fire) graded through "poor — short-cycling likely",
  plant totals by quantity, and a Riello firing-string parser.

### Simulators

Running models you can play with — no install, no sign-in. Most are
paired with an Education explainer for the underlying concepts.

- **PID Tuning Helper** — step-response simulator with an
  equipment-led selector (a supply-fan/duct-static loop, a 2-way
  valve, a radiator, a long-run reheat coil) and a parameter-style
  toggle (gain·reset·rate vs. Ti·Td in minutes or seconds vs.
  proportional-band conventions; the controller runs canonical units,
  the labels follow you). A live process strip above the chart
  animates the chosen gear — the actuator tracks the controller
  output while a playhead sweeps the step response — and the
  loop-speed numbers + a symptom → tuning-move cheat sheet hide
  behind a "loop details" spoiler, so you can tune by feel first and
  reveal to check. A bump-test path turns a real loop's measured
  ΔCO/ΔPV/τ/dead-time into conservative SIMC PI starting gains, read
  out in the selected parameter style. Cross-links to the PID Basics
  explainer.
- **Mock VFD Interface** — generic drive keypad to practice
  navigating a parameter tree without a live drive in front of you.
  13 parameters in 4 groups, fixed 20×4 mono LCD, linear-ramp motor
  model, LOCAL/REMOTE override. The run-source / speed-source
  pedagogy from the VFDs explainer in hand: a keypad RUN with the
  run-source set to TERMINALS sits there and does nothing.
- **Function-Block Editor** — graphical wiresheet sandbox: drag
  logic, math, timer, and PID blocks onto a sheet, wire them up,
  and watch a control sequence run live. Five worked examples
  built in (economizer-enable, freeze-stat lockout, dual-thermostat
  staging, heating PID, divide-by-zero edge case). Pairs with the
  Function-Block Basics explainer.
- **Equipment Staging Sequencer** — a continuously-running parallel
  plant: demand rides a 24-hour load curve while a configurable
  sequence stages 2–4 units up and down, rotates the lead three ways
  (fixed / runtime-equalized / scheduled), injects a fault with
  standby promotion, and logs every move on a live demand-vs-capacity
  trend. Pairs with the Equipment Staging explainer.
- **Controller Wiring Simulator** — wire a generic DDC controller the
  way you would in the field: power it from a 24 VAC transformer, drop
  sensors (10K thermistor, 0-10 V / 4-20 mA transmitters, dry contact)
  and outputs (0-10 V actuator, relay-driven fan), and click
  terminal-to-terminal. Points read live when landed right; a bad wire
  fails the way real hardware does — an open sensor, a dead actuator,
  a spark, a popped fuse — with every fault named in plain terms.
  Pairs with the Controller Wiring explainer.
- **Hydronic Loop Builder** — a 3D piping sandbox with a real solver:
  drop a plant, pump, coils, and valves onto two synced elevation views
  (north and east share the height axis, so the loop routes in true 3D),
  pipe them port-to-port, and hit run. Each tick solves a steady-state
  hydraulic and thermal balance: flow finds the pump curve's operating
  point, and a cold loop visibly warms up as heat (q = 500 · GPM · ΔT)
  rides the water. Pipe friction tracks the developed 3D run while static
  lift cancels around the closed loop (the expansion tank holds it);
  shut valves stay finite, and a solve that doesn't settle warns you
  rather than masquerading as solved. Three worked loops to start from;
  desktop-only by design. A teaching model, not a design tool — the
  capstone for the four hydronic lessons.
- **Refrigerant Loop Simulator** — a directional vapor-compression
  model: turn evaporator airflow, refrigerant charge, outdoor ambient,
  condenser airflow, return-air temperature, metering superheat, and
  the compressor stage, and watch suction and head pressure, superheat,
  subcooling, and a starving coil react on two manifold gauges, an
  animated loop, and a live P-T strip. Pressures are real P-T-table
  lookups; the magnitudes are illustrative. The headline scenario —
  "Starve the coil" — freezes the evaporator at a perfectly normal
  superheat, the airside-vs-refrigerant-side trap behind the VAV
  coil-flow minimum. Pairs with the refrigerant-cycle, superheat /
  subcooling, and metering-device lessons.

### Education

Practical explainers with hand-drawn SVG schematics. Aimed at
techs new to the industry and anyone wanting a refresh.

- **PID Basics** — what proportional, integral, and derivative
  actually *do* on an HVAC loop, with three cumulative mini-sims
  (P only → P+I → P+I+D) so you can move one knob at a time.
- **Controller Wiring** — how a field point lands on a DDC
  controller: 24 VAC power, the four input landings (10K thermistor,
  0-10 V and loop-powered 4-20 mA transmitters, dry contact), and the
  outputs, where the recurring trap is that the controller's signal
  is not the load's power. Built on one idea — every return comes
  back to the shared COM, and on a shared transformer every COM lands
  on the same leg or the first shared wire dead-shorts the secondary.
  The capstone diagram lands one of each on the same generic
  controller the simulator uses. Pairs with the Controller Wiring
  Simulator.
- **Controls Commissioning** — how you verify a controller actually
  does what its sequence of operations says. Point-to-point checkout
  of every AI, AO, BI, and BO (exercise the point, confirm the value
  or state, catch reversed actuators and swapped outputs), override
  discipline (log every force, clear it before turnover), interlock
  and reset testing against design intent, and trend logs as proof
  over time. The verification-loop capstone diagram ties it together.
  Pairs with Controller Wiring and the Function-Block lessons.
- **Hydronic Loops** — 2-pipe direct return, reverse return, and
  the primary-secondary "twin-T" boiler-injection configuration.
  Animated schematics, plus an interactive injection-pump widget
  on the twin-T section with a hidden failure-state anecdote at
  0 Hz.
- **Load Piping** — two-way vs. three-way valves at hydronic
  loads, variable vs. constant system flow, the differential
  pressure bypass valve (DPBV) on variable-flow systems, and what
  the load-side valve choice cascades to at the loop level. Pays
  off a forward callout from Hydronic Loops.
- **VFDs** — variable-frequency drives from the controls-tech
  angle: block-diagram intro, the cube-law energy story, and the
  *run command vs. speed reference* parameters that gate every
  command from the BMS. Includes an interactive widget that reveals
  a war story when you set up the configuration mistake that
  catches everyone. Pairs with the Mock VFD interface tool.
- **Pump Control** — how the BMS decides what speed reference to
  send to a variable-flow pump. Pump curves and the operating point
  (interactive chart), affinity laws, DP-based control with a remote
  sensor, and DP setpoint reset for the bottom of the cube-law
  savings. Two widgets, deadhead-anecdote reveal at zero demand.
  Closes out the variable-flow story with Load Piping and VFDs.
- **Equipment Staging** — several identical pumps in parallel and
  the sequence that runs them: how many to run, when to add or drop
  one, and which pump takes the lead. A live widget shows why
  stage-up and stage-down are different numbers (the deadband that
  stops the plant hunting) and why timers hold each change (stage
  delay + minimum stage time — no short-cycling). A second widget
  steps weeks of runtime to set fixed-lead against runtime-equalized
  rotation: one pump logging every hour while the "redundant"
  standby ages sitting still. Same logic stages boilers, chillers,
  and cooling-tower cells. Pairs with the Equipment Staging quiz.
- **Hydronic Balancing** — getting design flow to every load on a
  loop. Calibrated balancing valves, automatic balancing valves,
  and pressure-independent control valves (PICVs) — what each one
  is, how it behaves, and when to reach for it. Interactive widget
  comparing all three branches under varying system Δp, with a
  burst-coil anecdote at the low-pressure extreme. Pays off forward
  links from Hydronic Loops, Load Piping, and Pump Control.
- **Coil Selection** — where the design flow a balancer chases
  actually comes from. The load-to-flow chain (q = ṁ·cp·ΔT resolved
  to `GPM = Btu/h ÷ (500 × ΔT)` and `CFM = Btu/h ÷ (1.08 × ΔT)`), why
  the chosen design ΔT is the lever that sets the flow, the coil's own
  levers (rows, fin density, circuiting, face-velocity carryover), and
  a brief approach / LMTD note. A counterflow-coil capstone diagram
  ties the chain together. Feeds the Hydronic Balancing lesson.
- **Refrigerant Cycle Basics** — the vapor-compression cycle for
  controls people, who meet it through sensor readings (a low-suction
  alarm, a head-pressure trip) and have to decide whether the system
  is wrong or the sensor is. Four components, high side vs. low side,
  and the load-bearing concept: pressure and temperature locked
  together at saturation — with real R-410A numbers that reproduce in
  the Refrigerant P-T tool, a glide footnote for zeotropic blends, and
  an animated color-coded cycle diagram. Page 1 of the refrigerant
  chapter; pairs with the Refrigerant Cycle Basics quiz.
- **Superheat & Subcooling** — the two measurements that prove a
  refrigerant cycle is running right, not just running, computed
  from the four points a packaged unit's controller already shows
  (suction/liquid pressures + clamp-on line temps, against the dew
  or bubble column — the split that matters on blends with glide).
  Each deviation direction gets its fault family — low superheat →
  floodback, high → starved evaporator; low subcooling → undercharge
  (low enough and flash gas reaches the liquid line), high →
  overcharge or a restricted liquid line — with
  the caveat that the data plate's targets beat any rule of thumb.
  Worked R-410A example replays in the P-T tool; paired quiz.
- **TXVs vs. EEVs** — opens the box on the metering device that
  holds superheat: the TXV's mechanical force balance (bulb pressure
  opens, spring + evaporator pressure close — cutaway diagram) and
  the EEV's stepper loop (P + T sensors → controller computes SH →
  steps the port). Same job, two surfaces: the BMS sees the EEV as a
  point list; the wrench side holds the TXV. A field note defuses the
  bulb's look-alike trap (it reads as a strapped-on temp sensor to
  BMS eyes), and the hard-railed-valve tell — 0 or 100 % with SH
  off target means the loop is out of authority. Closes the
  refrigerant chapter; pairs with the TXVs vs. EEVs quiz.
- **Psychrometrics Basics** — the seven properties of moist air,
  which instrument gives you each, and why any two lock the other
  five (the reason the chart tool's Define-by dropdown exists).
  Gotcha grid on the traps: RH alone tells you nothing; dew point
  is the property that condenses. Capstone widget replays a real
  pool job — slide space dry-bulb, RH, and coldest-surface
  temperature, and a three-state panel calls it ("glass stays
  dry" / "watch the glass" / "condensation on glass") off the
  surface-minus-dew-point margin, on the same moist-air engine as
  the interactive chart. Pairs with the Psychrometrics Basics quiz.
- **Air Handlers** — what happens to air as it passes through an air
  handler: the path from return grille to supply duct, station by
  station — return and relief, the mixing box held at minimum
  outside air (with the worked mixed-air arithmetic), filter before
  coils and the dirty-filter ΔP, the drain pan under the cooling
  coil, and the draw-through supply fan with its degree of fan heat.
  Four animated air-path schematics plus a sensor-strip widget that
  walks RA-T / OA-T / MA-T / DA-T like a BMS graphic — its
  damper-failure preset replays a real RTU hunt traced to an MA-T
  sensor mounted too close to the DX coil. A budgeted callout maps
  the same drawing onto a packaged RTU. Page 1 of the forced-air
  chapter; pairs with the Air Handlers quiz.
- **Economizers** — when an air handler should cool with outside air
  instead of running the coil: the three dampers as one modulating
  assembly holding mixed-air temperature, the changeover decision
  and the deceptive wedge where dry-bulb admits humid air carrying
  more total heat than the return, integrated first-stage staging,
  and the field failure modes with their MA-T trend tells. A
  changeover-explorer widget judges one outdoor-air state by
  dry-bulb and by enthalpy side by side on the shared ASHRAE
  moist-air engine and derives the worst-case dry-bulb limit for
  buildings with no humidity sensor — its deceptive wedge replays a
  real all-dry-bulb building where the occupants were the only
  humidity sensor. Page 2 of the forced-air chapter; pairs with the
  Economizers quiz.
- **Building Pressure** — why a building goes positive or negative:
  the air ledger (outside air in vs exhaust, relief, and
  exfiltration out — pressure is the residual), the slightly-positive
  setpoint and the door symptoms in both directions, sizing the OA
  minimum over the exhaust that never returns, and the relief lineup
  — barometric's positive-only physics, power exhaust staged off
  damper position (emphatically not a return fan), and return-fan
  tracking. A pressure-ledger widget solves the building live against
  four relief strategies — its interlock-mistake preset replays the
  author's own program that ran power exhaust with the supply fan and
  dragged a building negative all winter. Page 3 of the forced-air
  chapter; pairs with the Building Pressure quiz.
- **Unit Identification** — standing in front of an air-side unit
  you've never met: the three field questions (where does it sit,
  what's in the cabinet, where does its air come from and go), the
  lineup and its fingerprints — packaged RTU (and the heat-pump
  variant only paper can confirm), built-up AHU, MAU/DOAS, splits,
  fan coils at recognition depth, and the CV-vs-VAV conjunction —
  then schedule tags, the mechanical schedule, nameplate literacy
  (tonnage out of a model number), and what to do when the paper
  lies: the off-season override that makes an unlabeled system
  announce itself. A lineup-walker widget deals field mysteries,
  the last one replaying the author's own building where the
  graphics, the prints, and the people all disagreed. Page 4 of
  the forced-air chapter; pairs with the Unit Identification quiz.
- **VAV Systems** — one air handler, thirty zones that never agree:
  the cold trunk and the boxes that throttle volume, not temperature
  (the load-piping mirror, said out loud); inside the box — damper,
  flow ring, CFM = K·√VP and the airflow tool that runs it; why the
  box chases flow instead of damper position (pressure independence,
  and where min/max CFM come from); the floors — ventilation at the
  box, reheat riding the minimum, measured outside air at the unit,
  and the DX coil's own airflow floor; a box-walker widget with a
  system strip that starves a coil the way the author's real building
  did. Closes on the chapter cliff-hanger: every box shuts at once —
  where does the pressure go? Page 5 of the forced-air chapter;
  pairs with the VAV Systems quiz.
- **Duct Static Control** — the chapter closer, answering page 5's
  cliff-hanger: why the supply fan holds one static pressure instead
  of chasing flow (the pump-control mirror, drawn on air); the loop —
  a sensor two-thirds down the trunk, a setpoint in whole inches, a
  fast PID on the VFD; trim & respond reset and the cube-law money it
  recovers; then the hard lesson — static is not flow, told three
  ways through the author's real building: identical readings at a
  quarter of design flow, an iced coil the loop masks with fan speed,
  and the old fix that railed a 0–2.5 in. w.c. transducer at 10 V
  because pressure-independent boxes give a cranked fan nothing but
  pressure back. Safeties (the independent high-static cutout, the
  lying sensing tube), a drivable static-loop widget, and a closing
  walk of all six pages. Page 6 of the forced-air chapter; pairs
  with the Duct Static Control quiz.
- **Air Balancing** — the air side of commissioning: proving every
  zone gets the design flow it was drawn for. The flow ring and
  CFM = K√VP, and why the box's own number is only as good as its
  K until an independent duct traverse checks it; the three box
  setpoints (min, max, reheat) and why the minimum is a ventilation
  floor, not a comfort number; pressure-independent vs
  pressure-dependent boxes and bypass dampers; holding the building
  slightly positive; then the proportional-balancing field method —
  proportion every terminal to the index zone, raise the common
  supply, iterate — the air-side mirror of hydronic balancing.
  Closes on the air-balance report as the record. Page 7 of the
  forced-air chapter.
- **Dedicated Outdoor Air (DOAS)** — the other way to bring fresh air
  in: a unit dedicated to 100% outdoor air that decouples ventilation
  and latent load from the space's sensible. What a DOAS is versus a
  mixed-air handler; why decoupling lets you control humidity
  independently and guarantees each zone its 62.1 ventilation share
  regardless of the thermostat; the latent/sensible split — the deep
  coil driven to a low apparatus dew point, then reheat to a neutral
  supply (and the cold-air variant that skips it); and how it's
  controlled — a leaving-air dew-point setpoint, reheat, enthalpy
  recovery, and occupancy / DCV scheduling. Closes on a true story: a
  lab building whose DOAS was sized to a design dew point the climate
  has since outrun. Page 8 of the forced-air chapter.
- **Function-Block Basics** — what a block and a wiresheet are, why
  the industry builds sequences this way (the diagram is the program,
  you can watch it run live, the block vocabulary travels across
  platforms), and the six families almost any palette sorts into.
  Explains how a sheet actually evaluates — the scan, dependency
  order, and the one-scan memory that lets a feedback loop (an SR
  latch) hold state instead of chasing itself — then walks a real
  economizer-enable sheet. Pairs with the Function-Block Editor
  sandbox and a Function Blocks quiz.
- **Modbus Basics** — what Modbus is on the wire: the four data
  tables (coils, discrete inputs, input and holding registers),
  the function codes that read and write them, and what an
  exception response means — the high-bit echo (0x03 comes back
  as 0x83) plus the four exception codes that show up in BMS work.
  RTU vs. TCP changes the envelope, not the language. Two field
  stances carry it: Modbus is dumb on purpose — a register is just
  sixteen bits, the meaning lives only in the vendor manual — and
  servers never speak first, so the client polls or it misses.
  Continues in Modbus Decoding for what the returned bits mean.
- **Modbus Decoding** — why a Modbus value comes back wrong even
  after the read succeeded: the four interpretation choices the
  protocol leaves to you. The 5-digit numbering trap (40001 is wire
  address 0), signed vs unsigned (the same 16 bits are 65523 or
  −13), the four 32-bit byte orders (ABCD / CDAB / BADC / DCBA —
  none of them "the standard"), and vendor scaling to engineering
  units — closing on the combined trap where a signed, 0.1-scaled
  register read unsigned logs a plausible 6553.5 instead of −0.1.
  Companion to the Modbus Basics explainer; the interactive form of
  each gotcha lives on the Modbus Register Viewer tool.
- **BACnet vs Modbus** — the bridge between the two protocol clusters:
  the same physical point seen as an anonymous Modbus register versus
  a self-describing BACnet object, then a dimension-by-dimension table
  (discovery, COV vs polling, priority array vs last-write, PICS/BIBBs
  vs vendor register map, transports, typical gear) and the two rows
  that bite daily. Closes on the field reality — Modbus at the edges,
  BACnet in the middle, a gateway at the seam — and why "which is
  better" is the wrong question.
- **BACnet Basics** — BACnet on the wire: the self-describing object
  model (an object knows its own name and units, where a Modbus
  register is just sixteen bits), the handful of services that do
  almost all the everyday work, and Who-Is / I-Am discovery. The
  priority array gets its own worked example — sixteen slots, lowest
  non-null wins — plus the field trap it defuses: a "broken" sequence
  is often a forgotten slot-8 override, and writing null releases it
  rather than overwriting. MS/TP vs BACnet/IP is same protocol,
  different wrapper; cross-router discovery and BBMDs defer to the
  BACnet Networking companion. Pairs with a practice quiz.
- **BACnet Services** — the fuller reference behind Basics' five
  everyday verbs: what a service is, the confirmed / unconfirmed
  split (why `Who-Is` owes no reply but `ReadProperty` always
  answers), the service families as a field-relevant table, and the
  part that decides whether two "fully BACnet" devices actually talk
  — **BIBBs** (the A = client / B = server role letters, with the
  anatomy of `DS-RP-B` broken open), device profiles (B-BC / B-AAC /
  B-ASC and friends), and the PICS that lists a device's real
  capabilities.
- **BACnet Networking** — the other half of BACnet Basics: how
  devices on different networks find each other, and why discovery
  fails with no error when they don't. Three addresses for one
  device (only the instance number survives a re-IP), the
  BVLL/NPDU/APDU frame, BBMDs with the asymmetric-BDT and
  two-BBMDs-on-one-subnet traps, Foreign Device Registration and
  its silently expiring TTL, and decoding the hex-blob device
  address some workstations show (the context behind the BACnet/IP
  Hex Converter tool). Closes with a field-ordered checklist for
  "I can't see a device I expect to see."
- **BACnet MS/TP** — why devices fall off an MS/TP trunk, as three
  layers that each fail differently: the token ring (`Max_Master`'s
  capped-ring silent failure — the correctly wired controller at
  MAC 45 that's simply never polled), addressing (MAC vs device
  instance, and the duplicate-MAC devices-take-turns-offline
  symptom), and the two wires (daisy-chain only, exactly two 120 Ω
  EOLs, single-point bias, and the A/B polarity-label trap — trust
  the + and −). Ends with a symptom → layer table and a two-tier
  budget rule: past the vendor's figure it *could* be a problem,
  past the standard's 4000 ft / 32-unit-load figure it *is*. Pairs
  with a practice quiz.

### Practice

Active-recall quizzes and drills that pair with the lessons or
reach beyond them. No login, scores live in localStorage. Two
flavors share the same engine:

- **Content quizzes** — every question links back to the lesson or
  tool that explains it. Built to be the self-check after reading a
  page.
- **Field drills** — broader scope; explanations stay inline since
  the topics don't always have a matching page on the site yet.
  When a topic recurs in feedback, it becomes a candidate for a
  new education page.

Shipped so far — twenty-three content quizzes (each 10 questions, paired
1:1 with its lesson and deep-linking the gotchas) plus five field
drills:

- **Content quizzes — protocols:** Modbus Basics, Modbus Decoding,
  BACnet Basics, BACnet Networking, BACnet MS/TP. The data tables and
  function codes, the 5-digit / signed / byte-order / scaling decoding
  traps, the self-describing object model and priority array, the
  three-layer addressing with BBMDs and Foreign Device Registration,
  and the MS/TP token ring with its Max_Master and termination traps.
- **Content quizzes — hydronics:** Pump Control, Hydronic Loops,
  Load Piping, Hydronic Balancing, Equipment Staging. The operating
  point and affinity laws, direct/reverse return and the
  primary-secondary twin-T, two-way vs three-way flow, the
  CBV / ABV / PICV families, and the stage-up/stage-down deadband
  with lead rotation for even wear.
- **Content quizzes — controls:** PID Basics, VFDs, Function Blocks.
  The droop P leaves and how integral erases it, the rectifier /
  DC-bus / inverter power stages and the run-command vs.
  speed-reference trap, and blocks, pins, wire types, and how a
  scan resolves feedback.
- **Content quizzes — refrigeration:** Refrigerant Cycle Basics,
  Superheat & Subcooling, TXVs vs. EEVs. The four components and
  the pressure-temperature saturation lock, which line each
  measurement lives on and what a high or low reading points
  toward, and the mechanical TXV force balance vs. the electronic
  EEV control loop.
- **Content quizzes — psychrometrics:** Psychrometrics Basics.
  Seven properties, why any two lock the rest, the four chart
  process families, and the RH / dew-point / enthalpy gotchas.
- **Content quizzes — forced air:** Air Handlers, Economizers,
  Building Pressure, Unit Identification, VAV Systems, Duct Static
  Control. The station order down the air path, minimum outside air
  and where the relief goes, the mixed-air arithmetic and its
  stuck-damper gotcha readout, filter ΔP, coil condensate, and fan
  heat; then free cooling end to end — the linked damper set, the
  mixing math run backwards, the deceptive air a dry-bulb changeover
  admits, the no-humidity-sensor fallback, and integrated staging;
  then the air ledger — OA-minimum sizing, barometric vs power
  exhaust vs tracking, and the heavy-door interlock diagnosis; then
  naming the box — the three field questions, the family tells,
  tonnage from a model number, and the mislabeled-fan-coil gotcha;
  then the boxes — volume not temperature, K-factor flow, the damper
  nobody sets, reheat at minimum, and the starved-coil trend; and
  finally the fan's answer — static as the signal, the sensor
  two-thirds out, trim & respond, the railed transducer, and who
  really decides total flow.
- **Surviving Your First Months** *(field drill)* — a broad sampler
  for techs in their first few months: LOTO and verify-on-known-live,
  the 4-20 mA live-zero wire-break signature, DMM continuity mode,
  the 24VAC R/C convention, VFD carrier whine, and the like.
- **Controller Swap** *(field drill)* — replacing a DDC controller
  end to end: documenting and re-landing field wiring, re-using the
  MS/TP address and BACnet device instance, EOL termination, config
  backup, application download, graphics re-bind, and commissioning
  the sequence (not just confirming the points read).
- **Field Wiring & Sensors** *(field drill)* — the layer where the
  signal meets copper, which bites before any logic runs: thermistor
  vs. RTD curves and 3-wire lead compensation, what an AI reads vs.
  what an AO drives, loop-powered 2-wire transmitters, the mA →
  engineering-units scaling math, shield bonded at one end only,
  and which way an open thermistor drives the displayed temperature.
- **Sequencing Scenarios** *(field drill)* — how real sequences of
  operation behave: chiller and boiler plant staging and why the
  stage-up/stage-down deadband is wide, lead/lag rotation, dry-bulb
  vs. enthalpy economizer changeover (and the mixed-air low limit
  missing on a freezing morning), the overcool-and-reheat
  dehumidification cascade, and condensing-boiler return-water
  logic.
- **Troubleshooting** *(field drill)* — symptom → most-likely-cause
  reasoning across the trade; the skill drilled is reading what a
  symptom rules in and out: a pingable-but-undiscoverable BACnet
  device, Modbus exceptions vs. a byte-order-garbled float, low-ΔT
  syndrome, an air-bound top-floor coil, low superheat vs. high
  subcooling, and a VFD that trips on start.

## How it's built

A multi-page static site under `html/` plus a small Cloudflare
Worker (only for `POST /api/contact`). The toolchain is deliberately
minimal: 11ty (Eleventy) templates the shared chrome — `<head>`,
nav, footer — out of every page; everything else is vanilla. No
client-side framework, no bundler, no JS transpiler. View-source of
the rendered page is still readable HTML, and browsers ten years
from now will still run it.

### Architecture

- **Source pages** under `html/` with YAML frontmatter, extending a
  shared Nunjucks layout (`html/_includes/layouts/page.njk`).
  Four-space indentation, anchor `href`s use explicit `.html`
  extensions. The shared partials (`head.njk`, `nav.njk`,
  `footer.njk`) supply the `<head>` block, the top nav, and the
  footer.
- **Build:** 11ty (`npm run build`) renders each page from its
  frontmatter + the layout, passes through `styles.css`, `scripts/`,
  `assets/`, `robots.txt`, generates `sitemap.xml` + the
  `search-index.json` the command palette reads, and writes to
  `_site/`. Build is a few seconds for the whole site; the only thing it
  does is templating, no JS transpile or bundle. Cloudflare Workers Build
  runs `npm install && npm run build` on push to `main` and serves
  `_site/`.
- **Shared design system** — `html/styles.css`. Flat
  "workstation" aesthetic borrowing visual grammar from BAS UIs
  (Niagara-ish property-sheet rows, EBO-clean panels, slightly
  shaded panel headers, flat underlined tabs). On wide screens
  (≥1240px), the side gutters carry an as-built schematic
  collage — 3-way diverting valves, hydronic pump-coil loops,
  4-20mA current loops, comparator and AND-gate logic snippets, and
  JACE supervisor trunks — that draws itself in as it scrolls
  into view. Decorative, not navigational; hidden on smaller
  screens where load weight outranks decoration. Nav cards across
  Home / Guides / Tools / Simulators / Education / Practice share an
  instrument-frame shape (titlebar with a section prefix + status
  pill, body, and a bullet-separated semantic statusline) so the
  landings read as instrument racks. One design system, applied across every page;
  page-specific CSS stays inline via the layout's
  `{% block head %}`.
- **Shared scripts** in `html/scripts/` as *classic* scripts (not
  ES modules — there's no bundler doing module-graph work, and the
  shared helpers expose globals like `Units`, `simulatePid`, and
  `FlowEngine` that page IIFEs reach for by name). Most pages
  load them per-page with `<script src="/scripts/xxx.js"></script>`
  before the inline `<script>`; `theme.js`, `units.js`, `search.js`,
  `nav-menu.js`, `flow-engine.js`, `schematic-bg.js`, and
  `fullscreen-toggle.js` are loaded site-wide by the layout (theme +
  units toggles, command palette, nav dropdowns + mobile hamburger,
  gutter art, fullscreen — all on every page).
  - `pid-engine.js` — FOPDT process model + PID controller with
    conditional-integration anti-windup. Drives the PID Tuning
    Helper simulator and the three PID Basics mini-sims.
  - `pid-chart.js` — the shared step-response canvas drawer + the
    unit-aware delta formatter both PID surfaces use.
  - `psychro-engine.js` — the psychrometric property core (dry-bulb /
    wet-bulb / RH / dew point / enthalpy at altitude) behind the
    chart tool, air-mixing, coil-sizing, dew-point,
    economizer-ratio, and the psychrometrics lesson's widgets
    (`psy-widget.js` wraps the tools' shared "Define by"
    second-property widget; the lesson's widgets sit directly on
    the engine).
  - `hydronic-engine.js` — steady-state hydraulic + thermal solver
    behind the Hydronic Loop Builder: pump curves, pipe / valve /
    coil resistances, and the operating-point solve on the
    assembled loop.
  - `fbe-engine.js` — function-block catalog + per-tick evaluator
    behind the Function-Block Editor simulator.
  - `wiring-engine.js` — pure circuit solver behind the Controller
    Wiring Simulator: union-find the wired terminals into nets,
    classify them HOT / COM off the transformer, then walk each field
    device to a live reading or a named fault. Unlike `fbe-engine.js`'s
    directional dataflow tick, conductors here are undirected and
    validation is circuit-level.
  - `flow-engine.js` — animation engine for SVG schematics with
    two modes: continuous particle flow on `data-flow` paths
    (hydronic supply / return), and discrete pulses on
    `data-pulse` paths (control wiring, logic-block signal
    chains, BACnet/IP comm traces). The function-block editor
    drives the discrete-pulse mode directly via
    `FlowEngine.pulse(el)` when a wire updates. Respects
    `prefers-reduced-motion`.
  - `schematic-bg.js` — scroll-driven reveal for the gutter
    schematic motifs; bootstraps `flow-engine.js` once on
    DOMContentLoaded.
  - `search.js` — the site-wide command palette (`window.Palette`).
    Fetches the build-time `/search-index.json` once and ranks it;
    opens on `/`, `Ctrl`/`⌘-K`, or the nav search button.
  - `nav-menu.js` — the Guides / Tools / Simulators / Education /
    Practice nav dropdowns (two-level category rows on Tools, Education,
    and Practice; Guides and Simulators are flat) and the mobile
    hamburger (`window.NavMenu`); the
    dropdown link lists are generated at build time from per-section
    collections.
  - `units.js` + `ui.js` — the site-wide US/metric display toggle
    (`data-us`/`data-metric` spans + `Units.display` helpers) and
    the small shared UI helpers (tab switching, copy buttons).
  - `thermistor-data.js` / `refrigerant-data.js` — sensor R/T curves
    and refrigerant P-T saturation tables, the data files behind the
    Thermistor Calculator and Refrigerant P-T tools (the voltage-drop
    tool reads the same R/T curves for its sensor-lead error).
  - `quiz-engine.js` — engine behind the Practice section. Owns
    DOM construction (settings row, progress, prompt panel,
    choices / numeric input, reveal panel, results card) inside a
    page-provided `<div id="quiz"></div>`. Schema covers MCQ /
    T/F / spot-the-gotcha / numeric question types. Best score
    persists to `localStorage` under
    `cf_quiz_<slug>_{best,best_total,best_time_ms,attempts,last_iso}`.
- **Worker** at `src/worker.js` — ES-module Worker. Validates
  the contact form, drops honeypot submissions silently, verifies
  Turnstile, and sends via Resend. Falls through to
  `env.ASSETS.fetch(request)` for everything else.
- **Hosting:** Cloudflare Workers. Auto-deploys on push to `main`
  via the GitHub integration (~60s); the dashboard runs the 11ty
  build before each deploy.
- **Config:** `wrangler.jsonc` — `name`, `main`,
  `assets.directory` (`./_site`), `assets.binding`,
  `assets.html_handling`, and `compatibility_date` are all
  load-bearing; touch carefully.

`CLAUDE.md` has the architecture documentation, conventions, and
gotchas. `site-ideas-and-friction.md` is the running log of ideas,
design decisions, and friction encountered while building.
`codebase-issues.md` tracks code-quality items that need a design
decision before they can be acted on.

## Local development

```sh
# install dev dependencies (11ty + Playwright + wrangler — the
# site itself ships zero runtime JS dependencies)
npm install

# live-reload dev server on http://localhost:8000
npm run dev

# or: one-shot build + plain static serve
npm run build
python3 -m http.server 8000 --directory _site

# smoke tests cover every page + a few behaviour spot-checks
npm test
```

Tests live under `tests/`: `smoke.spec.js` (every page returns
200, has the expected title and nav, no console errors, plus
behaviour spot-checks), `contact.spec.js` (the contact form),
`psychro-engine.spec.js` (pure-Node engine math), `nav-search.spec.js`
(the command palette + search-index drift), `nav-menu.spec.js` (the
nav dropdowns + mobile hamburger), and `home-hero.spec.js` (the
interactive hero loop + category deep-links). Chromium only. The Playwright config has a `webServer` block that builds
and serves `_site/`, so `npm test` is self-sufficient on a fresh
checkout — a running `npm run dev` on port 8000 is reused.

For UI changes, screenshot the page after editing rather than
guessing — `@playwright/test` re-exports `chromium` for one-shot
captures. For `contact.html` use `waitUntil: 'domcontentloaded'`
(Turnstile never goes idle).

## Contact

The site's [contact form](https://controlsfreak.dev/contact)
takes bug reports, tool requests, and corrections. GitHub Issues
is also fine for code-side questions.
