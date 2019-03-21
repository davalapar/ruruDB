
const fs = require('fs');
const { promisify } = require('util');

const ms = require('ms');
const tinydate = require('tinydate');
const MessagePack = require('what-the-pack');
const isPlainObject = require('lodash/isPlainObject');

const createValidator = require('./helpers/createValidator');
const sha256 = require('./helpers/sha256');
const validateSchema = require('./helpers/validateSchema');
const validateBySchema = require('./helpers/validateBySchema');
const copyObject = require('./helpers/copyObject');

const Table = require('./Table');
const KVTable = require('./KVTable');

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


class Database {
  constructor(options) {
    const validate = createValidator('constructor');

    validate('options').asObject(options);
    const {
      logFunction,
      filename,
      directory,
      saveFormat,
      msgpackBufferSize,
      snapshotInterval,
    } = options;

    validate('logFunction').asFunction(logFunction);
    this.logFunction = logFunction;

    validate('filename').asString(filename);
    this.filename = filename;

    validate('directory').asString(directory);
    this.directory = directory;

    if (schemas !== undefined) {
      if (isPlainObject(schemas) === false) {
        throw Error('@constructor : schemas must be a plain object.');
      }
      const schemaHashes = {};
      const schemaKeys = Object.keys(schemas);
      for (let i = 0, l = schemaKeys.length; i < l; i += 1) {
        const key = schemaKeys[i];
        const schema = schemas[key];
        validateSchema(schema);
        const hash = sha256(JSON.stringify(schema));
        schemaHashes[key] = hash;
      }
      this.schemas = schemas;
      this.schemaHashes = schemaHashes;
      if (updateFunctions !== undefined) {
        if (isPlainObject(updateFunctions) === false) {
          throw Error('@constructor : updateFunctions must be a plain object.');
        }
        const keys = Object.keys(updateFunctions);
        for (let i = 0, l = keys.length; i < l; i += 1) {
          const key = keys[i];
          if (typeof updateFunctions[key] !== 'function') {
            throw Error(`@constructor : index "${i}" at updateFunctions must be a function`);
          }
        }
        this.updateFunctions = updateFunctions;
      }
    }

    validate('saveFormat').asString(saveFormat);
    validate('saveFormat').asOneOf(['json', 'readable_json', 'msgpack'], saveFormat);
    this.saveFormat = saveFormat;

    switch (saveFormat) {
      case 'json': {
        this.main = directory.concat('/', filename, '-current.rrdb');
        this.temp = directory.concat('/', filename, '-temp.rrdb');
        this.recent = directory.concat('/', filename, '-recent.rrdb');
        this.snapshotExtension = '-snapshot.rrdb';
        break;
      }
      case 'readable_json': {
        this.main = directory.concat('/', filename, '-current.rrdb');
        this.temp = directory.concat('/', filename, '-temp.rrdb');
        this.recent = directory.concat('/', filename, '-recent.rrdb');
        this.snapshotExtension = '-snapshot.rrdb';
        break;
      }
      case 'msgpack': {
        this.main = directory.concat('/', filename, '-current.prrdb');
        this.temp = directory.concat('/', filename, '-temp.prrdb');
        this.recent = directory.concat('/', filename, '-recent.prrdb');
        this.snapshotExtension = '-snapshot.prrdb';
        validate('msgpackBufferSize').asNumber(msgpackBufferSize);
        const { encode: msgpackEncode, decode: msgpackDecode } = MessagePack.initialize(msgpackBufferSize);
        this.msgpackEncode = msgpackEncode;
        this.msgpackDecode = msgpackDecode;
        break;
      }
      default: {
        throw Error('@constructor : saveFormat must be either "json", "readable_json" or "msgpack"');
      }
    }

    if (snapshotInterval !== undefined) {
      validate('snapshotInterval').asString('snapshotInterval');
      if (typeof snapshotInterval !== 'string') {
        throw Error('@constructor : snapshotInterval must be a string');
      }
      this.snapshotInterval = ms(snapshotInterval);
    } else {
      this.snapshotInterval = Infinity;
    }

    this.tables = new Map();
    this.kvtables = new Map();
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

  initTable(tableLabel, itemSchema, outdatedItemUpdater) {
    const validate = createValidator('initTable');
    validate('tableLabel').asString(tableLabel);
    validate('itemSchema').asObject(itemSchema);
    validate('outdatedItemUpdater').asFunction(outdatedItemUpdater);
    console.log(this);
  }

  initKVTable() {
    console.log(this);
  }

  getTable() {
    console.log(this);
  }

  getKVTable() {
    console.log(this);
  }

  queryTable() {
    console.log(this);
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
    return undefined;
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
          this.logFunction(`@internalLoad : Loading from ${this.main}`);
          const mainContent = Buffer.alloc(mainStat.size);
          await read(this.mainFd, mainContent, 0, mainStat.size, 0);
          dbDataString = mainContent;
        } else {
          this.logFunction(`@internalLoad : ${this.main} empty, possibly corrupted.`);
        }
        await close(this.mainFd);
      } else {
        this.logFunction(`@internalLoad : ${this.main} not found.`);
        if (await exists(this.temp)) {
          this.tempFd = await open(this.temp, 'r');
          const tempStat = await fstat(this.tempFd);
          if (tempStat.size > 0) {
            this.logFunction(`@internalLoad : Loading from ${this.temp}`);
            const tempContent = Buffer.alloc(tempStat.size);
            await read(this.tempFd, tempContent, 0, tempStat.size, 0);
            dbDataString = tempContent;
          } else {
            this.logFunction(`@internalLoad : ${this.temp} empty, possibly corrupted.`);
          }
          await close(this.tempFd);
        } else {
          this.logFunction(`@internalLoad : ${this.temp} not found.`);
          if (await exists(this.recent)) {
            this.recentFd = await open(this.recent, 'r');
            const recentStat = await fstat(this.recentFd);
            if (recentStat.size > 0) {
              this.logFunction(`@internalLoad : Loading from ${this.recent}`);
              const tempContent = Buffer.alloc(recentStat.size);
              await read(this.recentFd, tempContent, 0, recentStat.size, 0);
              dbDataString = tempContent;
            } else {
              this.logFunction(`@internalLoad : ${this.recent} empty, possibly corrupted.`);
            }
            await close(this.recentFd);
          } else {
            this.logFunction(`@internalLoad : ${this.recent} not found.`);
          }
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
      this.logFunction('@internalLoad  file loaded, populating tables.');
      const [dataMeta, dataTables, dataKVTables] = data;
      const [filenameLoaded, rurudbVersionLoaded] = dataMeta;
      if (filenameLoaded !== this.filename) {
        throw Error(`@internalLoad : filename mismatch, ${filenameLoaded} !== ${this.filename}`);
      }
      if (rurudbVersionLoaded !== rurudbVersion) {
        throw Error(`@internalLoad : rurudbVersion mismatch, ${rurudbVersionLoaded} !== ${rurudbVersion}`);
      }
      this.initializing = true;
      let recordsUpdated = false;
      this.logFunction('@internalLoad : Loading tables.');
      for (let i = 0, l = dataTables.length; i < l; i += 1) {
        const [label, items, schemaHash] = dataTables[i];
        const table = new Table(label, this);
        let schema;
        let updateFunction;
        if (this.schemas !== undefined && this.schemas[label] !== undefined) {
          schema = this.schemas[label];
          if (this.schemaHashes[label] !== schemaHash) {
            this.logFunction(`Table "${label}" : schema hash mismatch`);
            if (this.updateFunctions === undefined || this.updateFunctions[label] === undefined) {
              throw Error(`"Table "${label}" : updateFunction not found`);
            }
            updateFunction = this.updateFunctions[label];
          }
        }
        this.logFunction(`Table "${label}" : loading items`);
        for (let a = 0, b = items.length; a < b; a += 1) {
          let item = items[a];
          if (schema !== undefined) {
            if (updateFunction !== undefined) {
              if (recordsUpdated === false) {
                recordsUpdated = true;
              }
              item = updateFunction(item);
            }
            validateBySchema(schema, item);
          }
          table.index.set(item.id, copyObject(item, true));
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
      this.logFunction('@internalLoad : table(s) populated.');
      if (recordsUpdated === true) {
        this.logFunction('@internalLoad : table(s) updated, saving db.');
        await this.internalSave();
      }
    } else {
      this.logFunction('@internalLoad : no file loaded, saving db.');
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
        if (this.schemaHashes !== undefined && this.schemaHashes[label] !== undefined) {
          const hash = this.schemaHashes[label];
          dataTables[i] = [label, items, hash];
        } else {
          dataTables[i] = [label, items];
        }
      }

      const kvtables = Array.from(this.kvtables.entries());
      const dataKVTables = new Array(kvtables.length);
      for (let i = 0, l = kvtables.length; i < l; i += 1) {
        const [label, kvtable] = kvtables[i];
        const keys = Array.from(kvtable.index.keys());
        const values = Array.from(kvtable.index.values());
        dataKVTables[i] = [label, keys, values];
      }

      const { filename } = this;
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

module.exports = { Database };
