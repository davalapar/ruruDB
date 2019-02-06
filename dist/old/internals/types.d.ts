export declare enum Actions {
    useDatabase = 0,
    useTable = 1
}
export interface Table {
    ids: ItemId[];
    items: Item[];
    index: Map<ItemId, Item>;
}
export interface TableIdentifier {
    readonly label: string;
}
export declare type ItemId = string;
export declare type Item = Record<string, string | string[] | number | number[]>;
export declare type Queue = NonNullable<[Function, Function]>[];
export declare type useDatabase = (label: string, directory: string) => null;
export declare type useDatabaseParameters = Parameters<useDatabase>;
export declare type useDatabaseReturnType = ReturnType<useDatabase>;
export declare type useTable = (label: string) => TableIdentifier;
export declare type useTableParameters = Parameters<useTable>;
export declare type useTableReturnType = ReturnType<useTable>;
export declare type ResponseResult = null | useDatabaseReturnType | useTableReturnType;
export declare type ResponseError = string[];
export declare type Response = [ResponseResult, ResponseError];
export declare type Request = [Actions, useDatabaseParameters] | [Actions, useTableParameters];
export interface GenericTable<Item> {
    ids: ItemId[];
    items: Item[];
    index: Map<ItemId, Item>;
}
export interface User {
    name?: string;
    age?: number;
}
//# sourceMappingURL=types.d.ts.map