
import fs from 'fs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const open = promisify(fs.open);
const ftruncate = promisify(fs.ftruncate);
const write = promisify(fs.write);
const read = promisify(fs.read);
const fstat = promisify(fs.fstat);
const close = promisify(fs.close);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);

import cloneDeep from 'lodash/cloneDeep';
import uuidv4 from 'uuid/v4';
import ms from 'ms';
import moment from 'moment';

export type Values = string|number|boolean|null|undefined;

// Symbols
const Tracker = Symbol('Item.Id');

// Functions
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

class Query <Item> {
  private items: Item[];
  private queryOffset: number;
  private queryLimit: number;
  private sorts: [string, boolean][];
  private selectedFields: string[];
  private hiddenFields: string[];
  public constructor (table: Table<Item>) {
    this.items = table.items.slice();
    this.queryOffset = 0;
    this.queryLimit = table.items.length;
    this.sorts = [];
    this.selectedFields = [];
    this.hiddenFields = [];
  }
  public offset (value: number) : Query <Item> {
    this.queryOffset = value;
    return this;
  }
  public limit (value: number) : Query <Item> {
    this.queryLimit = value;
    return this;
  }
  public ascend (field: string) : Query <Item>  {
    this.sorts.push([field, false]);
    return this;
  }
  public descend (field: string) : Query <Item>  {
    this.sorts.push([field, true]);
    return this;
  }
  public gt (field: string, value: number) : Query <Item> {
    // @ts-ignore
    this.items = this.items.filter(item => item[field] > value);
    return this;
  }
  public gte (field: string, value: number) : Query <Item> {
    // @ts-ignore
    this.items = this.items.filter(item => item[field] >= value);
    return this;
  }
  public lt (field: string, value: number) : Query <Item> {
    // @ts-ignore
    this.items = this.items.filter(item => item[field] < value);
    return this;
  }
  public lte (field: string, value: number) : Query <Item> {
    // @ts-ignore
    this.items = this.items.filter(item => item[field] <= value);
    return this;
  }
  public eq (field: string, value: number) : Query <Item> {
    // @ts-ignore
    this.items = this.items.filter(item => item[field] === value);
    return this;
  }
  public neq (field: string, value: number) : Query <Item> {
    // @ts-ignore
    this.items = this.items.filter(item => item[field] !== value);
    return this;
  }
  public has (field: string, value: Values) : Query <Item> {
    // @ts-ignore
    this.items = this.items.filter(item => Array.isArray(item[field]) && (item[field]).includes(value));
    return this;
  }
  public hasAnyOf (field: string, values: Values[]) : Query <Item> {
    // @ts-ignore
    this.items = this.items.filter(item => Array.isArray(item[field]) && values.some(value => (item[field] as PlainArray).includes(value)));
    return this;
  }
  public hasAllOf (field: string, values: Values[]) : Query <Item> {
    // @ts-ignore
    this.items = this.items.filter(item => Array.isArray(item[field]) && values.every(value => (item[field] as PlainArray).includes(value)));
    return this;
  }
  public hasNoneOfAny (field: string, values: Values[]) : Query <Item> {
    // @ts-ignore
    this.items = this.items.filter(item => Array.isArray(item[field]) && values.some(value => (item[field] as PlainArray).includes(value) === false));
    return this;
  }
  public hasNoneOfAll (field: string, values: Values[]) : Query <Item> {
    // @ts-ignore
    this.items = this.items.filter(item => Array.isArray(item[field]) && values.every(value => (item[field] as PlainArray).includes(value) === false));
    return this;
  }
  public select (fields: string[]) : Query <Item> {
    this.selectedFields = fields.slice();
    return this;
  }
  public hide (fields: string[]) : Query <Item> {
    this.hiddenFields = fields.slice();
    return this;
  }
  public results () : Item[] {
    if (this.sorts.length > 0) {
      this.items.sort((a, b) => {
        for (let i = 0, l = this.sorts.length; i < l; i += 1) {
          const [field, fieldDescend] = this.sorts[i];
          // If field of both items don't match: EXIT LOOP
          // @ts-ignore
          if (typeof a[field] !== typeof b[field]) {
            break;
          // If item fields are't "string" or "number": EXIT LOOP
          // @ts-ignore
          } else if (typeof a[field] !== 'string' || typeof a[field] !== 'number') {
            break;
          // If value of both items are equal: SKIP SORT
          // @ts-ignore
          } else if (a[field] === b[field]) {
            continue;
          // @ts-ignore
          } else if (typeof a[field] === 'string') {
            // @ts-ignore
            return compareString(a[field] as string, b[field] as string, fieldDescend);
          // @ts-ignore
          } else if (typeof a[field] === 'number') {
            // @ts-ignore
            return compareNumber(a[field] as number, b[field] as number, fieldDescend);
          }
        }
        return 0;
      });
    }

    // Apply our OFFSET & LIMIT filters
    this.items = this.items.slice(this.queryOffset, this.queryOffset + this.queryLimit);

    // Copy our items into a new RESULTS array
    const results: Item[] = new Array(this.items.length);
    for (let i = 0, l = this.items.length; i < l; i += 1) {
      results[i] = cloneDeep <Item> (this.items[i]);
    }

    // For each item in RESULTS
    for (let i = 0, l = results.length; i < l; i += 1) {
      const item = results[i];

      // For each selected fields
      for (let a = 0, b = this.selectedFields.length; a < b; a += 1) {
        const field = this.selectedFields[i];

        // delete field
        // @ts-ignore
        delete item[field];
      }

      const keys = Object.keys(item);
      
      if (this.selectedFields.length > 1) {
          // For each item field
        for (let a = 0, b = keys.length; a < b; a += 1) {
          const field = keys[a];
          // If selected field includes field, DELETE
          if (this.selectedFields.includes(field) === false) {
            // @ts-ignore
            delete item[field];
          }
        }
      }

      // For each hidden field, DELETE
      for (let a = 0, b = this.hiddenFields.length; a < b; a += 1) {
        const field = this.hiddenFields[a];
        // @ts-ignore
        delete item[field];
      }
      // @ts-ignore
      item[Tracker] = this.items[i][Tracker];
    }

    return results;
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
export class Transaction {
  private items: unknown[];
  private removed: [string, string][];
  private database: Database;
  public constructor (database: Database) {
    this.database = database;
    this.items = [];
    this.removed = [];
  }
  public fetchItem <Item> (table: Table<Item>, id: string) : Item {
    if (table.index.has(id) === false) {
      throw Error('Transaction @ createItem : Invalid "id", not found in table');
    }
    const item = table.index.get(id) as Item;
    const copy = cloneDeep <Item> (item);
    // @ts-ignore
    copy[Tracker] = [id, table.label];
    this.items.push(copy);
    return copy;
  }
  public createItem <Item> (table: Table<Item>, id: string, item: Item) : Item {
    if (table.index.has(id)) {
      throw Error('Transaction @ createItem : Invalid "id", already exists in table');
    }
    const copy = cloneDeep <Item> (item);
    // @ts-ignore
    copy[Tracker] = [id, table.label];
    this.items.push(copy);
    return copy;
  }
  public removeItem <Item> (item: Item) : void {
    if (this.items.includes(item) === false) {
      throw Error('Transaction @ removeItem : Invalid "item", not involved in Transaction');
    }
    this.items.splice(this.items.indexOf(item), 1);
    // @ts-ignore
    const [id, tableLabel] = item[Tracker];
    if (this.removed.some(entry => entry[1] === id)) {
      throw Error('Transaction @ removeItem : Invalid "id", item already marked as removed');
    }
    this.removed.push([tableLabel, id]);
  }
  public removeItemById <Item> (table: Table<Item>, id: string) : void {
    if (table.index.has(id) === false) {
      throw Error('Transaction @ removeItemById : Invalid "id", not found in table');
    }
    if (this.removed.some(entry => entry[1] === id)) {
      throw Error('Transaction @ removeItemById : Invalid "id", item already marked as removed');
    }
    this.removed.push([table.label, id]);
  }
  public async commit () : Promise<void> {
    for (let i = 0, l = this.items.length; i < l; i += 1) {
      const item = this.items[i];
      // @ts-ignore
      const [id, tableLabel]: [string, string] = item[Tracker];
      const table = this.database.index.get(tableLabel);
      if (table === undefined) {
        throw Error('Transaction @ commit : Table not found in Database index');
      }
      const entry = cloneDeep(item);
      // @ts-ignore
      entry[Tracker] = id;
      const index = table.ids.indexOf(id);
      if (index >= 0) {
        table.items[index] = entry;
      } else {
        table.ids.push(id);
        table.items.push(entry);
      }
      table.index.set(id, entry);
    }
    for (let i = 0, l = this.removed.length; i < l; i += 1) {
      const [tableLabel, id] = this.removed[i];
      const table = this.database.index.get(tableLabel);
      if (table === undefined) {
        throw Error('Transaction @ commit : Table not found in Database index');
      }
      const index = table.ids.indexOf(id);
      table.ids.splice(index, 1);
      table.items.splice(index, 1);
      table.index.delete(id);
    }
    await this.database.save();
  }
}

export const randomItemId = (table: Table<unknown>) : string => {
  let id = uuidv4();
  while (table.index.has(id)) {
    id = uuidv4();
  }
  return id;
};

class Table <Item> {
  public label: string;
  private database: Database;
  public ids: string[];
  public items: Item[];
  public index: Map<string, Item>;
  public constructor (label: string, database: Database) {
    this.label = label;
    this.database = database;
    this.ids = [];
    this.items = [];
    this.index = new Map();
    database.index.set(label, this);
  }
  public async insertItem(id: string, data : Item) : Promise<Item> {
    if (this.index.has(id)) {
      throw Error('Invalid "Item", "id" already exists in table');
    }
    const item = cloneDeep <Item> (data);
    // @ts-ignore
    item[Tracker] = id;
    this.ids.push(id);
    this.items.push(item);
    this.index.set(id, item);
    await this.database.save();
    const copy = cloneDeep <Item> (item);
    // @ts-ignore
    copy[Tracker] = id;
    return copy;
  }
  public async clearTable() : Promise<void> {
    this.ids = [];
    this.items = [];
    this.index.clear();
    await this.database.save();
  }
  public async removeTable() : Promise<void> {
    this.database.index.delete(this.label);
    await this.database.save();
    delete this.label;
    delete this.ids;
    delete this.items;
    delete this.index;
  }
  public async updateItem (modified: Item) : Promise<void> {
    // @ts-ignore
    const id: string = modified[Tracker];
    if (this.index.has(id) === false) {
      throw Error('Invalid "Item", "id" not found in table');
    }
    const item: Item = cloneDeep <Item> (modified);
    // @ts-ignore
    item[Tracker] = id;
    this.items[this.ids.indexOf(id)] = item;
    this.index.set(id, item);
    await this.database.save();
  }
  public async updateItemById (id: string, data: Item) : Promise<Item> {
    if (this.index.has(id) === false) {
      throw Error('Invalid "Item", "id" not found in table');
    }
    const item = cloneDeep <Item> (data);
    // @ts-ignore
    item[Tracker] = id;
    this.items[this.ids.indexOf(id)] = item;
    this.index.set(id, item);
    await this.database.save();
    const copy = cloneDeep <Item> (item);
    // @ts-ignore
    copy[Tracker] = id;
    return copy;
  }
  public async mergeItemById (id: string, data: Item) : Promise<Item> {
    if (this.index.has(id) === false) {
      throw Error('Invalid "Item", "id" not found in table');
    }
    const existing = this.index.get(id);
    const item = {
      ...existing,
      ...cloneDeep <Item>(data)
    };
    // @ts-ignore
    item[Tracker] = id;
    await this.database.save();
    const copy = cloneDeep <Item> (item);
    // @ts-ignore
    copy[Tracker] = id;
    return copy;
  }
  public async removeItem (item: Item) : Promise<void> {
    // @ts-ignore
    const id: string = item[Tracker];
    if (this.index.has(id) === false) {
      throw Error('Invalid "Item", "id" not found in table');
    }
    const index = this.ids.indexOf(id);
    this.ids.splice(index, 1);
    this.items.splice(index, 1);
    this.index.delete(id);
    await this.database.save();
    // @ts-ignore
    delete item[Tracker];
  }
  public async removeItemById (id: string) : Promise<void> {
    if (this.index.has(id) === false) {
      throw Error('Invalid "Item", "id" not found in table');
    }
    const index = this.ids.indexOf(id);
    this.ids.splice(index, 1);
    this.items.splice(index, 1);
    this.index.delete(id);
    await this.database.save();
  }
  public getItemId (item: Item) : string {
    // @ts-ignore
    const id: string = item[Tracker];
    if (this.index.has(id) === false) {
      throw Error('Invalid "Item", "id" not found in table');
    }
    return id;
  }
  public getItemById (id: string) : Item {
    if (this.index.has(id) === false) {
      throw Error('Invalid "Item", "id" not found in table');
    }
    const item = this.index.get(id);
    const copy = cloneDeep <Item> (item as Item);
    // @ts-ignore
    copy[Tracker] = id;
    return copy;
  }
  public createQuery () : Query <Item> {
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
  public index: Map<string, Table<unknown>>; // eslint-disable-line
  private saving = false;
  private queue: [Function, Function][] = [];
  public constructor (filename: string, directory: string, snapshotInterval?: string) {
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
  }
  public async initialize () : Promise<void> {
    if (exists(this.main)) {
      await this.load();
    } else {
      await this.save();
    }
  }
  private async load () : Promise<void> {
    this.index.clear();
    const dbDataString: string = await readFile(this.main, 'utf8');
    const data = JSON.parse(dbDataString);
    for (let i = 0, l = data.length; i < l; i += 1) {
      const [label, ids, items] = data[i];
      const table = new Table <unknown> (label, this);
      for (let a = 0, b = items.length; a < b; a += 1) {
        await table.insertItem(ids[a], items[a]);
      }
    }
  }
  private async internalSaveLoop () : Promise<void> {

    // Ensure directory existence
    if (await exists(this.directory) === false) {
      await mkdir(this.directory, { recursive: true });
    }

    // Ensure file existence in parallel
    await Promise.all([
      async () => {
        if (await exists(this.main) === false) {
          await writeFile(this.main, '', 'utf8');
        }
      },
      async () => {
        if (await exists(this.temp) === false) {
          await writeFile(this.temp, '', 'utf8');
        }
      },
      async () => {
        if (await exists(this.old) === false) {
          await writeFile(this.old, '', 'utf8');
        }
      },
    ]);

    // Open file descriptors
    const [mainFd, tempFd, oldFd] = await Promise.all([
      open(this.main, 'r+'),
      open(this.temp, 'r+'),
      open(this.old, 'r+')
    ]);

    // Recursively process queue
    while (this.queue.length > 0) {
      const fetched = this.queue;
      this.queue = [];
      try {
        const tables = Array.from(this.index.entries());
        const data = new Array(tables.length);
        for (let i = 0, l = tables.length; i < l; i += 1) {
          const [label, table] = tables[i];
          const ids = table.ids;
          const items = table.items;
          data[i] = [label, ids, items];
        }
        const dataString = JSON.stringify(data, null, 2);
        await ftruncate(tempFd);
        await write(tempFd, dataString, 0, 'utf8');

        const oldStat = await fstat(oldFd);
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
              moment(current).format('DDMMMY_hh_mm_ss_A_x'),
              '.rrdb.old');
            const oldContent = Buffer.alloc(oldStat.size);
            await read(mainFd, oldContent, 0, oldStat.size, null);
            await writeFile(snapshot, oldContent, 'utf8');
            this.lastSnapshotTimestamp = current.valueOf();
          }
        }
        const mainStat = await fstat(mainFd);
        const mainContent = Buffer.alloc(mainStat.size);
        await read(mainFd, mainContent, 0, mainStat.size, null);
        await ftruncate(oldFd);
        await write(oldFd, mainContent, 0, mainStat.size, 0);
        await ftruncate(mainFd);
        await write(mainFd, dataString, 0, 'utf8');
        for (let i = 0, l = fetched.length; i < l; i += 1) {
          const [resolve] = fetched[i];
          resolve();
        }
      } catch (e) {
        for (let i = 0, l = fetched.length; i < l; i += 1) {
          const [,reject] = fetched[i];
          reject(e);
        }
      }
    }

    // Close file descriptors in parallel
    await Promise.all([
      close(mainFd),
      close(tempFd),
      close(oldFd)
    ]);

    this.saving = false;
  }
  public async save () : Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push([resolve, reject]);
      if (this.saving === false) {
        this.saving = true;
        this.internalSaveLoop();
      }
    });
  }
  public useTable <Item> (label: string) : Table<Item> {
    if (this.index.has(label)) {
      return this.index.get(label) as Table<Item>;
    }
    const table = new Table <Item> (label, this);
    return table;
  }
}
