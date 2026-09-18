const { getPoll } = require('./lib/polls/registry');
const { json, badRequest, notFound } = require('./lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return badRequest('Use GET');

  const pollId = (event.queryStringParameters || {}).poll || '';
  const poll = getPoll(pollId);
  if (!poll) return notFound('Unknown poll');

  return json(200, {
    id: poll.id,
    title: poll.title,
    tagline: poll.tagline,
    options: poll.options.map(({ id, artist, title, year }) => ({ id, artist, title, year })),
  });
};
