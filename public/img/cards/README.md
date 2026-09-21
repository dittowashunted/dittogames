# Card art

Drop your custom artwork here and it shows up automatically — no code changes
needed. Each game/poll card looks for an image at a fixed path based on its
`id`, layered on top of its current flat color. If the file isn't there yet
(or fails to load), nothing breaks: the card just shows its current color +
emoji, exactly as it does today.

## Where to put each file

Filename = the game/poll's `id` + `.png`, in this folder (`public/img/cards/`).

**Games** (from `public/js/games/registry.js`):

```
public/img/cards/snake.png
public/img/cards/super-tic-tac-toe.png
public/img/cards/tic-tac-toe.png
public/img/cards/connect-four.png
public/img/cards/rock-paper-scissors.png
public/img/cards/dots-and-boxes.png
public/img/cards/2048.png
public/img/cards/memory-match.png
public/img/cards/breakout.png
public/img/cards/minesweeper.png
```

**Polls** (from `public/js/polls/registry.js`):

```
public/img/cards/favorite-album.png
public/img/cards/best-video-game.png
public/img/cards/greatest-movie.png
```

**Main hub** (the two big "doors" on the `/` homepage):

```
public/img/cards/games.png
public/img/cards/polls.png
```

## Format & size

- **Format:** `.png`. If you'd rather export `.jpg` or `.webp`, that's fine —
  just tell me and I'll update the extension in `public/js/app.js`'s
  `cardArt()` function (one line, same convention for every card).
- **Aspect ratio:** roughly **2.7 : 1** (wide rectangle) for every card,
  including the two homepage hub cards. The art in this folder is 2520x940.

## Art that already contains the game's name

By default a card draws its name and description in white over the art, with a
dark scrim behind them for legibility. If your artwork already spells the name
out (like `tic-tac-toe.png` does), set `artHasTitle: true` on that game in
`public/js/games/registry.js`. That switches the scrim off, hides the overlaid
text and icon, and keeps the title for screen readers only — so the drawn title
isn't competing with an HTML one. The two hub cards do the same thing via
`.poll-card--games-hub` / `--polls-hub`.
  Doesn't need to be exact either way: the image is center-cropped to cover
  the card (`background-size: cover`), so a little extra margin on the
  sides or top/bottom is safe.
- **Recommended export size:** **1260×470px** (game/poll cards) or
  **1200×700px** (the two hub cards), doubled for a crisper look on retina
  screens. Larger is fine; the browser scales down.
- Keep the most important part of the composition centered — corners and
  edges are the most likely to get cropped on narrow phone screens (cards
  go full-width, ~2.2:1, below 640px).

## Text sits on top, automatically

Every card gets a dark gradient scrim across its bottom third so the title
and description stay readable over *any* art, light or dark — you don't
need to leave empty space or bake text into the image. The title, one-line
description, and (for games) a small emoji render as real HTML on top of
whatever you put here.

## Everything currently live for reference

Titles, taglines and current emoji per card, so you know what each card
says today:

| id | title | current emoji |
|---|---|---|
| snake | Snake | 🐍 |
| super-tic-tac-toe | Super Tic Tac Toe | 🔳 |
| tic-tac-toe | Tic Tac Toe | ❌ |
| connect-four | Connect Four | 🔴 |
| rock-paper-scissors | Rock Paper Scissors | ✊ |
| dots-and-boxes | Dots and Boxes | 🔲 |
| 2048 | 2048 | 🧩 |
| memory-match | Memory Match | 🧠 |
| breakout | Breakout | 🧱 |
| minesweeper | Minesweeper | 💣 |
| favorite-album | Favorite Album of All Time | 🎧 |
| best-video-game | Best Video Game of All Time | 🎮 |
| greatest-movie | Greatest Movie of All Time | 🎬 |
| games | Games (homepage) | 🎮 |
| polls | Polls (homepage) | 🗳️ |
