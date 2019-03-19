
const fs = require('fs');
const { promisify } = require('util');
const cloneDeep = require('lodash/cloneDeep');
const isPlainObject = require('lodash/isPlainObject');
const uuidv4 = require('uuid/v4');
const ms = require('ms');
const tinydate = require('tinydate');
const MessagePack = require('what-the-pack');

const writeFile = promisify(fs.writeFile);
const open = promisify(fs.open);
const close = promisify(fs.close);
const ftruncate = promisify(fs.ftruncate);
const write = promisify(fs.write);
const read = promisify(fs.read);
const fstat = promisify(fs.fstat);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);

// Database Version
const rurudbVersion = 9;

// Helper Functions
const dateToString = tinydate('{DD}-{MM}-{YY}-{HH}-{mm}-{ss}');
const compareString = (a, b, descend) => (descend ? b.localeCompare(a) : a.localeCompare(b));
const compareNumber = (a, b, descend) => (descend ? b - a : a - b);

class Query {
  constructor(table) {
    if (typeof table !== 'object') {
      throw Error('@constructor : Expecting "table" to be typeof "object"');
    }
    this.resultIds = [];
    this.resultItems = [];
    this.slicedItems = Array.from(table.index.values());
    this.queryOffset = 0;
    this.queryLimit = this.slicedItems.length;
    this.sorts = [];
    this.selectedFields = [];
    this.hiddenFields = [];
    this.finalized = false;
  }

  offset(value) {
    if (this.finalized) throw Error('@offset : Query must not be finalized yet');
    this.queryOffset = value;
    return this;
  }

  limit(value) {
    if (this.finalized) throw Error('@limit : Query must not be finalized yet');
    this.queryLimit = value;
    return this;
  }

  ascend(field) {
    if (this.finalized) throw Error('@ascend : Query must not be finalized yet');
    this.sorts.push([field, false]);
    return this;
  }

  descend(field) {
    if (this.finalized) throw Error('@descend : Query must not be finalized yet');
    this.sorts.push([field, true]);
    return this;
  }

  sortBy(sortFn) {
    if (this.finalized) throw Error('@sortBy : Query must not be finalized yet');
    this.sorts.push([sortFn]);
    return this;
  }

