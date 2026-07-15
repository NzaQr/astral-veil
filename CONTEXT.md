# Astral Veil

A two-player prediction game about managing a finite hand while reading the changing composition of a shared deck.

## Language

**Match**:
A complete contest between two players, made up of resolved rounds and ending in a win or draw.
_Avoid_: Game, session

**Hot-seat match**:
A local match in which players alternate access to one device behind a privacy handoff.
_Avoid_: Couch multiplayer, pass-and-play

**Online seat**:
A player's recoverable place in an online match.
_Avoid_: Connection, socket

**Guest**:
A player represented by a device-bound identity and a safely generated display name, without a registered account.
_Avoid_: User, account

**Casual queue**:
The unranked public waiting pool that pairs two available players without a skill rating.
_Avoid_: Ranked queue, ladder

**Private room**:
An invite-only online gathering identified by a shareable code and containing one match and its two players.
_Avoid_: Lobby

**Hand**:
The cards a player currently owns and may play. Its composition is private to that player, while its size is public and serves as the player's score.
_Avoid_: Player deck

**Committed selection**:
The secret, irreversible card a player has chosen for the current round.
_Avoid_: Selected card, locked card

**Standoff**:
A round in which both players match the center card or neither player does, leaving the pot in place.
_Avoid_: Round tie

**Decisive round**:
A round in which exactly one player matches the center card.
_Avoid_: Won round

**Draw**:
A completed match in which both players have the same final hand size.
_Avoid_: Match tie

**Unseen center cards**:
The center cards whose symbols have not yet been revealed, including the current face-down card and all future cards in the central deck. Their known composition determines the public probabilities.
_Avoid_: Remaining deck

**Pot**:
The public shared collection of revealed cards carried across standoffs and claimed after a decisive round.
_Avoid_: Pile, pool

**Discard**:
The out-of-play collection for cards permanently removed from the match.
_Avoid_: Graveyard, trash

**Pattern break**:
A deliberate departure from an established selection pattern intended to make future choices harder for an opponent to predict.
_Avoid_: Bluff

**Fair AI**:
An algorithmic opponent constrained to information and memories available to a human player.
_Avoid_: Cheating AI

**Fallback selection**:
The automatic legal choice made when an online player does not commit before their choice window expires.
_Avoid_: Auto-play, timeout move

**Abandonment**:
A match-ending forfeiture caused by a player leaving or repeatedly failing to choose.
_Avoid_: Concession, disconnect
