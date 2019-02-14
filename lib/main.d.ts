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
    select(fields: string[]): Query<ExtendedItem>;
    hide(fields: string[]): Query<ExtendedItem>;
    filterBy(filterFn: (item: Item) => boolean): Query<ExtendedItem>;
    private finalize;
    ids(): string[];
    items(): Item[];
    entries(): [string, Item][];
    results(): [string[], Item[]];
}
export declare class PseudoTable<ExtendedItem extends Item> {
    label: string;
    index: Map<string, Item>;
    refTable: Table<ExtendedItem>;
    removedItemIds: Set<string>;
    constructor(label: string, refTable: Table<ExtendedItem>);
    randomItemId(): string;
    insertItem(id: string, data: ExtendedItem): ExtendedItem;
    updateItem(modified: ExtendedItem): void;
    updateItemById(id: string, data: ExtendedItem): ExtendedItem;
    mergeItemById(id: string, data: ExtendedItem): ExtendedItem;
    removeItem(item: ExtendedItem): void;
    removeItemById(id: string): void;
    fetchItem(id: string): ExtendedItem;
}
export declare class Transaction {
    private database;
    private index;
    constructor(database: Database);
    exec(execFn: (fetchTable: <ExtendedItem extends Item>(label: string) => PseudoTable<ExtendedItem>) => void): Promise<void>;
}
export declare class Table<ExtendedItem extends Item> {
    label: string;
    private database;
    index: Map<string, Item>;
    constructor(label: string, database: Database, mustExist?: boolean);
    randomItemId(): string;
    insertItem(id: string, data: ExtendedItem): Promise<ExtendedItem>;
    updateItem(modified: ExtendedItem): Promise<void>;
    updateItemById(id: string, data: ExtendedItem): Promise<ExtendedItem>;
    mergeItemById(id: string, data: ExtendedItem): Promise<ExtendedItem>;
    removeItem(item: ExtendedItem): Promise<void>;
    removeItemById(id: string): Promise<void>;
    fetchItem(id: string): ExtendedItem;
    clearTable(): Promise<void>;
    removeTable(): Promise<void>;
    createQuery(): Query<ExtendedItem>;
}
export declare class Database {
    private filename;
    private directory;
    private main;
    private temp;
    private old;
    private snapshotInterval;
    private lastSnapshotTimestamp;
    index: Map<string, Table<Item>>;
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
    useTable(label: string, mustExist: boolean): Table<Item>;
}
//# sourceMappingURL=main.d.ts.map