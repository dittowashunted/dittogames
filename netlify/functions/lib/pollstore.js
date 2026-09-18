const { getStore } = require('@netlify/blobs');

function pollsStore() {
  return getStore('polls');
}

async function getPollData(pollId) {
  const store = pollsStore();
  const data = await store.get(pollId, { type: 'json' });
  return data || { votes: {}, voters: {} };
}

async function putPollData(pollId, data) {
  const store = pollsStore();
  await store.set(pollId, JSON.stringify(data));
}

function computeStats(data, voterId) {
  const total = Object.keys(data.voters).length;
  const results = Object.entries(data.votes)
    .filter(([, count]) => count > 0)
    .map(([optionId, count]) => ({ optionId, count }))
    .sort((a, b) => b.count - a.count || a.optionId.localeCompare(b.optionId));
  const yourVote = voterId ? data.voters[voterId] || null : null;
  return { total, results, yourVote };
}

module.exports = { getPollData, putPollData, computeStats };
