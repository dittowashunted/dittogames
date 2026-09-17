const { getStore } = require('@netlify/blobs');

function roomsStore() {
  return getStore('rooms');
}

async function getRoom(code) {
  const store = roomsStore();
  return store.get(code, { type: 'json' });
}

async function putRoom(room) {
  const store = roomsStore();
  await store.set(room.code, JSON.stringify(room));
}

async function deleteRoom(code) {
  const store = roomsStore();
  await store.delete(code);
}

module.exports = { roomsStore, getRoom, putRoom, deleteRoom };
