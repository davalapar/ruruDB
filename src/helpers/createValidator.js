
const isPlainObject = require('lodash/isPlainObject');

const createValidator = (scope) => {
  if (typeof scope !== 'string' || scope === '') {
    throw Error('validate : "scope" must be a non-empty string');
  }
  return (label) => {
    if (typeof label !== 'string' || label === '') {
      throw Error('validate : "label" must be a non-empty string');
    }
    return {
      asString: (value) => {
        if (typeof value !== 'string' || value === '') {
          throw Error(`${scope} : "${label}" must be a non-empty string`);
        }
      },
      asNumber: (value) => {
        if (typeof value !== 'number') {
          throw Error(`${scope} : "${label}" must be a number`);
        } else if (Number.isNaN(value) === true) {
          throw Error(`${scope} : "${label}" must not be NaN`);
        } else if (Number.isFinite(value) === false) {
          throw Error(`${scope} : "${label}" must be finite`);
        }
      },
      asObject: (value) => {
        if (isPlainObject(value) === false) {
          throw Error(`${scope} : "${label}" must be a plain object`);
        }
      },
      asFunction: (value) => {
        if (typeof value !== 'function') {
          throw Error(`${scope} : "${label}" must be a plain object`);
        }
      },
      asOneOf: (array, value) => {
        if (Array.isArray(array) === false) {
          throw Error('asOneOf : "array" must be a plain array');
        }
        if (array.includes(value) === false) {
          throw Error(`${scope} : "${label}" not found in "${array.join(', ')}"`);
        }
      },
    };
  };
};

module.exports = { createValidator };
