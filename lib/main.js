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
const open = util_1.promisify(fs_1.default.open);
const close = util_1.promisify(fs_1.default.close);
const ftruncate = util_1.promisify(fs_1.default.ftruncate);
const write = util_1.promisify(fs_1.default.write);
const read = util_1.promisify(fs_1.default.read);
const fstat = util_1.promisify(fs_1.default.fstat);
const exists = util_1.promisify(fs_1.default.exists);
const mkdir = util_1.promisify(fs_1.default.mkdir);
const cloneDeep_1 = __importDefault(require("lodash/cloneDeep"));
const isPlainObject_1 = __importDefault(require("lodash/isPlainObject"));
const v4_1 = __importDefault(require("uuid/v4"));
const ms_1 = __importDefault(require("ms"));
const tinydate_1 = __importDefault(require("tinydate"));
const dateToString = tinydate_1.default('{DD}-{MM}-{YY}-{HH}-{mm}-{ss}');
const compareString = (a, b, descend) => (descend ? b.localeCompare(a) : a.localeCompare(b));
const compareNumber = (a, b, descend) => (descend ? b - a : a - b);
class Query {
    constructor(table) {
        this.resultIds = [];
        this.resultItems = [];
        this.slicedItems = Array.from(table.index.values());
        this.queryOffset = 0;
        this.queryLimit = this.slicedItems.length;
        this.sorts = [];
        this.selectedFields = [];
        this.hiddenFields = [];
        this.finalized = false;
    }
    offset(value) {
        if (this.finalized)
            throw Error('offset : Query must not be finalized yet');
        this.queryOffset = value;
        return this;
    }
    limit(value) {
        if (this.finalized)
            throw Error('limit : Query must not be finalized yet');
        this.queryLimit = value;
        return this;
    }
    ascend(field) {
        if (this.finalized)
            throw Error('ascend : Query must not be finalized yet');
        this.sorts.push([field, false]);
        return this;
    }
    descend(field) {
        if (this.finalized)
            throw Error('descend : Query must not be finalized yet');
        this.sorts.push([field, true]);
        return this;
    }
    sortBy(sortFn) {
        if (this.finalized)
            throw Error('sortBy : Query must not be finalized yet');
        this.sorts.push([sortFn]);
        return this;
    }
    gt(field, value) {
        if (this.finalized)
            throw Error('gt : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] > value);
        return this;
    }
    gte(field, value) {
        if (this.finalized)
            throw Error('gte : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] >= value);
        return this;
    }
    lt(field, value) {
        if (this.finalized)
            throw Error('lt : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] < value);
        return this;
    }
    lte(field, value) {
        if (this.finalized)
            throw Error('lte : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] <= value);
        return this;
    }
    eq(field, value) {
        if (this.finalized)
            throw Error('eq : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => item[field] === value);
        return this;
    }
    neq(field, value) {
        if (this.finalized)
            throw Error('neq : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => item[field] !== value);
        return this;
    }
    has(field, value) {
        if (this.finalized)
            throw Error('has : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && item[field].includes(value));
        return this;
    }
    hasAnyOf(field, values) {
        if (this.finalized)
            throw Error('hasAnyOf : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.some(value => item[field].includes(value)));
        return this;
    }
    hasAllOf(field, values) {
        if (this.finalized)
            throw Error('hasAllOf : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.every(value => item[field].includes(value)));
        return this;
    }
    hasNoneOfAny(field, values) {
        if (this.finalized)
            throw Error('hasNoneOfAny : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.some(value => item[field].includes(value) === false));
        return this;
    }
    hasNoneOfAll(field, values) {
        if (this.finalized)
            throw Error('hasNoneOfAll : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.every(value => item[field].includes(value) === false));
        return this;
    }
    select(fields) {
        if (this.finalized)
            throw Error('select : Query must not be finalized yet');
        this.selectedFields = fields.slice();
        return this;
    }
    hide(fields) {
        if (this.finalized)
            throw Error('hide : Query must not be finalized yet');
        this.hiddenFields = fields.slice();
        return this;
    }
    filterBy(filterFn) {
        if (this.finalized)
            throw Error('filterBy : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => filterFn(item));
        return this;
    }
    finalize() {
        if (this.sorts.length > 0) {
            this.slicedItems.sort((a, b) => {
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
        this.slicedItems = this.slicedItems.slice(this.queryOffset, this.queryOffset + this.queryLimit);
        const resultIds = new Array(this.slicedItems.length);
        const resultItems = new Array(this.slicedItems.length);
        for (let i = 0, l = this.slicedItems.length; i < l; i += 1) {
            const item = cloneDeep_1.default(this.slicedItems[i]);
            resultIds[i] = item.id;
            const itemFields = Object.keys(item);
            if (this.selectedFields.length > 1) {
                for (let a = 0, b = itemFields.length; a < b; a += 1) {
                    const currentField = itemFields[a];
                    if (this.selectedFields.includes(currentField) === false) {
                        delete item[currentField];
                    }
                }
            }
            for (let a = 0, b = this.hiddenFields.length; a < b; a += 1) {
                const currentHiddenField = this.hiddenFields[a];
                delete item[currentHiddenField];
            }
            resultItems[i] = item;
        }
        this.resultIds = resultIds;
        this.resultItems = resultItems;
        this.finalized = true;
    }
    ids() {
        if (this.finalized === false)
            this.finalize();
        return this.resultIds;
    }
    items() {
        if (this.finalized === false)
            this.finalize();
        return this.resultItems;
    }
    firstId() {
        if (this.finalized === false)
            this.finalize();
        return this.resultIds[0];
    }
    firstitem() {
        if (this.finalized === false)
            this.finalize();
        return this.resultItems[0];
    }
    entries() {
        if (this.finalized === false)
            this.finalize();
        return this.resultItems.map((item) => [item.id, item]);
    }
    results() {
        if (this.finalized === false)
            this.finalize();
        return [this.resultIds, this.resultItems];
    }
}
exports.Query = Query;
class Table {
    constructor(label, database, mustExist) {
        if (database.initialized === false && database.initializing === false) {
            throw Error('Cannot create table on non-initialized database.');
        }
        this.label = label;
        this.database = database;
        this.index = new Map();
        if (database.index.has(label)) {
            return database.index.get(label);
        }
        else if (mustExist === true) {
            throw Error(`constructor : Table "${label}" with "mustExist=true" not found!`);
        }
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
            if (isPlainObject_1.default(data) === false) {
                throw Error('insertItem : Invalid "data", "data" must be a plain object');
            }
            if (this.index.has(id)) {
                throw Error('insertItem : Invalid "id", must not exist in table');
            }
            const item = Object.assign({ id }, cloneDeep_1.default(data));
            this.index.set(id, item);
            yield this.database.save();
            const copy = cloneDeep_1.default(item);
            return copy;
        });
    }
    updateItem(modified) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isPlainObject_1.default(modified) === false) {
                throw Error('updateItem : Invalid "modified", "modified" must be a plain object');
            }
            if (modified.id === undefined) {
                throw Error('updateItem : Invalid "item", "id" must not be "undefined"');
            }
            if (this.index.has(modified.id) === false) {
                throw Error('updateItem : Invalid "item", item "id" must exist in table');
            }
            const item = cloneDeep_1.default(modified);
            this.index.set(item.id, item);
            yield this.database.save();
        });
    }
    updateItemById(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isPlainObject_1.default(data) === false) {
                throw Error('updateItemById : Invalid "data", "data" must be a plain object');
            }
            if (data.id !== undefined) {
                throw Error('updateItemById : Invalid "data", "id" must be "undefined"');
            }
            if (this.index.has(id) === false) {
                throw Error('updateItemById : Invalid "id", must exist in table');
            }
            const item = Object.assign({ id }, cloneDeep_1.default(data));
            this.index.set(id, item);
            yield this.database.save();
            const copy = cloneDeep_1.default(item);
            return copy;
        });
    }
    mergeItemById(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isPlainObject_1.default(data) === false) {
                throw Error('mergeItemById : Invalid "data", "data" must be a plain object');
            }
            if (data.id !== undefined) {
                throw Error('mergeItemById : Invalid "data", "id" must be "undefined"');
            }
            if (this.index.has(id) === false) {
                throw Error('mergeItemById : Invalid "item", "id" must exist in table');
            }
            const existing = this.index.get(id);
            const item = Object.assign({ id }, existing, cloneDeep_1.default(data));
            yield this.database.save();
            const copy = cloneDeep_1.default(item);
            return copy;
        });
    }
    removeItem(item) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isPlainObject_1.default(item) === false) {
                throw Error('removeItem : Invalid "item", "item" must be a plain object');
            }
            if (item.id === undefined) {
                throw Error('removeItem : Invalid "item", "id" must not be "undefined"');
            }
            if (this.index.has(item.id) === false) {
                throw Error('removeItem : Invalid "item", "id" must exist in table');
            }
            this.index.delete(item.id);
            yield this.database.save();
        });
    }
    removeItemById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (id === undefined) {
                throw Error('removeItemById : Invalid "id", "id" must not be "undefined"');
            }
            if (this.index.has(id) === false) {
                throw Error('removeItemById : Invalid "id", "id" must exist in table');
            }
            this.index.delete(id);
            yield this.database.save();
        });
    }
    fetchItem(id) {
        if (id === undefined) {
            throw Error('fetchItem : Invalid "id", "id" must not be "undefined"');
        }
        if (this.index.has(id) === false) {
            throw Error('fetchItem : Invalid "item", "id" must exist in table');
        }
        const item = this.index.get(id);
        const copy = cloneDeep_1.default(item);
        return copy;
    }
    clearTable() {
        return __awaiter(this, void 0, void 0, function* () {
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
    constructor(filename, directory, saveAsFormatted, snapshotInterval) {
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
        this.initializing = false;
        this.initialized = false;
        this.saveAsFormatted = saveAsFormatted === undefined ? false : saveAsFormatted;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initialized === false) {
                if (this.internalInitializePromise !== undefined) {
                    return this.internalInitializePromise;
                }
                this.internalInitializePromise = (() => __awaiter(this, void 0, void 0, function* () {
                    yield this.internalLoad();
                    this.initialized = true;
                }))();
                yield this.internalInitializePromise;
                this.internalInitializePromise = undefined;
            }
        });
    }
    internalLoad() {
        return __awaiter(this, void 0, void 0, function* () {
            this.index.clear();
            let dbDataString = '';
            if (yield exists(this.directory)) {
                if (yield exists(this.main)) {
                    this.mainFd = yield open(this.main, 'r');
                    const mainStat = yield fstat(this.mainFd);
                    if (mainStat.size > 0) {
                        console.log(`internalLoad : Loading from ${this.main}`);
                        const mainContent = Buffer.alloc(mainStat.size);
                        yield read(this.mainFd, mainContent, 0, mainStat.size, 0);
                        dbDataString = mainContent.toString();
                    }
                    else {
                        console.log(`internalLoad : ${this.main} empty, possibly corrupted.`);
                    }
                    yield close(this.mainFd);
                }
                else {
                    console.log(`internalLoad : ${this.main} not found.`);
                    if (yield exists(this.temp)) {
                        this.tempFd = yield open(this.temp, 'r');
                        const tempStat = yield fstat(this.tempFd);
                        if (tempStat.size > 0) {
                            console.log(`internalLoad : Loading from ${this.temp}`);
                            const tempContent = Buffer.alloc(tempStat.size);
                            yield read(this.tempFd, tempContent, 0, tempStat.size, 0);
                            dbDataString = tempContent.toString();
                        }
                        else {
                            console.log(`internalLoad : ${this.temp} empty, possibly corrupted.`);
                        }
                        yield close(this.tempFd);
                    }
                    else {
                        console.log(`internalLoad : ${this.temp} not found.`);
                        if (yield exists(this.old)) {
                            this.oldFd = yield open(this.old, 'r');
                            const oldStat = yield fstat(this.oldFd);
                            if (oldStat.size > 0) {
                                console.log(`internalLoad : Loading from ${this.old}`);
                                const tempContent = Buffer.alloc(oldStat.size);
                                yield read(this.oldFd, tempContent, 0, oldStat.size, 0);
                                dbDataString = tempContent.toString();
                            }
                            else {
                                console.log(`internalLoad : ${this.old} empty, possibly corrupted.`);
                            }
                            yield close(this.oldFd);
                        }
                        else {
                            console.log(`internalLoad : ${this.old} not found.`);
                        }
                    }
                }
            }
            if (dbDataString !== '') {
                console.log(`internalLoad : database file loaded, populating tables.`);
                const data = JSON.parse(dbDataString);
                this.initializing = true;
                for (let i = 0, l = data.length; i < l; i += 1) {
                    const [label, items] = data[i];
                    const table = new Table(label, this);
                    for (let a = 0, b = items.length; a < b; a += 1) {
                        table.index.set(items[a].id, items[a]);
                    }
                }
                this.initializing = false;
                console.log(`internalLoad : tables populated.`);
            }
            else {
                console.log(`internalLoad : database file not loaded, saving empty db.`);
                yield this.internalSave();
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
                    const items = Array.from(table.index.values());
                    data[i] = [label, items];
                }
                const dataString = this.saveAsFormatted ? JSON.stringify(data, null, 2) : JSON.stringify(data);
                yield ftruncate(this.tempFd);
                yield write(this.tempFd, dataString, 0, 'utf8');
                const oldStat = yield fstat(this.oldFd);
                if (oldStat.size > 0) {
                    const modified = oldStat.mtime;
                    const current = new Date();
                    if (current.valueOf() - modified.valueOf() >= this.snapshotInterval
                        && current.valueOf() - this.lastSnapshotTimestamp >= this.snapshotInterval) {
                        const snapshot = ''.concat(this.directory, '/', this.filename, '_', dateToString(current), '.rrdb.old');
                        const oldContent = Buffer.alloc(oldStat.size);
                        yield read(this.oldFd, oldContent, 0, oldStat.size, 0);
                        yield writeFile(snapshot, oldContent, 'utf8');
                        this.lastSnapshotTimestamp = current.valueOf();
                    }
                }
                const mainStat = yield fstat(this.mainFd);
                if (mainStat.size > 0) {
                    const mainContent = Buffer.alloc(mainStat.size);
                    yield read(this.mainFd, mainContent, 0, mainStat.size, 0);
                    yield ftruncate(this.oldFd);
                    yield write(this.oldFd, mainContent, 0, mainStat.size, 0);
                }
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
    internalSave() {
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
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initialized === false) {
                throw Error('Cannot call "save" on non-initialized database.');
            }
            yield this.internalSave();
        });
    }
    useTable(label, mustExist) {
        const table = new Table(label, this, mustExist);
        return table;
    }
}
exports.Database = Database;
