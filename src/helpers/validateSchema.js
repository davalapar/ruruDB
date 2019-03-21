
const isPlainObject = require('lodash/isPlainObject');

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
        throw Error(`@validateBySchema : "type" must be 'boolean'|'string'|'number'|'array', got "${schemaValue.type}".`);
      }
    }
  }
};

module.exports = { validateSchema };
