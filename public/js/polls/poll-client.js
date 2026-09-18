const BASE = '/.netlify/functions';

async function handleResponse(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function fetchPollOptions(pollId) {
  const res = await fetch(`${BASE}/poll-options?poll=${encodeURIComponent(pollId)}`);
  return handleResponse(res);
}

export async function fetchPollResults(pollId, voterId) {
  const qs = new URLSearchParams({ poll: pollId });
  if (voterId) qs.set('voterId', voterId);
  const res = await fetch(`${BASE}/poll-results?${qs.toString()}`);
  return handleResponse(res);
}

export async function submitVote(pollId, optionId, voterId) {
  const res = await fetch(`${BASE}/poll-vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ poll: pollId, optionId, voterId }),
  });
  return handleResponse(res);
}
