
export enum Actions {
  useDatabase,
  useTable,
}

export interface Table {
  ids: ItemId[],
  items: Item[],
  index: Map<ItemId, Item>,
}

export interface TableIdentifier {
  readonly label: string;
}

export type ItemId = string;
export type Item = Record<string, string|string[]|number|number[]>;

export type Queue = NonNullable<[Function, Function]>[];

export type useDatabase = (label: string, directory: string) => null;
export type useDatabaseParameters = Parameters<useDatabase>;
export type useDatabaseReturnType = ReturnType<useDatabase>;

export type useTable = (label: string) => TableIdentifier;
export type useTableParameters = Parameters<useTable>;
export type useTableReturnType = ReturnType<useTable>;

export type ResponseResult = null
  | useDatabaseReturnType
  | useTableReturnType;
export type ResponseError = string[];
export type Response = [ResponseResult, ResponseError];

export type Request = [Actions, useDatabaseParameters]
  | [Actions, useTableParameters];

export interface GenericTable<Item> {
  ids: ItemId[],
  items: Item[],
  index: Map<ItemId, Item>,
}

export interface User {
  name?: string;
  age?: number;
}
