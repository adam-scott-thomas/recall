// src/core/store.js

const DB_VERSION = 1;

export class RecallStore {
  constructor(dbName = 'recall') {
    this.dbName = dbName;
    this.db = null;
  }

  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'conversationId' });
          convStore.createIndex('title', 'title', { unique: false });
          convStore.createIndex('createTime', 'createTime', { unique: false });
          convStore.createIndex('domain', 'domain', { unique: false });
        }

        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'messageId' });
          msgStore.createIndex('conversationId', 'conversationId', { unique: false });
          msgStore.createIndex('contentHash', 'contentHash', { unique: false });
          msgStore.createIndex('timestamp', 'timestamp', { unique: false });
          msgStore.createIndex('role', 'role', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event) => reject(event.target.error);
    });
  }

  _tx(storeName, mode = 'readonly') {
    const tx = this.db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    return { tx, store };
  }

  _request(store, method, ...args) {
    return new Promise((resolve, reject) => {
      const req = store[method](...args);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async putConversation(conv) {
    const { store } = this._tx('conversations', 'readwrite');
    return this._request(store, 'put', conv);
  }

  async putConversations(convs) {
    const { tx } = this._tx('conversations', 'readwrite');
    const store = tx.objectStore('conversations');
    for (const conv of convs) {
      store.put(conv);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getConversation(id) {
    const { store } = this._tx('conversations');
    return this._request(store, 'get', id);
  }

  async getAllConversations() {
    const { store } = this._tx('conversations');
    return this._request(store, 'getAll');
  }

  async putMessages(msgs) {
    const { tx } = this._tx('messages', 'readwrite');
    const store = tx.objectStore('messages');
    for (const msg of msgs) {
      store.put(msg);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getMessagesByConversation(convId) {
    const { store } = this._tx('messages');
    const index = store.index('conversationId');
    return this._request(index, 'getAll', convId);
  }

  async getAllMessages() {
    const { store } = this._tx('messages');
    return this._request(store, 'getAll');
  }

  async searchText(query, limit = 50) {
    const queryLower = query.toLowerCase();
    const { store } = this._tx('messages');
    return new Promise((resolve, reject) => {
      const results = [];
      const cursor = store.openCursor();
      cursor.onsuccess = (event) => {
        const c = event.target.result;
        if (!c || results.length >= limit) {
          resolve(results);
          return;
        }
        if (c.value.text && c.value.text.toLowerCase().includes(queryLower)) {
          results.push(c.value);
        }
        c.continue();
      };
      cursor.onerror = () => reject(cursor.error);
    });
  }

  async getStats() {
    const { store: convStore } = this._tx('conversations');
    const { store: msgStore } = this._tx('messages');
    const [convCount, msgCount] = await Promise.all([
      this._request(convStore, 'count'),
      this._request(msgStore, 'count'),
    ]);
    return { conversationCount: convCount, messageCount: msgCount };
  }

  async exportAll() {
    const [conversations, messages] = await Promise.all([
      this.getAllConversations(),
      (() => {
        const { store } = this._tx('messages');
        return this._request(store, 'getAll');
      })(),
    ]);
    return { conversations, messages, exportedAt: new Date().toISOString() };
  }

  async deleteAll() {
    const tx = this.db.transaction(['conversations', 'messages'], 'readwrite');
    tx.objectStore('conversations').clear();
    tx.objectStore('messages').clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
