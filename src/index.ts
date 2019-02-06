
import {
  writeFileSync,
  renameSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'fs';

let dbInitialized = false;
let dbLabel = '';
let dbDirectory = '';
let dbMainFile = '';
let dbTempFile = '';
let dbOldFile = '';

const ItemTableLabel: string = Symbol('Item.Table') as unknown as string;
const ItemId: string = Symbol('Item.Id') as unknown as string;

export type Values = string|number|boolean|undefined|null;
export type PlainArray = Values[];
export type PlainObject = Record<string, Values>
export type ItemValues = Values|PlainArray|PlainObject;
export type ItemId = string|number;
export type Item = Record<string, ItemValues>;

interface Table<Item> {
  Label: string;
  Ids: ItemId[];
  Items: Item[];
  Index: Map<ItemId, Item>;
}

const create = <T> () : Map<string, Table<T>> => {
  return new Map();
};

const dbTables: Map<string, any> = new Map();

const loadDatabase = () : void => {
  dbTables.clear();
  const dbDataString: string = readFileSync(dbMainFile, 'utf8');
  const dbData = JSON.parse(dbDataString);
  for (let a = 0, b = dbData.length; a < b; a += 1) {
    const [label, ids, items] = dbData[a];
    if (Array.isArray(ids) === false) {
      throw Error('Unexpected non-array @ loaded "ids"');
    }
    if (Array.isArray(items) === false) {
      throw Error('Unexpected non-array @ loaded "items"');
    }
    const table: Table = {
      Label: label,
      Ids: ids,
      Items: items,
      Index: new Map(),
    };
    for (let c = 0, d = items.length; c < d; c += 1) {
      ((table.Index as Map<string, Item>).set as Function)(ids[c], items[c]);
    }
    dbTables.set(label, table);
  }
};

const saveDatabase = () : void => {
  const tableEntries = Array.from(dbTables.entries());
  const dbData = new Array(tableEntries.length);
  for (let i = 0, l = tableEntries.length; i < l; i += 1) {
    const [label, table] = tableEntries[i];
    const ids = table.Ids;
    const items = table.Items;
    dbData[i] = [label, ids, items];
  }
  const dbDataString = JSON.stringify(dbData, null, 2);
  if (existsSync(dbDirectory) === false) {
    mkdirSync(dbDirectory, { recursive: true });
  }
  writeFileSync(dbTempFile, dbDataString, 'utf8');
  if (existsSync(dbMainFile) === true) {
    renameSync(dbMainFile, dbOldFile);
  }
  renameSync(dbTempFile, dbMainFile);
};

export const useDatabase = (label: string, directory: string) : void => {
  if (dbInitialized) {
    throw Error('Database already initialized.');
  }
  dbInitialized = true;
  dbLabel = label;
  dbDirectory = directory;
  dbMainFile = dbDirectory.concat('/', dbLabel, '.rrdb');
  dbTempFile = dbMainFile.concat('.temp');
  dbOldFile = dbMainFile.concat('.old');
  if (existsSync(dbMainFile)) {
    loadDatabase();
  } else {
    saveDatabase();
  }
};

export const useTable = <Item> (label: string) : Table<Item> => {
  if (label === undefined) {
    throw Error('Unexpected "undefined" "label"');
  }
  if (dbTables.has(label)) {
    return dbTables.get(label) as Table<Item>;
  } else {
    const table: Table<Item> = {
      Label: label,
      Ids: [],
      Items: [],
      Index: new Map(),
    };
    dbTables.set(label, table);
    saveDatabase();
    return table;
  }
};

export const useGenericTable = <T extends Item> (label: string) : GenericTable<T> => {
  if (label === undefined) {
    throw Error('Unexpected "undefined" "label"');
  }
  if (dbTables.has(label)) {
    return dbTables.get(label) as GenericTable<T>;
  } else {
    const table: GenericTable<T> = {
      Label: label,
      Ids: [],
      Items: [],
      Index: new Map(),
    };
    dbTables.set(label, table);
    saveDatabase();
    return table;
  }
};

const isPlainObject = (value: any) : boolean => { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (typeof value === 'object' && value !== null) {
    if (Object.prototype.toString.call(value) === '[object Object]') {
      let proto = value;
      while (Object.getPrototypeOf(proto) !== null) {
        proto = Object.getPrototypeOf(proto);
      }
      return Object.getPrototypeOf(value) === proto;
    }
    return false;
  }
  return false;
};

const copyArray = (target: PlainArray) : PlainArray => {
  const clone: PlainArray = new Array(target.length);
  for (let i = 0, l = target.length; i < l; i += 1) {
    const key = i;
    const value = target[key];
    switch (typeof value) {
      case 'boolean':
      case 'string':
        clone[key] = value;
        break;
      case 'number':
        // boolean, string, number
        if (Number.isNaN(value) === false && Number.isFinite(value)) {
          clone[key] = value;
        } else {
          throw Error('Invalid "non-finite number" property value.');
        }
        break;
      case 'function':
        throw Error('Invalid "function" property value.');
      case 'symbol':
        throw Error('Invalid "symbol" property value.');
      case 'undefined':
        clone[key] = undefined;
        break;
      case 'object':
        if (value === null) {
          clone[key] = null;
        }
        break;
      // no-default
    }
  }
  return clone;
};

const copyObject = (target: PlainObject) : PlainObject => {
  const clone: PlainObject = {};
  const keys = Object.keys(target);
  for (let i = 0, l = keys.length; i < l; i += 1) {
    const key = keys[i];
    const value = target[key];
    switch (typeof value) {
      case 'boolean':
      case 'string':
        clone[key] = value;
        break;
      case 'number':
        // boolean, string, number
        if (Number.isNaN(value) === false && Number.isFinite(value)) {
          clone[key] = value;
        } else {
          throw Error('Invalid "non-finite number" property value.');
        }
        break;
      case 'function':
        throw Error('Invalid "function" property value.');
      case 'symbol':
        throw Error('Invalid "symbol" property value.');
      case 'undefined':
        clone[key] = undefined;
        break;
      case 'object':
        if (value === null) {
          clone[key] = null;
        }
        break;
      // no-default
    }
  }
  return clone;
};

const copyItem = (target: Item) : Item => {  
  const clone: Item = {};
  const keys = Object.keys(target);
  for (let i = 0, l = keys.length; i < l; i += 1) {
    const key = keys[i];
    const value = target[key];
    switch (typeof value) {
      case 'boolean':
      case 'string':
        clone[key] = value;
        break;
      case 'number':
        // boolean, string, number
        if (Number.isNaN(value) === false && Number.isFinite(value)) {
          clone[key] = value;
        } else {
          throw Error('Invalid "non-finite number" property value.');
        }
        break;
      case 'function':
        throw Error('Invalid "function" property value.');
      case 'symbol':
        throw Error('Invalid "symbol" property value.');
      case 'undefined':
        clone[key] = undefined;
        break;
      case 'object':
        if (isPlainObject(value)) {
          clone[key] = copyObject(value as PlainObject);
        } else if (Array.isArray(value)) {
          clone[key] = copyArray(value as PlainArray);
        } else if (value === null) {
          clone[key] = null;
        }
        break;
      // no-default
    }
  }
  return clone;
};

export const clearTable = (table: Table) : void => {
  table.Ids = [];
  table.Items = [];
  table.Index.clear();
  saveDatabase();
};

export const removeTable = (table: Table) : void => {
  if (dbTables.has(table.Label) === false) {
    throw Error('Invalid "Table", not found.');
  }
  dbTables.delete(table.Label);
  saveDatabase();
  delete table.Label;
  delete table.Ids;
  delete table.Items;
  delete table.Index;
};

export const insertItem = <T extends Item> (table: Table, data: T|Item, id: string) : T|Item => {
  if (table.Index.has(id)) {
    throw Error('Invalid "Item", "id" already exists in table');
  }
  const item: Item = copyItem(data);
  item[ItemId] = id;
  item[ItemTableLabel] = table.Label;
  table.Ids.push(id);
  table.Items.push(item);
  table.Index.set(id, item);
  saveDatabase();
  const copy: Item = copyItem(item);
  copy[ItemId] = id;
  copy[ItemTableLabel] = table.Label;
  return copy;
};

export const updateItem = (modifiedItem: Item) : void => {
  const table = dbTables.get(modifiedItem[ItemTableLabel] as string) as Table;
  const id = modifiedItem[ItemId] as ItemId;
  if (table.Index.has(id) === false) {
    throw Error('Invalid "Item", "id" not found in table');
  }
  const item: Item = copyItem(modifiedItem);
  item[ItemId] = id;
  item[ItemTableLabel] = table.Label;
  table.Items[table.Ids.indexOf(id)] = item;
  table.Index.set(id, item);
  saveDatabase();
};

export const updateItemByID = (table: Table, id: ItemId, data: Item) : Item => {
  if (table.Index.has(id) === false) {
    throw Error('Invalid "Item", "id" not found in table');
  }
  const item: Item = copyItem(data);
  item[ItemId] = id;
  item[ItemTableLabel] = table.Label;
  table.Items[table.Ids.indexOf(id)] = item;
  table.Index.set(id, item);
  saveDatabase();
  const copy: Item = copyItem(item);
  copy[ItemId] = id;
  copy[ItemTableLabel] = table.Label;
  return copy;
};

export const mergeItemByID = (table: Table, id: ItemId, data: Item) : Item => {
  if (table.Index.has(id) === false) {
    throw Error('Invalid "Item", "id" not found in table');
  }
  const existing = table.Index.get(id);
  const item: Item = {
    ...existing,
    ...copyItem(data)
  };
  item[ItemId] = id;
  item[ItemTableLabel] = table.Label;
  table.Items[table.Ids.indexOf(id)] = item;
  table.Index.set(id, item);
  saveDatabase();
  const copy: Item = copyItem(item);
  copy[ItemId] = id;
  copy[ItemTableLabel] = table.Label;
  return copy;
};

export const removeItem = (item: Item) : void => {
  const table = dbTables.get(item[ItemTableLabel] as string) as Table;
  const id = item[ItemId] as ItemId;
  if (table.Index.has(id) === false) {
    throw Error('Invalid "Item", "id" not found in table');
  }
  const index = table.Ids.indexOf(id);
  table.Ids.splice(index, 1);
  table.Items.splice(index, 1);
  table.Index.delete(id);
  saveDatabase();
  delete item[ItemId];
  delete item[ItemTableLabel];
};

export const removeItemByID = (table: Table, id: ItemId) : void => {
  if (table.Index.has(id) === false) {
    throw Error('Invalid "Item", "id" not found in table');
  }
  const index = table.Ids.indexOf(id);
  table.Ids.splice(index, 1);
  table.Items.splice(index, 1);
  table.Index.delete(id);
  saveDatabase();
};

export const getItemID = (item: Item) : ItemId => {
  if (item[ItemId] === undefined) {
    throw Error('Invalid "Item", "id" not found in table');
  }
  return item[ItemId] as ItemId;
}

export const getItemByID = (table: Table, id: ItemId) : Item => {
  if (table.Index.has(id) === false) {
    throw Error('Invalid "Item", "id" not found in table');
  }
  const item = table.Index.get(id) as Item;
  const copy: Item = copyItem(item);
  copy[ItemId] = id;
  copy[ItemTableLabel] = table.Label;
  return copy;
}

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

type Methods = Record<string, Function>;

export const createQuery = (table: Table) : Methods => {
  let items = table.Items.slice();
  let offset = 0;
  let limit = items.length;
  const sorts: [string, boolean][] = [];
  let selectedFields: string[] = [];
  let hiddenFields: string[] = [];
  const methods: Methods = {
    offset: (value: number) : Methods => {
      offset = value;
      return methods;
    },
    limit: (value: number) : Methods => {
      limit = value;
      return methods;
    },
    ascend: (field: string) : Methods => {
      sorts.push([field, false]);
      return methods;
    },
    descend: (field: string) : Methods => {
      sorts.push([field, true]);
      return methods;
    },
    gt: (field: string, value: number) : Methods => {
      items = items.filter(item => item[field] as number > value);
      return methods;
    },
    gte: (field: string, value: number) : Methods => {
      items = items.filter(item => item[field] as number >= value);
      return methods;
    },
    lt: (field: string, value: number) : Methods => {
      items = items.filter(item => item[field] as number < value);
      return methods;
    },
    lte: (field: string, value: number) : Methods => {
      items = items.filter(item => item[field] as number <= value);
      return methods;
    },
    eq: (field: string, value: number) : Methods => {
      items = items.filter(item => item[field] as ItemValues === value);
      return methods;
    },
    neq: (field: string, value: number) : Methods => {
      items = items.filter(item => item[field] as ItemValues !== value);
      return methods;
    },
    has: (field: string, value: Values) : Methods => {
      items = items.filter(item => Array.isArray(item[field]) && (item[field] as PlainArray).includes(value));
      return methods;
    },
    hasAnyOf: (field: string, values: Values[]) : Methods => {
      items = items.filter(item => Array.isArray(item[field]) && values.some(value => (item[field] as PlainArray).includes(value)));
      return methods;
    },
    hasAllOf: (field: string, values: Values[]) : Methods => {
      items = items.filter(item => Array.isArray(item[field]) && values.every(value => (item[field] as PlainArray).includes(value)));
      return methods;
    },
    withoutAnyOf: (field: string, values: Values[]) : Methods => {
      items = items.filter(item => Array.isArray(item[field]) && values.some(value => (item[field] as PlainArray).includes(value) === false));
      return methods;
    },
    withoutAllOf: (field: string, values: Values[]) : Methods => {
      items = items.filter(item => Array.isArray(item[field]) && values.every(value => (item[field] as PlainArray).includes(value) === false));
      return methods;
    },
    select: (fields: string[]) : Methods => {
      selectedFields = fields.slice();
      return methods;
    },
    hide: (fields: string[]) : Methods => {
      hiddenFields = fields.slice();
      return methods;
    },
    results: () : Item[] => {
      
      if (sorts.length > 0) {
        items.sort((a, b) => {
          for (let i = 0, l = sorts.length; i < l; i += 1) {
            const [field, fieldDescend] = sorts[i];
            // If field of both items don't match: EXIT LOOP
            if (typeof a[field] !== typeof b[field]) {
              break;
            // If item fields are't "string" or "number": EXIT LOOP
            } else if (typeof a[field] !== 'string' || typeof a[field] !== 'number') {
              break;
            // If value of both items are equal: SKIP SORT
            } else if (a[field] === b[field]) {
              continue;
            } else if (typeof a[field] === 'string') {
              return compareString(a[field] as string, b[field] as string, fieldDescend);
            } else if (typeof a[field] === 'number') {
              return compareNumber(a[field] as number, b[field] as number, fieldDescend);
            }
          }
          return 0;
        });
      }

      // Apply our OFFSET & LIMIT filters
      items = items.slice(offset, offset + limit);

      // Copy our items into a new RESULTS array
      const results: Item[] = new Array(items.length);
      for (let i = 0, l = items.length; i < l; i += 1) {
        results[i] = copyItem(items[i]);
      }

      // For each item in RESULTS
      for (let i = 0, l = results.length; i < l; i += 1) {
        const item = results[i];

        // For each selected fields
        for (let a = 0, b = selectedFields.length; a < b; a += 1) {
          const field = selectedFields[i];

          // delete field
          delete item[field];
        }

        const keys = Object.keys(item);
        
        // For each item field
        for (let a = 0, b = keys.length; a < b; a += 1) {
          const field = keys[a];
          // If selected field includes field, DELETE
          if (selectedFields.includes(field) === false) {
            delete item[field];
          }
        }

        // For each hidden field, DELETE
        for (let a = 0, b = hiddenFields.length; a < b; a += 1) {
          const field = hiddenFields[a];
          delete item[field];
        }
        item[ItemId] = items[i][ItemId];
        item[ItemTableLabel] = items[i][ItemTableLabel];
      }
      return results;
    }
  };
  return methods;
};
