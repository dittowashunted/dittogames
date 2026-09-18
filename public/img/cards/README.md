# Card art

Drop your custom artwork here and it shows up automatically — no code changes
needed. Each game/poll card looks for an image at a fixed path based on its
`id`, layered on top of its current flat color. If the file isn't there yet
(or fails to load), nothing breaks: the card just shows its current color +
emoji, exactly as it does today.

## Where to put each file

Filename = the game/poll's `id` + `.jpg`, in this folder (`public/img/cards/`).

**Games** (from `public/js/games/registry.js`):

```
public/img/cards/snake.jpg
public/img/cards/super-tic-tac-toe.jpg
public/img/cards/tic-tac-toe.jpg
public/img/cards/connect-four.jpg
public/img/cards/rock-paper-scissors.jpg
public/img/cards/dots-and-boxes.jpg
public/img/cards/2048.jpg
public/img/cards/memory-match.jpg
public/img/cards/breakout.jpg
public/img/cards/minesweeper.jpg
```

**Polls** (from `public/js/polls/registry.js`):

```
public/img/cards/favorite-album.jpg
public/img/cards/best-video-game.jpg
public/img/cards/greatest-movie.jpg
```

**Main hub** (the two big "doors" on the `/` homepage):

```
public/img/cards/games.jpg
public/img/cards/polls.jpg
```

## Format & size

- **Format:** `.jpg`. If you'd rather export `.png` or `.webp`, that's fine —
  just tell me and I'll update the extension in `public/js/app.js`'s
  `cardArt()` function (one line, same convention for every card).
- **Aspect ratio:** roughly **2.7 : 1** (wide rectangle) for every game and
  poll card — that's the shape they render at. The two homepage hub cards
  (`games.jpg`, `polls.jpg`) are a bit less wide, roughly **1.7 : 1**.
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
