
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
      asArray: (value) => {
        if (Array.isArray(value) === false) {
          throw Error(`${scope} : "${label}" must be a plain array`);
        }
      },
      asArrayOfStrings: (value) => {
        if (Array.isArray(value) === false) {
          throw Error(`${scope} : "${label}" must be a plain array`);
        }
        for (let i = 0, l = value.length; i < l; i += 1) {
          if (typeof value[i] !== 'string' || value[i] === '') {
            throw Error(`${scope} : index "${i}" of "${label}" must be a non-empty string`);
          }
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
      asArrayValues: (array1, array2) => {
        if (Array.isArray(array1) === false) {
          throw Error('asArrayValues : "array1" must be a plain array');
        }
        if (Array.isArray(array2) === false) {
          throw Error('asArrayValues : "array2" must be a plain array');
        }
        for (let i = 0, l = array2.length; i < l; i += 1) {
          if (array1.includes(array2[i]) === false) {
            throw Error(`${scope} : index "${i}" of "${label}" not found in "${array1.join(', ')}"`);
          }
        }
      },
      asInstanceOf: (targetClass, expectedClassInstance) => {
        if (typeof targetClass !== 'object' || targetClass === null) {
          throw Error('asInstanceOf : "targetClass" must be an object');
        }
        if (typeof targetClass.name !== 'string' || targetClass.name === '') {
          throw Error('asInstanceOf : "targetClass" must have "name" non-empty string property');
        }
        if (typeof expectedClassInstance !== 'object' || expectedClassInstance === null) {
          throw Error('asInstanceOf : "expectedClassInstance" must be an object');
        }
        if (expectedClassInstance instanceof targetClass === false) {
          throw Error(`${scope} : "${label}" must be an instance of "${targetClass.name}"`);
        }
      },
    };
  };
};

module.exports = createValidator;
