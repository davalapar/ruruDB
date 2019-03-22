
const uuidv4 = require('uuid/v4');
const isPlainObject = require('lodash/isPlainObject');

const validateInsertedUpdatedItem = require('./helpers/validateInsertedUpdatedItem');
const copyObject = require('./helpers/copyObject');
const createValidator = require('./helpers/createValidator');

const Database = require('./Database');
const Query = require('./Query');


class Table {
  constructor(label, database, schema) {
    const validate = createValidator('constructor');
    validate('database').asInstanceOf(Database, database);
    this.label = label;
    this.database = database;
    this.index = new Map();
    this.schema = schema;
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
    const item = copyObject(validateInsertedUpdatedItem(this.schema, { id, ...data }), true);
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
    const item = copyObject(validateInsertedUpdatedItem(this.schema, modifiedItem), true);
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
    const item = copyObject(validateInsertedUpdatedItem(this.schema, { id, ...data }), true);
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
    const item = copyObject(validateInsertedUpdatedItem(this.schema, { id, ...existing, ...data }), true);
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

module.exports = { Table };
