"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const lodash_1 = __importDefault(require("lodash"));
const ItemId = Symbol('Item.Id');
const ItemTableLabel = Symbol('Item.TableLabel');
const compareString = (a, b, descend) => (descend ? b.localeCompare(a) : a.localeCompare(b));
const compareNumber = (a, b, descend) => (descend ? b - a : a - b);
class Query {
    constructor(table) {
        this.items = table.items.slice();
        this.queryOffset = 0;
        this.queryLimit = table.items.length;
        this.sorts = [];
        this.selectedFields = [];
        this.hiddenFields = [];
    }
    offset(value) {
        this.queryOffset = value;
        return this;
    }
    limit(value) {
        this.queryLimit = value;
        return this;
    }
    ascend(field) {
        this.sorts.push([field, false]);
        return this;
    }
    descend(field) {
        this.sorts.push([field, true]);
        return this;
    }
    gt(field, value) {
        this.items = this.items.filter(item => item[field] > value);
        return this;
    }
    gte(field, value) {
        this.items = this.items.filter(item => item[field] >= value);
        return this;
    }
    lt(field, value) {
        this.items = this.items.filter(item => item[field] < value);
        return this;
    }
    lte(field, value) {
        this.items = this.items.filter(item => item[field] <= value);
        return this;
    }
    eq(field, value) {
        this.items = this.items.filter(item => item[field] === value);
        return this;
    }
    neq(field, value) {
        this.items = this.items.filter(item => item[field] !== value);
        return this;
    }
    has(field, value) {
        this.items = this.items.filter(item => Array.isArray(item[field]) && (item[field]).includes(value));
        return this;
    }
    hasAnyOf(field, values) {
        this.items = this.items.filter(item => Array.isArray(item[field]) && values.some(value => item[field].includes(value)));
        return this;
    }
    hasAllOf(field, values) {
        this.items = this.items.filter(item => Array.isArray(item[field]) && values.every(value => item[field].includes(value)));
        return this;
    }
    withoutAnyOf(field, values) {
        this.items = this.items.filter(item => Array.isArray(item[field]) && values.some(value => item[field].includes(value) === false));
        return this;
    }
    withoutAllOf(field, values) {
        this.items = this.items.filter(item => Array.isArray(item[field]) && values.every(value => item[field].includes(value) === false));
        return this;
    }
    select(fields) {
        this.selectedFields = fields.slice();
        return this;
    }
    hide(fields) {
        this.hiddenFields = fields.slice();
        return this;
    }
    results() {
        if (this.sorts.length > 0) {
            this.items.sort((a, b) => {
                for (let i = 0, l = this.sorts.length; i < l; i += 1) {
                    const [field, fieldDescend] = this.sorts[i];
                    if (typeof a[field] !== typeof b[field]) {
                        break;
                    }
                    else if (typeof a[field] !== 'string' || typeof a[field] !== 'number') {
                        break;
                    }
                    else if (a[field] === b[field]) {
                        continue;
                    }
                    else if (typeof a[field] === 'string') {
                        return compareString(a[field], b[field], fieldDescend);
                    }
                    else if (typeof a[field] === 'number') {
                        return compareNumber(a[field], b[field], fieldDescend);
                    }
                }
                return 0;
            });
        }
        this.items = this.items.slice(this.queryOffset, this.queryOffset + this.queryLimit);
        const results = new Array(this.items.length);
        for (let i = 0, l = this.items.length; i < l; i += 1) {
            results[i] = lodash_1.default.cloneDeep(this.items[i]);
        }
        for (let i = 0, l = results.length; i < l; i += 1) {
            const item = results[i];
            for (let a = 0, b = this.selectedFields.length; a < b; a += 1) {
                const field = this.selectedFields[i];
                delete item[field];
            }
            const keys = Object.keys(item);
            if (this.selectedFields.length > 1) {
                for (let a = 0, b = keys.length; a < b; a += 1) {
                    const field = keys[a];
                    if (this.selectedFields.includes(field) === false) {
                        delete item[field];
                    }
                }
            }
            for (let a = 0, b = this.hiddenFields.length; a < b; a += 1) {
                const field = this.hiddenFields[a];
                delete item[field];
            }
            item[ItemId] = this.items[i][ItemId];
            item[ItemTableLabel] = this.items[i][ItemTableLabel];
        }
        return results;
    }
}
exports.Query = Query;
class Table {
    constructor(label, database) {
        this.label = label;
        this.database = database;
        this.ids = [];
        this.items = [];
        this.index = new Map();
    }
    insertItem(id, data) {
        if (this.index.has(id)) {
            throw Error('Invalid "Item", "id" already exists in table');
        }
        const item = lodash_1.default.cloneDeep(data);
        item[ItemId] = id;
        item[ItemTableLabel] = this.label;
        this.ids.push(id);
        this.items.push(item);
        this.index.set(id, item);
        this.database.save();
        const copy = lodash_1.default.cloneDeep(item);
        copy[ItemId] = id;
        copy[ItemTableLabel] = this.label;
        return copy;
    }
    clearTable() {
        this.ids = [];
        this.items = [];
        this.index.clear();
        this.database.save();
    }
    removeTable() {
        this.database.index.delete(this.label);
        this.database.save();
        delete this.label;
        delete this.ids;
        delete this.items;
        delete this.index;
    }
    updateItem(modified) {
        const id = modified[ItemId];
        if (this.index.has(id) === false) {
            throw Error('Invalid "Item", "id" not found in table');
        }
        const item = lodash_1.default.cloneDeep(modified);
        item[ItemId] = id;
        item[ItemTableLabel] = this.label;
        this.items[this.ids.indexOf(id)] = item;
        this.index.set(id, item);
        this.database.save();
    }
    updateItemById(id, data) {
        if (this.index.has(id) === false) {
            throw Error('Invalid "Item", "id" not found in table');
        }
        const item = lodash_1.default.cloneDeep(data);
        item[ItemId] = id;
        item[ItemTableLabel] = this.label;
        this.items[this.ids.indexOf(id)] = item;
        this.index.set(id, item);
        this.database.save();
        const copy = lodash_1.default.cloneDeep(item);
        copy[ItemId] = id;
        copy[ItemTableLabel] = this.label;
        return copy;
    }
    mergeItemById(id, data) {
        if (this.index.has(id) === false) {
            throw Error('Invalid "Item", "id" not found in table');
        }
        const existing = this.index.get(id);
        const item = Object.assign({}, existing, lodash_1.default.cloneDeep(data));
        item[ItemId] = id;
        item[ItemTableLabel] = this.label;
        this.database.save();
        const copy = lodash_1.default.cloneDeep(item);
        copy[ItemId] = id;
        copy[ItemTableLabel] = this.label;
        return copy;
    }
    removeItem(item) {
        const id = item[ItemId];
        if (this.index.has(id) === false) {
            throw Error('Invalid "Item", "id" not found in table');
        }
        const index = this.ids.indexOf(id);
        this.ids.splice(index, 1);
        this.items.splice(index, 1);
        this.index.delete(id);
        this.database.save();
        delete item[ItemId];
        delete item[ItemTableLabel];
    }
    removeItemById(id) {
        if (this.index.has(id) === false) {
            throw Error('Invalid "Item", "id" not found in table');
        }
        const index = this.ids.indexOf(id);
        this.ids.splice(index, 1);
        this.items.splice(index, 1);
        this.index.delete(id);
        this.database.save();
    }
    getItemId(item) {
        const id = item[ItemId];
        if (this.index.has(id) === false) {
            throw Error('Invalid "Item", "id" not found in table');
        }
        return id;
    }
    getItemById(id) {
        if (this.index.has(id) === false) {
            throw Error('Invalid "Item", "id" not found in table');
        }
        const item = this.index.get(id);
        const copy = lodash_1.default.cloneDeep(item);
        copy[ItemId] = id;
        copy[ItemTableLabel] = this.label;
        return copy;
    }
    createQuery() {
        return new Query(this);
    }
}
class Database {
    constructor(filename, directory) {
        this.filename = filename;
        this.directory = directory;
        this.main = directory.concat('/', filename, '.rrdb');
        this.temp = directory.concat('/', filename, '.rrdb.temp');
        this.old = directory.concat('/', filename, '.rrdb.old');
        this.index = new Map();
        if (fs_1.existsSync(this.main)) {
            this.load();
        }
        else {
            this.save();
        }
    }
    load() {
        this.index.clear();
        const dbDataString = fs_1.readFileSync(this.main, 'utf8');
        const data = JSON.parse(dbDataString);
        for (let i = 0, l = data.length; i < l; i += 1) {
            const [label, ids, items] = data[i];
            const table = new Table(label, this);
            this.index.set(label, table);
            for (let a = 0, b = items.length; a < b; a += 1) {
                table.insertItem(ids[a], items[a]);
            }
        }
    }
    save() {
        const tables = Array.from(this.index.entries());
        const data = new Array(tables.length);
        for (let i = 0, l = tables.length; i < l; i += 1) {
            const [label, table] = tables[i];
            const ids = table.ids;
            const items = table.items;
            data[i] = [label, ids, items];
        }
        const dataString = JSON.stringify(data, null, 2);
        if (fs_1.existsSync(this.directory) === false) {
            fs_1.mkdirSync(this.directory, { recursive: true });
        }
        fs_1.writeFileSync(this.temp, dataString, 'utf8');
        if (fs_1.existsSync(this.main) === true) {
            fs_1.renameSync(this.main, this.old);
        }
        fs_1.renameSync(this.temp, this.main);
    }
    useTable(label) {
        if (this.index.has(label)) {
            return this.index.get(label);
        }
        const table = new Table(label, this);
        this.index.set(label, table);
        return table;
    }
}
exports.Database = Database;
