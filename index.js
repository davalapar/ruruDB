'use strict';

const fs = require('fs');
const { promisify } = require('util');
const isPlainObject = require('lodash/isPlainObject');
const uuidv4 = require('uuid/v4');
const ms = require('ms');
const tinydate = require('tinydate');
const MessagePack = require('what-the-pack');

const writeFile = promisify(fs.writeFile);
const open = promisify(fs.open);
const close = promisify(fs.close);
const ftruncate = promisify(fs.ftruncate);
const write = promisify(fs.write);
const read = promisify(fs.read);
const fstat = promisify(fs.fstat);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);

// Database Version
const rurudbVersion = 9;

// Helper Functions
const dateToString = tinydate('{DD}-{MM}-{YY}-{HH}-{mm}-{ss}');
const compareString = (a, b, descend) => (descend ? b.localeCompare(a) : a.localeCompare(b));
const compareNumber = (a, b, descend) => (descend ? b - a : a - b);
const copyArray = (target, freeze) => {
  if (Array.isArray(target) === false) {
    throw Error('copyArray : "target" must be a plain array');
  }
  if (typeof freeze !== 'boolean') {
    throw Error('copyArray : "freeze" must be a boolean');
  }
  const item = new Array(target.length);
  for (let i = 0, l = target.length; i < l; i += 1) {
    switch (typeof target[i]) {
      case 'undefined':
      case 'boolean':
      case 'string': {
        item[i] = target[i];
        break;
      }
      case 'number':{
        if (Number.isNaN(target[i]) === true) {
          throw Error (`copyArray : Unexpected NaN at index "${i}"`);
        } else if (Number.isFinite(target[i]) === false) {
          throw Error (`copyArray : Unexpected non-finite at index "${i}"`);
        } else {
          item[i] = target[i];
        }
        break;
      }
      case 'object': {
        if (target[i] === null) {
          item[i] = null;
        } else if (Array.isArray(target[i]) === true){
          item[i] = copyArray(target[i], freeze);
        } else {
          item[i] = copyObject(target[i], freeze);
        }
        break;
      }
      default: {
        throw Error (`copyArray : Unexpected type ${typeof target[i]}`);
      }
    }
  }
  if (freeze === true) {
    return Object.freeze(item);
  }
  return item;
};
const copyObject = (target, freeze) => {
  if (isPlainObject(target) === false) {
    throw Error('copyObject : "target" must be a plain object');
  }
  if (typeof freeze !== 'boolean') {
    throw Error('copyObject : "freeze" must be a boolean');
  }
  const item = {};
  const keys = Object.keys(target);
  for (let i = 0, l = keys.length; i < l; i += 1) {
    const key = keys[i];
    switch (typeof target[key]) {
      case 'undefined': {
        break;
      }
      case 'boolean':
      case 'string': {
        item[key] = target[key];
        break;
      }
      case 'number':{
        if (Number.isNaN(target[key]) === true) {
          throw Error (`copyObject : Unexpected NaN at key "${key}"`);
        } else if (Number.isFinite(target[key]) === false) {
          throw Error (`copyObject : Unexpected non-finite at key "${key}"`);
        } else {
          item[key] = target[key];
        }
        break;
      }
      case 'object': {
        if (target[key] === null) {
          item[key] = null;
        } else if (Array.isArray(target[key]) === true){
          item[key] = copyArray(target[key], freeze);
        } else {
          item[key] = copyObject(target[key], freeze);
        }
        break;
      }
      default: {
        throw Error (`copyObject : Unexpected type ${typeof target[i]}`);
      }
    }
  }
  if (freeze === true) {
    return Object.freeze(item);
  }
  return item;
};
function finalizeQuery (returnClone) {
  if (this.sorts.length > 0) {
    this.slicedItems.sort((a, b) => {
      for (let i = 0, l = this.sorts.length; i < l; i += 1) {
        const sort = this.sorts[i];
        if (typeof sort[0] === 'function') {
          const [sortFn] = sort;
          return sortFn(a, b);
        }
        const [field, fieldDescend] = sort;
        if (typeof a[field] !== typeof b[field]) { // If field of both slicedItems don't match: EXIT LOOP
          break;
        } else if (typeof a[field] !== 'string' && typeof a[field] !== 'number') { // If both item fields are't "string" or "number": EXIT LOOP
          break;
        } else if (a[field] === b[field]) { // If value of both slicedItems are equal: SKIP SORT
          continue;
        } else if (typeof a[field] === 'string') {
          return compareString(a[field], b[field], fieldDescend);
        } else if (typeof a[field] === 'number') {
          return compareNumber(a[field], b[field], fieldDescend);
        }
      }
      return 0;
    });
  }
  this.slicedItems = this.slicedItems.slice(this.queryOffset, this.queryOffset + this.queryLimit);
  if (returnClone === true) {
    this.resultItems = new Array(this.slicedItems.length);
    for (let i = 0, l = this.slicedItems.length; i < l; i += 1) {
      const item = copyObject(this.slicedItems[i], false);
      if (this.selectedFields.length > 0) {
        const itemFields = Object.keys(item);
        for (let a = 0, b = itemFields.length; a < b; a += 1) { // For each item field
          const currentField = itemFields[a];
          if (this.selectedFields.includes(currentField) === false) { // If selected field includes field, DELETE
            delete item[currentField];
          }
        }
      }
      for (let a = 0, b = this.hiddenFields.length; a < b; a += 1) { // For each hidden field, DELETE
        const currentHiddenField = this.hiddenFields[a];
        delete item[currentHiddenField];
      }
      this.resultItems[i] = item;
    }
  } else {
    if (this.selectedFields.length > 0) {
      throw Error('Query : "returnClone" must be "true" to use "select(...fields)"');
    }
    if (this.hiddenFields.length > 0) {
      throw Error('Query : "returnClone" must be "true" to use "hide(...fields)"');
    }
    this.resultItems = this.slicedItems;
  }
  this.finalized = true;
}

