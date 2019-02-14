
import fs, { stat } from 'fs';
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
import uuidv4 from 'uuid/v4';
import ms from 'ms';

import tinydate from 'tinydate';

export type AcceptedValues = string|number|boolean|null|undefined;

export interface Item {
  readonly id ?: string;
  readonly table ?: string;
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

export class Query {
  private resultItems: Item[];
  private queryOffset: number;
  private queryLimit: number;
  private sorts: ([string, boolean]|[Function])[];
  private selectedFields: string[];
  private hiddenFields: string[];
  public constructor (table: Table) {
    this.resultItems = Array.from(table.index.values());
    this.queryOffset = 0;
    this.queryLimit = this.resultItems.length;
    this.sorts = [];
    this.selectedFields = [];
    this.hiddenFields = [];
  }
  public offset (value: number) : Query {
    this.queryOffset = value;
    return this;
  }
  public limit (value: number) : Query {
    this.queryLimit = value;
    return this;
  }
  public ascend (field: string) : Query {
    this.sorts.push([field, false]);
    return this;
  }
  public descend (field: string) : Query {
    this.sorts.push([field, true]);
    return this;
  }
  public sortBy (sortFn: (a: Item, b: Item) => number) : Query {
    this.sorts.push([sortFn]);
    return this;
  }
  public gt (field: string, value: number) : Query {
    this.resultItems = this.resultItems.filter(item => Number.isFinite(item[field] as number) && item[field] as number > value);
    return this;
  }
  public gte (field: string, value: number) : Query {
    this.resultItems = this.resultItems.filter(item => Number.isFinite(item[field] as number) && item[field] as number >= value);
    return this;
  }
  public lt (field: string, value: number) : Query {    
    this.resultItems = this.resultItems.filter(item => Number.isFinite(item[field] as number) && item[field] as number < value);
    return this;
  }
  public lte (field: string, value: number) : Query {
    this.resultItems = this.resultItems.filter(item => Number.isFinite(item[field] as number) && item[field] as number <= value);
    return this;
  }
  public eq (field: string, value: number) : Query  {
    this.resultItems = this.resultItems.filter(item => item[field] === value);
    return this;
  }
  public neq (field: string, value: number) : Query  {
    this.resultItems = this.resultItems.filter(item => item[field] !== value);
    return this;
  }
  public has (field: string, value: (AcceptedValues)) : Query  {
    this.resultItems = this.resultItems.filter(item => Array.isArray(item[field]) && (item[field] as (AcceptedValues)[]).includes(value));
    return this;
  }
  public hasAnyOf (field: string, values: (AcceptedValues)[]) : Query  {
    
    this.resultItems = this.resultItems.filter(item => Array.isArray(item[field]) && values.some(value => (item[field] as (AcceptedValues)[]).includes(value)));
    return this;
  }
  public hasAllOf (field: string, values: (AcceptedValues)[]) : Query  {
    
    this.resultItems = this.resultItems.filter(item => Array.isArray(item[field]) && values.every(value => (item[field] as (AcceptedValues)[]).includes(value)));
    return this;
  }
  public hasNoneOfAny (field: string, values: (AcceptedValues)[]) : Query  {    
    this.resultItems = this.resultItems.filter(item => Array.isArray(item[field]) && values.some(value => (item[field] as (AcceptedValues)[]).includes(value) === false));
    return this;
  }
  public hasNoneOfAll (field: string, values: (AcceptedValues)[]) : Query  {    
    this.resultItems = this.resultItems.filter(item => Array.isArray(item[field]) && values.every(value => (item[field] as (AcceptedValues)[]).includes(value) === false));
    return this;
  }
  public select (fields: string[]) : Query  {
    this.selectedFields = fields.slice();
    return this;
  }
  public hide (fields: string[]) : Query  {
    this.hiddenFields = fields.slice();
    return this;
  }
  public filterBy (filterFn: (item: Item) => boolean) : Query  {    
    this.resultItems = this.resultItems.filter(item => filterFn(item));
    return this;
  }
  public results () : [string[], Item[]] {
    if (this.sorts.length > 0) {
      this.resultItems.sort((a, b) => {
        for (let i = 0, l = this.sorts.length; i < l; i += 1) {
          const sort = this.sorts[i];
          if (typeof sort[0] === 'function') {
            const [sortFn] = sort as [Function];            
            return sortFn(a, b);
          } else {
            const [field, fieldDescend] = sort as [string, boolean];
            if (typeof a[field] !== typeof b[field]) { // If field of both resultItems don't match: EXIT LOOP
              break;
            } else if (typeof a[field] !== 'string' || typeof a[field] !== 'number') { // If both item fields are't "string" or "number": EXIT LOOP
              break;
            } else if (a[field] === b[field]) { // If value of both resultItems are equal: SKIP SORT
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
    // Apply our OFFSET & LIMIT filters
    this.resultItems = this.resultItems.slice(this.queryOffset, this.queryOffset + this.queryLimit);
    // Copy our resultItems into a new RESULTS array
    // This is because we return clones that could be modified in next step
    // Next step is apply selected & hidden fields
    const ids: string[] = new Array(this.resultItems.length);
    const items: Item[] = new Array(this.resultItems.length);
    for (let i = 0, l = this.resultItems.length; i < l; i += 1) {
      const item = cloneDeep  (this.resultItems[i]);      
      ids[i] = this.resultItems[i].id as string;
      const itemFields = Object.keys(item);      
      if (this.selectedFields.length > 1) {
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
      items[i] = item;
    }
    return [ids, items];
  }
}

export class PseudoTable {
  public label: string;
  public index: Map<string, Item>;
  public refTable: Table;
  public removedItemIds: Set<string>;
  public constructor (label: string, refTable: Table) {
    this.label = label;
    this.refTable = refTable;
    this.index = new Map();
    this.removedItemIds = new Set();
  }
  public randomItemId () : string {
    let id = uuidv4();
    while (this.index.has(id) || this.refTable.index.has(id)) {
      id = uuidv4();
    }
    return id;
  }
  public insertItem (id: string, data : Item) : Item {
    if (this.index.has(id)) {
      throw Error('insertItem : Invalid "id", must not exist in table');
    }
    if (this.removedItemIds.has(id)) {
      throw Error('insertItem : Invalid "id", already set to be removed');
    }
    const item: Item = {
      id,
      ...cloneDeep(data),
    };
    this.index.set(id, item);
    const copy = cloneDeep (item);
    return copy;
  }
  public updateItem (modified: Item) : void {
    if (modified.id === undefined) {
      throw Error('updateItem : Invalid "item", "id" must not be "undefined"');
    }
    if (this.index.has(modified.id) === false) {
      throw Error('updateItem : Invalid "item", item "id" must exist in table');
    }
    const item: Item = cloneDeep  (modified);
    this.index.set(item.id as string, item);
  }
  public updateItemById (id: string, data: Item) : Item {
    if (data.id !== undefined) {
      throw Error('updateItemById : Invalid "data", "id" must be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('updateItemById : Invalid "id", must exist in table');
    }
    const item: Item = {
      id,
      ...cloneDeep(data),
    };
    this.index.set(id, item);
    const copy = cloneDeep  (item);
    return copy;
  }
  public mergeItemById (id: string, data: Item) : Item {
    if (data.id !== undefined) {
      throw Error('mergeItemById : Invalid "data", "id" must be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('mergeItemById : Invalid "item", "id" must exist in table');
    }
    const existing = this.index.get(id) || this.refTable.index.get(id);
    const item = {
      id,
      ...existing,
      ...cloneDeep (data)
    };
    const copy = cloneDeep  (item);
    return copy;
  }
  public removeItem (item: Item) : void {
    if (item.id === undefined) {
      throw Error('removeItem : Invalid "item", "id" must not be "undefined"');
    }
    if (this.index.has(item.id)) {
      this.index.delete(item.id);
      if (this.refTable.index.has(item.id)) {
        if (this.removedItemIds.has(item.id) === false) {
          this.removedItemIds.add(item.id);
        }
      }
      return;
    }
    if (this.index.has(item.id) === false) {
      throw Error('removeItem : Invalid "item", "id" must exist in table');
    }
  }
  public removeItemById (id: string) : void {
    if (id === undefined) {
      throw Error('removeItemById : Invalid "id", "id" must not be "undefined"');
    }
    if (this.index.has(id) || this.refTable.index.has(id)) {
      if (this.index.has(id)) {
        this.index.delete(id);
      }
      if (this.refTable.index.has(id)) {
        if (this.removedItemIds.has(id) === false) {
          this.removedItemIds.add(id);
        }
      }
    } else if (this.index.has(id) === false) {
      throw Error('removeItemById : Invalid "id", "id" must exist in table');
    }
  }
  public fetchItem (id: string) : Item {
    if (id === undefined) {
      throw Error('fetchItem : Invalid "id", "id" must not be "undefined"');
    }
    if (this.index.has(id)) {
      const item = this.index.get(id);
      const copy = cloneDeep  (item as Item);
      return copy;
    } else if (this.refTable.index.has(id)) {
      const item = this.refTable.index.get(id) as Item;
      this.index.set(id, item);
      const copy = cloneDeep  (item as Item);
      return copy;
    } else {
      throw Error('fetchItem : Invalid "item", "id" must exist in table');
    }
  }
}


/**
 * Transaction:
 * - Uses pseudo-tables
 * - Inserts, updates & deletes are isolated first
 * - Changes are applied at once if the Transaction doesn't throw
 */

type fetchTable =  (label: string) => PseudoTable;

export class Transaction {
  private database: Database;
  private index: Map<string, PseudoTable>;
  public constructor (database: Database) {
    if (database.initialized === false) {
      throw Error('Cannot create transaction on non-initialized database.');
    }
    this.database = database;
    this.index = new Map();
  }
  public async exec (execFn: (fetchTable: fetchTable) => void) : Promise<void> {
    const fetchTable: fetchTable =  (label: string) : PseudoTable  => {
      if (this.database.index.has(label) === false) {
        throw Error('fetchTable : Invalid "label", table not found.');
      }
      if (this.index.has(label)) {
        return this.index.get(label) as PseudoTable;
      }
      const pseudoTable = new PseudoTable(label, this.database.index.get(label) as Table);
      this.index.set(label, pseudoTable);
      return pseudoTable;
    };
    execFn(fetchTable);
    const pseudoTables = Array.from(this.index.values());
    for (let i = 0, l = pseudoTables.length; i < l; i += 1) {
      const pseudoTable = pseudoTables[i];
      const { refTable, removedItemIds } = pseudoTable;
      const updateEntries = Array.from(pseudoTable.index.entries());
      for (let a = 0, b = updateEntries.length; a < b; a += 1) {
        const [id, item] = updateEntries[a];
        refTable.index.set(id, item);
      }
      const removeValues = Array.from(removedItemIds.values())
      for (let a = 0, b = removeValues.length; a < b; a += 1) {
        refTable.index.delete(removeValues[a]);
      }
    }
    await this.database.save();
  }
}

export class Table {
  public label: string;
  private database: Database;
  public index: Map<string, Item>;
  public constructor (label: string, database: Database, mustExist?: boolean) {
    if (database.initialized === false && database.initializing === false) {
      throw Error('Cannot create table on non-initialized database.');
    }
    this.label = label;
    this.database = database;
    this.index = new Map();
    if (database.index.has(label)) {
      return database.index.get(label) as Table;
    } else if (mustExist === true) {
      throw Error(`constructor : Table "${label}" with "mustExist=true" not found!`);
    }
    database.index.set(label, this);
  }
  public randomItemId () : string {
    let id = uuidv4();
    while (this.index.has(id)) {
      id = uuidv4();
    }
    return id;
  }
  public async insertItem (id: string, data : Item) : Promise<Item> {
    if (this.index.has(id)) {
      throw Error('insertItem : Invalid "id", must not exist in table');
    }
    const item: Item = {
      id,
      ...cloneDeep(data),
    };
    this.index.set(id, item);
    await this.database.save();
    const copy = cloneDeep (item);
    return copy;
  }
  public async updateItem (modified: Item) : Promise<void> {
    if (modified.id === undefined) {
      throw Error('updateItem : Invalid "item", "id" must not be "undefined"');
    }
    if (this.index.has(modified.id) === false) {
      throw Error('updateItem : Invalid "item", item "id" must exist in table');
    }
    const item: Item = cloneDeep  (modified);
    this.index.set(item.id as string, item);
    await this.database.save();
  }
  public async updateItemById (id: string, data: Item) : Promise<Item> {
    if (data.id !== undefined) {
      throw Error('updateItemById : Invalid "data", "id" must be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('updateItemById : Invalid "id", must exist in table');
    }
    const item: Item = {
      id,
      ...cloneDeep(data),
    };
    this.index.set(id, item);
    await this.database.save();
    const copy = cloneDeep  (item);
    return copy;
  }
  public async mergeItemById (id: string, data: Item) : Promise<Item> {
    if (data.id !== undefined) {
      throw Error('mergeItemById : Invalid "data", "id" must be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('mergeItemById : Invalid "item", "id" must exist in table');
    }
    const existing = this.index.get(id);
    const item = {
      id,
      ...existing,
      ...cloneDeep (data)
    };
    await this.database.save();
    const copy = cloneDeep  (item);
    return copy;
  }
  public async removeItem (item: Item) : Promise<void> {
    if (item.id === undefined) {
      throw Error('removeItem : Invalid "item", "id" must not be "undefined"');
    }
    if (this.index.has(item.id) === false) {
      throw Error('removeItem : Invalid "item", "id" must exist in table');
    }
    this.index.delete(item.id);
    await this.database.save();
  }
  public async removeItemById (id: string) : Promise<void> {
    if (id === undefined) {
      throw Error('removeItemById : Invalid "id", "id" must not be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('removeItemById : Invalid "id", "id" must exist in table');
    }
    this.index.delete(id);
    await this.database.save();
  }
  public fetchItem (id: string) : Item {
    if (id === undefined) {
      throw Error('fetchItem : Invalid "id", "id" must not be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('fetchItem : Invalid "item", "id" must exist in table');
    }
    const item = this.index.get(id);
    const copy = cloneDeep  (item as Item);
    return copy;
  }
  public async clearTable() : Promise<void> {
    this.index.clear();
    await this.database.save();
  }
  public async removeTable() : Promise<void> {
    this.database.index.delete(this.label);
    await this.database.save();
  }
  public createQuery () : Query  {
    return new Query(this);
  }
}

// Database
export class Database {
  private filename: string;
  private directory: string;
  private main: string;
  private temp: string;
  private old: string;
  private snapshotInterval: number;
  private lastSnapshotTimestamp: number;
  public index: Map<string, Table>; // eslint-disable-line
  private saving = false;
  private queue: [Function, Function][] = [];
  private mainFd: number;
  private tempFd: number;
  private oldFd: number;
  public initializing: boolean;
  public initialized: boolean;
  private saveAsFormatted: boolean;
  private internalInitializePromise: Promise<void>|undefined;
  public constructor (filename: string, directory: string, saveAsFormatted ?: boolean, snapshotInterval?: string) {
    this.filename = filename;
    this.directory = directory;
    this.main = directory.concat('/', filename, '.rrdb');
    this.temp = directory.concat('/', filename, '.rrdb.temp');
    this.old = directory.concat('/', filename, '.rrdb.old');
    this.index = new Map();
    this.snapshotInterval = snapshotInterval ? ms(snapshotInterval) : Infinity;
    this.lastSnapshotTimestamp = -Infinity;
    this.saving = false;
    this.queue = [];
    this.save = this.save.bind(this);
    this.internalBeforeSave = this.internalBeforeSave.bind(this);
    this.internalSaveLoop = this.internalSaveLoop.bind(this);
    this.mainFd = 0;
    this.tempFd = 0;
    this.oldFd = 0;
    this.initializing = false;
    this.initialized = false;
    this.saveAsFormatted = saveAsFormatted === undefined ? false : saveAsFormatted;
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
    this.index.clear();
    let dbDataString = '';
    if (await exists(this.directory)) {
      if (await exists(this.main)) {
        this.mainFd = await open(this.main, 'r');
        const mainStat = await fstat(this.mainFd);
        if (mainStat.size > 0) {
          console.log(`internalLoad : Loading from ${this.main}`);
          const mainContent = Buffer.alloc(mainStat.size);
          await read(this.mainFd, mainContent, 0, mainStat.size, 0);
          dbDataString = mainContent.toString();
        } else {
          console.log(`internalLoad : ${this.main} empty, possibly corrupted.`);
        }
        await close(this.mainFd);
      } else {
        console.log(`internalLoad : ${this.main} not found.`);
        if (await exists(this.temp)) {
          this.tempFd = await open(this.temp, 'r');
          const tempStat = await fstat(this.tempFd);
          if (tempStat.size > 0) {
            console.log(`internalLoad : Loading from ${this.temp}`);
            const tempContent = Buffer.alloc(tempStat.size);
            await read(this.tempFd, tempContent, 0, tempStat.size, 0);
            dbDataString = tempContent.toString();
          } else {
            console.log(`internalLoad : ${this.temp} empty, possibly corrupted.`);
          }
          await close(this.tempFd);
        } else {
          console.log(`internalLoad : ${this.temp} not found.`);
          if (await exists(this.old)) {
            this.oldFd = await open(this.old, 'r');
            const oldStat = await fstat(this.oldFd);
            if (oldStat.size > 0) {
              console.log(`internalLoad : Loading from ${this.old}`);
              const tempContent = Buffer.alloc(oldStat.size);
              await read(this.oldFd, tempContent, 0, oldStat.size, 0);
              dbDataString = tempContent.toString();
            } else {
              console.log(`internalLoad : ${this.old} empty, possibly corrupted.`);
            }
            await close(this.oldFd);
          } else {
            console.log(`internalLoad : ${this.old} not found.`);
          }
        }
      }
    }
    if (dbDataString !== '') {
      console.log(`internalLoad : database file loaded, populating tables.`);
      const data = JSON.parse(dbDataString);
      this.initializing = true;
      for (let i = 0, l = data.length; i < l; i += 1) {
        const [label, ids, items] = data[i];
        const table = new Table (label, this);
        for (let a = 0, b = items.length; a < b; a += 1) {
          table.index.set(ids[a], items[a]);
        }
      }
      this.initializing = false;
      console.log(`internalLoad : tables populated.`);
    } else {
      console.log(`internalLoad : database file not loaded, saving empty db.`);
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
    if (await exists(this.old) === false) {
      await writeFile(this.old, '', 'utf8');
    }
    this.mainFd = await open(this.main, 'r+');
    this.tempFd = await open(this.temp, 'r+');
    this.oldFd = await open(this.old, 'r+');
    process.nextTick(this.internalSaveLoop);
  }
  private async internalSaveLoop () : Promise<void> {
    const fetched = this.queue;
    this.queue = [];
    let error: Error|undefined = undefined;;
    try {
      const tables = Array.from(this.index.entries());
      const data = new Array(tables.length);
      for (let i = 0, l = tables.length; i < l; i += 1) {
        const [label, table] = tables[i];
        const ids = Array.from(table.index.keys());
        const items = Array.from(table.index.values());
        data[i] = [label, ids, items];
      }
      const dataString = this.saveAsFormatted ? JSON.stringify(data, null, 2) : JSON.stringify(data);
      await ftruncate(this.tempFd);
      await write(this.tempFd, dataString, 0, 'utf8');

      const oldStat = await fstat(this.oldFd);
      if (oldStat.size > 0) {
        const modified = oldStat.mtime;
        const current = new Date();
        if (
          current.valueOf() - modified.valueOf() >= this.snapshotInterval
          && current.valueOf() - this.lastSnapshotTimestamp >= this.snapshotInterval
        ) {
          const snapshot = ''.concat(
            this.directory, '/',
            this.filename, '_',
            dateToString(current),
            '.rrdb.old');
          const oldContent = Buffer.alloc(oldStat.size);
          await read(this.oldFd, oldContent, 0, oldStat.size, 0);
          await writeFile(snapshot, oldContent, 'utf8');
          this.lastSnapshotTimestamp = current.valueOf();
        }
      }
      const mainStat = await fstat(this.mainFd);
      if (mainStat.size > 0) {
        const mainContent = Buffer.alloc(mainStat.size);
        await read(this.mainFd, mainContent, 0, mainStat.size, 0);
        await ftruncate(this.oldFd);
        await write(this.oldFd, mainContent, 0, mainStat.size, 0);
      }
      await ftruncate(this.mainFd);
      await write(this.mainFd, dataString, 0, 'utf8');
    } catch (e) {
      error = e;
    }

    if (this.queue.length > 0) {
      process.nextTick(this.internalSaveLoop);
    } else {
      this.saving = false;
      fs.closeSync(this.mainFd);
      fs.closeSync(this.tempFd);
      fs.closeSync(this.oldFd);
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
      throw Error('Cannot call "save" on non-initialized database.');
    }
    await this.internalSave();
  }
  public useTable  (label: string, mustExist: boolean) : Table {
    const table = new Table  (label, this, mustExist);
    return table;
  }
}
