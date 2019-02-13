
import fs from 'fs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const open = promisify(fs.open);
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
            const [sortFn] = sort;            
            return sortFn(a, b);
          } else {
            const [field, fieldDescend] = sort;
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

/**
 * Transactions:
 * - May involve multiple items
 * - May involve multiple tables
 * - Changes are committed at once
 * 
 * At Redis:
 * - Item snapshots are captured
 * - Changes are recorded
 * - If items were modified in database, aborts
 * - Developer can also abort
 * - If items were not modified, commits
 */

 /**
  * @todo check if items still exist
  * @todo check if items were modified
  */

/**
 * @todo
 * - Pure function must not be async approach
 * 
 * - insertedItems: Item[]
 * - updatedItems: Item[]
 * - removedIds: [string, string][]
 *   - for each [table, id] pair, remove item
 * - removedItems: Item[]
 *   - for each Item, remove from their table
 * 
 * - randomItemId (table)
 *   - id must not exist in table
 *   - id must not exist in inserted items
 *   - 
 * - fetchItem (table, id) : Item
 *   - id must exist in table
 * - insertItem (table, id, data) : Item
 * - updateItem (item) : Item
 * - updateItemById (table, id, data) : Item
 * - mergeItemById (table, id, data) : Item
 * - removeItem (item) : void
 *   - item id must exist
 * - removeItemById (table, id) : void
 *   - id must exist
 */

export class TransactionTable  {
  public label: string;
  public realTable: Table;
  public index: Map<string, Item>;
  private removedIds: Set<string>;
  public constructor (label: string, table: Table) {
    this.label = label;
    this.realTable = table;
    this.index = new Map();
    this.removedIds = new Set();
  }
  public randomItemId () : string {
    let id = uuidv4();
    while (this.index.has(id) || this.realTable.index.has(id)) {
      id = uuidv4();
    }
    return id;
  }
  public insertItem(id: string, data : Item) : Item {
    if (this.index.has(id) || this.realTable.index.has(id)) {
      throw Error('Invalid "Item", "id" already exists in table');
    }
    if (this.removedIds.has(id)) {
      throw Error('Invalid "Item", "id" already exists in items to be removed in table');
    }
    const item = cloneDeep  (data);
    
    item[Tracker] = id;
    this.index.set(id, item);
    const copy = cloneDeep  (item);
    
    copy[Tracker] = id;
    return copy;
  }
  public fetchItem (id: string) : Item {
    if (this.realTable.index.has(id) === false) {
      throw Error('fetchItem : Invalid "Item", "id" not found in table');
    }
    if (this.removedIds.has(id)) {
      throw Error('fetchItem : Invalid "Item", "id" already exists in items to be removed in table');
    }
    if (this.index.has(id)) {
      const item = this.index.get(id);
      const copy = cloneDeep  (item as Item);
      
      copy[Tracker] = id;
      return copy;
    } else {
      const realItem = this.realTable.index.get(id);
      const item = cloneDeep  (realItem as Item);
      
      item[Tracker] = id;
      this.index.set(id, item);
      const copy = cloneDeep  (item as Item);
      
      copy[Tracker] = id;
      return copy;
    }
  }
  public fetchItemId (item: Item) : string {
    
    const id: string = item[Tracker];
    if (this.index.has(id) === false) {
      throw Error('Invalid "Item", "id" not found in table');
    }
    return id;
  }
  public updateItem (modified: Item) : void {
    
    const id: string = modified[Tracker];
    if (this.index.has(id) === false) {
      throw Error('Invalid "Item", "id" not found in table');
    }
    const item: Item = cloneDeep  (modified);
    
    item[Tracker] = id;
    this.index.set(id, item);
  }
  public updateItemById (id: string, data: Item) : Item {
    if (this.index.has(id) === false) {
      throw Error('Invalid "Item", "id" not found in table');
    }
    const item = cloneDeep  (data);
    
    item[Tracker] = id;
    this.index.set(id, item);
    const copy = cloneDeep  (item);
    
    copy[Tracker] = id;
    return copy;
  }
  public mergeItemById (id: string, data: Item) : Item {
    if (this.index.has(id) === false) {
      throw Error('Invalid "Item", "id" not found in table');
    }
    const existing = this.index.get(id);
    const item = {
      ...existing,
      ...cloneDeep (data)
    };
    
    item[Tracker] = id;
    const copy = cloneDeep  (item);
    
    copy[Tracker] = id;
    return copy;
  }
  public removeItem (item: Item) : void {
    
    const id: string = item[Tracker];
    if (id === undefined) throw Error('Invild "Item", "id" Symbol is undefined.');
    if (this.index.has(id)) {
      // inserted
      if (this.realTable.index.has(id)) {
        // fetched
        this.removedIds.add(id);
      }
      this.index.delete(id);
      
      delete item[Tracker];
      return;
    }
    throw Error('Invalid "Item", "id" not found in table');
  }
  public removeItemById (id: string) : void {
    if (this.realTable.index.has(id)) {
      this.removedIds.add(id);
      return;
    }
    if (this.index.has(id)) {
      this.index.delete(id);
      return;
    }
    throw Error('Invalid "Item", "id" not found in table');
  }
}




export class PseudoTable {
  public label: string;
  public index: Map<string, Item>;
  private refTable: Table;
  private removedItemIds: Set<string>;
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
    const existing = this.index.get(id);
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
    if (this.index.has(item.id) === false) {
      throw Error('removeItem : Invalid "item", "id" must exist in table');
    }
    this.index.delete(item.id);
  }
  public removeItemById (id: string) : void {
    if (id === undefined) {
      throw Error('removeItemById : Invalid "id", "id" must not be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('removeItemById : Invalid "id", "id" must exist in table');
    }
    this.index.delete(id);
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
      return new PseudoTable(label, this.database.index.get(label) as Table);
    };
    execFn(fetchTable);
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
        if (await exists(this.main)) {
          await this.internalLoad();
        } else {
          await this.internalSave();
        }
        this.initialized = true;
      })();
      await this.internalInitializePromise;
      this.internalInitializePromise = undefined;
    }
  }
  private async internalLoad () : Promise<void> {
    this.index.clear();
    const dbDataString: string = await readFile(this.main, 'utf8');
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
      const mainContent = Buffer.alloc(mainStat.size);
      await read(this.mainFd, mainContent, 0, mainStat.size, 0);
      await ftruncate(this.oldFd);
      await write(this.oldFd, mainContent, 0, mainStat.size, 0);
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
