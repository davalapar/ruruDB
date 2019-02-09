# ruruDB

## Overview

RuruDB is a document database with basic features for prototyping purposes.

## Pros

- Written in `TypeScript` & has tests with `Jest`
- Asynchronous `Database`, `Table` & `Transaction` methods
- Synchronous `Query` methods, built-in
- Uses low-level file descriptors for performance
- Database file snapshots
- Atomic database file saves
  - Data is first written to `*.rrdb.temp`
  - Stale data in `*.rrdb` is transferred do `*.rrdb.old`
  - Data is finally written to `*.rrdb`
- Supports `string`, `number`, `boolean`, `null`, `undefined`, `Object` & `Array` properties
- Readable output, uses `JSON.stringify()` for encoding
- Supports custom `Item` interfaces
  ```ts
  interface User {
    name: string;
    age: number;
  }
  const users = new Table <User> (db);
  ```

## Planned Future Improvements

- Support saving using `MessagePack`
  - Smaller file size
  - Support for `Typedarrays`, `NaN`, `+Infinity` & `-Infinity` values

## Implementation Term Equivalents

| RuruDB | Google Datastore | MongoDB | MySQL |
|:-:|:-:|:-:|:-:|
| **Table** | Kind | Collection | Table |
| **Item** | Entity | Document | Row |
| **Item ID** | Key Name / Key ID | Document ID | Row Keys / ID |
| **Item Field** | Entity Property | Document Property | Row Column |
| **Query** |Query | Query | Query |

## `Database`

```ts
import { Database } from 'rurudb';

const db = new Database('mydbfile', './myfolder');
await db.initialize();
```

| Code | Tests | Async? | Database Functions | Returns | Description |
|:-:|:-:|:-:|:--|:-|:--|
| `OK` | - | - | `new Database(filename, directory)` | `Database()` | Creates a database instance |
| `OK` | - | `Yes` | `await Database().initialize()` | `Promise<void>` | Creates / loads the database file |
| `OK` | - | - | `Database().useTable <Item> (label)` | `Table()` | Selects / creates a table |

## `Table`

```ts
import { Database, Table } from 'rurudb';

const db = new Database('mydbfile', './myfolder');
await db.initialize();

interface User {
  name: string;
  age: number;
}

const users = new Table <User> (db);

const alice = await users.insertItem(users.randomItemId(), {
  name: 'alice',
  age: 27
});
```

| Code | Tests | Async? | Table Functions | Returns | Description |
|:-:|:-:|:-:|:--|:-|:--|
| `OK` | - | - | `new Table <Item> (database)` | `Table()` | Selects / creates a table |
| `OK` | - | - | `Table().randomItemId()` | `string` | Returns a uuidv4 string id |
| `OK` | - | `Yes` | `await Table().insertItem(id, data)` | `Promise<Item>` | Inserts an item into a table |
| `OK` | - | `Yes` | `await Table().updateItem(modifiedItem)` | `Promise<void>` | Update / overwrite an item |
| `OK` | - | `Yes` | `await Table().updateItemByID(id, data)` | `Promise<Item>` | Update / overwrite an item, by ID |
| `OK` | - | `Yes` | `await Table().mergeItemByID(id, data)` | `Promise<Item>` | Merges supplied data to an item, by ID |
| `OK` | - | `Yes` | `await Table().removeItem(item)` | `Promise<void>` | Remove an item |
| `OK` | - | `Yes` | `await Table().removeItemByID(id)` | `Promise<void>` | Remove an item, by ID |
| `OK` | - | - | `Table().getItemID(item)` | `string` | Return an item's ID |
| `OK` | - | - | `Table().getItemByID(, id)` | `Item` | Return an item, from ID |
| `OK` | - | `Yes` | `await Table().clearTable()` | `Promise<void>` | Clear a table |
| `OK` | - | `Yes` | `await Table().removeTable()` | `Promise<void>` | Remove  a table |
| `OK` | - | - | `Table().createQuery()` | `Query()` | Creates a query against a table |

## `Query`

```ts
import { Query } from 'rurudb';
```

