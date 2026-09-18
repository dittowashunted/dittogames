const { getPoll } = require('./lib/polls/registry');
const { getPollData, computeStats } = require('./lib/pollstore');
const { json, badRequest, notFound, serverError } = require('./lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return badRequest('Use GET');

  const params = event.queryStringParameters || {};
  const pollId = params.poll || '';
  const voterId = params.voterId || '';

  const poll = getPoll(pollId);
  if (!poll) return notFound('Unknown poll');

  try {
    const data = await getPollData(pollId);
    return json(200, computeStats(data, voterId));
  } catch (err) {
    console.error('poll-results failed', err);
    return serverError();
  }
};
