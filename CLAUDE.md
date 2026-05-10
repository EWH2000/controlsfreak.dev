# controlsfreak.dev

Personal website for Ethan Hill. Static site, hand-written HTML, no
framework or build step (yet).

## Stack

- **Source:** plain HTML/CSS/JS in `html/`
- **Hosting:** Cloudflare Workers (static-assets-only Worker)
- **Deploy:** Auto-deploys on push to `main` via GitHub integration
- **Config:** `wrangler.jsonc` at repo root tells Cloudflare where to
  find the site (`./html`)

## Repo structure

controlsfreak.dev/
├── CLAUDE.md           # this file
├── README.md           # human-facing project description
├── wrangler.jsonc      # Cloudflare deploy config — touch carefully
├── .gitignore
└── html/               # site root, served as-is
└── index.html

## Workflow

The user runs Git commands themselves. Claude Code's job is editing
source files; the user handles staging, committing, and pushing.
Do not run `git add`, `git commit`, or `git push` unless explicitly
asked.

Typical loop:
1. User asks for an HTML/CSS/JS change
2. Claude Code edits the file in `html/`
3. User reviews the diff (`git diff`)
4. User commits and pushes
5. Cloudflare auto-deploys within ~60 seconds

## Conventions

- HTML files use lowercase folder name (`html/`, not `HTML/`)
- Indentation: 2 spaces
- Keep things simple — no frameworks, no build step, no JS unless
  there's a clear reason
- Prefer semantic HTML over div soup
- The site should remain fast and accessible — no heavy fonts, no
  tracking scripts, no auto-playing media

## About the user

- Background in building automation / controls programming (BACnet,
  Modbus TCP, Niagara, EBO)
- Solid IP networking fundamentals; learning software dev workflows
- Comfortable in a terminal, getting comfortable with Git
- Wants to understand what's happening, not just have it work — when
  introducing a new concept or command, briefly explain it

## What to avoid

- Don't suggest adding frameworks, bundlers, or build steps without
  being asked. The site is intentionally simple.
- Don't run Git commands on the user's behalf.
- Don't modify `wrangler.jsonc` casually — the `directory` field and
  the Worker `name` are load-bearing for deploys.
- Don't add tracking, analytics, or third-party scripts without being
  asked.

## Future direction

- Phase 2 may add a static site generator (Hugo or 11ty leading
  candidates) once the site outgrows hand-written HTML
- May add additional pages over time — keep markup patterns
  consistent so a future migration to a generator is clean
