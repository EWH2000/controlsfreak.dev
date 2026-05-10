# controlsfreak.dev

Open calculators and reference tools for building-controls engineers —
BACnet, Modbus, HVAC, and building automation work. No login, no ads,
just tools that are actually useful on a job site.

Live at [controlsfreak.dev](https://controlsfreak.dev).

## What's here

- **Signal Scaling Calculator** — mA/V signals to engineering units and
  back, plus a 2-point → slope/offset solver for `y = mx + b`
- **Modbus Register Viewer** — 16-bit register as a clickable bit grid
  with decimal / hex / binary readouts

More tools (temperature conversion, VAV balancing, BACnet object
reference, PID tuning notes, Modbus function codes, duct pressure) are
on the roadmap — see the in-page roadmap section.

## How it's built

A single hand-written `html/index.html` — HTML, one inline `<style>`,
one inline `<script>`. No framework, no build step. Hosted on Cloudflare
Workers (static assets) and auto-deployed on push to `main`.

## Development

Edit `html/index.html` and open it in a browser — there's nothing to
build or run. `wrangler.jsonc` holds the Cloudflare deploy config.

## Contact

Bug reports and tool requests — contact path coming soon.
