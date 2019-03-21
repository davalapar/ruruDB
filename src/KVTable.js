
const Database = require('./Database');

class KVTable {
  constructor(label, database) {
    if (database instanceof Database === false) {
      throw Error('@constructor : "database" must be instance of Database.');
    }
    if (database.initialized === false && database.initializing === false) {
      throw Error('@Cannot create KVTable on non-initialized database.');
    }
    this.label = label;
    this.database = database;
    this.index = new Map();
    if (database.kvtables.has(label)) {
      return database.kvtables.get(label);
    }
    database.kvtables.set(label, this);
  }

  async set(key, value) {
    if (key === undefined) {
      throw Error('@set : Invalid "key", "key" must not be "undefined"');
    }
    if (typeof key !== 'string') {
      throw Error('@set : Invalid "key", "key" must be typeof "string"');
    }
    this.index.set(key, value);
    await this.database.save();
  }

  has(key) {
    if (key === undefined) {
      throw Error('@set : Invalid "key", "key" must not be "undefined"');
    }
    if (typeof key !== 'string') {
      throw Error('@set : Invalid "key", "key" must be typeof "string"');
    }
    return this.index.has(key);
  }

  get(key) {
    if (key === undefined) {
      throw Error('@get : Invalid "key", "key" must not be "undefined"');
    }
    if (typeof key !== 'string') {
      throw Error('@set : Invalid "key", "key" must be typeof "string"');
    }
    if (this.index.has(key) === false) {
      throw Error('@get : Invalid "key", "key" must exist in KVTable');
    }
    return this.index.get(key);
  }

  async delete(key) {
    if (key === undefined) {
      throw Error('@set : Invalid "key", "key" must not be "undefined"');
    }
    if (typeof key !== 'string') {
      throw Error('@set : Invalid "key", "key" must be typeof "string"');
    }
    this.index.delete(key);
    await this.database.save();
  }

  async clear() {
    this.index.clear();
    await this.database.save();
  }

  async destroy() {
    this.database.kvtables.delete(this.label);
    await this.database.save();
  }
}

module.exports = { KVTable };
