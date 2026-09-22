# DittoGames

Free browser games, no sign-up required. Play the computer, pass a phone back and forth, or send a room code to a friend and play online.

A static site + a handful of Netlify Functions, deployed on Netlify. No build step, no framework, no database to provision — multiplayer room state lives in [Netlify Blobs](https://docs.netlify.com/blobs/overview/), which works out of the box on Netlify with zero configuration.

## Games

**Versus** — each one plays three ways: online with a friend (create a room, share the 5-character code), two players on one device, or against the built-in AI across 10 difficulty levels.
- Super Tic Tac Toe
- Tic Tac Toe
- Connect Four
- Rock Paper Scissors (best of 5, simultaneous picks)
- Dots and Boxes

**Solo** — each has a 250-level campaign that gets steadily harder, plus an endless/classic mode with local best scores.
- Snake
- 2048
- Memory Match
- Breakout
- Minesweeper

All ten work on desktop (mouse + keyboard) and mobile (touch, swipe, on-screen controls where relevant). Room codes can also be shared as a link (`?join=CODE`) — opening it on a friend's phone joins the room automatically.

## Polls

A separate `#/polls` section, one question at a time, styled as a grid of colorful cards. Voters pick from a fixed, curated list instead of typing free text, so results stay clean and comparable:

- **Favorite Album of All Time** — 1,100+ albums across every genre (`netlify/functions/lib/polls/albums.js`)
- **Best Video Game of All Time** — 120+ acclaimed games across eras and platforms (`netlify/functions/lib/polls/videogames.js`)
- **Greatest Movie of All Time** — 125+ acclaimed films (`netlify/functions/lib/polls/movies.js`)

After voting you see live stats: total votes, a ranked results list with vote counts/percentages, and where your own pick landed.

## Playing the computer, or both seats yourself

Every versus game opens on a mode picker (`public/js/versus.js`) offering **Vs computer**, **Two players, one device**, and **Online with a friend**. The first two run entirely in the browser through `public/js/local-shell.js`, which synthesizes a room-shaped object so each game's existing `renderBoard` works unchanged whether the state came from the server or from local play. Pass-and-play games with simultaneous moves (Rock Paper Scissors) put a handover screen between turns so the second player doesn't see the first player's pick.

Local play needs the rules in the browser, where online play only ever needed them on the server. `public/js/rules/*.js` mirrors each server reducer — same `createInitialState`, `legalMoves`, `applyMove` — and a parity test replays 1,500 random games through both copies, asserting they agree move for move, so the two can't quietly drift apart.

The AI (`public/js/ai/`) is one generic alpha-beta search (`search.js`) driven by those shared rule modules, plus a per-game evaluation function (`index.js`). Difficulty is not a search-depth dial alone: `pickByLevel` ranks every legal move and then, with a probability that falls off as the level rises, deliberately picks a worse one. Level 1 blunders most of the time; level 10 plays its best move and searches deeper. Beating a level unlocks the next.

## The 250-level solo campaigns

Levels are generated from the level number rather than hand-authored (`public/js/levels.js`), so the curve is consistent, cheap to retune, and every one of the 1,250 levels is reachable. Each game gets its own knobs:

| Game | What gets harder |
| --- | --- |
| Snake | More apples to eat, a faster tick, and walls scattered through the field |
| 2048 | A higher target tile, and past level 15 a cap on how many moves you get |
| Breakout | More and tougher bricks, a faster ball, a narrower paddle, fewer lives |
| Minesweeper | A bigger field and a denser minefield |
| Memory Match | More pairs and a tightening clock |

`public/js/solo-shell.js` wraps each game with the campaign chrome — mode picker, the 250-level grid with its locks, the goal banner, and the win/lose panel. A game only has to honour the level config it is handed and call `api.complete()` or `api.fail()`; everything else is the shell's job. Both modes share one implementation per game, so the classic/endless mode is the same code with no level config.

Levels are checked for fairness rather than assumed: a test asserts every generated level is monotonically harder and still winnable (2048 move limits are pinned to the minimum number of spawns the target tile physically requires, Memory Match can never ask for more pairs than there are distinct card symbols, Snake's obstacle fields are flood-filled at generation time and rejected if they'd wall the board into two halves).

## Accounts (optional)

Accounts are opt-in and exist only to carry progress between devices — nothing is gated behind one. `netlify/functions/account-*.js` handles signup, login, logout and progress sync, storing users in a Netlify Blobs store with scrypt-hashed passwords and SHA-256-hashed session tokens. Login errors are deliberately generic so they can't be used to discover which usernames exist, and repeated failures lock an account briefly.

Progress merging is best-wins in both directions: higher scores and levels win, lower times win, and the merged result is capped so a tampered client can't claim level 9,000. Signed out, everything still works — progress just stays in `localStorage`.

## How multiplayer works

Each online game has a small, pure, server-side "reducer" (`netlify/functions/lib/games/*.js`) that owns the rules — board state, turn order, win/draw detection, and validation (can't move out of turn, can't play a taken square, etc.). Netlify Functions (`netlify/functions/room-*.js`) expose that as a tiny REST API:

- `POST /.netlify/functions/room-create` — create a room, get a code back
- `POST /.netlify/functions/room-join` — join with a code
- `GET /.netlify/functions/room-state` — poll for the current state
- `POST /.netlify/functions/room-action` — submit a move, request a rematch, or leave

Room documents are stored in a Netlify Blobs store named `rooms`, keyed by room code. The browser client (`public/js/room-client.js`) polls once a second while the tab is visible and applies updates optimistically after its own moves, so play feels responsive without needing WebSockets. Rock Paper Scissors hides the opponent's pick server-side until both players have locked one in, so there's no peeking via devtools.

Rooms with no activity for 2 hours are treated as expired. A player's seat in a room (their id + a private token) is kept in `localStorage` rather than tied to an account, which is what lets a page refresh rejoin the same game in progress — signing in syncs progress, not room seats.

## How polls work

Each poll has a fixed option list defined server-side (`netlify/functions/lib/polls/registry.js`), so the client can never submit an option that doesn't exist. Three functions serve the poll:

- `GET /.netlify/functions/poll-options?poll=<id>` — the poll's title, tagline, and full option list
- `POST /.netlify/functions/poll-vote` — record (or change) a vote, returns updated stats
- `GET /.netlify/functions/poll-results?poll=<id>` — current stats without voting

Poll data lives in a Netlify Blobs store named `polls`, one document per poll: vote counts per option plus a map of voter id → chosen option (so changing your vote decrements the old option and increments the new one instead of double-counting). A random voter id is generated once and kept in `localStorage`, the same trust model the multiplayer rooms use — votes aren't tied to an account, so it's not vote-fraud-proof, just casual-poll-appropriate. The UI itself (`public/js/polls/choice-poll.js`) is a generic "pick one from a searchable list" component driven entirely by registry data (`title`, `tagline`, `itemLabel` e.g. "album"/"game"/"movie", `subtitleLabel` e.g. "artist"/"developer"/"director", and an option list of `{ id, subtitle, title, year }`) — a new poll only needs a registry entry and an option list in `netlify/functions/lib/polls/`, not new UI code. `netlify/functions/lib/polls/build-options.js` turns a plain `[subtitle, title, year]` tuple list into that option shape with stable, unique slug ids.

## Local development

```bash
npm install
npm run dev
```

This runs `netlify dev`, which serves `public/` and emulates the functions (including a local Netlify Blobs store) at `http://localhost:8888`. Open two browser windows (or one normal + one incognito) to test a multiplayer game against yourself.

## Deploying

1. Push this repo to GitHub (or your git host of choice).
2. In Netlify, "Add new site" → "Import an existing project" → pick the repo.
3. Build settings are already declared in `netlify.toml` (publish `public/`, functions in `netlify/functions/`) — no build command is needed, so you can leave that field blank.
4. Deploy. Netlify Blobs requires no setup or environment variables — it's automatically available to functions running on Netlify.

## Project structure

```
netlify.toml                    # publish dir, functions dir, SPA redirect
netlify/functions/
  room-create.js, room-join.js, room-state.js, room-action.js
  poll-options.js, poll-vote.js, poll-results.js
  account-signup.js, account-login.js, account-logout.js, account-progress.js
  lib/
    store.js                    # Netlify Blobs read/write helpers (rooms)
    pollstore.js                 # Netlify Blobs read/write + stats helpers (polls)
    room.js                     # sanitizing room state per-viewer, token checks
    ids.js, http.js
    games/                      # one pure reducer per online game + registry
    polls/
      build-options.js           # tuple list -> { id, subtitle, title, year } option shape
      albums.js, videogames.js, movies.js  # option lists, one file per poll
      registry.js                # poll id -> title/tagline/labels/options + valid-option lookup
public/
  index.html                    # app shell (header, theme toggle, #view mount point)
  css/main.css                  # entire design system + every game's board styles
  img/cards/                    # custom card art, one <id>.jpg per game/poll (see its README)
  js/
    app.js                      # hash router, dynamically imports each game/poll module
    room-client.js               # polling client for the room API
    versus.js                    # mode picker: vs computer / one device / online
    online-shell.js              # shared lobby/status-bar/rematch chrome for online games
    local-shell.js               # runs AI + pass-and-play matches entirely in the browser
    solo-shell.js                # 250-level campaign chrome: level grid, goals, win/lose
    levels.js                    # generated difficulty curves for the solo campaigns
    storage.js, profile.js, account.js, toast.js, util.js
    rules/                      # browser mirrors of the server reducers (for local play)
    ai/                         # generic alpha-beta search + per-game evaluation
    games/                      # one module per game; solo games mount solo-shell.js,
                                 # versus games mount versus.js and supply a board renderer
    polls/
      registry.js                # poll cards shown on the #/polls hub
      choice-poll.js              # generic "pick one from a searchable list" poll UI
      poll-client.js, voter.js    # fetch helpers + persistent voter id in localStorage
```

Every game is a plain ES module exporting `mount(container, meta, params)`, which returns a cleanup function. The router in `app.js` calls that cleanup before navigating away, so timers/intervals/listeners don't leak between games.

## Known limitations

- No reconnect-on-a-different-device: room credentials live in `localStorage`, so resuming a game requires the same browser.
- No presence/disconnect detection beyond an explicit "Leave game" (which forfeits the match to the other player).
- Room codes aren't rate-limited; this is built for casual play with friends, not as a public matchmaking service.
- Poll votes are keyed by a random id in `localStorage`, not an account — clearing storage or voting from another browser lets someone vote again. Fine for a casual poll, not ballot-proof.
