const { connectLambda } = require('@netlify/blobs');
const { getUser, putUser } = require('./lib/store');
const { normalizeUsername, hasToken, mergeProgress, publicUser } = require('./lib/accounts');
const { json, badRequest, forbidden, notFound, parseBody, failure } = require('./lib/http');

exports.handler = async (event) => {
  if (event.blobs) connectLambda(event);
  if (event.httpMethod !== 'POST') return badRequest('Use POST');

  const body = parseBody(event);
  if (!body) return badRequest('Invalid JSON body');

  const username = normalizeUsername(body.username);
  const token = body.token;
  if (!username || !token) return badRequest('Missing username or token');

  try {
    const user = await getUser(username);
    if (!user) return notFound('Account not found');
    if (!hasToken(user, token)) return forbidden('Your session has expired. Sign in again.');

    user.progress = mergeProgress(user.progress, body.progress);
    user.updatedAt = Date.now();
    await putUser(user);

    return json(200, { account: publicUser(user) });
  } catch (err) {
    console.error('account-progress failed', err);
    return failure(err);
  }
};
