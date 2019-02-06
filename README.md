# ruruDB

*Document database for gangstas*

## Overview

RuruDB is a document database which provides basic features for prototyping & migration purposes.

## Pros

- Written in `TypeScript` & has tests with `Jest`
- Atomic database file saving approach
  - Data is first written to `*.rrdb.temp`
  - We then rename `*.rrdb` to `*.rrdb.old`
  - Finally, we rename `*.rrdb.temp` to `*.rrdb`
- Has built-in `Query` methods
- Supports `string`, `number`, `boolean`, `null` & `undefined` values
- Accepts custom `Item` types

```ts
interface User {
  name: string;
  age: number;
}
const users = db.useTable <User> ('users');
```

## Cons

- Runs in main thread / process
- Currently uses synchronous fs methods (blocks main-thread)
- Currently saves using `JSON.stringify` (large file size)

## Planned Future Improvements

- Run in separate thread / process
- Use asynchronous fs methods (non-blocking)
- Support saving using `MessagePack` (smaller file size)

## Database Term Equivalents

| RuruDB | Google Datastore | MongoDB | MySQL |
|:-:|:-:|:-:|:-:|
| **Table** | Kind | Collection | Table |
| **Item** | Entity | Document | Row |
| **Item ID** | Key Name / Key ID | Document ID | Row Keys / ID |
| **Item Field** | Entity Property | Document Property | Row Column |
| **Query** |Query | Query | Query |

## Code & Test Coverage

| Code | Tests | Database Functions | Returns | Description |
|:-:|:-:|:--|:-|:--|
| `OK` | - | `new Database(filename, directory)` | `Database()` | Selects / creates / loads a database file |

| Code | Tests | Table Functions | Returns | Description |
|:-:|:-:|:--|:-|:--|
| `OK` | - | `Database().useTable <Item> (label)` | `Table()` | Selects / creates a table |
| `OK` | - | `Table().clearTable()` | `void` | Clear a table |
| `OK` | - | `Table().removeTable()` | `void` | Remove  a table |
| `OK` | - | `Table().insertItem(data, id)` | `Item` | Inserts an item into a table |
| `OK` | - | `Table().updateItem(item)` | `void` | Update / overwrite an item |
| `OK` | - | `Table().updateItemByID(id, data)` | `Item` | Update / overwrite an item, by ID |
| `OK` | - | `Table().mergeItemByID(id, data)` | `Item` | Merges supplied data to an item, by ID |
| `OK` | - | `Table().removeItem(item)` | `void` | Remove an item |
| `OK` | - | `Table().removeItemByID(id)` | `void` | Remove an item, by ID |
| `OK` | - | `Table().getItemID(item)` | `string` | Return an item's ID |
| `OK` | - | `Table().getItemByID(, id)` | `Item` | Return an item, from ID |

| Code | Tests | Query Functions | Returns | Description |
|:-:|:-:|:--|:-|:--|
| `OK` | - | `Table().createQuery()` | `Query()` | Creates a query against a table |
| `OK` | - | `new Query(table)` | `Query()` | Creates a query against a table |
| `OK` | - | `Query().offset(value)` | `Query()` | Sets offset of results to return |
| `OK` | - | `Query().limit(value)` | `Query()` | Sets limit of results to return |
| `OK` | - | `Query().ascend(field)` | `Query()` | Ascend results by a string / number field |
| `OK` | - | `Query().descend(field)` | `Query()` | Descend results by a string / number field |
| `OK` | - | `Query().gt(field, value)` | `Query()` | If field is greater than to value |
| `OK` | - | `Query().gte(field, value)` | `Query()` | If field is greater than or equal to value |
| `OK` | - | `Query().lt(field, value)` | `Query()` | If field is less than to value |
| `OK` | - | `Query().lte(field, value)` | `Query()` | If field is less than or equal to value |
| `OK` | - | `Query().eq(field, value)` | `Query()` | If field is equal to value |
| `OK` | - | `Query().neq(field, value)` | `Query()` | If field is not equal to value |
| `OK` | - | `Query().has(field, value)` | `Query()` | If array field has specified value |
| `OK` | - | `Query().hasAnyOf(field, values)` | `Query()` | If array field has any of specified values |
| `OK` | - | `Query().hasAllOf(field, values)` | `Query()` | If field has all of specified values |
| `OK` | - | `Query().hasNoneOfAny(field, values)` | `Query()` | If array field has none of any specified values |
| `OK` | - | `Query().hasNoneOfAll(field, values)` | `Query()` | If array field has none of all specified values |
| `OK` | - | `Query().select(fields)` | `Query()` | Select fields |
| `OK` | - | `Query().hide(fields)` | `Query()` | Hide fields |
| - | - | `Query().sortBy(sortFn)` | `Query()` | Sort by function |
| - | - | `Query().filterBy(filterFn)` | `Query()` | Filter by function |
| - | - | `Query().groupBy(groupFn)` | `Query()` | Group by function |
| - | - | `Query().partitionBy(partitionFn)` | `Query()` | Partition by function |
| `OK` | - | `Query().results()` | `Items[]` | Return query results |

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

## Google Datastore Wrapper

| Method | Code | Jest |
|:--|:-:|:-:|
| Entity : constructor () : `Object` | - | - |
| Entity : fromKey () : `Object` | - | - |
| Entity : fromUUID () : `Object` | - | - |
| Entity : fromFilters () : `Object` | - | - |
| Entity : upsert () : `Object` | - | - |
| Entity : merge () : `Object` | - | - |
| Entity : delete () : `Object` | - | - |
| Entity : fetch () : `Object` | - | - |
| Query : constructor () : `Object` | - | - |
| Query : filter () : `Object` | - | - |
| Query : offset () : `Object` | - | - |
| Query : limit () : `Object` | - | - |
| Query : ascend () : `Object` | - | - |
| Query : descend () : `Object` | - | - |
| Query : runQuery () : `Object` | - | - |
| Query : cache support | - | - |
| Transaction : constructor () : `Object` | - | - |
| Transaction : keys () : `Object` | - | - |
| Transaction : exec () : `Object` | - | - |

MIT | @davalapar
