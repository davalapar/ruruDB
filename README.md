# ruruDB

document database for gangstas

RuruDB is a document database which aims to provide the most basic features, useful for prototyping & migration.

## Perks

- Written in TypeScript
- Balance between type-safety, file-safety and performance
- Atomic database saving
  - Data is first written to `*.rrdb.temp`
  - We then rename `*.rrdb` to `*.rrdb.old`
  - Finally, we rename `*.rrdb.temp` to `*.rrdb`
- Accepts custom Item types
- Tested with Jest

```ts
interface User {
  name: string;
  age: number;
}
const usersTable = useTable<User> ('users');
```

| Code | Tests | Functions | Returns | Description |
|:-:|:-:|:--|:-|:--|
| OK | - | useDatabase (filename, directory) | null | Select / create / load a database |
| OK | - | useTable (label, database) | Table | Select / create a table |
| OK | - | clearTable (table) | void | Clear a table |
| OK | - | removeTable (table) | void | Remove  a table |
| OK | - | insertItem (table, data, id) | Item | Inserts an item into a table |
| OK | - | updateItem (item) | void | Update / overwrite an item |
| OK | - | updateItemByID (table, id, data) | Item | Update / overwrite an item, by ID |
| OK | - | mergeItemByID (table, id, data) | Item | Merges supplied data to an item, by ID |
| OK | - | removeItem (item) | void | Remove an item |
| OK | - | removeItemByID (table, id) | void | Remove an item, by ID |
| OK | - | getItemID (item) | ItemId | Return an item's ID |
| OK | - | getItemByID (table, id) | Item | Return an item, from ID |
| OK | - | createQuery (table) | Query Methods | Creates a query against a table |
| OK | - | ~ offset (value) | Query Methods | Sets offset of query results |
| OK | - | ~ limit (value) | Query Methods | Sets limit of query results |
| OK | - | ~ ascend (field) | Query Methods | Ascend a string / number field |
| OK | - | ~ descend (field) | Query Methods | Descend a string / number field |
| OK | - | ~ gt (field, value) | Query Methods | Greater than |
| OK | - | ~ gte (field, value) | Query Methods | Greater than or equal |
| OK | - | ~ lt (field, value) | Query Methods | Less than |
| OK | - | ~ lte (field, value) | Query Methods | Less than or equal |
| OK | - | ~ eq (field, value) | Query Methods | Equal |
| OK | - | ~ neq (field, value) | Query Methods | Not equal |
| OK | - | ~ has (field, value) | Query Methods | Has value |
| OK | - | ~ hasAnyOf (field, values) | Query Methods | Has any of values |
| OK | - | ~ hasAllOf (field, values) | Query Methods | Has all of values |
| OK | - | ~ withoutAnyOf (field, values) | Query Methods | Has none of any values |
| OK | - | ~ withoutAllOf (field, values) | Query Methods | Has none of all values |
| OK | - | ~ select (...fields) | Query Methods | Select fields |
| OK | - | ~ hide (...fields) | Query Methods | Hide fields |
| - | - | ~ sortBy (sortFn) | Query Methods | Sort by function |
| - | - | ~ extendWith (symbol, valueFn) | Query Methods | Attach a symbol, with value |
| - | - | ~ filterBy (filterFn) | Query Methods | Filter by function |
| - | - | ~ groupBy (groupFn) | Query Methods | Group by function |
| - | - | ~ partitionBy (partitionFn) | Query Methods | Partition by function |
| OK | - | ~ results () | Items[] | Return query results |

## Database Term Equivalents

| RuruDB | Google Datastore | MongoDB | MySQL |
|:-:|:-:|:-:|:-:|
| **Table** | Kind | Collection | Table |
| **Item** | Entity | Document | Row |
| **Item ID** | Key Name / Key ID | Document ID | Row Keys / ID |
| **Item Field** | Entity Property | Document Property | Row Column |
| **Query** |Query | Query | Query |

## Key & Value support for Items

#### Keys

| Type | Supported? |
|:--|:-:|
| String | Yes |
| Symbols | - |

#### Values

| Type | Supported? |
|:--|:-:|
| Boolean | Yes |
| String | Yes |
| Number | Yes |
| Undefined | Yes |
| Null | Yes |
| Plain Objects | Yes |
| Plain Arrays | Yes |
| NaN | - |
| +Infinity | - |
| -Infinity | - |
| Functions | - |
| Symbols | - |
| Class Objects | - |
| Class Instance Objects | - |
| Typedarrays | - |
| Maps | - |
| Sets | - |
| WeakMaps | - |
| WeakSets | - |

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
