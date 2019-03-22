
const uuidv4 = require('uuid/v4');

const validateInsertedUpdatedItem = require('./helpers/validateInsertedUpdatedItem');
const copyObject = require('./helpers/copyObject');
const createValidator = require('./helpers/createValidator');

const Query = require('./Query');

class Table {
  constructor(label, database, schema) {
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
    const validate = createValidator('insertItem');
    validate('id').asString(id);
    validate('data').asObject(data);
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
    const validate = createValidator('updateItem');
    validate('modifiedItem').asObject(modifiedItem);
    validate('modifiedItem.id').asString(modifiedItem.id);
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
    const validate = createValidator('updateItemById');
    validate('id').asString(id);
    validate('data').asObject(data);
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
    const validate = createValidator('mergeItemById');
    validate('id').asString(id);
    validate('data').asObject(data);
    validate('data.id').asString(data.id);
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
    const validate = createValidator('removeItem');
    validate('data').asObject(item);
    validate('item.id').asString(item.id);
    if (this.index.has(item.id) === false) {
      throw Error('@removeItem : Invalid "item", "id" must exist in table');
    }
    this.index.delete(item.id);
    await this.database.save();
  }

  async removeItemById(id) {
    const validate = createValidator('removeItemById');
    validate('id').asString(id);
    if (this.index.has(id) === false) {
      throw Error('@removeItemById : Invalid "id", "id" must exist in table');
    }
    this.index.delete(id);
    await this.database.save();
  }

  fetchItem(id, returnClone) {
    const validate = createValidator('fetchItem');
    validate('id').asString(id);
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

module.exports = Table;
