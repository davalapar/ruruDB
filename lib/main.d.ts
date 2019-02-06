export declare type Values = string | number | boolean | null | undefined;
export declare class Query<Item> {
    private items;
    private queryOffset;
    private queryLimit;
    private sorts;
    private selectedFields;
    private hiddenFields;
    constructor(table: Table<Item>);
    offset(value: number): Query<Item>;
    limit(value: number): Query<Item>;
    ascend(field: string): Query<Item>;
    descend(field: string): Query<Item>;
    gt(field: string, value: number): Query<Item>;
    gte(field: string, value: number): Query<Item>;
    lt(field: string, value: number): Query<Item>;
    lte(field: string, value: number): Query<Item>;
    eq(field: string, value: number): Query<Item>;
    neq(field: string, value: number): Query<Item>;
    has(field: string, value: Values): Query<Item>;
    hasAnyOf(field: string, values: Values[]): Query<Item>;
    hasAllOf(field: string, values: Values[]): Query<Item>;
    hasNoneOfAny(field: string, values: Values[]): Query<Item>;
    hasNoneOfAll(field: string, values: Values[]): Query<Item>;
    select(fields: string[]): Query<Item>;
    hide(fields: string[]): Query<Item>;
    results(): Item[];
}
export declare class Transaction {
    private items;
    private removed;
    private database;
    constructor(database: Database);
    fetchItem<Item>(table: Table<Item>, id: string): Item;
    createItem<Item>(table: Table<Item>, id: string, item: Item): Item;
    removeItem<Item>(item: Item): void;
    removeItemById<Item>(table: Table<Item>, id: string): void;
    commit(): void;
}
export declare const randomItemId: (table: Table<unknown>) => string;
declare class Table<Item> {
    label: string;
    private database;
    ids: string[];
    items: Item[];
    index: Map<string, Item>;
    constructor(label: string, database: Database);
    insertItem(id: string, data: Item): Item;
    clearTable(): void;
    removeTable(): void;
    updateItem(modified: Item): void;
    updateItemById(id: string, data: Item): Item;
    mergeItemById(id: string, data: Item): Item;
    removeItem(item: Item): void;
    removeItemById(id: string): void;
    getItemId(item: Item): string;
    getItemById(id: string): Item;
    createQuery(): Query<Item>;
}
export declare class Database {
    private filename;
    private directory;
    private main;
    private temp;
    private old;
    private snapshotInterval;
    private lastSnapshotTimestamp;
    index: Map<string, Table<unknown>>;
    constructor(filename: string, directory: string, snapshotInterval: string);
    private load;
    save(forceSnapshot?: boolean): void;
    useTable<Item>(label: string): Table<Item>;
}
export {};
//# sourceMappingURL=main.d.ts.map