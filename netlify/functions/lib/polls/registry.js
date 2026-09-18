const albums = require('./albums');

const POLLS = {
  'favorite-album': {
    id: 'favorite-album',
    title: 'Favorite Album of All Time',
    tagline: 'Pick the record you would take to a desert island. No typing — just choose from the list.',
    options: albums,
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
    optionCount: poll.options.length,
  }));
}

module.exports = { getPoll, listPolls };