/**
 * @param {Object} schema Item schema.
 * @param {Object} target Initial item data.
 * 
 * Example types & defaults:
 * - type='boolean', default=false
 * - type='string', default=''
 * - type='number', default=0
 * - type='array', accept='boolean'|'string'|'number'
 * 
 * Notes:
 * - 'type' & 'default' for 'boolean', 'string' & 'number'
 * - 'type' & 'accept' for 'array'
 * - 'null' and 'undefined' values are not accepted
 * 
 * @returns {Object} Finalized item data.
 */

const validateSchema = (schema) => {
  if (schema === undefined) {
    throw Error('@validateSchema : "schema" must not be undefined.');
  } else if (isPlainObject(schema) === false) {
    throw Error('@validateSchema : "schema" must be a plain object.');
  }
  const schemaKeys = Object.keys(schema);
  for (let i = 0, l = schemaKeys.length; i < l; i += 1) {
    const schemaKey = schemaKeys[i];
    const schemaValue = schema[schemaKey];
    if (isPlainObject(schemaValue) === false) {
      throw Error(`@validateBySchema : Unexpected non-plain-object at schemaKey "${schemaKey}"`);
    }
    if (schemaValue.type === undefined) {
      throw Error(`@validateBySchema : Unexpected non-string "type" at schemaKey "${schemaKey}"`);
    }
    switch (schemaValue.type) {
      case 'boolean': {
        if (typeof schemaValue.default !== 'boolean') {
          throw Error(`@validateBySchema : "default" at "${schemaKey}" must be typeof boolean.`);
        }
        break;
      }
      case 'string': {
        if (typeof schemaValue.default !== 'string') {
          throw Error(`@validateBySchema : "default" at "${schemaKey}" must be typeof string.`);
        }
        break;
      }
      case 'number': {
        if (typeof schemaValue.default !== 'number') {
          throw Error(`@validateBySchema : "default" at "${schemaKey}" must be typeof number.`);
        } else if (Number.isNaN(schemaValue.default) === true) {
          throw Error(`@validateBySchema : "default" at "${schemaKey}" must not be NaN.`);
        } else if (Number.isFinite(schemaValue.default) === false) {
          throw Error(`@validateBySchema : "default" at "${schemaKey}" must be finite.`);
        }
        break;
      }
      case 'array': {
        if (typeof schemaValue.accept !== 'string') {
          throw Error(`@validateBySchema : "accept" at "${schemaKey}" must be typeof string.`);
        }
        if (schemaValue.accept !== 'boolean' && schemaValue.accept !== 'string' && schemaValue.accept !== 'number') {
          throw Error(`@validateBySchema : "accept" at "${schemaKey}" must be 'boolean'|'string'|'number'.`);
        }
        break;
      }
      default: {
        throw Error(`@validateBySchema : "type" must be 'boolean'|'string'|'number'|'array', got "${type}".`);
      }
    }
  }
};

