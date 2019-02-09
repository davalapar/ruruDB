"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const writeFile = util_1.promisify(fs_1.default.writeFile);
const readFile = util_1.promisify(fs_1.default.readFile);
const open = util_1.promisify(fs_1.default.open);
const ftruncate = util_1.promisify(fs_1.default.ftruncate);
const write = util_1.promisify(fs_1.default.write);
const read = util_1.promisify(fs_1.default.read);
const fstat = util_1.promisify(fs_1.default.fstat);
const exists = util_1.promisify(fs_1.default.exists);
const mkdir = util_1.promisify(fs_1.default.mkdir);
const cloneDeep_1 = __importDefault(require("lodash/cloneDeep"));
const v4_1 = __importDefault(require("uuid/v4"));
const ms_1 = __importDefault(require("ms"));
const moment_1 = __importDefault(require("moment"));
const Tracker = Symbol('Item.Id');
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
    sortBy(sortFn) {
        this.sorts.push(sortFn);
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
        this.items = this.items.filter(item => Array.isArray(item[field]) && values.some(value => (item[field]).includes(value)));
        return this;
    }
    hasAllOf(field, values) {
        this.items = this.items.filter(item => Array.isArray(item[field]) && values.every(value => (item[field]).includes(value)));
        return this;
    }
    hasNoneOfAny(field, values) {
        this.items = this.items.filter(item => Array.isArray(item[field]) && values.some(value => (item[field]).includes(value) === false));
        return this;
    }
    hasNoneOfAll(field, values) {
        this.items = this.items.filter(item => Array.isArray(item[field]) && values.every(value => (item[field]).includes(value) === false));
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
    filterBy(filterFn) {
        this.items = this.items.filter(item => filterFn(item, item[Tracker]));
        return this;
    }
    results() {
        if (this.sorts.length > 0) {
            this.items.sort((a, b) => {
                for (let i = 0, l = this.sorts.length; i < l; i += 1) {
                    const sort = this.sorts[i];
                    if (typeof sort[0] === 'function') {
                        const [sortFn] = sort;
                        return sortFn(a, b);
                    }
                    else {
                        const [field, fieldDescend] = sort;
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
                }
                return 0;
            });
        }
        this.items = this.items.slice(this.queryOffset, this.queryOffset + this.queryLimit);
        const results = new Array(this.items.length);
        for (let i = 0, l = this.items.length; i < l; i += 1) {
            results[i] = cloneDeep_1.default(this.items[i]);
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
            item[Tracker] = this.items[i][Tracker];
        }
        return results;
    }
}
exports.Query = Query;
class Transaction {
    constructor(database) {
        this.database = database;
        this.items = [];
        this.removed = [];
    }
    fetchItem(table, id) {
        if (table.index.has(id) === false) {
            throw Error('Transaction @ createItem : Invalid "id", not found in table');
        }
        const item = table.index.get(id);
        const copy = cloneDeep_1.default(item);
        copy[Tracker] = [id, table.label];
        this.items.push(copy);
        return copy;
    }
    createItem(table, id, item) {
        if (table.index.has(id)) {
            throw Error('Transaction @ createItem : Invalid "id", already exists in table');
        }
        const copy = cloneDeep_1.default(item);
        copy[Tracker] = [id, table.label];
        this.items.push(copy);
        return copy;
    }
    removeItem(item) {
        if (this.items.includes(item) === false) {
            throw Error('Transaction @ removeItem : Invalid "item", not involved in Transaction');
        }
        this.items.splice(this.items.indexOf(item), 1);
        const [id, tableLabel] = item[Tracker];
        if (this.removed.some(entry => entry[1] === id)) {
            throw Error('Transaction @ removeItem : Invalid "id", item already marked as removed');
        }
        this.removed.push([tableLabel, id]);
    }
    removeItemById(table, id) {
        if (table.index.has(id) === false) {
            throw Error('Transaction @ removeItemById : Invalid "id", not found in table');
        }
        if (this.removed.some(entry => entry[1] === id)) {
            throw Error('Transaction @ removeItemById : Invalid "id", item already marked as removed');
        }
        this.removed.push([table.label, id]);
    }
    commit() {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0, l = this.items.length; i < l; i += 1) {
                const item = this.items[i];
                const [id, tableLabel] = item[Tracker];
                const table = this.database.index.get(tableLabel);
                if (table === undefined) {
                    throw Error('Transaction @ commit : Table not found in Database index');
                }
                const entry = cloneDeep_1.default(item);
                entry[Tracker] = id;
                const index = table.ids.indexOf(id);
                if (index >= 0) {
                    table.items[index] = entry;
                }
                else {
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
                if (table.index.has(id)) {
                    const index = table.ids.indexOf(id);
                    table.ids.splice(index, 1);
                    table.items.splice(index, 1);
                    table.index.delete(id);
                }
            }
            yield this.database.save();
        });
    }
}
exports.Transaction = Transaction;
class Table {
    constructor(label, database) {
        this.label = label;
        this.database = database;
        this.ids = [];
        this.items = [];
        this.index = new Map();
        database.index.set(label, this);
    }
    randomItemId() {
        let id = v4_1.default();
        while (this.index.has(id)) {
            id = v4_1.default();
        }
        return id;
    }
    insertItem(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.index.has(id)) {
                throw Error('Invalid "Item", "id" already exists in table');
            }
            const item = cloneDeep_1.default(data);
            item[Tracker] = id;
            this.ids.push(id);
            this.items.push(item);
            this.index.set(id, item);
            yield this.database.save();
            const copy = cloneDeep_1.default(item);
            copy[Tracker] = id;
            return copy;
        });
    }
    updateItem(modified) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = modified[Tracker];
            if (this.index.has(id) === false) {
                throw Error('Invalid "Item", "id" not found in table');
            }
            const item = cloneDeep_1.default(modified);
            item[Tracker] = id;
            this.items[this.ids.indexOf(id)] = item;
            this.index.set(id, item);
            yield this.database.save();
        });
    }
    updateItemById(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.index.has(id) === false) {
                throw Error('Invalid "Item", "id" not found in table');
            }
            const item = cloneDeep_1.default(data);
            item[Tracker] = id;
            this.items[this.ids.indexOf(id)] = item;
            this.index.set(id, item);
            yield this.database.save();
            const copy = cloneDeep_1.default(item);
            copy[Tracker] = id;
            return copy;
        });
    }
    mergeItemById(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.index.has(id) === false) {
                throw Error('Invalid "Item", "id" not found in table');
            }
            const existing = this.index.get(id);
            const item = Object.assign({}, existing, cloneDeep_1.default(data));
            item[Tracker] = id;
            yield this.database.save();
            const copy = cloneDeep_1.default(item);
            copy[Tracker] = id;
            return copy;
        });
    }
    removeItem(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = item[Tracker];
            if (this.index.has(id) === false) {
                throw Error('Invalid "Item", "id" not found in table');
            }
            const index = this.ids.indexOf(id);
            this.ids.splice(index, 1);
            this.items.splice(index, 1);
            this.index.delete(id);
            yield this.database.save();
            delete item[Tracker];
        });
    }
    removeItemById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.index.has(id) === false) {
                throw Error('Invalid "Item", "id" not found in table');
            }
            const index = this.ids.indexOf(id);
            this.ids.splice(index, 1);
            this.items.splice(index, 1);
            this.index.delete(id);
            yield this.database.save();
        });
    }
    getItemId(item) {
        const id = item[Tracker];
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
        const copy = cloneDeep_1.default(item);
        copy[Tracker] = id;
        return copy;
    }
    clearTable() {
        return __awaiter(this, void 0, void 0, function* () {
            this.ids = [];
            this.items = [];
            this.index.clear();
            yield this.database.save();
        });
    }
    removeTable() {
        return __awaiter(this, void 0, void 0, function* () {
            this.database.index.delete(this.label);
            yield this.database.save();
        });
    }
    createQuery() {
        return new Query(this);
    }
}
exports.Table = Table;
class Database {
    constructor(filename, directory, snapshotInterval) {
        this.saving = false;
        this.queue = [];
        this.filename = filename;
        this.directory = directory;
        this.main = directory.concat('/', filename, '.rrdb');
        this.temp = directory.concat('/', filename, '.rrdb.temp');
        this.old = directory.concat('/', filename, '.rrdb.old');
        this.index = new Map();
        this.snapshotInterval = snapshotInterval ? ms_1.default(snapshotInterval) : Infinity;
        this.lastSnapshotTimestamp = -Infinity;
        this.saving = false;
        this.queue = [];
        this.save = this.save.bind(this);
        this.internalBeforeSave = this.internalBeforeSave.bind(this);
        this.internalSaveLoop = this.internalSaveLoop.bind(this);
        this.mainFd = 0;
        this.tempFd = 0;
        this.oldFd = 0;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield exists(this.main)) {
                yield this.load();
            }
            else {
                yield this.save();
            }
        });
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            this.index.clear();
            const dbDataString = yield readFile(this.main, 'utf8');
            const data = JSON.parse(dbDataString);
            for (let i = 0, l = data.length; i < l; i += 1) {
                const [label, ids, items] = data[i];
                const table = new Table(label, this);
                for (let a = 0, b = items.length; a < b; a += 1) {
                    yield table.insertItem(ids[a], items[a]);
                }
            }
        });
    }
    internalBeforeSave() {
        return __awaiter(this, void 0, void 0, function* () {
            if ((yield exists(this.directory)) === false) {
                yield mkdir(this.directory, { recursive: true });
            }
            if ((yield exists(this.main)) === false) {
                yield writeFile(this.main, '', 'utf8');
            }
            if ((yield exists(this.temp)) === false) {
                yield writeFile(this.temp, '', 'utf8');
            }
            if ((yield exists(this.old)) === false) {
                yield writeFile(this.old, '', 'utf8');
            }
            this.mainFd = yield open(this.main, 'r+');
            this.tempFd = yield open(this.temp, 'r+');
            this.oldFd = yield open(this.old, 'r+');
            process.nextTick(this.internalSaveLoop);
        });
    }
    internalSaveLoop() {
        return __awaiter(this, void 0, void 0, function* () {
            const fetched = this.queue;
            this.queue = [];
            let error = undefined;
            ;
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
                yield ftruncate(this.tempFd);
                yield write(this.tempFd, dataString, 0, 'utf8');
                const oldStat = yield fstat(this.oldFd);
                if (oldStat.size > 0) {
                    const modified = oldStat.mtime;
                    const current = new Date();
                    if (current.valueOf() - modified.valueOf() >= this.snapshotInterval
                        && current.valueOf() - this.lastSnapshotTimestamp >= this.snapshotInterval) {
                        const snapshot = ''.concat(this.directory, '/', this.filename, '_', moment_1.default(current).format('DDMMMY_hh_mm_ss_A_x'), '.rrdb.old');
                        const oldContent = Buffer.alloc(oldStat.size);
                        yield read(this.mainFd, oldContent, 0, oldStat.size, 0);
                        yield writeFile(snapshot, oldContent, 'utf8');
                        this.lastSnapshotTimestamp = current.valueOf();
                    }
                }
                const mainStat = yield fstat(this.mainFd);
                const mainContent = Buffer.alloc(mainStat.size);
                yield read(this.mainFd, mainContent, 0, mainStat.size, 0);
                yield ftruncate(this.oldFd);
                yield write(this.oldFd, mainContent, 0, mainStat.size, 0);
                yield ftruncate(this.mainFd);
                yield write(this.mainFd, dataString, 0, 'utf8');
            }
            catch (e) {
                error = e;
            }
            if (this.queue.length > 0) {
                process.nextTick(this.internalSaveLoop);
            }
            else {
                this.saving = false;
                fs_1.default.closeSync(this.mainFd);
                fs_1.default.closeSync(this.tempFd);
                fs_1.default.closeSync(this.oldFd);
            }
            if (error !== undefined) {
                for (let i = 0, l = fetched.length; i < l; i += 1) {
                    const [, reject] = fetched[i];
                    reject(error);
                }
            }
            else {
                for (let i = 0, l = fetched.length; i < l; i += 1) {
                    const [resolve] = fetched[i];
                    resolve();
                }
            }
        });
    }
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.queue.push([resolve, reject]);
                if (this.saving === false) {
                    this.saving = true;
                    process.nextTick(this.internalBeforeSave);
                }
            });
        });
    }
    useTable(label) {
        if (this.index.has(label)) {
            return this.index.get(label);
        }
        const table = new Table(label, this);
        return table;
    }
}
exports.Database = Database;
