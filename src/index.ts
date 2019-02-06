
import {
  writeFileSync,
  renameSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'fs';

import _ from 'lodash';

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

export class Query <Item> {
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
      results[i] = _.cloneDeep <Item> (this.items[i]);
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
    const copy = _.cloneDeep <Item> (item);
    // @ts-ignore
    copy[Tracker] = [id, table.label];
    this.items.push(copy);
    return copy;
  }
  public createItem <Item> (table: Table<Item>, id: string, item: Item) : Item {
    if (table.index.has(id)) {
      throw Error('Transaction @ createItem : Invalid "id", already exists in table');
    }
    const copy = _.cloneDeep <Item> (item);
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
  public commit () : void {
    for (let i = 0, l = this.items.length; i < l; i += 1) {
      const item = this.items[i];
      // @ts-ignore
      const [id, tableLabel]: [string, string] = item[Tracker];
      const table = this.database.index.get(tableLabel);
      if (table === undefined) {
        throw Error('Transaction @ commit : Table not found in Database index');
      }
      const entry = _.cloneDeep(item);
      // @ts-ignore
      entry[Tracker] = id;
      table.items[table.ids.indexOf(id)] = entry;
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
    this.database.save();
  }
}

export const randomItemId = (table: Table<unknown>) : string => {
  let id = String(Math.random());
  while (table.index.has(id)) {
    id = String(Math.random());
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
  }
  public insertItem(id: string, data : Item) : Item {
    if (this.index.has(id)) {
      throw Error('Invalid "Item", "id" already exists in table');
    }
    const item = _.cloneDeep <Item> (data);
    // @ts-ignore
    item[Tracker] = id;
    this.ids.push(id);
    this.items.push(item);
    this.index.set(id, item);
    this.database.save();
    const copy = _.cloneDeep <Item> (item);
    // @ts-ignore
    copy[Tracker] = id;
    return copy;
  }
  public clearTable() : void {
    this.ids = [];
    this.items = [];
    this.index.clear();
    this.database.save();
  }
  public removeTable() : void {
    this.database.index.delete(this.label);
    this.database.save();
    delete this.label;
    delete this.ids;
    delete this.items;
    delete this.index;
  }
  public updateItem (modified: Item) : void {
    // @ts-ignore
    const id: string = modified[Tracker];
    if (this.index.has(id) === false) {
      throw Error('Invalid "Item", "id" not found in table');
    }
    const item: Item = _.cloneDeep <Item> (modified);
    // @ts-ignore
    item[Tracker] = id;
    this.items[this.ids.indexOf(id)] = item;
    this.index.set(id, item);
    this.database.save();
  }
  public updateItemById (id: string, data: Item) : Item {
    if (this.index.has(id) === false) {
      throw Error('Invalid "Item", "id" not found in table');
    }
    const item = _.cloneDeep <Item> (data);
    // @ts-ignore
    item[Tracker] = id;
    this.items[this.ids.indexOf(id)] = item;
    this.index.set(id, item);
    this.database.save();
    const copy = _.cloneDeep <Item> (item);
    // @ts-ignore
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
      ..._.cloneDeep <Item>(data)
    };
    // @ts-ignore
    item[Tracker] = id;
    this.database.save();
    const copy = _.cloneDeep <Item> (item);
    // @ts-ignore
    copy[Tracker] = id;
    return copy;
  }
  public removeItem (item: Item) : void {
    // @ts-ignore
    const id: string = item[Tracker];
    if (this.index.has(id) === false) {
      throw Error('Invalid "Item", "id" not found in table');
    }
    const index = this.ids.indexOf(id);
    this.ids.splice(index, 1);
    this.items.splice(index, 1);
    this.index.delete(id);
    this.database.save();
    // @ts-ignore
    delete item[Tracker];
  }
  public removeItemById (id: string) : void {
    if (this.index.has(id) === false) {
      throw Error('Invalid "Item", "id" not found in table');
    }
    const index = this.ids.indexOf(id);
    this.ids.splice(index, 1);
    this.items.splice(index, 1);
    this.index.delete(id);
    this.database.save();
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
    const copy = _.cloneDeep <Item> (item as Item);
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
  public index: Map<string, Table<unknown>>; // eslint-disable-line
  public constructor (filename: string, directory: string) {
    this.filename = filename;
    this.directory = directory;
    this.main = directory.concat('/', filename, '.rrdb');
    this.temp = directory.concat('/', filename, '.rrdb.temp');
    this.old = directory.concat('/', filename, '.rrdb.old');
    this.index = new Map();
    if (existsSync(this.main)) {
      this.load();
    } else {
      this.save();
    }
  }
  private load () : void {
    this.index.clear();
    const dbDataString: string = readFileSync(this.main, 'utf8');
    const data = JSON.parse(dbDataString);
    for (let i = 0, l = data.length; i < l; i += 1) {
      const [label, ids, items] = data[i];
      const table = new Table <unknown> (label, this);
      this.index.set(label, table);
      for (let a = 0, b = items.length; a < b; a += 1) {
        table.insertItem(ids[a], items[a]);
      }
    }
  }
  public save () : void {
    const tables = Array.from(this.index.entries());
    const data = new Array(tables.length);
    for (let i = 0, l = tables.length; i < l; i += 1) {
      const [label, table] = tables[i];
      const ids = table.ids;
      const items = table.items;
      data[i] = [label, ids, items];
    }
    const dataString = JSON.stringify(data, null, 2);
    if (existsSync(this.directory) === false) {
      mkdirSync(this.directory, { recursive: true });
    }
    writeFileSync(this.temp, dataString, 'utf8');
    if (existsSync(this.main) === true) {
      renameSync(this.main, this.old);
    }
    renameSync(this.temp, this.main);
  }
  public useTable <Item> (label: string) : Table<Item> {
    if (this.index.has(label)) {
      return this.index.get(label) as Table<Item>;
    }
    const table = new Table <Item> (label, this);
    this.index.set(label, table);
    return table;
  }
}


