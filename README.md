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
- Add `'use strict';` on your code to expose related errors
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze

## Database

- constructor(options) => Database
  - `options.logFunction` Function
  - `options.filename` String
  - `options.directory` String
  - `options.saveFormat` String
    - `json`, `readable_json`, `msgpack`
  - `options.msgpackBufferSize` Number Optional
  - `options.snapshotInterval` String Optional
- async loadDAtabaseFile() => undefined
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

- 1.0.0
  - Feature-complete release
- 1.0.1
  - Remove incorrect types module for `moment`
- 2.0.0
  - Add internal check to ensure `Database().initialize()` is called
  - Use `tinydate` instead of `moment`
  - Add `saveAsFormatted` option
  - Fix snapshot file corruption (wrong file descriptor referenced)
- 2.1.0
  - Fix internal loading (file re-save interference)
- 2.2.0
  - Fix bug on multiple same-table instances (existing table overwritten, no class instance re-use)
  - Add internal checks in creating new tables to ensure database is initialized
- 2.2.1
  - Prevent multiple `Database().initialize()` calls
  - Add `mustExist` parameter for `new Table(label, database, mustExist)` and `Database().useTable(label, mustExist)`
- 2.2.2
  - Stack multiple `Database().initialize()` calls into a single resolving promise
- 3.0.0
  - Rewrite `Query` to return `[ids, item]` format
  - Add some basic tests for `Query`
- 4.0.0
  - Remove usage of Symbols and `// @ts-ignore` lines
  - Change `Table().getItemById(id)` to `Table().fetchItem(id)`
  - Remove `Table().getItemId(id)`
  - Export `Item` interface
  - Implement database file recovery / loading
    - If the directory exists, check for files
    - If `*.rrdb` exists, load it
    - Otherwise if `*.rrdb.temp` exists, load it
    - Otherwise if `*.rrdb.old` exists, load it
    - Otherwise optionally create directory, and just save it as empty db
- 4.1.0
  - Restore interface support
  ```ts
  import { Database, Table, Item } from 'rurudb';
  interface User extends Item {
    id ?: string;
    name: string;
    age: number;
  }
  const db = new Database('test', './temp', false, '30m');
  await db.initialize();
  const users = new Table <User> ('users', db);
  ```
- 4.2.0 `¯\_(ツ)_/¯`
  - Add `Query().ids()`, `Query().items()` & `Query().entries()`
  - Prevent `Query()` mutation once any of `Query().ids()`, `Query().items()`, `Query().entries()` & `Query().results()` are already called
- 5.0.0
  - Add type checks to ensure parameters are plain objects
  - Reduce db filesize (duplicate id entries)
- 5.0.1
  - Add `Query().firstId()` and `Query().firstItem()`
- 6.0.0
  - Remove `Transaction`, due to bugs introduced when involving `Query`
- 6.1.0
  - `Query().firstitem()` to `Query().firstItem()`
- 6.2.0
  - Fix faulty `Query().ascend()` & `Query().descend()`
- 6.3.0
  - Fix `Table().mergeItemById(id, data)`, new `item` not set in `Map`
- 6.4.0
  - Fix faulty `Query().select()` & `Query().hide()`
- 7.0.0
  - Added `KVTable()`
  - Changed `Table().clearTable()` to `Table().clear()`
  - Changed `Table().removeTable()` to `Table().destroy()`
  - Changed `Table().createQuery()` to `Table().query()`
  - Changed `Database().useTable()` to `Database().table(label)`
  - Added `Database().kvtable(label)`
  - Removed `mustExist` parameter on `new Table()`, now `new Table(id, database)`
  - Added versioning on database files, load now checks for major semver version and expected db filename
  - Snapshots now sourced from `main` instead of `old` file
  - Fixed typos on Database pre-constructor
- 8.0.0
  - Rewrite `what-the-pack` msgpack encoder
  - Add `what-the-pack` test coverage checks
  - Create types for `what-the-pack`
  - Use `*.prrdb` for "msgpack" databases
  - Use `*.rrdb` for "json" and "readable_json" databases
  - Benchmark differences: `329KB @ json` becomes `126KB @ msgpack`
- 8.0.x
  - Update `what-the-pack`
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

MIT | @davalapar
