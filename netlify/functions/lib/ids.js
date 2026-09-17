const crypto = require('node:crypto');

// Excludes 0/O and 1/I so codes are easy to read and type on a phone.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateRoomCode(length = 5) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  }
  return code;
}

function generateId() {
  return crypto.randomUUID();
}

module.exports = { generateRoomCode, generateId };
