
const createValidator = require('./createValidator');

/**
 * @param {Object} schema Item schema.
 * @param {Object} item Item data.
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
 * @returns {undefined}
 */

const validateLoadedItem = (tableLabel, schema, item) => {
  const validate = createValidator('validateLoadedItem');
  validate('tableLabel').asString(tableLabel);
  validate('schema').asObject(schema);
  validate('item').asObject(item);

  const schemaKeys = Object.keys(schema);

  const itemKeys = Object.keys(item);

  for (let i = 0, l = itemKeys.length; i < l; i += 1) {
    const itemKey = itemKeys[i];
    if (schemaKeys.includes(itemKey) === false) {
      throw Error(`${tableLabel} : Unexpected "${itemKey}" field in item`);
    }
  }

  for (let i = 0, l = schemaKeys.length; i < l; i += 1) {
    const schemaKey = schemaKeys[i];
    const schemaValue = schema[schemaKey];
    switch (schemaValue.type) {
      case 'boolean': {
        // If it's not set in item, we set it.
        if (item[schemaKey] === undefined) {
          throw Error(`${tableLabel} : "${schemaKey}" at item must not be undefined.`);
        }
        // If it's set in item, we type-check it.
        if (typeof item[schemaKey] !== 'boolean') {
          throw Error(`${tableLabel} : "${schemaKey}" at item must be typeof boolean.`);
        }
        break;
      }
      case 'string': {
        // If it's not set in item, we set it.
        if (item[schemaKey] === undefined) {
          throw Error(`${tableLabel} : "${schemaKey}" at item must not be undefined.`);
        }
        // If it's set in item, we type-check it.
        if (typeof item[schemaKey] !== 'string') {
          throw Error(`${tableLabel} : "${schemaKey}" at item must be typeof string.`);
        }
        break;
      }
      case 'number': {
        // If it's not set in item, we set it.
        if (item[schemaKey] === undefined) {
          throw Error(`${tableLabel} : "${schemaKey}" at item must not be undefined.`);
        }
        // If it's set in item, we type-check it.
        if (typeof item[schemaKey] !== 'number') {
          throw Error(`${tableLabel} : "${schemaKey}" at item must be typeof number.`);
        } else if (Number.isNaN(item[schemaKey]) === true) {
          throw Error(`${tableLabel} : "${schemaKey}" at item must not be NaN.`);
        } else if (Number.isFinite(item[schemaKey]) === false) {
          throw Error(`${tableLabel} : "${schemaKey}" at item must be finite.`);
        }
        break;
      }
      case 'array': {
        // If it's not set in item, we break.
        if (item[schemaKey] === undefined) {
          throw Error(`${tableLabel} : "${schemaKey}" at item must not be undefined.`);
        }
        // If it's set in item, we type-check it.
        const itemValue = item[schemaKey];
        if (Array.isArray(itemValue) === false) {
          throw Error(`${tableLabel} : "${schemaKey}" at item must be a plain array.`);
        }
        switch (schemaValue.accept) {
          case 'boolean': {
            for (let a = 0, b = itemValue.length; a < b; a += 1) {
              const innerValue = itemValue[a];
              if (typeof innerValue !== 'boolean') {
                throw Error(`${tableLabel} : index "${a}" of "${schemaKey}" at item must be typeof boolean.`);
              }
            }
            break;
          }
          case 'string': {
            for (let a = 0, b = itemValue.length; a < b; a += 1) {
              const innerValue = itemValue[a];
              if (typeof innerValue !== 'string') {
                throw Error(`${tableLabel} : index "${a}" of "${schemaKey}" at item must be typeof string.`);
              }
            }
            break;
          }
          case 'number': {
            for (let a = 0, b = itemValue.length; a < b; a += 1) {
              const innerValue = itemValue[a];
              if (typeof innerValue !== 'number') {
                throw Error(`${tableLabel} : index "${a}" of "${schemaKey}" at item must be typeof number.`);
              } else if (Number.isNaN(innerValue) === true) {
                throw Error(`${tableLabel} : index "${a}" of "${schemaKey}" at item must not be NaN.`);
              } else if (Number.isFinite(innerValue) === false) {
                throw Error(`${tableLabel} : index "${a}" of "${schemaKey}" at item must be finite.`);
              }
            }
            break;
          }
          default: {
            throw Error(`${tableLabel} : "accept" at "${schemaKey}" must be 'boolean'|'string'|'number'.`);
          }
        }
        break;
      }
      default: {
        throw Error(`${tableLabel} : "type" must be 'boolean'|'string'|'number'|'array', got "${schemaValue.type}".`);
      }
    }
  }
};

module.exports = validateLoadedItem;
