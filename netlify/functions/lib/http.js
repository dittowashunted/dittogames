function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(data),
  };
}

const badRequest = (message) => json(400, { error: message });
const forbidden = (message = 'Forbidden') => json(403, { error: message });
const notFound = (message = 'Room not found') => json(404, { error: message });
const conflict = (message) => json(409, { error: message });
const gone = (message = 'This room has expired') => json(410, { error: message });
const serverError = (message = 'Something went wrong') => json(500, { error: message });

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}

module.exports = { json, badRequest, forbidden, notFound, conflict, gone, serverError, parseBody };
