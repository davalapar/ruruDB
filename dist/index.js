"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
let dbInitialized = false;
let dbLabel = '';
let dbDirectory = '';
let dbMainFile = '';
let dbTempFile = '';
let dbOldFile = '';
const ItemTableLabel = Symbol('Item.Table');
const ItemId = Symbol('Item.Id');
const dbTables = new Map();
const loadDatabase = () => {
    dbTables.clear();
    const dbDataString = fs_1.readFileSync(dbMainFile, 'utf8');
    const dbData = JSON.parse(dbDataString);
    for (let a = 0, b = dbData.length; a < b; a += 1) {
        const [label, ids, items] = dbData[a];
        if (Array.isArray(ids) === false) {
            throw Error('Unexpected non-array @ loaded "ids"');
        }
        if (Array.isArray(items) === false) {
            throw Error('Unexpected non-array @ loaded "items"');
        }
        const table = {
            Label: label,
            Ids: ids,
            Items: items,
            Index: new Map(),
        };
        for (let c = 0, d = items.length; c < d; c += 1) {
            table.Index.set(ids[c], items[c]);
        }
        dbTables.set(label, table);
    }
};
const saveDatabase = () => {
    const tableEntries = Array.from(dbTables.entries());
    const dbData = new Array(tableEntries.length);
    for (let i = 0, l = tableEntries.length; i < l; i += 1) {
        const [label, table] = tableEntries[i];
        const ids = table.Ids;
        const items = table.Items;
        dbData[i] = [label, ids, items];
    }
    const dbDataString = JSON.stringify(dbData, null, 2);
    if (fs_1.existsSync(dbDirectory) === false) {
        fs_1.mkdirSync(dbDirectory, { recursive: true });
    }
    fs_1.writeFileSync(dbTempFile, dbDataString, 'utf8');
    if (fs_1.existsSync(dbMainFile) === true) {
        fs_1.renameSync(dbMainFile, dbOldFile);
    }
    fs_1.renameSync(dbTempFile, dbMainFile);
};
exports.useDatabase = (label, directory) => {
    if (dbInitialized) {
        throw Error('Database already initialized.');
    }
    dbInitialized = true;
    dbLabel = label;
    dbDirectory = directory;
    dbMainFile = dbDirectory.concat('/', dbLabel, '.rrdb');
    dbTempFile = dbMainFile.concat('.temp');
    dbOldFile = dbMainFile.concat('.old');
    if (fs_1.existsSync(dbMainFile)) {
        loadDatabase();
    }
    else {
        saveDatabase();
    }
};
exports.useTable = (label) => {
    if (label === undefined) {
        throw Error('Unexpected "undefined" "label"');
    }
    if (dbTables.has(label)) {
        return dbTables.get(label);
    }
    else {
        const table = {
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
exports.useGenericTable = (label) => {
    if (label === undefined) {
        throw Error('Unexpected "undefined" "label"');
    }
    if (dbTables.has(label)) {
        return dbTables.get(label);
    }
    else {
        const table = {
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
const isPlainObject = (value) => {
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
const copyArray = (target) => {
    const clone = new Array(target.length);
    for (let i = 0, l = target.length; i < l; i += 1) {
        const key = i;
        const value = target[key];
        switch (typeof value) {
            case 'boolean':
            case 'string':
                clone[key] = value;
                break;
            case 'number':
                if (Number.isNaN(value) === false && Number.isFinite(value)) {
                    clone[key] = value;
                }
                else {
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
        }
    }
    return clone;
};
const copyObject = (target) => {
    const clone = {};
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
                if (Number.isNaN(value) === false && Number.isFinite(value)) {
                    clone[key] = value;
                }
                else {
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
        }
    }
    return clone;
};
const copyItem = (target) => {
    const clone = {};
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
                if (Number.isNaN(value) === false && Number.isFinite(value)) {
                    clone[key] = value;
                }
                else {
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
                    clone[key] = copyObject(value);
                }
                else if (Array.isArray(value)) {
                    clone[key] = copyArray(value);
                }
                else if (value === null) {
                    clone[key] = null;
                }
                break;
        }
    }
    return clone;
};
exports.clearTable = (table) => {
    table.Ids = [];
    table.Items = [];
    table.Index.clear();
    saveDatabase();
};
exports.removeTable = (table) => {
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
exports.insertItem = (table, data, id) => {
    if (table.Index.has(id)) {
        throw Error('Invalid "Item", "id" already exists in table');
    }
    const item = copyItem(data);
    table.Ids.push(id);
    table.Items.push(item);
    table.Index.set(id, item);
    saveDatabase();
    const copy = copyItem(item);
    copy[ItemId] = id;
    copy[ItemTableLabel] = table.Label;
    return copy;
};
exports.updateItem = (modifiedItem) => {
    const table = dbTables.get(modifiedItem[ItemTableLabel]);
    const id = modifiedItem[ItemId];
    if (table.Index.has(id) === false) {
        throw Error('Invalid "Item", "id" not found in table');
    }
    const item = copyItem(modifiedItem);
    table.Items[table.Ids.indexOf(id)] = item;
    table.Index.set(id, item);
    saveDatabase();
};
exports.updateItemByID = (table, id, data) => {
    if (table.Index.has(id) === false) {
        throw Error('Invalid "Item", "id" not found in table');
    }
    const item = copyItem(data);
    table.Items[table.Ids.indexOf(id)] = item;
    table.Index.set(id, item);
    saveDatabase();
    const copy = copyItem(item);
    copy[ItemId] = id;
    copy[ItemTableLabel] = table.Label;
    return copy;
};
exports.mergeItemByID = (table, id, data) => {
    if (table.Index.has(id) === false) {
        throw Error('Invalid "Item", "id" not found in table');
    }
    const existing = table.Index.get(id);
    const item = Object.assign({}, existing, copyItem(data));
    table.Items[table.Ids.indexOf(id)] = item;
    table.Index.set(id, item);
    saveDatabase();
    const copy = copyItem(item);
    copy[ItemId] = id;
    copy[ItemTableLabel] = table.Label;
    return copy;
};
exports.removeItem = (item) => {
    const table = dbTables.get(item[ItemTableLabel]);
    const id = item[ItemId];
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
exports.removeItemByID = (table, id) => {
    if (table.Index.has(id) === false) {
        throw Error('Invalid "Item", "id" not found in table');
    }
    const index = table.Ids.indexOf(id);
    table.Ids.splice(index, 1);
    table.Items.splice(index, 1);
    table.Index.delete(id);
    saveDatabase();
};
exports.getItemID = (item) => {
    if (item[ItemId] === undefined) {
        throw Error('Invalid "Item", "id" not found in table');
    }
    return item[ItemId];
};
exports.getItemByID = (table, id) => {
    if (table.Index.has(id) === false) {
        throw Error('Invalid "Item", "id" not found in table');
    }
    const item = table.Index.get(id);
    const copy = copyItem(item);
    copy[ItemId] = id;
    copy[ItemTableLabel] = table.Label;
    return copy;
};
