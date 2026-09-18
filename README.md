# DittoGames

Free browser games, no sign-up. Play solo, or create a room and send the code to a friend to play together online.

A static site + a handful of Netlify Functions, deployed on Netlify. No build step, no framework, no database to provision — multiplayer room state lives in [Netlify Blobs](https://docs.netlify.com/blobs/overview/), which works out of the box on Netlify with zero configuration.

## Games

**Play online with a friend** (create a room, share the 5-character code):
- Super Tic Tac Toe
- Tic Tac Toe
- Connect Four
- Rock Paper Scissors (best of 5, simultaneous picks)
- Dots and Boxes

**Solo, with local best scores:**
- Snake
- 2048
- Memory Match
- Breakout
- Minesweeper

All ten work on desktop (mouse + keyboard) and mobile (touch, swipe, on-screen controls where relevant). Room codes can also be shared as a link (`?join=CODE`) — opening it on a friend's phone joins the room automatically.

## Polls

A separate `#/polls` section, one question at a time, styled as a grid of colorful cards. Voters pick from a fixed, curated list instead of typing free text, so results stay clean and comparable:

- **Favorite Album of All Time** — 200+ well-known albums (`netlify/functions/lib/polls/albums.js`)
- **Best Video Game of All Time** — 120+ acclaimed games across eras and platforms (`netlify/functions/lib/polls/videogames.js`)
- **Greatest Movie of All Time** — 125+ acclaimed films (`netlify/functions/lib/polls/movies.js`)

After voting you see live stats: total votes, a ranked results list with vote counts/percentages, and where your own pick landed.

## How multiplayer works

Each online game has a small, pure, server-side "reducer" (`netlify/functions/lib/games/*.js`) that owns the rules — board state, turn order, win/draw detection, and validation (can't move out of turn, can't play a taken square, etc.). Netlify Functions (`netlify/functions/room-*.js`) expose that as a tiny REST API:

- `POST /.netlify/functions/room-create` — create a room, get a code back
- `POST /.netlify/functions/room-join` — join with a code
- `GET /.netlify/functions/room-state` — poll for the current state
- `POST /.netlify/functions/room-action` — submit a move, request a rematch, or leave

Room documents are stored in a Netlify Blobs store named `rooms`, keyed by room code. The browser client (`public/js/room-client.js`) polls once a second while the tab is visible and applies updates optimistically after its own moves, so play feels responsive without needing WebSockets. Rock Paper Scissors hides the opponent's pick server-side until both players have locked one in, so there's no peeking via devtools.

Rooms with no activity for 2 hours are treated as expired. There's no account system — a player's seat in a room (their id + a private token) is kept in `localStorage`, which is what lets a page refresh rejoin the same game in progress.

## How polls work

Each poll has a fixed option list defined server-side (`netlify/functions/lib/polls/registry.js`), so the client can never submit an option that doesn't exist. Three functions serve the poll:

- `GET /.netlify/functions/poll-options?poll=<id>` — the poll's title, tagline, and full option list
- `POST /.netlify/functions/poll-vote` — record (or change) a vote, returns updated stats
- `GET /.netlify/functions/poll-results?poll=<id>` — current stats without voting

Poll data lives in a Netlify Blobs store named `polls`, one document per poll: vote counts per option plus a map of voter id → chosen option (so changing your vote decrements the old option and increments the new one instead of double-counting). A random voter id is generated once and kept in `localStorage`, the same trust model the multiplayer rooms use — there's no account system, so it's not vote-fraud-proof, just casual-poll-appropriate. The UI itself (`public/js/polls/choice-poll.js`) is a generic "pick one from a searchable list" component driven entirely by registry data (`title`, `tagline`, `itemLabel` e.g. "album"/"game"/"movie", `subtitleLabel` e.g. "artist"/"developer"/"director", and an option list of `{ id, subtitle, title, year }`) — a new poll only needs a registry entry and an option list in `netlify/functions/lib/polls/`, not new UI code. `netlify/functions/lib/polls/build-options.js` turns a plain `[subtitle, title, year]` tuple list into that option shape with stable, unique slug ids.

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
  js/
    app.js                      # hash router, dynamically imports each game/poll module
    room-client.js               # polling client for the room API
    online-shell.js              # shared lobby/status-bar/rematch chrome for online games
    storage.js, profile.js, toast.js, util.js
    games/                      # one module per game; solo games are self-contained,
                                 # online games plug their board renderer into online-shell.js
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
