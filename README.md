# ruruDB

document database for gangstas

RuruDB is a document database which aims to provide the most basic features, useful if you are bootstrapping a product or migrating between vendors such as Google Cloud Datastore.

## Rewrite

| Before | After |
|:--|:--|
| Vanila JS | TypeScript |
| Runs on same process | Runs on separate process |
| Loaded in memory of same process | Loaded in memory of separate process |
| Database is saved by separate tables per file | Database is saved as a whole single file |
| Saved using asynchronous file system functions | Saved using synchronous file system functions |
| Focused on performance | Focused on stability & file safety, over performance |
| Uses temp & main file | Uses temp, main & old file |
| No transaction support | Supports functional transactions / batch updates |
| Uses ES6 symbols | Only in main process, to track items |
| Supports ajv JSON schemas | Only in main process, to pre-validate items |
| Supports random ID generation | Yes, in child process |
| Accurate error stack traces | Both in main process & child process |
| Asynchronous API | Yes |
| Internally synchronous | Yes |
| Has Jest tests & Istanbul code coverage | Yes |

| Status | Functions | Description |
|:-:|:--|:--|
| - | useDatabase (directory, filename) | Creates a new database, loads any existing records from file |
| - | useTable (label, schema) | Creates new table, loads any existing records from file |
| - | clearTable (table) | Clears a table |
| - | removeTable (table) | Removes a table |
| - | insertItem (table, data, id) | Inserts an item into a table |
| - | updateItem (item) | Overwrites an existing item |
| - | updateItemByID (table, id, data) | Overwrites an existing item by ID |
| - | mergeItemByID (table, id, data) | Merges supplied object to an existing item |
| - | removeItem (item) | Removes an item |
| - | removeItemByID (table, id) | Removes an item by ID |
| - | getItemID (item) | Returns an item's ID |
| - | getItemByID (table, id) | Returns an item from ID |
| - | newQuery (table) | Creates a query against the table |
| - | ~ offset (value) | Sets offset of query results |
| - | ~ limit (value) | Sets limit of query results |
| - | ~ ascend (field) | Ascend a string / number field |
| - | ~ descend (field) | Descend a string / number field |
| - | ~ sortBy (sortFn) | Sort by function |
| - | ~ gt (field, value) | Greater than |
| - | ~ gte (field, value) | Greater than or equal |
| - | ~ lt (field, value) | Less than |
| - | ~ lte (field, value) | Less than or equal |
| - | ~ eq (field, value) | Equal |
| - | ~ neq (field, value) | Not equal |
| - | ~ has (field, value) | Has value |
| - | ~ hasAnyOf (field, values) | Has any of values |
| - | ~ hasAllOf (field, values) | Has all of values |
| - | ~ hasNoneOfAny (field, values) | Has none of any values |
| - | ~ hasNoneOfAll (field, values) | Has none of all values |
| - | ~ selectFields (...fields) | Select fields |
| - | ~ hideFields (...fields) | Hide fields |
| - | ~ extendWith (symbol, valueFn) | Attach a symbol, with value |
| - | ~ filterBy (filterFn) | Filter by function |
| - | ~ groupBy (groupFn) | Group by function |
| - | ~ partitionBy (partitionFn) | Partition by function |
| - | ~ results () : Array | Return query results |

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

## Implementation status & test coverage

#### Internals

| Method | Code | Jest |
|:--|:-:|:-:|
| deepClone | - | - |
| isPlainObject | - | - |

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
