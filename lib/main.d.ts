export declare type AcceptedValues = string | number | boolean | null | undefined;
export interface Item {
    readonly id?: string;
    [key: string]: AcceptedValues | (AcceptedValues)[];
}
export declare class Query<ExtendedItem extends Item> {
    private resultIds;
    private resultItems;
    private slicedItems;
    private queryOffset;
    private queryLimit;
    private sorts;
    private selectedFields;
    private hiddenFields;
    private finalized;
    constructor(table: Table<ExtendedItem>);
    offset(value: number): Query<ExtendedItem>;
    limit(value: number): Query<ExtendedItem>;
    ascend(field: string): Query<ExtendedItem>;
    descend(field: string): Query<ExtendedItem>;
    sortBy(sortFn: (a: Item, b: Item) => number): Query<ExtendedItem>;
    gt(field: string, value: number): Query<ExtendedItem>;
    gte(field: string, value: number): Query<ExtendedItem>;
    lt(field: string, value: number): Query<ExtendedItem>;
    lte(field: string, value: number): Query<ExtendedItem>;
    eq(field: string, value: number): Query<ExtendedItem>;
    neq(field: string, value: number): Query<ExtendedItem>;
    has(field: string, value: (AcceptedValues)): Query<ExtendedItem>;
    hasAnyOf(field: string, values: (AcceptedValues)[]): Query<ExtendedItem>;
    hasAllOf(field: string, values: (AcceptedValues)[]): Query<ExtendedItem>;
    hasNoneOfAny(field: string, values: (AcceptedValues)[]): Query<ExtendedItem>;
    hasNoneOfAll(field: string, values: (AcceptedValues)[]): Query<ExtendedItem>;
    select(...fields: string[]): Query<ExtendedItem>;
    hide(...fields: string[]): Query<ExtendedItem>;
    filterBy(filterFn: (item: Item) => boolean): Query<ExtendedItem>;
    private finalize;
    ids(): string[];
    items(): Item[];
    firstId(): string | undefined;
    firstItem(): Item | undefined;
    entries(): [string, Item][];
    results(): [string[], Item[]];
}
export declare class Table<ExtendedItem extends Item> {
    label: string;
    private database;
    index: Map<string, Item>;
    constructor(label: string, database: Database);
    randomItemId(): string;
    insertItem(id: string, data: ExtendedItem): Promise<ExtendedItem>;
    updateItem(modified: ExtendedItem): Promise<void>;
    updateItemById(id: string, data: ExtendedItem): Promise<ExtendedItem>;
    mergeItemById(id: string, data: ExtendedItem): Promise<ExtendedItem>;
    removeItem(item: ExtendedItem): Promise<void>;
    removeItemById(id: string): Promise<void>;
    fetchItem(id: string): ExtendedItem;
    clear(): Promise<void>;
    destroy(): Promise<void>;
    query(): Query<ExtendedItem>;
}
export declare class KVTable<Value> {
    label: string;
    private database;
    index: Map<string, Value>;
    constructor(label: string, database: Database);
    set(key: string, value: Value): Promise<void>;
    has(key: string): boolean;
    get(key: string): Value;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    destroy(): Promise<void>;
}
interface DatabaseOptions {
    filename: string;
    directory: string;
    saveFormat: "json" | "msgpack" | "readable_json";
    snapshotInterval?: string;
    msgpackBufferSize?: number;
    logFunction?: Function;
}
export declare class Database {
    private filename;
    private directory;
    private main;
    private temp;
    private recent;
    private snapshotInterval;
    private lastSnapshotTimestamp;
    tables: Map<string, Table<Item>>;
    kvtables: Map<string, KVTable<unknown>>;
    private saving;
    private queue;
    private mainFd;
    private tempFd;
    private recentFd;
    initialized: boolean;
    initializing: boolean;
    private saveFormat;
    private msgpackEncode;
    private msgpackDecode;
    private snapshotExtension;
    private internalInitializePromise;
    private logFunction;
    constructor(options: DatabaseOptions);
    initialize(): Promise<void>;
    private internalLoad;
    private internalBeforeSave;
    private internalSaveLoop;
    private internalSave;
    save(): Promise<void>;
    table(label: string): Table<Item>;
    kvtable(label: string): KVTable<unknown>;
}
export {};
//# sourceMappingURL=main.d.ts.map