  gt(field, value) {
    if (this.finalized) throw Error('@gt : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] > value);
    return this;
  }

  gte(field, value) {
    if (this.finalized) throw Error('@gte : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] >= value);
    return this;
  }

  lt(field, value) {
    if (this.finalized) throw Error('@lt : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] < value);
    return this;
  }

  lte(field, value) {
    if (this.finalized) throw Error('@lte : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] <= value);
    return this;
  }

  eq(field, value) {
    if (this.finalized) throw Error('@eq : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => item[field] === value);
    return this;
  }

  neq(field, value) {
    if (this.finalized) throw Error('@neq : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => item[field] !== value);
    return this;
  }

  has(field, value) {
    if (this.finalized) throw Error('@has : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && (item[field]).includes(value));
    return this;
  }

  hasAnyOf(field, values) {
    if (this.finalized) throw Error('@hasAnyOf : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.some(value => (item[field]).includes(value)));
    return this;
  }

  hasAllOf(field, values) {
    if (this.finalized) throw Error('@hasAllOf : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.every(value => (item[field]).includes(value)));
    return this;
  }

  hasNoneOfAny(field, values) {
    if (this.finalized) throw Error('@hasNoneOfAny : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.some(value => (item[field]).includes(value) === false));
    return this;
  }

  hasNoneOfAll(field, values) {
    if (this.finalized) throw Error('@hasNoneOfAll : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.every(value => (item[field]).includes(value) === false));
    return this;
  }

  select(...fields) {
    if (this.finalized) throw Error('@select : Query must not be finalized yet');
    this.selectedFields = fields.slice();
    return this;
  }

  hide(...fields) {
    if (this.finalized) throw Error('@hide : Query must not be finalized yet');
    this.hiddenFields = fields.slice();
    return this;
  }

  filterBy(filterFn) {
    if (this.finalized) throw Error('@filterBy : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => filterFn(item));
    return this;
  }

  finalize() {
    if (this.sorts.length > 0) {
      this.slicedItems.sort((a, b) => {
        for (let i = 0, l = this.sorts.length; i < l; i += 1) {
          const sort = this.sorts[i];
          if (typeof sort[0] === 'function') {
            const [sortFn] = sort;
            return sortFn(a, b);
          }
          const [field, fieldDescend] = sort;
          if (typeof a[field] !== typeof b[field]) { // If field of both slicedItems don't match: EXIT LOOP
            break;
          } else if (typeof a[field] !== 'string' && typeof a[field] !== 'number') { // If both item fields are't "string" or "number": EXIT LOOP
            break;
          } else if (a[field] === b[field]) { // If value of both slicedItems are equal: SKIP SORT
            continue;
          } else if (typeof a[field] === 'string') {
            return compareString(a[field], b[field], fieldDescend);
          } else if (typeof a[field] === 'number') {
            return compareNumber(a[field], b[field], fieldDescend);
          }
        }
        return 0;
      });
    }
    this.slicedItems = this.slicedItems.slice(this.queryOffset, this.queryOffset + this.queryLimit);
    const resultIds = new Array(this.slicedItems.length);
    const resultItems = new Array(this.slicedItems.length);
    for (let i = 0, l = this.slicedItems.length; i < l; i += 1) {
      const item = cloneDeep(this.slicedItems[i]);
      resultIds[i] = item.id;
      if (this.selectedFields.length > 0) {
        const itemFields = Object.keys(item);
        for (let a = 0, b = itemFields.length; a < b; a += 1) { // For each item field
          const currentField = itemFields[a];
          if (this.selectedFields.includes(currentField) === false) { // If selected field includes field, DELETE
            delete item[currentField];
          }
        }
      }
      for (let a = 0, b = this.hiddenFields.length; a < b; a += 1) { // For each hidden field, DELETE
        const currentHiddenField = this.hiddenFields[a];
        delete item[currentHiddenField];
      }
      resultItems[i] = item;
    }
    this.resultIds = resultIds;
    this.resultItems = resultItems;
    this.finalized = true;
  }

  ids() {
    if (this.finalized === false) this.finalize();
    return this.resultIds;
  }

  items() {
    if (this.finalized === false) this.finalize();
    return this.resultItems;
  }

  firstId() {
    if (this.finalized === false) this.finalize();
    return this.resultIds[0];
  }

  firstItem() {
    if (this.finalized === false) this.finalize();
    return this.resultItems[0];
  }

  entries() {
    if (this.finalized === false) this.finalize();
    return this.resultItems.map(item => [item.id, item]);
  }

  results() {
    if (this.finalized === false) this.finalize();
    return [this.resultIds, this.resultItems];
  }
}

class Table {
  constructor(label, database) {
    if (database.initialized === false && database.initializing === false) {
      throw Error('@constructor : Cannot create table on non-initialized database.');
    }
    this.label = label;
    this.database = database;
    this.index = new Map();
    if (database.tables.has(label)) {
      return database.tables.get(label);
    }
    database.tables.set(label, this);
  }

  randomItemId() {
    let id = uuidv4();
    while (this.index.has(id)) {
      id = uuidv4();
    }
    return id;
  }

  async insertItem(id, data) {
    if (isPlainObject(data) === false) {
      throw Error('@insertItem : Invalid "data", "data" must be a plain object');
    }
    if (this.index.has(id)) {
      throw Error('@insertItem : Invalid "id", must not exist in table');
    }
    const item = Object.freeze({
      id,
      ...cloneDeep(data),
    });
    this.index.set(id, item);
    await this.database.save();
    const copy = cloneDeep(item);
    return copy;
  }

  async updateItem(modified) {
    if (isPlainObject(modified) === false) {
      throw Error('@updateItem : Invalid "modified", "modified" must be a plain object');
    }
    if (modified.id === undefined) {
      throw Error('@updateItem : Invalid "item", "id" must not be "undefined"');
    }
    if (this.index.has(modified.id) === false) {
      throw Error('@updateItem : Invalid "item", item "id" must exist in table');
    }
    const item = cloneDeep(modified);
    this.index.set(item.id, item);
    await this.database.save();
  }

  async updateItemById(id, data) {
    if (isPlainObject(data) === false) {
      throw Error('@updateItemById : Invalid "data", "data" must be a plain object');
    }
    if (data.id !== undefined) {
      throw Error('@updateItemById : Invalid "data", "id" must be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('@updateItemById : Invalid "id", must exist in table');
    }
    const item = {
      id,
      ...cloneDeep(data),
    };
    this.index.set(id, item);
    await this.database.save();
    const copy = cloneDeep(item);
    return copy;
  }

  async mergeItemById(id, data) {
    if (isPlainObject(data) === false) {
      throw Error('@mergeItemById : Invalid "data", "data" must be a plain object');
    }
    if (data.id !== undefined) {
      throw Error('@mergeItemById : Invalid "data", "id" must be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('@mergeItemById : Invalid "item", "id" must exist in table');
    }
    const existing = this.index.get(id);
    const item = {
      id,
      ...existing,
      ...cloneDeep(data),
    };
    this.index.set(id, item);
    await this.database.save();
    const copy = cloneDeep(item);
    return copy;
  }

  async removeItem(item) {
    if (isPlainObject(item) === false) {
      throw Error('@removeItem : Invalid "item", "item" must be a plain object');
    }
    if (item.id === undefined) {
      throw Error('@removeItem : Invalid "item", "id" must not be "undefined"');
    }
    if (this.index.has(item.id) === false) {
      throw Error('@removeItem : Invalid "item", "id" must exist in table');
    }
    this.index.delete(item.id);
    await this.database.save();
  }

  async removeItemById(id) {
    if (id === undefined) {
      throw Error('@removeItemById : Invalid "id", "id" must not be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('@removeItemById : Invalid "id", "id" must exist in table');
    }
    this.index.delete(id);
    await this.database.save();
  }

  fetchItem(id) {
    if (id === undefined) {
      throw Error('@fetchItem : Invalid "id", "id" must not be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('@fetchItem : Invalid "item", "id" must exist in table');
    }
    const item = this.index.get(id);
    const copy = cloneDeep(item);
    return copy;
  }

  async clear() {
    this.index.clear();
    await this.database.save();
  }

  async destroy() {
    this.database.tables.delete(this.label);
    await this.database.save();
  }

  query() {
    return new Query(this);
  }
}

class KVTable {
  constructor(label, database) {
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

class Database {
  constructor(options) {
    this.logFunction = options.logFunction;
    this.filename = options.filename;
    this.directory = options.directory;
    switch (options.saveFormat) {
      case 'json': {
        this.main = options.directory.concat('/', options.filename, '-current.rrdb');
        this.temp = options.directory.concat('/', options.filename, '-temp.rrdb');
        this.recent = options.directory.concat('/', options.filename, '-recent.rrdb');
        this.snapshotExtension = '-snapshot.rrdb';
        break;
      }
      case 'readable_json': {
        this.main = options.directory.concat('/', options.filename, '-current.rrdb');
        this.temp = options.directory.concat('/', options.filename, '-temp.rrdb');
        this.recent = options.directory.concat('/', options.filename, '-recent.rrdb');
        this.snapshotExtension = '-snapshot.rrdb';
        break;
      }
      case 'msgpack': {
        this.main = options.directory.concat('/', options.filename, '-current.prrdb');
        this.temp = options.directory.concat('/', options.filename, '-temp.prrdb');
        this.recent = options.directory.concat('/', options.filename, '-recent.prrdb');
        this.snapshotExtension = '-snapshot.prrdb';
        if (options.msgpackBufferSize === undefined) {
          throw Error('@constructor : options.msgpackBufferSize must be a "number"');
        }
        if (options.logFunction !== undefined) {
          if (typeof options.logFunction !== 'function') {
            throw Error('@constructor : options.logFunction must be a "function"');
          }
          const { encode: msgpackEncode, decode: msgpackDecode } = MessagePack.initialize(options.msgpackBufferSize, options.logFunction);
          this.msgpackEncode = msgpackEncode;
          this.msgpackDecode = msgpackDecode;
        } else {
          const { encode: msgpackEncode, decode: msgpackDecode } = MessagePack.initialize(options.msgpackBufferSize);
          this.msgpackEncode = msgpackEncode;
          this.msgpackDecode = msgpackDecode;
        }
        break;
      }
      default: {
        throw Error('@constructor : options.saveFormat must be either "json", "readable_json" or "msgpack"');
      }
    }
    this.saveFormat = options.saveFormat;

    this.tables = new Map();
    this.kvtables = new Map();
    this.snapshotInterval = options.snapshotInterval ? ms(options.snapshotInterval) : Infinity;
    this.lastSnapshotTimestamp = -Infinity;
    this.saving = false;
    this.queue = [];
    this.save = this.save.bind(this);
    this.internalBeforeSave = this.internalBeforeSave.bind(this);
    this.internalSaveLoop = this.internalSaveLoop.bind(this);
    this.mainFd = 0;
    this.tempFd = 0;
    this.recentFd = 0;
    this.initialized = false;
    this.initializing = false;
  }

  async initialize() {
    if (this.initialized === false) {
      if (this.internalInitializePromise !== undefined) {
        return this.internalInitializePromise;
      }
      this.internalInitializePromise = (async () => {
        await this.internalLoad();
        this.initialized = true;
      })();
      await this.internalInitializePromise;
      this.internalInitializePromise = undefined;
    }
  }

  async internalLoad() {
    this.tables.clear();
    this.kvtables.clear();
    let dbDataString = Buffer.alloc(0);
    if (await exists(this.directory)) {
      if (await exists(this.main)) {
        this.mainFd = await open(this.main, 'r');
        const mainStat = await fstat(this.mainFd);
        if (mainStat.size > 0) {
          if (this.logFunction !== undefined) this.logFunction(`@internalLoad : Loading from ${this.main}`);
          const mainContent = Buffer.alloc(mainStat.size);
          await read(this.mainFd, mainContent, 0, mainStat.size, 0);
          dbDataString = mainContent;
        } else if (this.logFunction !== undefined) this.logFunction(`@internalLoad : ${this.main} empty, possibly corrupted.`);
        await close(this.mainFd);
      } else {
        if (this.logFunction !== undefined) this.logFunction(`@internalLoad : ${this.main} not found.`);
        if (await exists(this.temp)) {
          this.tempFd = await open(this.temp, 'r');
          const tempStat = await fstat(this.tempFd);
          if (tempStat.size > 0) {
            if (this.logFunction !== undefined) this.logFunction(`@internalLoad : Loading from ${this.temp}`);
            const tempContent = Buffer.alloc(tempStat.size);
            await read(this.tempFd, tempContent, 0, tempStat.size, 0);
            dbDataString = tempContent;
          } else if (this.logFunction !== undefined) this.logFunction(`@internalLoad : ${this.temp} empty, possibly corrupted.`);
          await close(this.tempFd);
        } else {
          if (this.logFunction !== undefined) this.logFunction(`@internalLoad : ${this.temp} not found.`);
          if (await exists(this.recent)) {
            this.recentFd = await open(this.recent, 'r');
            const recentStat = await fstat(this.recentFd);
            if (recentStat.size > 0) {
              if (this.logFunction !== undefined) this.logFunction(`@internalLoad : Loading from ${this.recent}`);
              const tempContent = Buffer.alloc(recentStat.size);
              await read(this.recentFd, tempContent, 0, recentStat.size, 0);
              dbDataString = tempContent;
            } else if (this.logFunction !== undefined) this.logFunction(`@internalLoad : ${this.recent} empty, possibly corrupted.`);
            await close(this.recentFd);
          } else if (this.logFunction !== undefined) this.logFunction(`@internalLoad : ${this.recent} not found.`);
        }
      }
    }
    if (dbDataString.byteLength !== 0) {
      let data; // eslint-disable-line
      if (this.saveFormat === 'json' || this.saveFormat === 'readable_json') {
        data = JSON.parse(dbDataString.toString());
      } else { // msgpack
        data = (this.msgpackDecode)(dbDataString);
      }

      if (this.logFunction !== undefined) this.logFunction('@internalLoad  file loaded, populating tables.');
      const [dataMeta, dataTables, dataKVTables] = data;
      const [filenameLoaded, rurudbVersionLoaded] = dataMeta;
      if (filenameLoaded !== this.filename) {
        throw Error(`@internalLoad : filename mismatch, ${filenameLoaded} !== ${this.filename}`);
      }
      if (rurudbVersionLoaded !== rurudbVersion) {
        throw Error(`@internalLoad : rurudbVersion mismatch, ${rurudbVersionLoaded} !== ${rurudbVersion}`);
      }
      this.initializing = true;
      for (let i = 0, l = dataTables.length; i < l; i += 1) {
        const [label, items] = dataTables[i];
        const table = new Table(label, this);
        for (let a = 0, b = items.length; a < b; a += 1) {
          table.index.set(items[a].id, items[a]);
        }
      }
      for (let i = 0, l = dataKVTables.length; i < l; i += 1) {
        const [label, keys, values] = dataKVTables[i];
        const kvtable = new KVTable(label, this);
        for (let a = 0, b = keys.length; a < b; a += 1) {
          kvtable.index.set(keys[a], values[a]);
        }
      }
      this.initializing = false;
      if (this.logFunction !== undefined) this.logFunction('@internalLoad : tables populated.');
    } else {
      if (this.logFunction !== undefined) this.logFunction('@internalLoad  file not loaded, saving empty db.');
      await this.internalSave();
    }
  }

  async internalBeforeSave() {
    // Ensure directory existence
    if (await exists(this.directory) === false) {
      await mkdir(this.directory, { recursive: true });
    }

    // Ensure file existence
    if (await exists(this.main) === false) {
      await writeFile(this.main, '', 'utf8');
    }
    if (await exists(this.temp) === false) {
      await writeFile(this.temp, '', 'utf8');
    }
    if (await exists(this.recent) === false) {
      await writeFile(this.recent, '', 'utf8');
    }
    this.mainFd = await open(this.main, 'r+');
    this.tempFd = await open(this.temp, 'r+');
    this.recentFd = await open(this.recent, 'r+');
    process.nextTick(this.internalSaveLoop);
  }

  async internalSaveLoop() {
    const fetched = this.queue;
    this.queue = [];
    let error;
    try {
      const tables = Array.from(this.tables.entries());
      const dataTables = new Array(tables.length);
      for (let i = 0, l = tables.length; i < l; i += 1) {
        const [label, table] = tables[i];
        const items = Array.from(table.index.values());
        dataTables[i] = [label, items];
      }

      const kvtables = Array.from(this.kvtables.entries());
      const dataKVTables = new Array(kvtables.length);
      for (let i = 0, l = kvtables.length; i < l; i += 1) {
        const [label, kvtable] = kvtables[i];
        const keys = Array.from(kvtable.index.keys());
        const values = Array.from(kvtable.index.values());
        dataKVTables[i] = [label, keys, values];
      }

      const filename = this.filename;
      const dataMeta = [filename, rurudbVersion];

      const data = [
        dataMeta,
        dataTables,
        dataKVTables,
      ];

      let dataString;
      if (this.saveFormat === 'json') {
        dataString = Buffer.from(JSON.stringify(data));
      } else if (this.saveFormat === 'readable_json') {
        dataString = Buffer.from(JSON.stringify(data, null, 2));
      } else { // msgpack
        dataString = (this.msgpackEncode)(data);
      }

      await ftruncate(this.tempFd);
      await write(this.tempFd, dataString, 0, dataString.byteLength, 0);

      const mainStat = await fstat(this.mainFd);
      if (mainStat.size > 0) {
        const modified = mainStat.mtime;
        const current = new Date();
        let mainContent;
        if (
          current.valueOf() - modified.valueOf() >= this.snapshotInterval
          && current.valueOf() - this.lastSnapshotTimestamp >= this.snapshotInterval
        ) {
          const snapshot = ''.concat(
            this.directory, '/',
            this.filename, '_',
            dateToString(current),
            this.snapshotExtension,
          );
          const snapshotFd = await open(snapshot, 'w');
          mainContent = Buffer.alloc(mainStat.size);
          await read(this.mainFd, mainContent, 0, mainStat.size, 0);
          await write(snapshotFd, mainContent, 0, mainStat.size, 0);
          await close(snapshotFd);
          this.lastSnapshotTimestamp = current.valueOf();
        }
        if (mainContent === undefined) {
          mainContent = Buffer.alloc(mainStat.size);
          await read(this.mainFd, mainContent, 0, mainStat.size, 0);
        }
        await ftruncate(this.recentFd);
        await write(this.recentFd, mainContent, 0, mainStat.size, 0);
      }
      await ftruncate(this.mainFd);
      await write(this.mainFd, dataString, 0, dataString.byteLength, 0);
    } catch (e) {
      error = e;
    }

    if (this.queue.length > 0) {
      process.nextTick(this.internalSaveLoop);
    } else {
      this.saving = false;
      fs.closeSync(this.mainFd);
      fs.closeSync(this.tempFd);
      fs.closeSync(this.recentFd);
    }
    if (error !== undefined) {
      for (let i = 0, l = fetched.length; i < l; i += 1) {
        const [, reject] = fetched[i];
        reject(error);
      }
    } else {
      for (let i = 0, l = fetched.length; i < l; i += 1) {
        const [resolve] = fetched[i];
        resolve();
      }
    }
  }

  async internalSave() {
    return new Promise((resolve, reject) => {
      this.queue.push([resolve, reject]);
      if (this.saving === false) {
        this.saving = true;
        process.nextTick(this.internalBeforeSave);
      }
    });
  }

  async save() {
    if (this.initialized === false) {
      throw Error('@save : Cannot call "save" on non-initialized database.');
    }
    await this.internalSave();
  }

  table(label) {
    if (this.tables.has(label) === false) {
      throw Error(`@table : "${label}" Table not found, must exist`);
    }
    const table = new Table(label, this);
    return table;
  }

  kvtable(label) {
    if (this.kvtables.has(label) === false) {
      throw Error(`@kvtable : "${label}" KVTable not found, must exist`);
    }
    const kvtable = new KVTable(label, this);
    return kvtable;
  }
}

module.exports = {
  Database,
  Query,
  Table,
  KVTable,
};