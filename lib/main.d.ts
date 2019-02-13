export declare type AcceptedValues = string | number | boolean | null | undefined;
export interface Item {
    readonly id?: string;
    readonly table?: string;
    [key: string]: AcceptedValues | (AcceptedValues)[];
}
export declare class Query {
    private resultItems;
    private queryOffset;
    private queryLimit;
    private sorts;
    private selectedFields;
    private hiddenFields;
    constructor(table: Table);
    offset(value: number): Query;
    limit(value: number): Query;
    ascend(field: string): Query;
    descend(field: string): Query;
    sortBy(sortFn: (a: Item, b: Item) => number): Query;
    gt(field: string, value: number): Query;
    gte(field: string, value: number): Query;
    lt(field: string, value: number): Query;
    lte(field: string, value: number): Query;
    eq(field: string, value: number): Query;
    neq(field: string, value: number): Query;
    has(field: string, value: (AcceptedValues)): Query;
    hasAnyOf(field: string, values: (AcceptedValues)[]): Query;
    hasAllOf(field: string, values: (AcceptedValues)[]): Query;
    hasNoneOfAny(field: string, values: (AcceptedValues)[]): Query;
    hasNoneOfAll(field: string, values: (AcceptedValues)[]): Query;
    select(fields: string[]): Query;
    hide(fields: string[]): Query;
    filterBy(filterFn: (item: Item) => boolean): Query;
    results(): [string[], Item[]];
}
export declare class TransactionTable {
    label: string;
    realTable: Table;
    index: Map<string, Item>;
    private removedIds;
    constructor(label: string, table: Table);
    randomItemId(): string;
    insertItem(id: string, data: Item): Item;
    fetchItem(id: string): Item;
    fetchItemId(item: Item): string;
    updateItem(modified: Item): void;
    updateItemById(id: string, data: Item): Item;
    mergeItemById(id: string, data: Item): Item;
    removeItem(item: Item): void;
    removeItemById(id: string): void;
}
export declare class PseudoTable {
    label: string;
    index: Map<string, Item>;
    private refTable;
    private removedItemIds;
    constructor(label: string, refTable: Table);
    randomItemId(): string;
    insertItem(id: string, data: Item): Item;
    updateItem(modified: Item): void;
    updateItemById(id: string, data: Item): Item;
    mergeItemById(id: string, data: Item): Item;
    removeItem(item: Item): void;
    removeItemById(id: string): void;
    fetchItem(id: string): Item;
}
declare type fetchTable = (label: string) => PseudoTable;
export declare class Transaction {
    private database;
    private index;
    constructor(database: Database);
    exec(execFn: (fetchTable: fetchTable) => void): Promise<void>;
}
export declare class Table {
    label: string;
    private database;
    index: Map<string, Item>;
    constructor(label: string, database: Database, mustExist?: boolean);
    randomItemId(): string;
    insertItem(id: string, data: Item): Promise<Item>;
    updateItem(modified: Item): Promise<void>;
    updateItemById(id: string, data: Item): Promise<Item>;
    mergeItemById(id: string, data: Item): Promise<Item>;
    removeItem(item: Item): Promise<void>;
    removeItemById(id: string): Promise<void>;
    fetchItem(id: string): Item;
    clearTable(): Promise<void>;
    removeTable(): Promise<void>;
    createQuery(): Query;
}
export declare class Database {
    private filename;
    private directory;
    private main;
    private temp;
    private old;
    private snapshotInterval;
    private lastSnapshotTimestamp;
    index: Map<string, Table>;
    private saving;
    private queue;
    private mainFd;
    private tempFd;
    private oldFd;
    initializing: boolean;
    initialized: boolean;
    private saveAsFormatted;
    private internalInitializePromise;
    constructor(filename: string, directory: string, saveAsFormatted?: boolean, snapshotInterval?: string);
    initialize(): Promise<void>;
    private internalLoad;
    private internalBeforeSave;
    private internalSaveLoop;
    private internalSave;
    save(): Promise<void>;
    useTable(label: string, mustExist: boolean): Table;
}
export {};
//# sourceMappingURL=main.d.ts.map