const validateBySchema = (schema, target) => {
  if (schema === undefined) {
    throw Error('@validateBySchema : "schema" must not be undefined.');
  }
  const schemaKeys = Object.keys(schema);
  for (let i = 0, l = schemaKeys.length; i < l; i += 1) {
    const schemaKey = schemaKeys[i];
    const schemaValue = schema[schemaKey];
    switch (schemaValue.type) {
      case 'boolean': {
        const targetValue = target[schemaKey];
        // If it's not set in target, we set it.
        if (targetValue === undefined) {
          targetValue === schemaValue.default;
          break;
        }
        // If it's set in target, we type-check it.
        if (typeof targetValue !== 'boolean') {
          throw Error(`@validateBySchema : "${schemaKey}" at target must be typeof boolean.`);
        }
        break;
      }
      case 'string': {
        const targetValue = target[schemaKey];
        // If it's not set in target, we set it.
        if (targetValue === undefined) {
          targetValue === schemaValue.default;
          break;
        }
        // If it's set in target, we type-check it.
        if (typeof targetValue !== 'string') {
          throw Error(`@validateBySchema : "${schemaKey}" at target must be typeof string.`);
        }
        break;
      }
      case 'number': {
        const targetValue = target[schemaKey];
        // If it's not set in target, we set it.
        if (targetValue === undefined) {
          targetValue === schemaValue.default;
          break;
        }
        // If it's set in target, we type-check it.
        if (typeof targetValue !== 'number') {
          throw Error(`@validateBySchema : "${schemaKey}" at target must be typeof number.`);
        } else if (Number.isNaN(targetValue) === true) {
          throw Error(`@validateBySchema : "${schemaKey}" at target must not be NaN.`);
        } else if (Number.isFinite(targetValue) === false) {
          throw Error(`@validateBySchema : "${schemaKey}" at target must be finite.`);
        }
        break;
      }
      case 'array': {
        const targetValue = target[schemaKey];
        // If it's not set in target, we break.
        if (targetValue === undefined) {
          break;
        }
        // If it's set in target, we type-check it.
        if (Array.isArray(targetValue) !== false) {
          throw Error(`@validateBySchema : "${schemaKey}" at target must be a plain array.`);
        }
        switch (schemaValue.accept) {
          case 'boolean': {
            for (let a = 0, b = targetValue.length; a < b; a += 1) {
              const innerValue = targetValue[a];
              if (typeof innerValue !== 'boolean') {
                throw Error(`@validateBySchema : index "${a}" of "${schemaKey}" at target must be typeof boolean.`);
              }
            }
            break;
          }
          case 'string': {
            for (let a = 0, b = targetValue.length; a < b; a += 1) {
              const innerValue = targetValue[a];
              if (typeof innerValue !== 'string') {
                throw Error(`@validateBySchema : index "${a}" of "${schemaKey}" at target must be typeof string.`);
              }
            }
            break;
          }
          case 'number': {
            for (let a = 0, b = targetValue.length; a < b; a += 1) {
              const innerValue = targetValue[a];
              if (typeof innerValue !== 'number') {
                throw Error(`@validateBySchema : index "${a}" of "${schemaKey}" at target must be typeof number.`);
              } else if (Number.isNaN(schemaValue.default) === true) {
                throw Error(`@validateBySchema : index "${a}" of "${schemaKey}" at target must not be NaN.`);
              } else if (Number.isFinite(schemaValue.default) === false) {
                throw Error(`@validateBySchema : index "${a}" of "${schemaKey}" at target must be finite.`);
              }
            }
            break;
          }
          default: {
            throw Error(`@validateBySchema : "accept" at "${schemaKey}" must be 'boolean'|'string'|'number'.`);
          }
        }
        break;
      }
      default: {
        throw Error(`@validateBySchema : "type" must be 'boolean'|'string'|'number'|'array', got "${type}".`);
      }
    }
  }
};

