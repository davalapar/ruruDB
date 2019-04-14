# ruruDB

## Overview

RuruDB is a document database with basic features for prototyping purposes.

- Fully schema-based, with explicit field `type` and `default`
  - string
  - boolean
  - number
  - string array
  - boolean array
  - number array
- Atomic database file saves
  - Data is first written to `*-temp.rrdb`
  - If `snapshotInterval` has passed, copy `*-current.rrdb` to `*-DATE_TIME-snapshot.rrdb`
  - Stale data in `*-current.rrdb` is transferred to `*-old.rrdb`
  - Data is finally written to `*-curent.rrdb`
- Adaptive file loads
  - Data is first checked at `*-curent.rrdb`
  - If not found, we check at `*-temp.rrdb`
  - If not found, we check at `*-old.rrdb`

## Implementation Term Equivalents

| RuruDB | Google Datastore | MongoDB | MySQL |
|:-:|:-:|:-:|:-:|
| **Table** | Kind | Collection | Table |
| **Item** | Entity | Document | Row |
| **Item ID** | Key Name / Key ID | Document ID | Row Keys / ID |
| **Item Field** | Entity Property | Document Property | Row Column |
| **Query** |Query | Query | Query |

## IMPORTANT

- This module uses `Object.freeze` for immutability & performance
- In JS engines, modifications made on frozen objects fail silently on non-strict mode
- Therefore you must add `'use strict';` on your code to expose such errors
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
- For Babel users: https://babeljs.io/docs/en/next/babel-plugin-transform-strict-mode.html

## Database

- constructor(options) => Database
  - `options.logFunction` Function
  - `options.filename` String
  - `options.directory` String
  - `options.saveFormat` String
    - `json`, `readable_json`, `msgpack`
  - `options.msgpackBufferSize` Number Optional
  - `options.snapshotInterval` String Optional
- async loadDatabaseFile() => undefined
- initTable(tableLabel, itemSchema, outdatedItemUpdater, shouldExist) => undefined
  - `tableLabel` String
  - `itemSchema` Object Schema
  - `outdatedItemUpdater` Function
  - `shouldExist` Boolean Optional
- initKVTable(tableLabel, shouldExist) => undefined
  - `tableLabel` String
  - `shouldExist` Boolean Optional
- async serve() => undefined
- getTable(tableLabel) => Table
  - `tableLabel` String
- getKVTable(tableLabel) => KVTable
  - `tableLabel` String

#### Example code

```js
// db.js

const { Database } = require('rurudb');

const db = new Database({
  filename: 'test',
  directory: './temp',
  saveFormat: 'readable_json',
  logFunction: console.log,
});

module.exports = db;
```

```js
// initialize.js

const db = require('./db');

const initialize = async () => {
  await db.loadDatabaseFile();
  db.initTable(
    'Members',
    {
      name: { type: 'string', default: '' },
      age: { type: 'number', default: 0 },
      onboarded: { type: 'boolean', default: false },
      roles: { type: 'array', accept: 'string' },
    },
    () => {},
  );
  await db.serve();
};

module.exports = initialize;
```

## Table

- randomItemId() => String
- async insertItem(id, data, returnClone) => Item
  - `id` String
  - `data` Object
  - `returnClone` Boolean Optional
- async updateItem(modifiedItem, returnClone) => Item
  - `modifiedItem` Object
  - `returnClone` Boolean Optional
- async updateItemById(id, data, returnClone) => Item
  - `id` String
  - `data` Object
  - `returnClone` Boolean Optional
- async mergeItemById(id, data, returnClone) => Item
  - `id` String
  - `data` Object
  - `returnClone` Boolean Optional
- async removeItem(item) => undefined
  - `item` Object
- async removeItemById(id) => undefined
  - `id` String
- hasId(id) => Boolean
  - `id` String
- fetchItem(id, returnClone) => Item
  - `id` String
  - `returnClone` Boolean Optional
- async clear() => undefined
- async destroy() => undefined
- query() => Query

#### Table Notes

- `directory` must start with `'./'`, ie `'./temp'`
- `msgpackBufferSize` is required when using `msgpack` as value of `saveFormat`
- `snapshotInterval` is only triggered when database has been modified

## KVTable
- async set(key, value) => undefined
  - `key` String
  - `value` Any
- has(key) => boolean
  - `key` String
