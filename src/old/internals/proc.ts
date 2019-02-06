
import {
  writeFileSync,
  renameSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'fs';
import { 
  Actions,
  useDatabaseParameters,
  useDatabaseReturnType,
  useTableParameters,
  useTableReturnType,
  ItemId,
  Item,
  ResponseResult,
  Request,
  Table,
  TableIdentifier
} from './types';

const sendResult = (result: ResponseResult) : void => {
  (process.send as Function)([result]);
};
const sendError = (error: Error) : void => {
  (process.send as Function)([null, [error.message, error.stack]]);
};

let dbInitialized = false;
let dbLabel = '';
let dbDirectory = '';
let dbFile = '';
let dbTempFile = '';
let dbOldFile = '';

const dbTables: Map<string, Table> = new Map();

const loadDatabase = () : void => {
  dbTables.clear();
  const dbDataString: string = readFileSync(dbFile, 'utf8');
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
      ids: tableIds,
      items: tableItems,
      index: new Map(),
    };
    for (let c = 0, d = tableItems.length; c < d; c += 1) {
      ((table.index as Map<ItemId, Item>).set as Function)(tableIds[c], tableItems[c]);
    }
    dbTables.set(tableLabel, table);
  }
};

const saveDatabase = () : void => {
  const tableEntries = Array.from(dbTables.entries());
  const dbData = new Array(tableEntries.length);
  for (let i = 0, l = tableEntries.length; i < l; i += 1) {
    const [tableLabel, table] = tableEntries[i];
    const tableIds = table.ids;
    const tableItems = table.items;
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
};

const useDatabase = (
  [label, directory]: useDatabaseParameters
) : useDatabaseReturnType => {
  if (dbInitialized) {
    throw Error('Database already initialized.');
  }
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
  return null;
};

const useTable = (
  [label]: useTableParameters
) : useTableReturnType => {
  if (label === undefined) {
    throw Error('Unexpected "undefined" "label"');
  }
  if (dbTables.has(label) === false) {
    const table: Table = {
      ids: [],
      items: [],
      index: new Map(),
    };
    dbTables.set(label, table);
    saveDatabase();
  }
  const identifier: TableIdentifier = {
    label: label,
  };
  return identifier;
};

process.on('message', (request: Request) => {
  const [action, parameters] = request;
  try {
    switch (action) {
      case Actions.useDatabase: {
        sendResult(useDatabase(parameters as useDatabaseParameters));
        return;
      }
      case Actions.useTable: {
        sendResult(useTable(parameters as useTableParameters));
        return;
      }
    }
  } catch (e) {
    sendError(e);
  }
});