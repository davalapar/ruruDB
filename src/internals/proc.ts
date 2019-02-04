
import {
  writeFileSync,
  renameSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'fs';
import { Action } from './enums';
import { Data, ItemId, Item } from './types';
import { Table } from './interfaces';
import { TableItemIds, TableItems, TableItemIndex } from './symbols';

const sendResult = (result: null) : void => {
  (process.send as Function)([result]);
};
const sendError = (error: Error) : void => {
  (process.send as Function)([null, error.message, error.stack]);
};

let dbInitialized = false;
let dbLabel = '';
let dbDirectory = '';
let dbFile = '';
let dbTempFile = '';
let dbOldFile = '';

const dbTables = new Map();

const NestedError = (prefix: string, source: Error) : Error => {
  const message = ''.concat(prefix, ' » ', source.message);
  const error = Error(message);
  if (error.stack !== undefined && source.stack !== undefined) {
    error.stack = ''.concat(
      error.toString(),
      '\n',
      source.stack.split('\n').slice(1, 3).join('\n'),
      '\n',
      error.stack.split('\n').slice(2, 3).join('\n')
    );
  }
  return error;
};

const loadDatabase = () : void => {
  try {
    dbTables.clear();
    const dbDataString: string = readFileSync(dbFile, { encoding: 'string' });
    const dbData = JSON.parse(dbDataString);
    for (let a = 0, b = dbData.length; a < b; a += 1) {
      const [tableLabel, tableIds, tableItems] = dbData[a];
      if (Array.isArray(tableIds) === false) {
        throw Error('Unexpected non-array @ loaded "ids"');
      }
      if (Array.isArray(tableItems) === false) {
        throw Error('Unexpected non-array @ loaded "items"');
      }
      const table: Table = {
        [TableItemIds]: tableIds,
        [TableItems]: tableItems,
        [TableItemIndex]: new Map(),
      };
      for (let c = 0, d = tableItems.length; c < d; c += 1) {
        ((table[TableItemIndex] as Map<ItemId, Item>).set as Function)(tableIds[c], tableItems[c]);
      }
      dbTables.set(tableLabel, table);
    }
  } catch (e) {
    throw NestedError('loadDatabase()', e);
  }
};

const saveDatabase = () : void => {
  try {
    const tableEntries = Array.from(dbTables.entries());
    const dbData = new Array(tableEntries.length);
    for (let i = 0, l = tableEntries.length; i < l; i += 1) {
      const [tableLabel, table] = tableEntries[i];
      const tableIds = table[TableItemIds];
      const tableItems = table[TableItems];
      dbData[i] = [tableLabel, tableIds, tableItems];
    }
    const dbDataString = JSON.stringify(dbData, null, 2);
    if (existsSync(dbDirectory) === false) {
      mkdirSync(dbDirectory, { recursive: true });
    }
    writeFileSync(dbTempFile, dbDataString, 'utf8');
    if (existsSync(dbFile) === true) {
      renameSync(dbFile, dbOldFile);
    }
    renameSync(dbTempFile, dbFile);
  } catch (e) {
    throw NestedError('saveDatabase()', e);
  }
};

process.on('message', (data: Data) => {
  const [action, parameters] = data;
  try {
    switch (action) {
      case Action.useDatabase: {
        if (dbInitialized) {
          throw Error('Already initialized.');
        }
        const [label, directory] = parameters;
        dbInitialized = true;
        dbLabel = label;
        dbDirectory = directory;
        dbFile = dbDirectory.concat('/', dbLabel, '.rrdb');
        dbTempFile = dbFile.concat('.temp');
        dbOldFile = dbFile.concat('.old');
        if (existsSync(dbFile)) {
          loadDatabase();
        } else {
          saveDatabase();
        }
        sendResult(null);
        break;
      }
    }
  } catch (e) {
    sendError(e);
  }
});