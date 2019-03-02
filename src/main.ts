
import fs from 'fs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const open = promisify(fs.open);
const close = promisify(fs.close);
const ftruncate = promisify(fs.ftruncate);
const write = promisify(fs.write);
const read = promisify(fs.read);
const fstat = promisify(fs.fstat);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);

import cloneDeep from 'lodash/cloneDeep';
import isPlainObject from 'lodash/isPlainObject';
import uuidv4 from 'uuid/v4';
import ms from 'ms';

import tinydate from 'tinydate';
import MessagePack from 'what-the-pack';

export type AcceptedValues = string|number|boolean|null|undefined;

export interface Item {
  readonly id ?: string;
  [key:string]: AcceptedValues|(AcceptedValues)[];
}

// Helper Functions
const dateToString = tinydate('{DD}-{MM}-{YY}-{HH}-{mm}-{ss}');
const compareString = (
  a: string,
  b: string,
  descend: boolean
) : number => (descend ? b.localeCompare(a) : a.localeCompare(b));
const compareNumber = (
  a: number,
  b: number,
  descend: boolean
) : number => (descend ? b - a : a - b);

export class Query <ExtendedItem extends Item> {
  private resultIds: string[];
  private resultItems: Item[];
  private slicedItems: Item[];
  private queryOffset: number;
  private queryLimit: number;
  private sorts: ([string, boolean]|[Function])[];
  private selectedFields: string[];
  private hiddenFields: string[];
  private finalized: boolean;
  public constructor (table: Table <ExtendedItem> ) {
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
  public offset (value: number) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@offset : Query must not be finalized yet');
    this.queryOffset = value;
    return this;
  }
  public limit (value: number) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@limit : Query must not be finalized yet');
    this.queryLimit = value;
    return this;
  }
  public ascend (field: string) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@ascend : Query must not be finalized yet');
    this.sorts.push([field, false]);
    return this;
  }
  public descend (field: string) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@descend : Query must not be finalized yet');
    this.sorts.push([field, true]);
    return this;
  }
  public sortBy (sortFn: (a: Item, b: Item) => number) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@sortBy : Query must not be finalized yet');
    this.sorts.push([sortFn]);
    return this;
  }
  public gt (field: string, value: number) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@gt : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field] as number) && item[field] as number > value);
    return this;
  }
  public gte (field: string, value: number) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@gte : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field] as number) && item[field] as number >= value);
    return this;
  }
  public lt (field: string, value: number) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@lt : Query must not be finalized yet');  
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field] as number) && item[field] as number < value);
    return this;
  }
  public lte (field: string, value: number) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@lte : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field] as number) && item[field] as number <= value);
    return this;
  }
  public eq (field: string, value: number) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@eq : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => item[field] === value);
    return this;
  }
  public neq (field: string, value: number) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@neq : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => item[field] !== value);
    return this;
  }
  public has (field: string, value: (AcceptedValues)) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@has : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && (item[field] as (AcceptedValues)[]).includes(value));
    return this;
  }
  public hasAnyOf (field: string, values: (AcceptedValues)[]) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@hasAnyOf : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.some(value => (item[field] as (AcceptedValues)[]).includes(value)));
    return this;
  }
  public hasAllOf (field: string, values: (AcceptedValues)[]) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@hasAllOf : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.every(value => (item[field] as (AcceptedValues)[]).includes(value)));
    return this;
  }
  public hasNoneOfAny (field: string, values: (AcceptedValues)[]) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@hasNoneOfAny : Query must not be finalized yet');  
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.some(value => (item[field] as (AcceptedValues)[]).includes(value) === false));
    return this;
  }
  public hasNoneOfAll (field: string, values: (AcceptedValues)[]) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@hasNoneOfAll : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.every(value => (item[field] as (AcceptedValues)[]).includes(value) === false));
    return this;
  }
  public select (...fields: string[]) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@select : Query must not be finalized yet');
    this.selectedFields = fields.slice();
    return this;
  }
  public hide (...fields: string[]) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@hide : Query must not be finalized yet');
    this.hiddenFields = fields.slice();
    return this;
  }
  public filterBy (filterFn: (item: Item) => boolean) : Query <ExtendedItem> {
    if (this.finalized) throw Error('@filterBy : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => filterFn(item));
    return this;
  }
  private finalize () : void {
    if (this.sorts.length > 0) {
      this.slicedItems.sort((a, b) => {
        for (let i = 0, l = this.sorts.length; i < l; i += 1) {
          const sort = this.sorts[i];
          if (typeof sort[0] === 'function') {
            const [sortFn] = sort as [Function];            
            return sortFn(a, b);
          } else {
            const [field, fieldDescend] = sort as [string, boolean];
            if (typeof a[field] !== typeof b[field]) { // If field of both slicedItems don't match: EXIT LOOP
              break;
            } else if (typeof a[field] !== 'string' && typeof a[field] !== 'number') { // If both item fields are't "string" or "number": EXIT LOOP
              break;
            } else if (a[field] === b[field]) { // If value of both slicedItems are equal: SKIP SORT
              continue;
            } else if (typeof a[field] === 'string') {
              return compareString(a[field] as string, b[field] as string, fieldDescend as boolean);            
            } else if (typeof a[field] === 'number') {
              return compareNumber(a[field] as number, b[field] as number, fieldDescend as boolean);
            }
          }
        }
        return 0;
      });
    }
    this.slicedItems = this.slicedItems.slice(this.queryOffset, this.queryOffset + this.queryLimit);
    const resultIds: string[] = new Array(this.slicedItems.length);
    const resultItems: Item[] = new Array(this.slicedItems.length);
    for (let i = 0, l = this.slicedItems.length; i < l; i += 1) {
      const item = cloneDeep (this.slicedItems[i]);
      resultIds[i] = item.id as string;     
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
  public ids () : string[] {
    if (this.finalized === false) this.finalize();
    return this.resultIds;
  }
  public items () : Item[] {
    if (this.finalized === false) this.finalize();
    return this.resultItems;
  }
  public firstId () : string|undefined {
    if (this.finalized === false) this.finalize();
    return this.resultIds[0];
  }
  public firstItem () : Item|undefined {
    if (this.finalized === false) this.finalize();
    return this.resultItems[0];
  }
  public entries () : [string, Item][] {
    if (this.finalized === false) this.finalize();
    return this.resultItems.map((item) => [item.id, item] as [string, Item]);
  }
  public results () : [string[], Item[]] {
    if (this.finalized === false) this.finalize();
    return [this.resultIds, this.resultItems];
  }
}

export class Table <ExtendedItem extends Item> {
  public label: string;
  private database: Database;
  public index: Map<string, Item>;
  public constructor (label: string, database: Database) {
    if (database.initialized === false && database.initializing === false) {
      throw Error('@constructor : Cannot create table on non-initialized database.');
    }
    this.label = label;
    this.database = database;
    this.index = new Map();
    if (database.tables.has(label)) {
      return database.tables.get(label) as Table<ExtendedItem>;
    }
    database.tables.set(label, this);
  }
  public randomItemId () : string {
    let id = uuidv4();
    while (this.index.has(id)) {
      id = uuidv4();
    }
    return id;
  }
  public async insertItem (id: string, data : ExtendedItem) : Promise<ExtendedItem> {
    if (isPlainObject(data) === false) {
      throw Error('@insertItem : Invalid "data", "data" must be a plain object');
    }
    if (this.index.has(id)) {
      throw Error('@insertItem : Invalid "id", must not exist in table');
    }
    const item = {
      id,
      ...cloneDeep(data),
    };
    this.index.set(id, item);
    await this.database.save();
    const copy = cloneDeep (item);
    return copy;
  }
  public async updateItem (modified: ExtendedItem) : Promise<void> {
    if (isPlainObject(modified) === false) {
      throw Error('@updateItem : Invalid "modified", "modified" must be a plain object');
    }
    if (modified.id === undefined) {
      throw Error('@updateItem : Invalid "item", "id" must not be "undefined"');
    }
    if (this.index.has(modified.id) === false) {
      throw Error('@updateItem : Invalid "item", item "id" must exist in table');
    }
    const item = cloneDeep  (modified);
    this.index.set(item.id as string, item);
    await this.database.save();
  }
  public async updateItemById (id: string, data: ExtendedItem) : Promise<ExtendedItem> {
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
    const copy = cloneDeep  (item);
    return copy;
  }
  public async mergeItemById (id: string, data: ExtendedItem) : Promise<ExtendedItem> {
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
      ...cloneDeep (data)
    };
    this.index.set(id, item);
    await this.database.save();
    const copy = cloneDeep  (item);
    return copy;
  }
  public async removeItem (item: ExtendedItem) : Promise<void> {
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
  public async removeItemById (id: string) : Promise<void> {
    if (id === undefined) {
      throw Error('@removeItemById : Invalid "id", "id" must not be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('@removeItemById : Invalid "id", "id" must exist in table');
    }
    this.index.delete(id);
    await this.database.save();
  }
  public fetchItem (id: string) : ExtendedItem {
    if (id === undefined) {
      throw Error('@fetchItem : Invalid "id", "id" must not be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('@fetchItem : Invalid "item", "id" must exist in table');
    }
    const item = this.index.get(id);
    const copy = cloneDeep  (item as ExtendedItem);
    return copy;
  }
  public async clear() : Promise<void> {
    this.index.clear();
    await this.database.save();
  }
  public async destroy() : Promise<void> {
    this.database.tables.delete(this.label);
    await this.database.save();
  }
  public query () : Query <ExtendedItem> {
    return new Query(this);
  }
}


export class KVTable <Value> {
  public label: string;
  private database: Database;
  public index: Map<string, Value>;
  public constructor (label: string, database: Database) {
    if (database.initialized === false && database.initializing === false) {
      throw Error('@Cannot create KVTable on non-initialized database.');
    }
    this.label = label;
    this.database = database;
    this.index = new Map();
    if (database.kvtables.has(label)) {
      return database.kvtables.get(label) as KVTable<Value>;
    }
    database.kvtables.set(label, this);
  }
  public async set (key: string, value: Value) : Promise<void> {
    if (key === undefined) {
      throw Error('@set : Invalid "key", "key" must not be "undefined"');
    }
    if (typeof key !== 'string') {
      throw Error('@set : Invalid "key", "key" must be typeof "string"');
    }
    this.index.set(key, value);
    await this.database.save();
  }
  public has (key: string) : boolean {
    if (key === undefined) {
      throw Error('@set : Invalid "key", "key" must not be "undefined"');
    }
    if (typeof key !== 'string') {
      throw Error('@set : Invalid "key", "key" must be typeof "string"');
    }
    return this.index.has(key);
  }
  public get (key: string) : Value {
    if (key === undefined) {
      throw Error('@get : Invalid "key", "key" must not be "undefined"');
    }
    if (typeof key !== 'string') {
      throw Error('@set : Invalid "key", "key" must be typeof "string"');
    }
    if (this.index.has(key) === false) {
      throw Error('@get : Invalid "key", "key" must exist in KVTable');
    }
    return this.index.get(key) as Value;
  }
  public async delete (key: string) : Promise<void> {
    if (key === undefined) {
      throw Error('@set : Invalid "key", "key" must not be "undefined"');
    }
    if (typeof key !== 'string') {
      throw Error('@set : Invalid "key", "key" must be typeof "string"');
    }
    this.index.delete(key);
    await this.database.save();
  }
  public async clear() : Promise<void> {
    this.index.clear();
    await this.database.save();
  }
  public async destroy() : Promise<void> {
    this.database.kvtables.delete(this.label);
    await this.database.save();
  }
}

const rurudbVersion = 7;

// Database
interface DatabaseOptions {
  filename: string;
  directory: string;
  saveFormat: "json"|"msgpack"|"readable_json";
  snapshotInterval?: string;
  msgpackBufferSize?: number;
  logFunction?: Function;
}

export class Database {
  private filename: string;
  private directory: string;
  private main: string;
  private temp: string;
  private recent: string;
  private snapshotInterval: number;
  private lastSnapshotTimestamp: number;
  public tables: Map<string, Table <Item>>;
  public kvtables: Map<string, KVTable<unknown>>;
  private saving: boolean;
  private queue: [Function, Function][];
  private mainFd: number;
  private tempFd: number;
  private recentFd: number;
  public initialized: boolean;
  public initializing: boolean;
  private saveFormat: "json"|"msgpack"|"readable_json";
  private msgpackEncode: Function|undefined;
  private msgpackDecode: Function|undefined;
  private snapshotExtension: string;
  private internalInitializePromise: Promise<void>|undefined;
  private logFunction: Function|undefined;
  public constructor (options: DatabaseOptions) {
    this.logFunction = options.logFunction;
    this.filename = options.filename;
    this.directory = options.directory;
    switch (options.saveFormat) {
      case "json": {
        this.main = options.directory.concat('/', options.filename, '-current.rrdb');
        this.temp = options.directory.concat('/', options.filename, '-temp.rrdb');
        this.recent = options.directory.concat('/', options.filename, '-recent.rrdb');
        this.snapshotExtension = '-snapshot.rrdb';
        break;
      }
      case "readable_json": {
        this.main = options.directory.concat('/', options.filename, '-current.rrdb');
        this.temp = options.directory.concat('/', options.filename, '-temp.rrdb');
        this.recent = options.directory.concat('/', options.filename, '-recent.rrdb');
        this.snapshotExtension = '-snapshot.rrdb';
        break;
      }
      case "msgpack": {
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
      default:{
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
  public async initialize () : Promise<void> {
    if (this.initialized === false) {
      if (this.internalInitializePromise !== undefined) {
        return this.internalInitializePromise;
      }
      this.internalInitializePromise = (async () : Promise<void> => {
        await this.internalLoad();
        this.initialized = true;
      })();
      await this.internalInitializePromise;
      this.internalInitializePromise = undefined;
    }
  }
  private async internalLoad () : Promise<void> {
    this.tables.clear();
    this.kvtables.clear();
    let dbDataString: Buffer = Buffer.alloc(0);
    if (await exists(this.directory)) {
      if (await exists(this.main)) {
        this.mainFd = await open(this.main, 'r');
        const mainStat = await fstat(this.mainFd);
        if (mainStat.size > 0) {
          if (this.logFunction !== undefined) this.logFunction(`@internalLoad : Loading from ${this.main}`);
          const mainContent = Buffer.alloc(mainStat.size);
          await read(this.mainFd, mainContent, 0, mainStat.size, 0);
          dbDataString = mainContent;
        } else {
          if (this.logFunction !== undefined) this.logFunction(`@internalLoad : ${this.main} empty, possibly corrupted.`);
        }
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
          } else {
            if (this.logFunction !== undefined) this.logFunction(`@internalLoad : ${this.temp} empty, possibly corrupted.`);
          }
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
            } else {
              if (this.logFunction !== undefined) this.logFunction(`@internalLoad : ${this.recent} empty, possibly corrupted.`);
            }
            await close(this.recentFd);
          } else {
            if (this.logFunction !== undefined) this.logFunction(`@internalLoad : ${this.recent} not found.`);
          }
        }
      }
    }
    if (dbDataString.byteLength !== 0) {
      let data: any; // eslint-disable-line
      if (this.saveFormat === "json" || this.saveFormat === "readable_json") {
        data = JSON.parse(dbDataString.toString());
      } else { // msgpack
        data = (this.msgpackDecode as Function) (dbDataString);
      }

      if (this.logFunction !== undefined) this.logFunction(`@internalLoad : database file loaded, populating tables.`);
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
        const [label, items]: [string, Item[]] = dataTables[i];
        const table = new Table (label, this);
        for (let a = 0, b = items.length; a < b; a += 1) {
          table.index.set(items[a].id as string, items[a]);
        }
      }
      for (let i = 0, l = dataKVTables.length; i < l; i += 1) {
        const [label, keys, values]: [string, unknown[], unknown[]] = dataKVTables[i];
        const kvtable = new KVTable <unknown> (label, this);
        for (let a = 0, b = keys.length; a < b; a += 1) {
          kvtable.index.set(keys[a] as string, values[a]);
        }
      }
      this.initializing = false;
      if (this.logFunction !== undefined) this.logFunction(`@internalLoad : tables populated.`);
    } else {
      if (this.logFunction !== undefined) this.logFunction(`@internalLoad : database file not loaded, saving empty db.`);
      await this.internalSave();
    }
  }
  private async internalBeforeSave () : Promise<void> {
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
  private async internalSaveLoop () : Promise<void> {
    const fetched = this.queue;
    this.queue = [];
    let error: Error|undefined = undefined;;
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

      let dataString: Buffer;
      if (this.saveFormat === "json") {
        dataString = Buffer.from(JSON.stringify(data));
      } else if (this.saveFormat === "readable_json") {
        dataString = Buffer.from(JSON.stringify(data, null, 2));
      } else { // msgpack
        dataString = (this.msgpackEncode as Function) (data) as Buffer;
      }

      await ftruncate(this.tempFd);
      await write(this.tempFd, dataString, 0, dataString.byteLength, 0);

      const mainStat = await fstat(this.mainFd);
      if (mainStat.size > 0) {
        const modified = mainStat.mtime;
        const current = new Date();
        let mainContent = undefined;;
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
          const snapshotFd = await open(snapshot, 'w');;
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
        const [,reject] = fetched[i];
        reject(error);
      }
    } else {
      for (let i = 0, l = fetched.length; i < l; i += 1) {
        const [resolve] = fetched[i];
        resolve();
      }
    }
  }
  private async internalSave () : Promise <void> {
    return new Promise((resolve, reject) => {
      this.queue.push([resolve, reject]);
      if (this.saving === false) {
        this.saving = true;
        process.nextTick(this.internalBeforeSave);
      }
    });
  }
  public async save () : Promise<void> {
    if (this.initialized === false) {
      throw Error('@save : Cannot call "save" on non-initialized database.');
    }
    await this.internalSave();
  }
  public table (label: string) : Table <Item> {
    if (this.tables.has(label) === false) {
      throw Error(`@table : "${label}" Table not found, must exist`);
    }
    const table = new Table (label, this);
    return table;
  }
  public kvtable (label: string) : KVTable <unknown> {
    if (this.kvtables.has(label) === false) {
      throw Error(`@kvtable : "${label}" KVTable not found, must exist`);
    }
    const kvtable = new KVTable (label, this);
    return kvtable;
  }
}
