/* eslint-disable no-continue */

const copyObject = require('./helpers/copyObject');
const createValidator = require('./helpers/createValidator');
const haversine = require('./helpers/haversine');

const compareString = (a, b, descend) => (descend ? b.localeCompare(a) : a.localeCompare(b));
const compareNumber = (a, b, descend) => (descend ? b - a : a - b);

function finalizeQuery(returnClone) {
  if (this.sorts.length > 0) {
    this.slicedItems.sort((a, b) => {
      for (let i = 0, l = this.sorts.length; i < l; i += 1) {
        const sortEntry = this.sorts[i];
        if (sortEntry.length === 1) {
          // sortBy
          const [sortFn] = sortEntry;
          return sortFn(a, b);
        } if (sortEntry.length === 2) {
          // ascend, descend
          const [field, fieldDescend] = sortEntry;
          if (typeof a[field] !== typeof b[field]) { // If field of both slicedItems don't match: EXIT LOOP
            throw Error(`Unexpected typeof mismatch at "${field}" field.`);
          } else if (typeof a[field] !== 'string' && typeof a[field] !== 'number') { // If both item fields are't "string" or "number": EXIT LOOP
            throw Error(`Unexpected non-string & non-number value at "${field}" field.`);
          } else if (a[field] === b[field]) { // If value of both slicedItems are equal: SKIP SORT
            continue;
          } else if (typeof a[field] === 'string') {
            return compareString(a[field], b[field], fieldDescend);
          } else if (typeof a[field] === 'number') {
            return compareNumber(a[field], b[field], fieldDescend);
          }
        } else if (sortEntry.length === 4) {
          // ascendHaversine, descendHaversine
          const [field, latitude, longitude, fieldDescend] = sortEntry;
          return compareNumber(
            haversine(latitude, longitude, a[field][0], a[field][1]),
            haversine(latitude, longitude, b[field][0], b[field][1]),
            fieldDescend,
          );
        } else {
          throw Error('finalizeQuery : unknown "sortEntry" type');
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

class Query {
  constructor(table) {
    if (typeof table !== 'object') {
      throw Error('@constructor : "table" must be an object');
    }
    this.resultItems = [];
    this.slicedItems = Array.from(table.index.values());
    this.queryOffset = 0;
    this.queryLimit = this.slicedItems.length;
    this.sorts = [];
    this.selectedFields = [];
    this.hiddenFields = [];
    this.finalized = false;
    this.schema = table.schema;
    this.schemaKeys = Object.keys(table.schema);
  }

  offset(value) {
    const validate = createValidator('offset');
    validate('value').asNumber(value);
    if (this.finalized) throw Error('@offset : Query must not be finalized yet');
    this.queryOffset = value;
    return this;
  }

  limit(value) {
    const validate = createValidator('limit');
    validate('value').asNumber(value);
    if (this.finalized) throw Error('@limit : Query must not be finalized yet');
    this.queryLimit = value;
    return this;
  }

  ascend(field) {
    const validate = createValidator('ascend');
    validate('field').asString(field);
    validate('field').asOneOf(this.schemaKeys, field);
    if (this.schema[field].type !== 'string' && this.schema[field].type !== 'number') {
      throw Error(`@ascend : invalid field "${field}", must be a string field or number field`);
    }
    if (this.finalized) throw Error('@ascend : Query must not be finalized yet');
    this.sorts.push([field, false]);
    return this;
  }

  descend(field) {
    const validate = createValidator('descend');
    validate('field').asString(field);
    validate('field').asOneOf(this.schemaKeys, field);
    if (this.schema[field].type !== 'string' && this.schema[field].type !== 'number') {
      throw Error(`@ascend : invalid field "${field}", must be a string field or number field`);
    }
    if (this.finalized) throw Error('@descend : Query must not be finalized yet');
    this.sorts.push([field, true]);
    return this;
  }

  ascendHaversine(field, latitude, longitude) {
    const validate = createValidator('ascend');
    validate('field').asString(field);
    validate('field').asOneOf(this.schemaKeys, field);
    validate('latitude').asNumber(latitude);
    validate('longitude').asNumber(longitude);
    if (this.schema[field].type !== 'array') {
      throw Error(`@ascend : invalid field "${field}", must be an array field`);
    }
    if (this.schema[field].accept !== 'string' && this.schema[field].accept !== 'number') {
      throw Error(`@ascend : invalid array field "${field}", must only accept "string" or "number"`);
    }
    if (this.finalized) throw Error('@ascend : Query must not be finalized yet');
    this.sorts.push([field, latitude, longitude, false]);
    return this;
  }

  descendHaversine(field, latitude, longitude) {
    const validate = createValidator('descend');
    validate('field').asString(field);
    validate('field').asOneOf(this.schemaKeys, field);
    validate('latitude').asNumber(latitude);
    validate('longitude').asNumber(longitude);
    if (this.schema[field].type !== 'array') {
      throw Error(`@ascend : invalid field "${field}", must be an array field`);
    }
    if (this.schema[field].accept !== 'string' && this.schema[field].accept !== 'number') {
      throw Error(`@ascend : invalid array field "${field}", must only accept "string" or "number"`);
    }
    if (this.finalized) throw Error('@descend : Query must not be finalized yet');
    this.sorts.push([field, latitude, longitude, true]);
    return this;
  }

  sortBy(sortFn) {
    const validate = createValidator('sortBy');
    validate('sortFn').asFunction(sortFn);
    if (this.finalized) throw Error('@sortBy : Query must not be finalized yet');
    this.sorts.push([sortFn]);
    return this;
  }

  gt(field, value) {
    const validate = createValidator('gt');
    validate('field').asString(field);
    validate('field').asOneOf(this.schemaKeys, field);
    validate('value').asNumber(value);
    if (this.schema[field].type !== 'number') {
      throw Error(`@ascend : invalid field "${field}", must be a number field`);
    }
    if (this.finalized) throw Error('@gt : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] > value);
    return this;
  }

  gte(field, value) {
    const validate = createValidator('gte');
    validate('field').asString(field);
    validate('field').asOneOf(this.schemaKeys, field);
    validate('value').asNumber(value);
    if (this.schema[field].type !== 'number') {
      throw Error(`@ascend : invalid field "${field}", must be a number field`);
    }
    if (this.finalized) throw Error('@gte : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] >= value);
    return this;
  }

  lt(field, value) {
    const validate = createValidator('lt');
    validate('field').asString(field);
    validate('field').asOneOf(this.schemaKeys, field);
    validate('value').asNumber(value);
    if (this.schema[field].type !== 'number') {
      throw Error(`@ascend : invalid field "${field}", must be a number field`);
    }
    if (this.finalized) throw Error('@lt : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] < value);
    return this;
  }

  lte(field, value) {
    const validate = createValidator('lte');
    validate('field').asString(field);
    validate('field').asOneOf(this.schemaKeys, field);
    validate('value').asNumber(value);
    if (this.schema[field].type !== 'number') {
      throw Error(`@ascend : invalid field "${field}", must be a number field`);
    }
    if (this.finalized) throw Error('@lte : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Number.isFinite(item[field]) && item[field] <= value);
    return this;
  }

  eq(field, value) {
    const validate = createValidator('eq');
    validate('field').asString(field);
    validate('field').asOneOf(this.schemaKeys, field);
    if (this.finalized) throw Error('@eq : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => item[field] === value);
    return this;
  }

  neq(field, value) {
    const validate = createValidator('neq');
    validate('field').asString(field);
    validate('field').asOneOf(this.schemaKeys, field);
    if (this.finalized) throw Error('@neq : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => item[field] !== value);
    return this;
  }

  has(field, value) {
    const validate = createValidator('has');
    validate('field').asString(field);
    validate('field').asOneOf(this.schemaKeys, field);
    if (this.schema[field].type !== 'array') {
      throw Error(`@ascend : invalid field "${field}", must be an array field`);
    }
    if (this.finalized) throw Error('@has : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && (item[field]).includes(value));
    return this;
  }

  hasAnyOf(field, values) {
    const validate = createValidator('hasAnyOf');
    validate('field').asString(field);
    validate('field').asOneOf(this.schemaKeys, field);
    validate('values').asArray(values);
    if (this.schema[field].type !== 'array') {
      throw Error(`@ascend : invalid field "${field}", must be an array field`);
    }
    if (this.finalized) throw Error('@hasAnyOf : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.some(value => (item[field]).includes(value)));
    return this;
  }

  hasAllOf(field, values) {
    const validate = createValidator('hasAllOf');
    validate('field').asString(field);
    validate('field').asOneOf(this.schemaKeys, field);
    validate('values').asArray(values);
    if (this.schema[field].type !== 'array') {
      throw Error(`@ascend : invalid field "${field}", must be an array field`);
    }
    if (this.finalized) throw Error('@hasAllOf : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.every(value => (item[field]).includes(value)));
    return this;
  }

  hasNoneOfAny(field, values) {
    const validate = createValidator('hasNoneOfAny');
    validate('field').asString(field);
    validate('field').asOneOf(this.schemaKeys, field);
    validate('values').asArray(values);
    if (this.schema[field].type !== 'array') {
      throw Error(`@ascend : invalid field "${field}", must be an array field`);
    }
    if (this.finalized) throw Error('@hasNoneOfAny : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.some(value => (item[field]).includes(value) === false));
    return this;
  }

  hasNoneOfAll(field, values) {
    const validate = createValidator('hasNoneOfAll');
    validate('field').asString(field);
    validate('field').asOneOf(this.schemaKeys, field);
    validate('values').asArray(values);
    if (this.schema[field].type !== 'array') {
      throw Error(`@ascend : invalid field "${field}", must be an array field`);
    }
    if (this.finalized) throw Error('@hasNoneOfAll : Query must not be finalized yet');
    this.slicedItems = this.slicedItems.filter(item => Array.isArray(item[field]) && values.every(value => (item[field]).includes(value) === false));
    return this;
  }

  select(...fields) {
    const validate = createValidator('select');
    validate('fields').asArrayOfStrings(fields);
    validate('fields').asArrayValues(this.schemaKeys, fields);
    if (this.finalized) throw Error('@select : Query must not be finalized yet');
    this.selectedFields = fields.slice();
    return this;
  }

  hide(...fields) {
    const validate = createValidator('hide');
    validate('fields').asArrayOfStrings(fields);
    validate('fields').asArrayValues(this.schemaKeys, fields);
    if (this.finalized) throw Error('@hide : Query must not be finalized yet');
    this.hiddenFields = fields.slice();
    return this;
  }

  filterBy(filterFn) {
    const validate = createValidator('filterBy');
    validate('filterFn').asFunction(filterFn);
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

module.exports = Query;
