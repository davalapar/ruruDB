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
const what_the_pack_1 = __importDefault(require("what-the-pack"));
const dateToString = tinydate_1.default('{DD}-{MM}-{YY}-{HH}-{mm}-{ss}');
const compareString = (a, b, descend) => (descend ? b.localeCompare(a) : a.localeCompare(b));
const compareNumber = (a, b, descend) => (descend ? b - a : a - b);
class Query {
    constructor(table) {
        if (typeof table !== 'object') {
            throw Error('@constructor : Expecting "table" to be typeof "object"');
        }
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
            throw Error('@offset : Query must not be finalized yet');
        this.queryOffset = value;
        return this;
    }
    limit(value) {
        if (this.finalized)
            throw Error('@limit : Query must not be finalized yet');
        this.queryLimit = value;
        return this;
    }
    ascend(field) {
        if (this.finalized)
            throw Error('@ascend : Query must not be finalized yet');
        this.sorts.push([field, false]);
        return this;
    }
    descend(field) {
        if (this.finalized)
            throw Error('@descend : Query must not be finalized yet');
        this.sorts.push([field, true]);
        return this;
    }
    sortBy(sortFn) {
        if (this.finalized)
            throw Error('@sortBy : Query must not be finalized yet');
        this.sorts.push([sortFn]);
        return this;
    }
    gt(field, value) {
        if (this.finalized)
            throw Error('@gt : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] > value);
        return this;
    }
    gte(field, value) {
        if (this.finalized)
            throw Error('@gte : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] >= value);
        return this;
    }
    lt(field, value) {
        if (this.finalized)
            throw Error('@lt : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] < value);
        return this;
    }
    lte(field, value) {
        if (this.finalized)
            throw Error('@lte : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] <= value);
        return this;
    }
    eq(field, value) {
        if (this.finalized)
            throw Error('@eq : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => item[field] === value);
        return this;
    }
    neq(field, value) {
        if (this.finalized)
            throw Error('@neq : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => item[field] !== value);
        return this;
    }
    has(field, value) {
        if (this.finalized)
            throw Error('@has : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && item[field].includes(value));
        return this;
    }
    hasAnyOf(field, values) {
        if (this.finalized)
            throw Error('@hasAnyOf : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.some(value => item[field].includes(value)));
        return this;
    }
    hasAllOf(field, values) {
        if (this.finalized)
            throw Error('@hasAllOf : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.every(value => item[field].includes(value)));
        return this;
    }
    hasNoneOfAny(field, values) {
        if (this.finalized)
            throw Error('@hasNoneOfAny : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.some(value => item[field].includes(value) === false));
        return this;
    }
    hasNoneOfAll(field, values) {
        if (this.finalized)
            throw Error('@hasNoneOfAll : Query must not be finalized yet');
        this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.every(value => item[field].includes(value) === false));
        return this;
    }
    select(...fields) {
        if (this.finalized)
            throw Error('@select : Query must not be finalized yet');
        this.selectedFields = fields.slice();
        return this;
    }
    hide(...fields) {
        if (this.finalized)
            throw Error('@hide : Query must not be finalized yet');
        this.hiddenFields = fields.slice();
        return this;
    }
    filterBy(filterFn) {
        if (this.finalized)
            throw Error('@filterBy : Query must not be finalized yet');
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
                        else if (typeof a[field] !== 'string' && typeof a[field] !== 'number') {
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
            if (this.selectedFields.length > 0) {
                const itemFields = Object.keys(item);
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
    firstItem() {
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
    constructor(label, database) {
        if (database.initialized === false && database.initializing === false) {
            throw Error('@constructor : Cannot create table on non-initialized database.');
        }
        this.label = label;
        this.database = database;
        this.index = new Map();
        if (database.tables.has(label)) {
            return database.tables.get(label);
        }
        database.tables.set(label, this);
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
                throw Error('@insertItem : Invalid "data", "data" must be a plain object');
            }
            if (this.index.has(id)) {
                throw Error('@insertItem : Invalid "id", must not exist in table');
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
                throw Error('@updateItem : Invalid "modified", "modified" must be a plain object');
            }
            if (modified.id === undefined) {
                throw Error('@updateItem : Invalid "item", "id" must not be "undefined"');
            }
            if (this.index.has(modified.id) === false) {
                throw Error('@updateItem : Invalid "item", item "id" must exist in table');
            }
            const item = cloneDeep_1.default(modified);
            this.index.set(item.id, item);
            yield this.database.save();
        });
    }
    updateItemById(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isPlainObject_1.default(data) === false) {
                throw Error('@updateItemById : Invalid "data", "data" must be a plain object');
            }
            if (data.id !== undefined) {
                throw Error('@updateItemById : Invalid "data", "id" must be "undefined"');
            }
            if (this.index.has(id) === false) {
                throw Error('@updateItemById : Invalid "id", must exist in table');
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
                throw Error('@mergeItemById : Invalid "data", "data" must be a plain object');
            }
            if (data.id !== undefined) {
                throw Error('@mergeItemById : Invalid "data", "id" must be "undefined"');
            }
            if (this.index.has(id) === false) {
                throw Error('@mergeItemById : Invalid "item", "id" must exist in table');
            }
            const existing = this.index.get(id);
            const item = Object.assign({ id }, existing, cloneDeep_1.default(data));
            this.index.set(id, item);
            yield this.database.save();
            const copy = cloneDeep_1.default(item);
            return copy;
        });
    }
    removeItem(item) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isPlainObject_1.default(item) === false) {
                throw Error('@removeItem : Invalid "item", "item" must be a plain object');
            }
            if (item.id === undefined) {
                throw Error('@removeItem : Invalid "item", "id" must not be "undefined"');
            }
            if (this.index.has(item.id) === false) {
                throw Error('@removeItem : Invalid "item", "id" must exist in table');
            }
            this.index.delete(item.id);
            yield this.database.save();
        });
    }
    removeItemById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (id === undefined) {
                throw Error('@removeItemById : Invalid "id", "id" must not be "undefined"');
            }
            if (this.index.has(id) === false) {
                throw Error('@removeItemById : Invalid "id", "id" must exist in table');
            }
            this.index.delete(id);
            yield this.database.save();
        });
    }
    fetchItem(id) {
        if (id === undefined) {
            throw Error('@fetchItem : Invalid "id", "id" must not be "undefined"');
        }
        if (this.index.has(id) === false) {
            throw Error('@fetchItem : Invalid "item", "id" must exist in table');
        }
        const item = this.index.get(id);
        const copy = cloneDeep_1.default(item);
        return copy;
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            this.index.clear();
            yield this.database.save();
        });
    }
    destroy() {
        return __awaiter(this, void 0, void 0, function* () {
            this.database.tables.delete(this.label);
            yield this.database.save();
        });
    }
    query() {
        return new Query(this);
    }
}
exports.Table = Table;
class KVTable {
    constructor(label, database) {
        if (database.initialized === false && database.initializing === false) {
            throw Error('@Cannot create KVTable on non-initialized database.');
        }
        this.label = label;
        this.database = database;
        this.index = new Map();
        if (database.kvtables.has(label)) {
            return database.kvtables.get(label);
        }
        database.kvtables.set(label, this);
    }
    set(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            if (key === undefined) {
                throw Error('@set : Invalid "key", "key" must not be "undefined"');
            }
            if (typeof key !== 'string') {
                throw Error('@set : Invalid "key", "key" must be typeof "string"');
            }
            this.index.set(key, value);
            yield this.database.save();
        });
    }
    has(key) {
        if (key === undefined) {
            throw Error('@set : Invalid "key", "key" must not be "undefined"');
        }
        if (typeof key !== 'string') {
            throw Error('@set : Invalid "key", "key" must be typeof "string"');
        }
        return this.index.has(key);
    }
    get(key) {
        if (key === undefined) {
            throw Error('@get : Invalid "key", "key" must not be "undefined"');
        }
        if (typeof key !== 'string') {
            throw Error('@set : Invalid "key", "key" must be typeof "string"');
        }
        if (this.index.has(key) === false) {
            throw Error('@get : Invalid "key", "key" must exist in KVTable');
        }
        return this.index.get(key);
    }
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (key === undefined) {
                throw Error('@set : Invalid "key", "key" must not be "undefined"');
            }
            if (typeof key !== 'string') {
                throw Error('@set : Invalid "key", "key" must be typeof "string"');
            }
            this.index.delete(key);
            yield this.database.save();
        });
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            this.index.clear();
            yield this.database.save();
        });
    }
    destroy() {
        return __awaiter(this, void 0, void 0, function* () {
            this.database.kvtables.delete(this.label);
            yield this.database.save();
        });
    }
}
exports.KVTable = KVTable;
const rurudbVersion = 7;
class Database {
    constructor(options) {
        this.logFunction = options.logFunction;
        this.filename = options.filename;
        this.directory = options.directory;
        switch (options.saveFormat) {
            case "json": {
                this.main = options.directory.concat('/', options.filename, '-current.rrdb');
                this.temp = options.directory.concat('/', options.filename, '-temp.rrdb');
                this.recent = options.directory.concat('/', options.filename, '-recent.rrdb');
                this.snapshotExtension = '-snapshot.rrdb';
                break;
            }
            case "readable_json": {
                this.main = options.directory.concat('/', options.filename, '-current.rrdb');
                this.temp = options.directory.concat('/', options.filename, '-temp.rrdb');
                this.recent = options.directory.concat('/', options.filename, '-recent.rrdb');
                this.snapshotExtension = '-snapshot.rrdb';
                break;
            }
            case "msgpack": {
                this.main = options.directory.concat('/', options.filename, '-current.prrdb');
                this.temp = options.directory.concat('/', options.filename, '-temp.prrdb');
                this.recent = options.directory.concat('/', options.filename, '-recent.prrdb');
                this.snapshotExtension = '-snapshot.prrdb';
                if (options.msgpackBufferSize === undefined) {
                    throw Error('@constructor : options.msgpackBufferSize must be a "number"');
                }
                if (options.logFunction !== undefined) {
                    if (typeof options.logFunction !== 'function') {
                        throw Error('@constructor : options.logFunction must be a "function"');
                    }
                    const { encode: msgpackEncode, decode: msgpackDecode } = what_the_pack_1.default.initialize(options.msgpackBufferSize, options.logFunction);
                    this.msgpackEncode = msgpackEncode;
                    this.msgpackDecode = msgpackDecode;
                }
                else {
                    const { encode: msgpackEncode, decode: msgpackDecode } = what_the_pack_1.default.initialize(options.msgpackBufferSize);
                    this.msgpackEncode = msgpackEncode;
                    this.msgpackDecode = msgpackDecode;
                }
                break;
            }
            default: {
                throw Error('@constructor : options.saveFormat must be either "json", "readable_json" or "msgpack"');
            }
        }
        this.saveFormat = options.saveFormat;
        this.tables = new Map();
        this.kvtables = new Map();
        this.snapshotInterval = options.snapshotInterval ? ms_1.default(options.snapshotInterval) : Infinity;
        this.lastSnapshotTimestamp = -Infinity;
        this.saving = false;
        this.queue = [];
        this.save = this.save.bind(this);
        this.internalBeforeSave = this.internalBeforeSave.bind(this);
        this.internalSaveLoop = this.internalSaveLoop.bind(this);
        this.mainFd = 0;
        this.tempFd = 0;
        this.recentFd = 0;
        this.initialized = false;
        this.initializing = false;
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
            this.tables.clear();
            this.kvtables.clear();
            let dbDataString = Buffer.alloc(0);
            if (yield exists(this.directory)) {
                if (yield exists(this.main)) {
                    this.mainFd = yield open(this.main, 'r');
                    const mainStat = yield fstat(this.mainFd);
                    if (mainStat.size > 0) {
                        if (this.logFunction !== undefined)
                            this.logFunction(`@internalLoad : Loading from ${this.main}`);
                        const mainContent = Buffer.alloc(mainStat.size);
                        yield read(this.mainFd, mainContent, 0, mainStat.size, 0);
                        dbDataString = mainContent;
                    }
                    else {
                        if (this.logFunction !== undefined)
                            this.logFunction(`@internalLoad : ${this.main} empty, possibly corrupted.`);
                    }
                    yield close(this.mainFd);
                }
                else {
                    if (this.logFunction !== undefined)
                        this.logFunction(`@internalLoad : ${this.main} not found.`);
                    if (yield exists(this.temp)) {
                        this.tempFd = yield open(this.temp, 'r');
                        const tempStat = yield fstat(this.tempFd);
                        if (tempStat.size > 0) {
                            if (this.logFunction !== undefined)
                                this.logFunction(`@internalLoad : Loading from ${this.temp}`);
                            const tempContent = Buffer.alloc(tempStat.size);
                            yield read(this.tempFd, tempContent, 0, tempStat.size, 0);
                            dbDataString = tempContent;
                        }
                        else {
                            if (this.logFunction !== undefined)
                                this.logFunction(`@internalLoad : ${this.temp} empty, possibly corrupted.`);
                        }
                        yield close(this.tempFd);
                    }
                    else {
                        if (this.logFunction !== undefined)
                            this.logFunction(`@internalLoad : ${this.temp} not found.`);
                        if (yield exists(this.recent)) {
                            this.recentFd = yield open(this.recent, 'r');
                            const recentStat = yield fstat(this.recentFd);
                            if (recentStat.size > 0) {
                                if (this.logFunction !== undefined)
                                    this.logFunction(`@internalLoad : Loading from ${this.recent}`);
                                const tempContent = Buffer.alloc(recentStat.size);
                                yield read(this.recentFd, tempContent, 0, recentStat.size, 0);
                                dbDataString = tempContent;
                            }
                            else {
                                if (this.logFunction !== undefined)
                                    this.logFunction(`@internalLoad : ${this.recent} empty, possibly corrupted.`);
                            }
                            yield close(this.recentFd);
                        }
                        else {
                            if (this.logFunction !== undefined)
                                this.logFunction(`@internalLoad : ${this.recent} not found.`);
                        }
                    }
                }
            }
            if (dbDataString.byteLength !== 0) {
                let data;
                if (this.saveFormat === "json" || this.saveFormat === "readable_json") {
                    data = JSON.parse(dbDataString.toString());
                }
                else {
                    data = this.msgpackDecode(dbDataString);
                }
                if (this.logFunction !== undefined)
                    this.logFunction(`@internalLoad : database file loaded, populating tables.`);
                const [dataMeta, dataTables, dataKVTables] = data;
                const [filenameLoaded, rurudbVersionLoaded] = dataMeta;
                if (filenameLoaded !== this.filename) {
                    throw Error(`@internalLoad : filename mismatch, ${filenameLoaded} !== ${this.filename}`);
                }
                if (rurudbVersionLoaded !== rurudbVersion) {
                    throw Error(`@internalLoad : rurudbVersion mismatch, ${rurudbVersionLoaded} !== ${rurudbVersion}`);
                }
                this.initializing = true;
                for (let i = 0, l = dataTables.length; i < l; i += 1) {
                    const [label, items] = dataTables[i];
                    const table = new Table(label, this);
                    for (let a = 0, b = items.length; a < b; a += 1) {
                        table.index.set(items[a].id, items[a]);
                    }
                }
                for (let i = 0, l = dataKVTables.length; i < l; i += 1) {
                    const [label, keys, values] = dataKVTables[i];
                    const kvtable = new KVTable(label, this);
                    for (let a = 0, b = keys.length; a < b; a += 1) {
                        kvtable.index.set(keys[a], values[a]);
                    }
                }
                this.initializing = false;
                if (this.logFunction !== undefined)
                    this.logFunction(`@internalLoad : tables populated.`);
            }
            else {
                if (this.logFunction !== undefined)
                    this.logFunction(`@internalLoad : database file not loaded, saving empty db.`);
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
            if ((yield exists(this.recent)) === false) {
                yield writeFile(this.recent, '', 'utf8');
            }
            this.mainFd = yield open(this.main, 'r+');
            this.tempFd = yield open(this.temp, 'r+');
            this.recentFd = yield open(this.recent, 'r+');
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
                const tables = Array.from(this.tables.entries());
                const dataTables = new Array(tables.length);
                for (let i = 0, l = tables.length; i < l; i += 1) {
                    const [label, table] = tables[i];
                    const items = Array.from(table.index.values());
                    dataTables[i] = [label, items];
                }
                const kvtables = Array.from(this.kvtables.entries());
                const dataKVTables = new Array(kvtables.length);
                for (let i = 0, l = kvtables.length; i < l; i += 1) {
                    const [label, kvtable] = kvtables[i];
                    const keys = Array.from(kvtable.index.keys());
                    const values = Array.from(kvtable.index.values());
                    dataKVTables[i] = [label, keys, values];
                }
                const filename = this.filename;
                const dataMeta = [filename, rurudbVersion];
                const data = [
                    dataMeta,
                    dataTables,
                    dataKVTables,
                ];
                let dataString;
                if (this.saveFormat === "json") {
                    dataString = Buffer.from(JSON.stringify(data));
                }
                else if (this.saveFormat === "readable_json") {
                    dataString = Buffer.from(JSON.stringify(data, null, 2));
                }
                else {
                    dataString = this.msgpackEncode(data);
                }
                yield ftruncate(this.tempFd);
                yield write(this.tempFd, dataString, 0, dataString.byteLength, 0);
                const mainStat = yield fstat(this.mainFd);
                if (mainStat.size > 0) {
                    const modified = mainStat.mtime;
                    const current = new Date();
                    let mainContent = undefined;
                    ;
                    if (current.valueOf() - modified.valueOf() >= this.snapshotInterval
                        && current.valueOf() - this.lastSnapshotTimestamp >= this.snapshotInterval) {
                        const snapshot = ''.concat(this.directory, '/', this.filename, '_', dateToString(current), this.snapshotExtension);
                        const snapshotFd = yield open(snapshot, 'w');
                        ;
                        mainContent = Buffer.alloc(mainStat.size);
                        yield read(this.mainFd, mainContent, 0, mainStat.size, 0);
                        yield write(snapshotFd, mainContent, 0, mainStat.size, 0);
                        yield close(snapshotFd);
                        this.lastSnapshotTimestamp = current.valueOf();
                    }
                    if (mainContent === undefined) {
                        mainContent = Buffer.alloc(mainStat.size);
                        yield read(this.mainFd, mainContent, 0, mainStat.size, 0);
                    }
                    yield ftruncate(this.recentFd);
                    yield write(this.recentFd, mainContent, 0, mainStat.size, 0);
                }
                yield ftruncate(this.mainFd);
                yield write(this.mainFd, dataString, 0, dataString.byteLength, 0);
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
                fs_1.default.closeSync(this.recentFd);
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
                throw Error('@save : Cannot call "save" on non-initialized database.');
            }
            yield this.internalSave();
        });
    }
    table(label) {
        if (this.tables.has(label) === false) {
            throw Error(`@table : "${label}" Table not found, must exist`);
        }
        const table = new Table(label, this);
        return table;
    }
    kvtable(label) {
        if (this.kvtables.has(label) === false) {
            throw Error(`@kvtable : "${label}" KVTable not found, must exist`);
        }
        const kvtable = new KVTable(label, this);
        return kvtable;
    }
}
exports.Database = Database;
