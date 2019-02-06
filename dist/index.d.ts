declare type Values = string | number | boolean | null | undefined;
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
    withoutAnyOf(field: string, values: Values[]): Query<Item>;
    withoutAllOf(field: string, values: Values[]): Query<Item>;
    select(fields: string[]): Query<Item>;
    hide(fields: string[]): Query<Item>;
    results(): Item[];
}
declare class Table<Item> {
    private label;
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
    index: Map<string, Table<unknown>>;
    constructor(filename: string, directory: string);
    private load;
    save(): void;
    useTable<Item>(label: string): Table<Item>;
}
export {};
//# sourceMappingURL=index.d.ts.map