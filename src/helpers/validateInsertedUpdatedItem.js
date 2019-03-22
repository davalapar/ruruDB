
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
 * @returns {Object} Validated item data with defaults.
 */

const validateInsertedUpdatedItem = (schema, target) => {
  if (schema === undefined) {
    throw Error('Validation : "schema" must not be undefined.');
  }
  const schemaKeys = Object.keys(schema);

  const targetKeys = Object.keys(target);

  for (let i = 0, l = targetKeys.length; i < l; i += 1) {
    const targetKey = targetKeys[i];
    if (schemaKeys.includes(targetKey) === false) {
      throw Error(`Validation : Unexpected "${targetKey}" field in target`);
    }
  }

  const validated = {};
  for (let i = 0, l = schemaKeys.length; i < l; i += 1) {
    const schemaKey = schemaKeys[i];
    const schemaValue = schema[schemaKey];
    switch (schemaValue.type) {
      case 'boolean': {
        // If it's not set in target, we set it.
        if (target[schemaKey] === undefined) {
          validated[schemaKey] = schemaValue.default;
          break;
        }
        // If it's set in target, we type-check it.
        if (typeof target[schemaKey] !== 'boolean') {
          throw Error(`Validation : "${schemaKey}" at target must be typeof boolean.`);
        }
        validated[schemaKey] = target[schemaKey];
        break;
      }
      case 'string': {
        // If it's not set in target, we set it.
        if (target[schemaKey] === undefined) {
          validated[schemaKey] = schemaValue.default;
          break;
        }
        // If it's set in target, we type-check it.
        if (typeof target[schemaKey] !== 'string') {
          throw Error(`Validation : "${schemaKey}" at target must be typeof string.`);
        }
        validated[schemaKey] = target[schemaKey];
        break;
      }
      case 'number': {
        // If it's not set in target, we set it.
        if (target[schemaKey] === undefined) {
          validated[schemaKey] = schemaValue.default;
          break;
        }
        // If it's set in target, we type-check it.
        if (typeof target[schemaKey] !== 'number') {
          throw Error(`Validation : "${schemaKey}" at target must be typeof number.`);
        } else if (Number.isNaN(target[schemaKey]) === true) {
          throw Error(`Validation : "${schemaKey}" at target must not be NaN.`);
        } else if (Number.isFinite(target[schemaKey]) === false) {
          throw Error(`Validation : "${schemaKey}" at target must be finite.`);
        }
        validated[schemaKey] = target[schemaKey];
        break;
      }
      case 'array': {
        // If it's not set in target, we break.
        if (target[schemaKey] === undefined) {
          validated[schemaKey] = [];
          break;
        }
        // If it's set in target, we type-check it.
        const targetValue = target[schemaKey];
        if (Array.isArray(targetValue) === false) {
          throw Error(`Validation : "${schemaKey}" at target must be a plain array.`);
        }
        switch (schemaValue.accept) {
          case 'boolean': {
            for (let a = 0, b = targetValue.length; a < b; a += 1) {
              const innerValue = targetValue[a];
              if (typeof innerValue !== 'boolean') {
                throw Error(`Validation : index "${a}" of "${schemaKey}" at target must be typeof boolean.`);
              }
            }
            break;
          }
          case 'string': {
            for (let a = 0, b = targetValue.length; a < b; a += 1) {
              const innerValue = targetValue[a];
              if (typeof innerValue !== 'string') {
                throw Error(`Validation : index "${a}" of "${schemaKey}" at target must be typeof string.`);
              }
            }
            break;
          }
          case 'number': {
            for (let a = 0, b = targetValue.length; a < b; a += 1) {
              const innerValue = targetValue[a];
              if (typeof innerValue !== 'number') {
                throw Error(`Validation : index "${a}" of "${schemaKey}" at target must be typeof number.`);
              } else if (Number.isNaN(innerValue) === true) {
                throw Error(`Validation : index "${a}" of "${schemaKey}" at target must not be NaN.`);
              } else if (Number.isFinite(innerValue) === false) {
                throw Error(`Validation : index "${a}" of "${schemaKey}" at target must be finite.`);
              }
            }
            break;
          }
          default: {
            throw Error(`Validation : "accept" at "${schemaKey}" must be 'boolean'|'string'|'number'.`);
          }
        }
        validated[schemaKey] = [...target[schemaKey]];
        break;
      }
      default: {
        throw Error(`Validation : "type" must be 'boolean'|'string'|'number'|'array', got "${schemaValue.type}".`);
      }
    }
  }
  return validated;
};

module.exports = validateInsertedUpdatedItem;
