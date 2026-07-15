# Astral Veil

A two-player prediction game about managing a finite hand while reading the changing composition of a shared deck.

## Language

**Match**:
A complete contest between two players, made up of resolved rounds and ending in a win or draw.
_Avoid_: Game, session

**Hot-seat match**:
A local match in which players alternate access to one device behind a privacy handoff.
_Avoid_: Couch multiplayer, pass-and-play

**Hand**:
The cards a player currently owns and may play. Its composition is private to that player, while its size is public.
_Avoid_: Player deck

**Committed selection**:
The secret, irreversible card a player has chosen for the current round.
_Avoid_: Selected card, locked card

**Round reveal**:
The staged unveiling, after both players have a committed selection, of those plays in the order they were committed, then the center card, then the round outcome.
_Avoid_: Reveal animation, reveal stage machine, flip sequence

**Standoff**:
A round in which both players match the center card or neither player does, leaving the pot in place.
_Avoid_: Round tie

**Decisive round**:
A round in which exactly one player matches the center card.
_Avoid_: Won round

**Draw**:
A completed match in which both players have the same final burden size.
_Avoid_: Match tie

**Unseen center cards**:
The center cards whose symbols have not yet been revealed, including the current face-down card and all future cards in the central deck. Their known composition determines the public probabilities.
_Avoid_: Remaining deck

**Pot**:
The public shared collection of revealed cards carried across standoffs and claimed after a decisive round.
_Avoid_: Pile, pool

**Burden**:
A player's personal collection of cards received from claimed pots; those cards cannot be played. Only its size is public, and that size is the player's score.
_Avoid_: Pozo propio, penalty pile, taken pile, vault

**Pattern break**:
A deliberate departure from an established selection pattern intended to make future choices harder for an opponent to predict.
_Avoid_: Bluff

**Fair AI**:
An algorithmic opponent constrained to information and memories available to a human player.
_Avoid_: Cheating AI

**Fallback selection**:
The automatic legal choice made when a player does not commit before their choice window expires.
_Avoid_: Auto-play, timeout move

**Abandonment**:
A match-ending forfeiture caused by a player leaving or repeatedly failing to choose.
_Avoid_: Concession, disconnect
