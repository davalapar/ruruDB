"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const types_1 = require("./types");
const sendResult = (result) => {
    process.send([result]);
};
const sendError = (error) => {
    process.send([null, [error.message, error.stack]]);
};
let dbInitialized = false;
let dbLabel = '';
let dbDirectory = '';
let dbFile = '';
let dbTempFile = '';
let dbOldFile = '';
const dbTables = new Map();
const loadDatabase = () => {
    dbTables.clear();
    const dbDataString = fs_1.readFileSync(dbFile, 'utf8');
    const dbData = JSON.parse(dbDataString);
    for (let a = 0, b = dbData.length; a < b; a += 1) {
        const [tableLabel, tableIds, tableItems] = dbData[a];
        if (Array.isArray(tableIds) === false) {
            throw Error('Unexpected non-array @ loaded "ids"');
        }
        if (Array.isArray(tableItems) === false) {
            throw Error('Unexpected non-array @ loaded "items"');
        }
        const table = {
            ids: tableIds,
            items: tableItems,
            index: new Map(),
        };
        for (let c = 0, d = tableItems.length; c < d; c += 1) {
            table.index.set(tableIds[c], tableItems[c]);
        }
        dbTables.set(tableLabel, table);
    }
};
const saveDatabase = () => {
    const tableEntries = Array.from(dbTables.entries());
    const dbData = new Array(tableEntries.length);
    for (let i = 0, l = tableEntries.length; i < l; i += 1) {
        const [tableLabel, table] = tableEntries[i];
        const tableIds = table.ids;
        const tableItems = table.items;
        dbData[i] = [tableLabel, tableIds, tableItems];
    }
    const dbDataString = JSON.stringify(dbData, null, 2);
    if (fs_1.existsSync(dbDirectory) === false) {
        fs_1.mkdirSync(dbDirectory, { recursive: true });
    }
    fs_1.writeFileSync(dbTempFile, dbDataString, 'utf8');
    if (fs_1.existsSync(dbFile) === true) {
        fs_1.renameSync(dbFile, dbOldFile);
    }
    fs_1.renameSync(dbTempFile, dbFile);
};
const useDatabase = ([label, directory]) => {
    if (dbInitialized) {
        throw Error('Database already initialized.');
    }
    dbInitialized = true;
    dbLabel = label;
    dbDirectory = directory;
    dbFile = dbDirectory.concat('/', dbLabel, '.rrdb');
    dbTempFile = dbFile.concat('.temp');
    dbOldFile = dbFile.concat('.old');
    if (fs_1.existsSync(dbFile)) {
        loadDatabase();
    }
    else {
        saveDatabase();
    }
    return null;
};
const useTable = ([label]) => {
    if (label === undefined) {
        throw Error('Unexpected "undefined" "label"');
    }
    if (dbTables.has(label) === false) {
        const table = {
            ids: [],
            items: [],
            index: new Map(),
        };
        dbTables.set(label, table);
        saveDatabase();
    }
    const identifier = {
        label: label,
    };
    return identifier;
};
process.on('message', (request) => {
    const [action, parameters] = request;
    try {
        switch (action) {
            case types_1.Actions.useDatabase: {
                sendResult(useDatabase(parameters));
                return;
            }
            case types_1.Actions.useTable: {
                sendResult(useTable(parameters));
                return;
            }
        }
    }
    catch (e) {
        sendError(e);
    }
});
