const albums = require('./albums');
const videogames = require('./videogames');
const movies = require('./movies');

const POLLS = {
  'favorite-album': {
    id: 'favorite-album',
    title: 'Favorite Album of All Time',
    tagline: 'Pick the record you would take to a desert island. No typing — just choose from the list.',
    itemLabel: 'album',
    subtitleLabel: 'artist',
    options: albums,
  },
  'best-video-game': {
    id: 'best-video-game',
    title: 'Best Video Game of All Time',
    tagline: 'From arcade classics to this year’s biggest release — pick the one you’d call the GOAT.',
    itemLabel: 'game',
    subtitleLabel: 'developer',
    options: videogames,
  },
  'greatest-movie': {
    id: 'greatest-movie',
    title: 'Greatest Movie of All Time',
    tagline: 'A century of film, one favorite. Pick the film you’d defend to the end.',
    itemLabel: 'movie',
    subtitleLabel: 'director',
    options: movies,
  },
};

Object.values(POLLS).forEach((poll) => {
  poll.optionIds = new Set(poll.options.map((o) => o.id));
});

function getPoll(id) {
  return POLLS[id] || null;
}

function listPolls() {
  return Object.values(POLLS).map((poll) => ({
    id: poll.id,
    title: poll.title,
    tagline: poll.tagline,
    itemLabel: poll.itemLabel,
    subtitleLabel: poll.subtitleLabel,
    optionCount: poll.options.length,
  }));
}

module.exports = { getPoll, listPolls };
