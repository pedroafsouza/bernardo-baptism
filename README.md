<div align="center">

<img src="public/assets/game/bernardo.png" width="96" alt="Bernardo the bear" />
<img src="public/assets/game/oscar.png" width="96" alt="Oscar the dog" />
<img src="public/assets/game/church_pixel.png" width="128" alt="The church" />

# Bernardo's Christening

**A playable invitation.** Instead of a card, every guest gets a personal link to
a little pixel-art platformer: help **Bernardo the bear** and his dog **Oscar**
collect bones, cross the world, reach the church — and RSVP at the finish line.

Built with Next.js 15 · React 19 · Phaser 3 · Prisma + SQLite · Tailwind

</div>

---

## The event

|                |                                          |
| -------------- | ---------------------------------------- |
| **Child**      | Bernardo Freitas de Souza                |
| **Born**       | 16.06.2026                               |
| **Christening**| 03.10.2026                               |

---

## How it works

```
/?code=MARVIN  →  entrance screen (Dansk / English)
               →  platformer: run, hop, collect bones, bounce, kick the ball
               →  reach the church
               →  RSVP + score submitted to the leaderboard
```

- **Personal invite codes.** Each code is a playful portmanteau of the invitees'
  own names — `BIBEDRO` (Bibi + Pedro), `MARVIN` (Marie + Kevin), `THADRA`
  (Thales + Sandra). Solo guests get Bernardo's own `-ARDO` ending.
- **Leaderboard.** 10 points per bone, 100 per blessing, 250 for reaching the
  church. Best run per guest wins.
- **Oscar grows.** The more bones you collect, the bigger Oscar gets — from
  scale 1.2 up to 2.1 at 40 bones.
- **Two languages.** Danish by default, English opt-in, stored in localStorage.
- **Original chiptune soundtrack**, synthesised in the browser with Web Audio.

<img src="public/assets/game/hospital.png" width="160" alt="Level scenery" />
<img src="public/assets/game/tiles.png" width="320" alt="Tileset" />

---

## Admin panel

`/admin` — protected by credentials read from the environment.

- Guest list with group, status, adults, kids and score
- **Invitation generator**: per guest, in **Danish, English and Portuguese**,
  in a short WhatsApp form and a long e-mail form, with copy-to-clipboard plus
  direct "open WhatsApp" / "open e-mail" links
- **Invitation-sent tracking** with a timestamp, a filter and a progress bar
- Headline counters: how many have accepted, and how many people that is
  (adults + kids)
- CSV export

---

## Getting started

```bash
npm install
cp .env.example .env      # then fill in the values (see below)
npm run db:push           # create the SQLite schema
npm run seed              # load the guest list
npm run dev
```

Open <http://localhost:3000> for the invitation and
<http://localhost:3000/admin> for the panel.

### Environment variables

No credentials are committed to this repository. `.env` is gitignored and the
app **fails closed** — admin login returns 503 while these are unset.

| Variable         | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `DATABASE_URL`   | Prisma connection string, e.g. `file:./dev.db`       |
| `ADMIN_USER`     | Admin panel username                                 |
| `ADMIN_PASSWORD` | Admin panel password                                 |
| `ADMIN_SECRET`   | Random string signed into the admin session cookie   |

Locally they live in `.env`. In CI/deployment set them as repository secrets or
hosting environment variables:

```bash
gh secret set ADMIN_USER
gh secret set ADMIN_PASSWORD
gh secret set ADMIN_SECRET
```

---

## Scripts

| Command          | What it does                              |
| ---------------- | ----------------------------------------- |
| `npm run dev`    | Development server                        |
| `npm run build`  | `prisma generate` + production build      |
| `npm run start`  | Serve the production build                |
| `npm run db:push`| Sync the Prisma schema to SQLite          |
| `npm run seed`   | Upsert the guest list (never overwrites answers) |

---

## Project layout

```
app/                 Next.js routes — invitation, /admin, /api/*
components/          React UI (intro, RSVP, leaderboard, icons)
components/game/     Phaser scene factory and procedural textures
components/admin/    Admin-only UI (invitation message modal)
lib/                 config, i18n, invite templates, music, game constants
lib/levels/          level data
prisma/              schema, seed script and the real guest list
public/assets/game/  pixel art (CC0 — see CREDITS.md)
```

## Credits

Pixel art from [Kenney](https://kenney.nl) under CC0 — see
[`public/assets/game/CREDITS.md`](public/assets/game/CREDITS.md). Characters,
props and music are generated procedurally in code.
