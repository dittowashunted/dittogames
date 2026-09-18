const { connectLambda } = require('@netlify/blobs');
const { getPoll } = require('./lib/polls/registry');
const { getPollData, putPollData, computeStats } = require('./lib/pollstore');
const { json, badRequest, notFound, parseBody, serverError } = require('./lib/http');

exports.handler = async (event) => {
  if (event.blobs) connectLambda(event);
  if (event.httpMethod !== 'POST') return badRequest('Use POST');

  const body = parseBody(event);
  if (!body) return badRequest('Invalid JSON body');

  const pollId = typeof body.poll === 'string' ? body.poll : '';
  const optionId = typeof body.optionId === 'string' ? body.optionId : '';
  const voterId = typeof body.voterId === 'string' ? body.voterId.slice(0, 64) : '';
  if (!pollId || !optionId || !voterId) return badRequest('Missing poll, optionId or voterId');

  const poll = getPoll(pollId);
  if (!poll) return notFound('Unknown poll');
  if (!poll.optionIds.has(optionId)) return badRequest('Unknown option for this poll');

  try {
    const data = await getPollData(pollId);
    const prevVote = data.voters[voterId];

    if (prevVote !== optionId) {
      if (prevVote && data.votes[prevVote]) {
        data.votes[prevVote] -= 1;
        if (data.votes[prevVote] <= 0) delete data.votes[prevVote];
      }
      data.votes[optionId] = (data.votes[optionId] || 0) + 1;
      data.voters[voterId] = optionId;
      data.updatedAt = Date.now();
      await putPollData(pollId, data);
    }

    return json(200, computeStats(data, voterId));
  } catch (err) {
    console.error('poll-vote failed', err);
    return serverError();
  }
};
