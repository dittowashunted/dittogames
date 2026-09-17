const { getRoom } = require('./lib/store');
const { getGameEngine } = require('./lib/games');
const { isExpired, findPlayer, sanitizeRoom } = require('./lib/room');
const { json, badRequest, notFound, forbidden, gone, serverError } = require('./lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return badRequest('Use GET');

  const params = event.queryStringParameters || {};
  const code = (params.code || '').trim().toUpperCase();
  const playerId = params.playerId || '';
  const token = params.token || '';
  if (!code || !playerId || !token) return badRequest('Missing code, playerId or token');

  try {
    const room = await getRoom(code);
    if (!room) return notFound();
    if (isExpired(room)) return gone();

    const { index, error } = findPlayer(room, playerId, token);
    if (error === 'not_found') return notFound('You are not a player in this room');
    if (error === 'bad_token') return forbidden('Invalid credentials for this room');

    const engine = getGameEngine(room.gameId);
    if (!engine) return serverError('Unknown game for this room');

    return json(200, sanitizeRoom(room, engine, index));
  } catch (err) {
    console.error('room-state failed', err);
    return serverError();
  }
};
