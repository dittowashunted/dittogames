const ROOM_TTL_MS = 2 * 60 * 60 * 1000; // rooms idle this long are treated as expired

function isExpired(room) {
  return Date.now() - room.updatedAt > ROOM_TTL_MS;
}

function findPlayer(room, playerId, token) {
  const index = room.players.findIndex((p) => p.id === playerId);
  if (index === -1) return { index: -1, error: 'not_found' };
  if (room.players[index].token !== token) return { index: -1, error: 'bad_token' };
  return { index, error: null };
}

function sanitizeName(name, fallback) {
  const trimmed = typeof name === 'string' ? name.trim().slice(0, 18) : '';
  return trimmed || fallback;
}

function sanitizeRoom(room, engine, viewerIndex) {
  const state = engine && typeof engine.sanitizeForPlayer === 'function'
    ? engine.sanitizeForPlayer(room.state, viewerIndex)
    : room.state;

  return {
    code: room.code,
    gameId: room.gameId,
    status: room.status,
    players: room.players.map((p, i) => ({ id: p.id, name: p.name, index: i })),
    state,
    turn: room.turn,
    winner: room.winner,
    version: room.version,
    rematchVotes: room.rematchVotes,
    forfeitedBy: room.forfeitedBy ?? null,
    you: viewerIndex,
    updatedAt: room.updatedAt,
  };
}

module.exports = { isExpired, findPlayer, sanitizeRoom, sanitizeName, ROOM_TTL_MS };
