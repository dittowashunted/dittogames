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

## How multiplayer works

Each online game has a small, pure, server-side "reducer" (`netlify/functions/lib/games/*.js`) that owns the rules — board state, turn order, win/draw detection, and validation (can't move out of turn, can't play a taken square, etc.). Netlify Functions (`netlify/functions/room-*.js`) expose that as a tiny REST API:

- `POST /.netlify/functions/room-create` — create a room, get a code back
- `POST /.netlify/functions/room-join` — join with a code
- `GET /.netlify/functions/room-state` — poll for the current state
- `POST /.netlify/functions/room-action` — submit a move, request a rematch, or leave

Room documents are stored in a Netlify Blobs store named `rooms`, keyed by room code. The browser client (`public/js/room-client.js`) polls once a second while the tab is visible and applies updates optimistically after its own moves, so play feels responsive without needing WebSockets. Rock Paper Scissors hides the opponent's pick server-side until both players have locked one in, so there's no peeking via devtools.

Rooms with no activity for 2 hours are treated as expired. There's no account system — a player's seat in a room (their id + a private token) is kept in `localStorage`, which is what lets a page refresh rejoin the same game in progress.

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
  lib/
    store.js                    # Netlify Blobs read/write helpers
    room.js                     # sanitizing room state per-viewer, token checks
    ids.js, http.js
    games/                      # one pure reducer per online game + registry
public/
  index.html                    # app shell (header, theme toggle, #view mount point)
  css/main.css                  # entire design system + every game's board styles
  js/
    app.js                      # hash router, dynamically imports each game module
    room-client.js               # polling client for the room API
    online-shell.js              # shared lobby/status-bar/rematch chrome for online games
    storage.js, profile.js, toast.js, util.js
    games/                      # one module per game; solo games are self-contained,
                                 # online games plug their board renderer into online-shell.js
```

Every game is a plain ES module exporting `mount(container, meta, params)`, which returns a cleanup function. The router in `app.js` calls that cleanup before navigating away, so timers/intervals/listeners don't leak between games.

## Known limitations

- No reconnect-on-a-different-device: room credentials live in `localStorage`, so resuming a game requires the same browser.
- No presence/disconnect detection beyond an explicit "Leave game" (which forfeits the match to the other player).
- Room codes aren't rate-limited; this is built for casual play with friends, not as a public matchmaking service.
