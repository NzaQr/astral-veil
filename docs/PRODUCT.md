# Astral Veil — v1 Product Specification

## Scope

Astral Veil is an English-only, two-player prediction game for modern browsers. Version 1 includes:

- Singleplayer against Easy, Medium, or Hard algorithmic AI.
- Hot-seat play on one device.
- A rules reference.

Version 1 intentionally excludes accounts, profiles, rankings, persistent statistics, match history, replays, spectators, custom rules, and music.

## Match setup

- Symbols: Sun, Moon, and Star.
- Central deck baseline: 5 cards of each symbol.
- Each starting hand baseline: 3 cards of each symbol.
- Counts remain configurable until simulation and playtesting validate balance.
- The central deck is deterministically shuffled from a seed.

## Round lifecycle

1. Draw one hidden center card.
2. Both players commit one card secretly and irreversibly.
3. Reveal both played cards simultaneously.
4. Reveal the center card.
5. Resolve the round.

The center card and both played cards enter the pot.

- Exactly one match is a decisive round. The other player receives every card in the accumulated pot into their burden, including the center and both played cards. Burden cards cannot be played.
- Both players matching or neither matching is a standoff. The entire pot remains in place.

The match ends after a resolved round when either hand is empty or no future center cards remain. Only burden sizes count toward the final score; the lower score wins. Equal burden sizes are a draw. A terminal pot remains unclaimed.

## Public and private information

Each player can inspect:

- Their own hand composition.
- The opponent's total hand size, but not its composition.
- Both players' burden sizes (the running scores). Burden composition is not shown.
- The public pot's total and Sun/Moon/Star composition.
- Every center card previously revealed.
- Counts and probabilities for unseen center cards.

“Unseen center cards” includes the current face-down card plus all future cards. Its symbol count decreases only after the current card is revealed, preventing hidden-information leakage.

Previously revealed opponent choices are not presented as a persistent opponent-hand breakdown; remembering them remains a skill.

## Interaction

- The primary commit gesture is dragging the top card of a symbol stack into the center.
- An equivalent focus/tap plus “Play card” action supports keyboard, touch, and assistive technology.
- Cards of the same symbol appear as one physical stack with a visible count.
- The pot appears as a depth-limited stack with a total count and an inspectable symbol summary.
- Dynamic numbers use tabular figures and all interactive hit areas are at least 40 by 40 CSS pixels.

Hot-seat uses a privacy handoff between choices. The player choosing first alternates each round. Matches are untimed. Singleplayer and hot-seat offer immediate rematch.

## Probability panel

The probability panel derives exact percentages from unseen center-card counts. It remains visible on desktop and uses a compact expandable presentation in mobile portrait mode.

## AI

AI is local algorithmic game logic, not a generative model or external service. It has no per-match inference cost and never receives hidden information unavailable to a human opponent.

- Easy is mostly random.
- Medium samples legal symbols weighted by unseen-center probabilities and availability in its hand.
- Hard models choices revealed during the current match, evaluates pot size and scarcity, and uses seeded pattern-breaking to avoid becoming deterministic.

Hard AI forgets its model when the match ends.

## Visual direction

- Theme: obsidian and aged brass.
- Sun: radial amber and gold disc.
- Moon: asymmetric silver and indigo crescent.
- Star: faceted cyan and violet star.
- Shape, not color alone, distinguishes every symbol.
- Cards use beveled presentation with metallic inlays, engraved symbols, and surface variation.
- The table and cards render in the game client; React DOM renders menus, HUD, probabilities, dialogs, and accessible controls.
- Mobile portrait is a complete experience; landscape and desktop expand the table composition.

Quality scales automatically:

- High: full subtle bloom, ambient occlusion, depth of field, reflections, and soft shadows.
- Medium: reduced postprocessing and reflection cost.
- Low: constrained pixel ratio, shadows, and materials while preserving game readability.

Players can override the automatic quality level. Reduced-motion preferences are respected automatically and can be overridden: state-critical card movement remains, while tilt, parallax, camera reactions, pulsing light, and intense celebrations are removed.

Version 1 includes restrained card and result sound effects, mute/volume controls, and light haptics on supported mobile devices. It has no continuous music.

## Architecture

The pnpm workspace is divided into:

- `apps/web`: React, Vite, TypeScript, Tailwind CSS, Motion, and Zustand.
- `packages/engine`: pure deterministic rules, projections, simulation, and algorithmic AI.

The engine runs locally for singleplayer and hot-seat. Player-specific projections redact the hidden center, deck order, opponent hand composition, and un-revealed opponent choice.

Implementation proceeds in three slices:

1. Engine, simulation, and tests.
2. Polished singleplayer and hot-seat.
3. Audio, accessibility, adaptive performance, and end-to-end hardening.