- get(key) => Any
  - `key` String
- async delete(key) => undefined
  - `key` String
- asnyc clear() => undefined
- async destroy() => undefined

## Query

- offset(value) => Query
  - `value` Number
- limit(value) => Query
  - `value` Number
- ascend(field) => Query
  - `field` String StringField NumberField
- descend(field) => Query
  - `field` String StringField NumberField
- ascendHaversine(field, latitude, longitude) => Query
  - `field` String StringField NumberArrayField
  - `latitude` Number
  - `longitude` Number
- descendHaversine(field, latitude, longitude) => Query
  - `field` String StringField NumberArrayField
  - `latitude` Number
  - `longitude` Number
- sortBy(sortFn) => Query
  - `sortFn` Function
- gt(field, value) => Query
  - `field` String NumberField
  - `value` Number
- gte(field, value) => Query
  - `field` String NumberField
  - `value` Number
- lt(field, value) => Query
  - `field` String NumberField
  - `value` Number
- lte(field, value) => Query
  - `field` String NumberField
  - `value` Number
- eq(field, value) => Query
  - `field` String AnyField
  - `value` Any
- neq(field, value) => Query
  - `field` String AnyField
  - `value` Any
- has(field, value) => Query
  - `field` String ArrayField
  - `value` Any
- hasAnyOf(field, values) => Query
  - `field` String ArrayField
  - `values` Array
- hasAllOf(field, values) => Query
  - `field` String ArrayField
  - `values` Array
- hasNoneOfAny(field, values) => Query
  - `field` String ArrayField
  - `values` Array
- hasNoneOfAll(field, values) => Query
  - `field` String ArrayField
  - `values` Array
- select(...fields) => Query
  - `fields` String StringFields
- hide(...fields) => Query
  - `fields` String StringFields
- filterBy(filterFn) => Query
  - `filterFn` Function
- results(returnClone) => Array
  - `returnClone` Boolean Optional
- firstResult(returnClone) => Item
  - `returnClone` Boolean Optional
- hasResults(returnClone) => Boolean
  - `returnClone` Boolean Optional
- countResults(returnClone) => Number
  - `returnClone` Boolean Optional


#### Notes on `filterBy(filterFn)`

- `filterBy`'s `filterFn` must accept `(item: Item, id: string)` and return `boolean`
  - Check out `Array.filter` at MDN for reference

#### Notes on `ascend(field)`, `descend(field)` and `sortBy(sortFn)`

- Sorts can be stacked, meaning you can sort by multiple fields easily
- `ascend` & `descend` are designed for sorting of `string` and `number` fields
- `sortBy`'s `sortFn` must accept `(a: Item, b: Item)` and return `number`
  - Check out `Array.sort` at MDN for reference

#### Notes on `results(returnClone)`

- Returned items are immutable / frozen objects, pass `returnClone=true` to return mutable objects
- Modifying the results directly won't affect stored data, unless you use `Table.updateItem(item)` on them

## Changelog

- 1.x.x - 8.x.x
  - Initial releases
- 9.0.0
  - Refactor to Javascript from Typescript
  - Fully schema-based
  - Consistent & readable type-checks
  - Use of frozen objects for immutability & performance
  - Query helpers
    - results()
    - firstResult()
    - hasResults()
    - countResults()
- 9.1.x
  - `Query.js` : Add Haversine sort methods
    - Query().ascendHaversine(field, latitude, longitude);
    - Query().descendHaversine(field, latitude, longitude);
  - `validateSchema.js` : Fix typos 
  - `Query.js` : Schema-based type-checks on `field` parameters
  - `validateLoadedItem.js` : Fix detection of unexpected keys
  - `Database.js` : Make errors more verbose
  - `Table.js` : Make errors more verbose
  - `validateInsertedUpdatedItem.js` : Make errors more verbose
  - `validateLoadedItem.js` : Make errors more verbose
  - `validateSchema.js` : Make errors more verbose
  - `@9.1.3` `Query.js` : Fix `ascend()` and `descend()` parameter type checks
  - `@9.1.3` `README.md` : Fix `ascendHaversine()` and `descendHaversine()` return values
  - `@9.1.4` `Table.js` : Fix error verbosity by showing table names
  - `@9.1.5` `Table.js` : Fix `initKVTable()`

MIT | @davalapar