class Query {
  constructor(table) {
    if (table instanceof Table === false) {
      throw Error('@constructor : "table" must be instance of Table.');
    }
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
    if (this.finalized) throw Error('@offset : Query must not be finalized yet');
    this.queryOffset = value;
    return this;
  }

  limit(value) {
    if (this.finalized) throw Error('@limit : Query must not be finalized yet');
    this.queryLimit = value;
    return this;
  }

  ascend(field) {
    if (this.finalized) throw Error('@ascend : Query must not be finalized yet');
    this.sorts.push([field, false]);
    return this;
  }

  descend(field) {
    if (this.finalized) throw Error('@descend : Query must not be finalized yet');
    this.sorts.push([field, true]);
    return this;
  }

  sortBy(sortFn) {
    if (this.finalized) throw Error('@sortBy : Query must not be finalized yet');
    this.sorts.push([sortFn]);
    return this;
  }

  gt(field, value) {
    if (this.finalized) throw Error('@gt : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] > value);
    return this;
  }

  gte(field, value) {
    if (this.finalized) throw Error('@gte : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] >= value);
    return this;
  }

  lt(field, value) {
    if (this.finalized) throw Error('@lt : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] < value);
    return this;
  }

  lte(field, value) {
    if (this.finalized) throw Error('@lte : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] <= value);
    return this;
  }

  eq(field, value) {
    if (this.finalized) throw Error('@eq : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => item[field] === value);
    return this;
  }

  neq(field, value) {
    if (this.finalized) throw Error('@neq : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => item[field] !== value);
    return this;
  }

  has(field, value) {
    if (this.finalized) throw Error('@has : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && (item[field]).includes(value));
    return this;
  }

  hasAnyOf(field, values) {
    if (this.finalized) throw Error('@hasAnyOf : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.some(value => (item[field]).includes(value)));
    return this;
  }

  hasAllOf(field, values) {
    if (this.finalized) throw Error('@hasAllOf : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.every(value => (item[field]).includes(value)));
    return this;
  }

  hasNoneOfAny(field, values) {
    if (this.finalized) throw Error('@hasNoneOfAny : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.some(value => (item[field]).includes(value) === false));
    return this;
  }

  hasNoneOfAll(field, values) {
    if (this.finalized) throw Error('@hasNoneOfAll : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.every(value => (item[field]).includes(value) === false));
    return this;
  }

  select(...fields) {
    if (this.finalized) throw Error('@select : Query must not be finalized yet');
    this.selectedFields = fields.slice();
    return this;
  }

  hide(...fields) {
    if (this.finalized) throw Error('@hide : Query must not be finalized yet');
    this.hiddenFields = fields.slice();
    return this;
  }

  filterBy(filterFn) {
    if (this.finalized) throw Error('@filterBy : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => filterFn(item));
    return this;
  }

  results(returnClone) {
    if (this.finalized === false) finalizeQuery.call(this, returnClone);
    return this.resultItems;
  }

  firstResult(returnClone) {
    if (this.finalized === false) finalizeQuery.call(this, returnClone);
    return this.resultItems[0];
  }

  hasResults(returnClone) {
    if (this.finalized === false) finalizeQuery.call(this, returnClone);
    return this.resultItems.length > 0;
  }

  countResults(returnClone) {
    if (this.finalized === false) finalizeQuery.call(this, returnClone);
    return this.resultItems.length;
  }
}

class Table {
  constructor(label, database, schema) {
    if (database instanceof Database === false) {
      throw Error('@constructor : "database" must be instance of Database.');
    }
    if (database.initialized === false && database.initializing === false) {
      throw Error('@constructor : Cannot create table on non-initialized database.');
    }
    if (schema !== undefined) {
      if (isPlainObject(schema) === false) {
        throw Error('@constructor : "schema" must be a plain object.');
      }
      this.schema = schema;
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
    let id = uuidv4();
    while (this.index.has(id)) {
      id = uuidv4();
    }
    return id;
  }

  async insertItem(id, data, returnClone) {
    if (isPlainObject(data) === false) {
      throw Error('@insertItem : Invalid "data", "data" must be a plain object');
    }
    if (this.index.has(id)) {
      throw Error('@insertItem : Invalid "id", must not exist in table');
    }
    const item = copyObject({
      id,
      ...data
    }, true);
    this.index.set(id, item);
    await this.database.save();
    if (returnClone === true) {
      return copyObject(item, false);
    }
    return item;
  }

  async updateItem(modifiedItem, returnClone) {
    if (isPlainObject(modifiedItem) === false) {
      throw Error('@updateItem : Invalid "modifiedItem", "modifiedItem" must be a plain object');
    }
    if (modifiedItem.id === undefined) {
      throw Error('@updateItem : Invalid "item", "id" must not be "undefined"');
    }
    if (this.index.has(modifiedItem.id) === false) {
      throw Error('@updateItem : Invalid "item", item "id" must exist in table');
    }
    const item = copyObject(modifiedItem, true);
    this.index.set(item.id, item);
    await this.database.save();
    if (returnClone === true) {
      return copyObject(item, false);
    }
    return item;
  }

  async updateItemById(id, data, returnClone) {
    if (isPlainObject(data) === false) {
      throw Error('@updateItemById : Invalid "data", "data" must be a plain object');
    }
    if (data.id !== undefined) {
      throw Error('@updateItemById : Invalid "data", "id" must be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('@updateItemById : Invalid "id", must exist in table');
    }
    const item = copyObject({
      id,
      ...data,
    }, true);
    this.index.set(id, item);
    await this.database.save();
    if (returnClone === true) {
      return copyObject(item, false);
    }
    return item;
  }

  async mergeItemById(id, data, returnClone) {
    if (isPlainObject(data) === false) {
      throw Error('@mergeItemById : Invalid "data", "data" must be a plain object');
    }
    if (data.id !== undefined) {
      throw Error('@mergeItemById : Invalid "data", "id" must be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('@mergeItemById : Invalid "item", "id" must exist in table');
    }
    const existing = this.index.get(id);
    const item = copyObject({
      id,
      ...existing,
      ...data,
    }, true);
    this.index.set(id, item);
    await this.database.save();
    if (returnClone === true) {
      return copyObject(item, false);
    }
    return item;
  }

  async removeItem(item) {
    if (isPlainObject(item) === false) {
      throw Error('@removeItem : Invalid "item", "item" must be a plain object');
    }
    if (item.id === undefined) {
      throw Error('@removeItem : Invalid "item", "id" must not be "undefined"');
    }
    if (this.index.has(item.id) === false) {
      throw Error('@removeItem : Invalid "item", "id" must exist in table');
    }
    this.index.delete(item.id);
    await this.database.save();
  }

  async removeItemById(id) {
    if (id === undefined) {
      throw Error('@removeItemById : Invalid "id", "id" must not be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('@removeItemById : Invalid "id", "id" must exist in table');
    }
    this.index.delete(id);
    await this.database.save();
  }

  fetchItem(id, returnClone) {
    if (id === undefined) {
      throw Error('@fetchItem : Invalid "id", "id" must not be "undefined"');
    }
    if (this.index.has(id) === false) {
      throw Error('@fetchItem : Invalid "item", "id" must exist in table');
    }
    const item = this.index.get(id);
    if (returnClone === true) {
      return copyObject(item, false);
    }
    return item;
  }

  async clear() {
    this.index.clear();
    await this.database.save();
  }

  async destroy() {
    this.database.tables.delete(this.label);
    await this.database.save();
  }

  query() {
    return new Query(this);
  }
}

class KVTable {
  constructor(label, database) {
    if (database instanceof Database === false) {
      throw Error('@constructor : "database" must be instance of Database.');
    }
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

  async set(key, value) {
    if (key === undefined) {
      throw Error('@set : Invalid "key", "key" must not be "undefined"');
    }
    if (typeof key !== 'string') {
      throw Error('@set : Invalid "key", "key" must be typeof "string"');
    }
    this.index.set(key, value);
    await this.database.save();
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

  async delete(key) {
    if (key === undefined) {
      throw Error('@set : Invalid "key", "key" must not be "undefined"');
    }
    if (typeof key !== 'string') {
      throw Error('@set : Invalid "key", "key" must be typeof "string"');
    }
    this.index.delete(key);
    await this.database.save();
  }

  async clear() {
    this.index.clear();
    await this.database.save();
  }

  async destroy() {
    this.database.kvtables.delete(this.label);
    await this.database.save();
  }
}

class Database {
  constructor(options) {
    if (options.logFunction !== 'undefined') {
      if (typeof options.logFunction !== 'function') {
        throw Error('@constructor : options.logFunction must be a function.');
      }
    }
    const logFunction = options.logFunction ? options.logFunction : () => {};
    this.logFunction = logFunction;

    if (typeof options.filename !== 'string' || options.filename === '') {
      throw Error('@constructor : options.filename must be a non-empty string.');
    }
    logFunction(`filename : "${options.filename}"`);
    this.filename = options.filename;

    if (typeof options.directory !== 'string' || options.directory === '') {
      throw Error('@constructor : options.directory must be a non-empty string.');
    }
    logFunction(`directory : "${options.directory}"`);
    this.directory = options.directory;

    if (options.schemas !== undefined) {
      if (isPlainObject(options.schemas) === false) {
        throw Error('@constructor : options.schemas must be a plain object.');
      }
      const keys = Object.keys(options.schemas);
      for (let i = 0, l = keys.length; i < l; i += 1) {
        const key = keys[i];
        logFunction(`schemas : Validating "${key}" schema..`);
        validateSchema(options.schemas[key]);
        logFunction(`schemas : "${key}" schema valid.`);
      }
      this.schemas = options.schemas;
      logFunction(`schemas : "${keys}"`);
    }

    if (typeof options.saveFormat !== 'string') {
      throw Error('@constructor : options.directory must be a string.');
    }
    if (options.saveFormat !== 'json' && options.saveFormat !== 'readable_json' && options.saveFormat !== 'msgpack') {
      throw Error('@constructor : options.directory must be "json"|"readable_json"|"msgpack".');
    }
    logFunction(`saveFormat : "${options.saveFormat}"`);
    this.saveFormat = options.saveFormat;

    switch (options.saveFormat) {
      case 'json': {
        this.main = options.directory.concat('/', options.filename, '-current.rrdb');
        this.temp = options.directory.concat('/', options.filename, '-temp.rrdb');
        this.recent = options.directory.concat('/', options.filename, '-recent.rrdb');
        this.snapshotExtension = '-snapshot.rrdb';
        break;
      }
      case 'readable_json': {
        this.main = options.directory.concat('/', options.filename, '-current.rrdb');
        this.temp = options.directory.concat('/', options.filename, '-temp.rrdb');
        this.recent = options.directory.concat('/', options.filename, '-recent.rrdb');
        this.snapshotExtension = '-snapshot.rrdb';
        break;
      }
      case 'msgpack': {
        this.main = options.directory.concat('/', options.filename, '-current.prrdb');
        this.temp = options.directory.concat('/', options.filename, '-temp.prrdb');
        this.recent = options.directory.concat('/', options.filename, '-recent.prrdb');
        this.snapshotExtension = '-snapshot.prrdb';
        logFunction(`msgpackBufferSize : "${options.msgpackBufferSize}"`);
        if (typeof options.msgpackBufferSize !== 'number') {
          throw Error('@constructor : options.msgpackBufferSize must be a number.');
        } else if (Number.isNaN(options.msgpackBufferSize) === true) {
          throw Error('@constructor : options.msgpackBufferSize must not be NaN.');
        } else if (Number.isFinite(options.msgpackBufferSize) === false) {
          throw Error('@constructor : options.msgpackBufferSize must be finite.');
        }
        const { encode: msgpackEncode, decode: msgpackDecode } = MessagePack.initialize(options.msgpackBufferSize);
        this.msgpackEncode = msgpackEncode;
        this.msgpackDecode = msgpackDecode;
        break;
      }
      default: {
        throw Error('@constructor : options.saveFormat must be either "json", "readable_json" or "msgpack"');
      }
    }
    
    logFunction(`snapshotInterval : "${options.snapshotInterval}"`);
    if (options.snapshotInterval !== undefined) {
      if (typeof options.snapshotInterval !== 'string') {
        throw Error('@constructor : options.snapshotInterval must be a string');
      }
      this.snapshotInterval = ms(options.snapshotInterval);
    } else {
      this.snapshotInterval = Infinity;
    }

    this.tables = new Map();
    this.kvtables = new Map();
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

  async initialize() {
    if (this.initialized === false) {
      if (this.internalInitializePromise !== undefined) {
        return this.internalInitializePromise;
      }
      this.internalInitializePromise = (async () => {
        await this.internalLoad();
        this.initialized = true;
      })();
      await this.internalInitializePromise;
      this.internalInitializePromise = undefined;
    }
  }

  async internalLoad() {
    this.tables.clear();
    this.kvtables.clear();
    let dbDataString = Buffer.alloc(0);
    if (await exists(this.directory)) {
      if (await exists(this.main)) {
        this.mainFd = await open(this.main, 'r');
        const mainStat = await fstat(this.mainFd);
        if (mainStat.size > 0) {
          this.logFunction(`@internalLoad : Loading from ${this.main}`);
          const mainContent = Buffer.alloc(mainStat.size);
          await read(this.mainFd, mainContent, 0, mainStat.size, 0);
          dbDataString = mainContent;
        } else {
          this.logFunction(`@internalLoad : ${this.main} empty, possibly corrupted.`);
        }
        await close(this.mainFd);
      } else {
        this.logFunction(`@internalLoad : ${this.main} not found.`);
        if (await exists(this.temp)) {
          this.tempFd = await open(this.temp, 'r');
          const tempStat = await fstat(this.tempFd);
          if (tempStat.size > 0) {
            this.logFunction(`@internalLoad : Loading from ${this.temp}`);
            const tempContent = Buffer.alloc(tempStat.size);
            await read(this.tempFd, tempContent, 0, tempStat.size, 0);
            dbDataString = tempContent;
          } else {
            this.logFunction(`@internalLoad : ${this.temp} empty, possibly corrupted.`);
          }
          await close(this.tempFd);
        } else {
          this.logFunction(`@internalLoad : ${this.temp} not found.`);
          if (await exists(this.recent)) {
            this.recentFd = await open(this.recent, 'r');
            const recentStat = await fstat(this.recentFd);
            if (recentStat.size > 0) {
              this.logFunction(`@internalLoad : Loading from ${this.recent}`);
              const tempContent = Buffer.alloc(recentStat.size);
              await read(this.recentFd, tempContent, 0, recentStat.size, 0);
              dbDataString = tempContent;
            } else {
              this.logFunction(`@internalLoad : ${this.recent} empty, possibly corrupted.`);
            }
            await close(this.recentFd);
          } else {
            this.logFunction(`@internalLoad : ${this.recent} not found.`);
          }
        }
      }
    }
    if (dbDataString.byteLength !== 0) {
      let data; // eslint-disable-line
      if (this.saveFormat === 'json' || this.saveFormat === 'readable_json') {
        data = JSON.parse(dbDataString.toString());
      } else { // msgpack
        data = (this.msgpackDecode)(dbDataString);
      }
      this.logFunction('@internalLoad  file loaded, populating tables.');
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
      this.logFunction('@internalLoad : tables populated.');
    } else {
      this.logFunction('@internalLoad : file not loaded, saving empty db.');
      await this.internalSave();
    }
  }

  async internalBeforeSave() {
    // Ensure directory existence
    if (await exists(this.directory) === false) {
      await mkdir(this.directory, { recursive: true });
    }

    // Ensure file existence
    if (await exists(this.main) === false) {
      await writeFile(this.main, '', 'utf8');
    }
    if (await exists(this.temp) === false) {
      await writeFile(this.temp, '', 'utf8');
    }
    if (await exists(this.recent) === false) {
      await writeFile(this.recent, '', 'utf8');
    }
    this.mainFd = await open(this.main, 'r+');
    this.tempFd = await open(this.temp, 'r+');
    this.recentFd = await open(this.recent, 'r+');
    process.nextTick(this.internalSaveLoop);
  }

  async internalSaveLoop() {
    const fetched = this.queue;
    this.queue = [];
    let error;
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
      if (this.saveFormat === 'json') {
        dataString = Buffer.from(JSON.stringify(data));
      } else if (this.saveFormat === 'readable_json') {
        dataString = Buffer.from(JSON.stringify(data, null, 2));
      } else { // msgpack
        dataString = (this.msgpackEncode)(data);
      }

      await ftruncate(this.tempFd);
      await write(this.tempFd, dataString, 0, dataString.byteLength, 0);

      const mainStat = await fstat(this.mainFd);
      if (mainStat.size > 0) {
        const modified = mainStat.mtime;
        const current = new Date();
        let mainContent;
        if (
          current.valueOf() - modified.valueOf() >= this.snapshotInterval
          && current.valueOf() - this.lastSnapshotTimestamp >= this.snapshotInterval
        ) {
          const snapshot = ''.concat(
            this.directory, '/',
            this.filename, '_',
            dateToString(current),
            this.snapshotExtension,
          );
          const snapshotFd = await open(snapshot, 'w');
          mainContent = Buffer.alloc(mainStat.size);
          await read(this.mainFd, mainContent, 0, mainStat.size, 0);
          await write(snapshotFd, mainContent, 0, mainStat.size, 0);
          await close(snapshotFd);
          this.lastSnapshotTimestamp = current.valueOf();
        }
        if (mainContent === undefined) {
          mainContent = Buffer.alloc(mainStat.size);
          await read(this.mainFd, mainContent, 0, mainStat.size, 0);
        }
        await ftruncate(this.recentFd);
        await write(this.recentFd, mainContent, 0, mainStat.size, 0);
      }
      await ftruncate(this.mainFd);
      await write(this.mainFd, dataString, 0, dataString.byteLength, 0);
    } catch (e) {
      error = e;
    }

    if (this.queue.length > 0) {
      process.nextTick(this.internalSaveLoop);
    } else {
      this.saving = false;
      fs.closeSync(this.mainFd);
      fs.closeSync(this.tempFd);
      fs.closeSync(this.recentFd);
    }
    if (error !== undefined) {
      for (let i = 0, l = fetched.length; i < l; i += 1) {
        const [, reject] = fetched[i];
        reject(error);
      }
    } else {
      for (let i = 0, l = fetched.length; i < l; i += 1) {
        const [resolve] = fetched[i];
        resolve();
      }
    }
  }

  async internalSave() {
    return new Promise((resolve, reject) => {
      this.queue.push([resolve, reject]);
      if (this.saving === false) {
        this.saving = true;
        process.nextTick(this.internalBeforeSave);
      }
    });
  }

  async save() {
    if (this.initialized === false) {
      throw Error('@save : Cannot call "save" on non-initialized database.');
    }
    await this.internalSave();
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

module.exports = {
  Database,
  Query,
  Table,
  KVTable,
};