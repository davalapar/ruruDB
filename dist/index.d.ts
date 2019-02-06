export declare type PlainArray = (string | number | boolean | undefined | null)[];
export declare type PlainObject = Record<string, (string | number | boolean | undefined | null)>;
export declare type Values = string | number | boolean | undefined | null | PlainArray | PlainObject;
export declare type ItemId = string | number;
export declare type Item = Record<string, Values>;
interface Table {
    Label: string;
    Ids: ItemId[];
    Items: Item[];
    Index: Map<ItemId, Item>;
}
interface GenericTable<GenericItem extends Item> {
    Label: string;
    Ids: ItemId[];
    Items: GenericItem[];
    Index: Map<ItemId, GenericItem>;
}
export declare const useDatabase: (label: string, directory: string) => void;
export declare const useTable: (label: string) => Table;
export declare const useGenericTable: <T extends Record<string, Values>>(label: string) => GenericTable<T>;
export declare const clearTable: (table: Table) => void;
export declare const removeTable: (table: Table) => void;
export declare const insertItem: (table: Table, data: Record<string, Values>, id: string) => Record<string, Values>;
export declare const updateItem: (modifiedItem: Record<string, Values>) => void;
export declare const updateItemByID: (table: Table, id: string | number, data: Record<string, Values>) => Record<string, Values>;
export declare const mergeItemByID: (table: Table, id: string | number, data: Record<string, Values>) => Record<string, Values>;
export declare const removeItem: (item: Record<string, Values>) => void;
export declare const removeItemByID: (table: Table, id: string | number) => void;
export declare const getItemID: (item: Record<string, Values>) => string | number;
export declare const getItemByID: (table: Table, id: string | number) => Record<string, Values>;
export {};
//# sourceMappingURL=index.d.ts.map