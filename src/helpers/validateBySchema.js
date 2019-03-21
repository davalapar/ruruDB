
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

const validateBySchema = (schema, target) => {
  if (schema === undefined) {
    throw Error('@validateBySchema : "schema" must not be undefined.');
  }
  const schemaKeys = Object.keys(schema);
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
          throw Error(`@validateBySchema : "${schemaKey}" at target must be typeof boolean.`);
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
          throw Error(`@validateBySchema : "${schemaKey}" at target must be typeof string.`);
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
          throw Error(`@validateBySchema : "${schemaKey}" at target must be typeof number.`);
        } else if (Number.isNaN(target[schemaKey]) === true) {
          throw Error(`@validateBySchema : "${schemaKey}" at target must not be NaN.`);
        } else if (Number.isFinite(target[schemaKey]) === false) {
          throw Error(`@validateBySchema : "${schemaKey}" at target must be finite.`);
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
        validated[schemaKey] = [...target[schemaKey]];
        break;
      }
      default: {
        throw Error(`@validateBySchema : "type" must be 'boolean'|'string'|'number'|'array', got "${schemaValue.type}".`);
      }
    }
  }
  return validated;
};

module.exports = { validateBySchema };
