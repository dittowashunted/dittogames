import { loadValue, saveValue } from '../storage.js';

function randomId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function getVoterId() {
  let id = loadValue('poll:voterId', null);
  if (!id) {
    id = randomId();
    saveValue('poll:voterId', id);
  }
  return id;
}

export function getMyVote(pollId) {
  return loadValue(`poll:${pollId}:myVote`, null);
}

export function setMyVote(pollId, optionId) {
  saveValue(`poll:${pollId}:myVote`, optionId);
}