| Code | Tests | Async? | Functions | Returns | Description |
|:-:|:-:|:-:|:--|:-|:--|
| `OK` | - | - | `new Query <Item> (table)` | `Query()` | Creates a query against a table |
| `OK` | - | - | `Query().offset(value)` | `Query()` | Sets offset of results to return |
| `OK` | - | - | `Query().limit(value)` | `Query()` | Sets limit of results to return |
| `OK` | - | - | `Query().ascend(field)` | `Query()` | Ascend results by a string / number field |
| `OK` | - | - | `Query().descend(field)` | `Query()` | Descend results by a string / number field |
| `OK` | - | - | `Query().gt(field, value)` | `Query()` | If field is greater than to value |
| `OK` | - | - | `Query().gte(field, value)` | `Query()` | If field is greater than or equal to value |
| `OK` | - | - | `Query().lt(field, value)` | `Query()` | If field is less than to value |
| `OK` | - | - | `Query().lte(field, value)` | `Query()` | If field is less than or equal to value |
| `OK` | - | - | `Query().eq(field, value)` | `Query()` | If field is equal to value |
| `OK` | - | - | `Query().neq(field, value)` | `Query()` | If field is not equal to value |
| `OK` | - | - | `Query().has(field, value)` | `Query()` | If array field has specified value |
| `OK` | - | - | `Query().hasAnyOf(field, values)` | `Query()` | If array field has any of specified values |
| `OK` | - | - | `Query().hasAllOf(field, values)` | `Query()` | If field has all of specified values |
| `OK` | - | - | `Query().hasNoneOfAny(field, values)` | `Query()` | If array field has none of any specified values |
| `OK` | - | - | `Query().hasNoneOfAll(field, values)` | `Query()` | If array field has none of all specified values |
| `OK` | - | - | `Query().select(fields)` | `Query()` | Select fields |
| `OK` | - | - | `Query().hide(fields)` | `Query()` | Hide fields |
| `OK` | - | - | `Query().sortBy(sortFn)` | `Query()` | Sort by function, must return a `number` |
| `OK` | - | - | `Query().filterBy(filterFn)` | `Query()` | Filter by function, must return a `boolean` |
| `OK` | - | - | `Query().results()` | `Items[]` | Return query results |

#### Notes on `filterBy(filterFn)`

- `filterBy`'s `filterFn` must accept `(item: Item, id: string)` and return `boolean`
  - Check out `Array.filter` at MDN for reference

#### Notes on `ascend(field)`, `descend(field)` and `sortBy(sortFn)`

- Sorts can be stacked, meaning you can sort by multiple fields easily
- `ascend` & `descend` are designed for sorting of `string` and `number` fields
- `sortBy`'s `sortFn` must accept `(a: Item, b: Item)` and return `number`
  - Check out `Array.sort` at MDN for reference

#### Notes on `results()`

- Returned items are clones
- Modifying them directly won't affect stored data, unless you use `Table.updateItem(item)` on them

## `Transaction`

```ts
import { Transaction } from 'rurudb';
```

| Code | Tests | Async? | Functions | Returns | Description |
|:-:|:-:|:-:|:--|:-|:--|
| `OK` | - | - | `new Transaction(database)` | `Transaction()` | Creates a transaction against a database |
| `OK` | - | - | `Transaction().fetchItem <Item> (table, id)` | `Item` | Fetches an item from a table |
| `OK` | - | - | `Transaction().createItem <Item> (table, id, data)` | `Item` | Creates an item for a table |
| `OK` | - | - | `Transaction().removeItem <Item> (item)` | `void` | Removes an item from a table |
| `OK` | - | - | `Transaction().removeItemById(id)` | `void` | Removes an item by id from a table |
| `OK` | - | `Yes` | `await Transaction().commit()` | `Promise<void>` | Commits all changes made in this Transaction |

## Item Interface Support

- Supported Keys
  - string
- Supported Values
  - Boolean
  - String
  - Number
  - Undefined
  - Null
  - Objects
  - Arrays
- Non-supported Values
  - Symbols `(Impossible, values are runtime unique)`
  - Class Objects `(Impossible, loses methods etc)`
  - Class Instance Objects `(Impossible, loses methods etc)`
  - Functions `(Impossible, loses context)`
  - NaN `(No JSON.stringify support)`
  - +Infinity `(No JSON.stringify support)`
  - -Infinity `(No JSON.stringify support)`
  - Typedarrays `(No JSON.stringify support)`
  - Maps `(No JSON.stringify support)`
  - Sets `(No JSON.stringify support)`
  - WeakMaps `(No JSON.stringify support)`
  - WeakSets `(No JSON.stringify support)`

MIT | @davalapar
