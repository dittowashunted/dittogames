const BASE = '/.netlify/functions';
const POLL_MS = 1000;
const STORAGE_PREFIX = 'dittogames:room:';

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

/**
 * Handles room lifecycle (create/join/resume), polling for opponent moves,
 * and sending actions for a single online game instance.
 */
export class RoomClient extends EventTarget {
  constructor(gameId) {
    super();
    this.gameId = gameId;
    this.code = null;
    this.playerId = null;
    this.token = null;
    this.room = null;
    this.myIndex = null;
    this._timer = null;
    this._inFlight = false;
    this._destroyed = false;
    this._onVisibility = this._onVisibility.bind(this);
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  get storageKey() {
    return `${STORAGE_PREFIX}${this.gameId}`;
  }

  loadSaved() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  _persist() {
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({ code: this.code, playerId: this.playerId, token: this.token })
      );
    } catch {
      /* private mode / quota exceeded - session just won't survive a refresh */
    }
  }

  _clearPersisted() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      /* ignore */
    }
  }

  _setRoom(room) {
    this.room = room;
    this.myIndex = room.you;
    this.code = room.code;
    this.dispatchEvent(new CustomEvent('update', { detail: room }));
  }

  async create(name) {
    const data = await handleResponse(
      await fetch(`${BASE}/room-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: this.gameId, name }),
      })
    );
    this.playerId = data.playerId;
    this.token = data.token;
    this._setRoom(data.room);
    this._persist();
    this.startPolling();
    return data.room;
  }

  async join(code, name) {
    const data = await handleResponse(
      await fetch(`${BASE}/room-join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name }),
      })
    );
    this.playerId = data.playerId;
    this.token = data.token;
    this._setRoom(data.room);
    this._persist();
    this.startPolling();
    return data.room;
  }

  async resume(saved) {
    this.code = saved.code;
    this.playerId = saved.playerId;
    this.token = saved.token;
    const room = await this.poll();
    this.startPolling();
    return room;
  }

  async poll() {
    if (this._inFlight || !this.code) return this.room;
    this._inFlight = true;
    try {
      const url = `${BASE}/room-state?code=${encodeURIComponent(this.code)}&playerId=${encodeURIComponent(
        this.playerId
      )}&token=${encodeURIComponent(this.token)}`;
      const data = await handleResponse(await fetch(url));
      this._setRoom(data);
      return data;
    } catch (err) {
      if (err.status === 404 || err.status === 410 || err.status === 403) {
        this.stopPolling();
        this._clearPersisted();
        this.dispatchEvent(new CustomEvent('closed', { detail: err }));
      }
      throw err;
    } finally {
      this._inFlight = false;
    }
  }

  async sendAction(type, payload) {
    const data = await handleResponse(
      await fetch(`${BASE}/room-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: this.code, playerId: this.playerId, token: this.token, type, payload }),
      })
    );
    this._setRoom(data);
    return data;
  }

  startPolling() {
    this.stopPolling();
    if (this._destroyed || document.hidden) return;
    this._timer = setInterval(() => {
      this.poll().catch(() => {});
    }, POLL_MS);
  }

  stopPolling() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  _onVisibility() {
    if (this._destroyed) return;
    if (document.hidden) {
      this.stopPolling();
    } else if (this.code) {
      this.poll().catch(() => {});
      this.startPolling();
    }
  }

  leaveRoom() {
    if (!this.code || !this.playerId) return;
    const url = `${BASE}/room-action`;
    const body = JSON.stringify({ code: this.code, playerId: this.playerId, token: this.token, type: 'leave' });
    let sent = false;
    try {
      if (navigator.sendBeacon) {
        sent = navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      }
    } catch {
      sent = false;
    }
    if (!sent) {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(
        () => {}
      );
    }
    this._clearPersisted();
  }

  forgetRoom() {
    this._clearPersisted();
    this.code = null;
    this.playerId = null;
    this.token = null;
    this.room = null;
    this.myIndex = null;
  }

  destroy() {
    this._destroyed = true;
    this.stopPolling();
    document.removeEventListener('visibilitychange', this._onVisibility);
  }
}
