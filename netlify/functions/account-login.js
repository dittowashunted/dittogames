const { connectLambda } = require('@netlify/blobs');
const { getUser, putUser } = require('./lib/store');
const {
  normalizeUsername, verifyPassword, createToken, addToken, mergeProgress, publicUser,
  isLockedOut, registerFailedAttempt, clearFailedAttempts,
} = require('./lib/accounts');
const { json, badRequest, forbidden, parseBody, failure } = require('./lib/http');

// Deliberately identical for "no such user" and "wrong password" so the
// endpoint can't be used to discover which usernames exist.
const INVALID = 'Incorrect username or password.';

exports.handler = async (event) => {
  if (event.blobs) connectLambda(event);
  if (event.httpMethod !== 'POST') return badRequest('Use POST');

  const body = parseBody(event);
  if (!body) return badRequest('Invalid JSON body');

  const username = normalizeUsername(body.username);
  const password = String(body.password || '');
  if (!username || !password) return badRequest(INVALID);

  try {
    const user = await getUser(username);
    if (!user) return forbidden(INVALID);

    if (isLockedOut(user)) {
      return forbidden('Too many failed attempts. Try again in a few minutes.');
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      registerFailedAttempt(user);
      user.updatedAt = Date.now();
      await putUser(user);
      return forbidden(INVALID);
    }

    const token = createToken();
    clearFailedAttempts(user);
    addToken(user, token);
    // Fold in whatever the device played while signed out.
    user.progress = mergeProgress(user.progress, body.progress);
    user.updatedAt = Date.now();
    await putUser(user);

    return json(200, { token, account: publicUser(user) });
  } catch (err) {
    console.error('account-login failed', err);
    return failure(err);
  }
};
