const { connectLambda } = require('@netlify/blobs');
const { getUser, putUser } = require('./lib/store');
const {
  validateCredentials, hashPassword, createToken, addToken, emptyProgress, mergeProgress, publicUser,
} = require('./lib/accounts');
const { json, badRequest, conflict, parseBody, failure } = require('./lib/http');

exports.handler = async (event) => {
  if (event.blobs) connectLambda(event);
  if (event.httpMethod !== 'POST') return badRequest('Use POST');

  const body = parseBody(event);
  if (!body) return badRequest('Invalid JSON body');

  const creds = validateCredentials(body.username, body.password);
  if (creds.error) return badRequest(creds.error);

  try {
    const existing = await getUser(creds.username);
    if (existing) return conflict('That username is already taken.');

    const now = Date.now();
    const token = createToken();
    const user = {
      username: creds.username,
      displayName: creds.displayName,
      password: await hashPassword(creds.password),
      tokens: [],
      progress: mergeProgress(emptyProgress(), body.progress),
      failedAttempts: 0,
      lockedUntil: 0,
      createdAt: now,
      updatedAt: now,
    };
    addToken(user, token);

    await putUser(user);

    return json(200, { token, account: publicUser(user) });
  } catch (err) {
    console.error('account-signup failed', err);
    return failure(err);
  }
};
