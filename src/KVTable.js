
const Database = require('./Database');
const createValidator = require('./helpers/createValidator');

class KVTable {
  constructor(label, database) {
    const validate = createValidator('constructor');
    validate('database').asInstanceOf(Database, database);
    this.label = label;
    this.database = database;
    this.index = new Map();
  }

  async set(key, value) {
    const validate = createValidator('set');
    validate('key').asString(key);
    this.index.set(key, value);
    await this.database.save();
  }

  has(key) {
    const validate = createValidator('has');
    validate('key').asString(key);
    return this.index.has(key);
  }

  get(key) {
    const validate = createValidator('get');
    validate('key').asString(key);
    if (this.index.has(key) === false) {
      throw Error('@get : Invalid "key", "key" must exist in KVTable');
    }
    return this.index.get(key);
  }

  async delete(key) {
    const validate = createValidator('delete');
    validate('key').asString(key);
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
