
/**
 * @param {Object} schema Item schema.
 * @param {Object} target Item data.
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

const validateLoadedItem = (schema, target) => {
  if (schema === undefined) {
    throw Error('@validateLoadedItem : "schema" must not be undefined.');
  }
  const schemaKeys = Object.keys(schema);

  const targetKeys = Object.keys(target);

  for (let i = 0, l = targetKeys.length; i < l; i += 1) {
    const targetKey = targetKeys[i];
    if (schemaKeys.includes(targetKey) === false) {
      throw Error(`Validation : Unexpected "${targetKey}" field in target`);
    }
  }

  for (let i = 0, l = schemaKeys.length; i < l; i += 1) {
    const schemaKey = schemaKeys[i];
    const schemaValue = schema[schemaKey];
    switch (schemaValue.type) {
      case 'boolean': {
        // If it's not set in target, we set it.
        if (target[schemaKey] === undefined) {
          throw Error(`@validateLoadedItem : "${schemaKey}" at target must not be undefined.`);
        }
        // If it's set in target, we type-check it.
        if (typeof target[schemaKey] !== 'boolean') {
          throw Error(`@validateLoadedItem : "${schemaKey}" at target must be typeof boolean.`);
        }
        break;
      }
      case 'string': {
        // If it's not set in target, we set it.
        if (target[schemaKey] === undefined) {
          throw Error(`@validateLoadedItem : "${schemaKey}" at target must not be undefined.`);
        }
        // If it's set in target, we type-check it.
        if (typeof target[schemaKey] !== 'string') {
          throw Error(`@validateLoadedItem : "${schemaKey}" at target must be typeof string.`);
        }
        break;
      }
      case 'number': {
        // If it's not set in target, we set it.
        if (target[schemaKey] === undefined) {
          throw Error(`@validateLoadedItem : "${schemaKey}" at target must not be undefined.`);
        }
        // If it's set in target, we type-check it.
        if (typeof target[schemaKey] !== 'number') {
          throw Error(`@validateLoadedItem : "${schemaKey}" at target must be typeof number.`);
        } else if (Number.isNaN(target[schemaKey]) === true) {
          throw Error(`@validateLoadedItem : "${schemaKey}" at target must not be NaN.`);
        } else if (Number.isFinite(target[schemaKey]) === false) {
          throw Error(`@validateLoadedItem : "${schemaKey}" at target must be finite.`);
        }
        break;
      }
      case 'array': {
        // If it's not set in target, we break.
        if (target[schemaKey] === undefined) {
          throw Error(`@validateLoadedItem : "${schemaKey}" at target must not be undefined.`);
        }
        // If it's set in target, we type-check it.
        const targetValue = target[schemaKey];
        if (Array.isArray(targetValue) === false) {
          throw Error(`@validateLoadedItem : "${schemaKey}" at target must be a plain array.`);
        }
        switch (schemaValue.accept) {
          case 'boolean': {
            for (let a = 0, b = targetValue.length; a < b; a += 1) {
              const innerValue = targetValue[a];
              if (typeof innerValue !== 'boolean') {
                throw Error(`@validateLoadedItem : index "${a}" of "${schemaKey}" at target must be typeof boolean.`);
              }
            }
            break;
          }
          case 'string': {
            for (let a = 0, b = targetValue.length; a < b; a += 1) {
              const innerValue = targetValue[a];
              if (typeof innerValue !== 'string') {
                throw Error(`@validateLoadedItem : index "${a}" of "${schemaKey}" at target must be typeof string.`);
              }
            }
            break;
          }
          case 'number': {
            for (let a = 0, b = targetValue.length; a < b; a += 1) {
              const innerValue = targetValue[a];
              if (typeof innerValue !== 'number') {
                throw Error(`@validateLoadedItem : index "${a}" of "${schemaKey}" at target must be typeof number.`);
              } else if (Number.isNaN(innerValue) === true) {
                throw Error(`@validateLoadedItem : index "${a}" of "${schemaKey}" at target must not be NaN.`);
              } else if (Number.isFinite(innerValue) === false) {
                throw Error(`@validateLoadedItem : index "${a}" of "${schemaKey}" at target must be finite.`);
              }
            }
            break;
          }
          default: {
            throw Error(`@validateLoadedItem : "accept" at "${schemaKey}" must be 'boolean'|'string'|'number'.`);
          }
        }
        break;
      }
      default: {
        throw Error(`@validateLoadedItem : "type" must be 'boolean'|'string'|'number'|'array', got "${schemaValue.type}".`);
      }
    }
  }
};

module.exports = validateLoadedItem;
