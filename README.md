# Astral Veil

A two-player prediction game about managing a finite hand while reading the changing composition of a shared deck.

Play against algorithmic AI (Easy / Medium / Hard) or hot-seat on one device. English-only, browser-based, no accounts.

## How to play

Each round, a hidden center card is drawn. Both players secretly commit one card from their hand. After reveal:

- **Decisive round** — exactly one player matches the center. The other receives the entire pot into their **burden**.
- **Standoff** — both match or neither does. The pot stays in place.

The match ends when a hand empties or the central deck runs out. Lower burden wins; equal burdens are a draw.

Symbols: **Sun**, **Moon**, and **Star**.

## Stack

| Layer | Tech |
| --- | --- |
| Client | React, Vite, TypeScript, Tailwind CSS, Motion, Zustand |
| Rules | `@astral-veil/engine` — pure deterministic engine, projections, simulation, AI |

## Requirements

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+

## Setup

```bash
pnpm install
pnpm dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite dev server |
| `pnpm build` | Typecheck and build for production |
| `pnpm preview` | Preview the production build |
| `pnpm test` | Run client and engine tests |
| `pnpm typecheck` | Typecheck the workspace |
| `pnpm lint` | Lint with oxlint |
| `pnpm simulate` | Run engine balance / AI simulations |

## Project layout

```
├── src/                 # React game client
├── packages/engine/     # Pure rules, AI, simulation
├── docs/
│   ├── PRODUCT.md       # v1 product specification
│   └── adr/             # Architecture decision records
└── CONTEXT.md           # Domain language
```

## Documentation

- [Product specification](docs/PRODUCT.md) — scope, rules, AI, visual direction
- [Domain language](CONTEXT.md) — preferred terms (match, burden, standoff, …)
- [ADRs](docs/adr/) — key architecture decisions

## License

Private / unlicensed for now.
