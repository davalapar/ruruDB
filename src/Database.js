
const fs = require('fs');
const { promisify } = require('util');

const ms = require('ms');
const tinydate = require('tinydate');
const MessagePack = require('what-the-pack');

const createValidator = require('./helpers/createValidator');
const validateSchema = require('./helpers/validateSchema');
const validateLoadedItem = require('./helpers/validateLoadedItem');
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
const currentMajorVersion = 9;

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

    // new:
    this.loadedTables = undefined;
    this.loadedKVTables = undefined;
    this.loading = false;
    this.newTablesCreated = false;
    this.outdatedItemsUpdated = false;
    this.loaded = false;
    this.served = false;
  }

  async loadDatabaseFile() {
    if (this.served) {
      throw Error('initTable : db already served');
    } else if (this.loading) {
      throw Error('initTable : db file already loading');
    } else if (this.loaded === true) {
      throw Error('initTable : db file already loaded');
    }

    this.loading = true;

    await this.internalLoad();

    this.loading = false;
    this.loaded = true;
  }

  async serve() {
    if (this.newTablesCreated === true || this.outdatedItemsUpdated === true) {
      await this.internalSave();
    }
    this.loadedTables = undefined;
    this.loadedKVTables = undefined;
    this.served = true;
  }

  initTable(tableLabel, itemSchema, outdatedItemUpdater, shouldExist) {
    if (this.served) {
      throw Error('initTable : db already served');
    } else if (this.loading) {
      throw Error('initTable : db file still loading');
    } else if (this.loaded === false) {
      throw Error('initTable : db file not yet loaded');
    }
    const validate = createValidator('initTable');
    validate('tableLabel').asString(tableLabel);
    if (this.tables.has(tableLabel) === true) {
      throw Error(`initTable : table "${tableLabel}" already initialized`);
    }
    validate('itemSchema').asObject(itemSchema);
    validate('outdatedItemUpdater').asFunction(outdatedItemUpdater);
    const schema = copyObject({
      id: { type: 'string', default: '' },
      ...itemSchema,
    }, true);
    validateSchema(tableLabel, schema);
    const tableData = this.loadedTables.find(t => t[0] === tableLabel);
    if (tableData === undefined) {
      if (shouldExist === true) {
        throw Error(`initTable : table "${tableLabel}" not found`);
      } else {
        // create:
        const table = new Table(tableLabel, this, schema);
        this.tables.set(tableLabel, table);
      }
    } else {
      // populate:
      const items = tableData[1];
      const table = new Table(tableLabel, this, schema);
      for (let a = 0, b = items.length; a < b; a += 1) {
        const loadedItem = items[a];
        try {
          validateLoadedItem(tableLabel, schema, loadedItem);
          table.index.set(loadedItem.id, copyObject(loadedItem, true));
        } catch (e1) {
          const updatedItem = outdatedItemUpdater(loadedItem);
          validateLoadedItem(tableLabel, schema, updatedItem);
          table.index.set(updatedItem.id, copyObject(updatedItem, true));
          this.outdatedItemsUpdated = true;
        }
      }
      this.tables.set(tableLabel, table);
    }
  }

  initKVTable(tableLabel, shouldExist) {
    if (this.served) {
      throw Error('initKVTable : db already served');
    } else if (this.loading) {
      throw Error('initKVTable : db file still loading');
    } else if (this.loaded === false) {
      throw Error('initKVTable : db file not yet loaded');
    }
    const validate = createValidator('initKVTable');
    validate('tableLabel').asString(tableLabel);
    if (this.kvtables.has(tableLabel) === true) {
      throw Error(`initKVTable : table "${tableLabel}" already initialized`);
    }
    const tableData = this.loadedKVTables.find(t => t[0] === tableLabel);
    if (tableData === undefined) {
      if (shouldExist === true) {
        throw Error(`initKVTable : table "${tableLabel}" not found`);
      } else {
        // create:
        const table = new KVTable(tableLabel, this);
        this.tables.set(tableLabel, table);
      }
    } else {
      // populate:
      const keys = tableData[1];
      const values = tableData[2];
      const kvtable = new KVTable(tableLabel, this);
      for (let a = 0, b = keys.length; a < b; a += 1) {
        kvtable.index.set(keys[a], values[a]);
      }
      this.kvtables.set(tableLabel, kvtable);
    }
  }

  getTable(tableLabel) {
    if (this.served === false) {
      throw Error('getTable : db not yet served');
    }
    const validate = createValidator('getTable');
    validate('tableLabel').asString(tableLabel);
    if (this.tables.has(tableLabel) === false) {
      throw Error(`getTable : "${tableLabel}" KVTable not found, must exist`);
    }
    return this.tables.get(tableLabel);
  }

  getKVTable(tableLabel) {
    if (this.served === false) {
      throw Error('getKVTable : db not yet served');
    }
    const validate = createValidator('getKVTable');
    validate('tableLabel').asString(tableLabel);
    if (this.kvtables.has(tableLabel) === false) {
      throw Error(`getKVTable : "${tableLabel}" KVTable not found, must exist`);
    }
    return this.kvtables.get(tableLabel);
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
      let data;
      if (this.saveFormat === 'json' || this.saveFormat === 'readable_json') {
        data = JSON.parse(dbDataString.toString());
      } else { // msgpack
        data = this.msgpackDecode(dbDataString);
      }
      this.logFunction('@internalLoad : file loaded, populating tables.');
      const [dataMeta, dataTables, dataKVTables] = data;
      const [filenameLoaded, currentMajorVersionLoaded] = dataMeta;
      if (filenameLoaded !== this.filename) {
        throw Error(`@internalLoad : filename mismatch, "${filenameLoaded}" !== "${this.filename}"`);
      }
      if (currentMajorVersionLoaded !== currentMajorVersion) {
        throw Error(`@internalLoad : database version mismatch, "${currentMajorVersionLoaded}" !== "${currentMajorVersion}"`);
      }
      this.loadedTables = dataTables;
      this.loadedKVTables = dataKVTables;
    } else {
      this.loadedTables = [];
      this.loadedKVTables = [];
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

      const { filename } = this;
      const dataMeta = [filename, currentMajorVersion];

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
    if (this.served === false) {
      throw Error('@save : Cannot call "save" on non-served database.');
    }
    await this.internalSave();
  }
}

module.exports = Database;
