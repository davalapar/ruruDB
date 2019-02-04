
import { Action } from './enums';

export type ItemId = string;
export type Item = Record<string, string|string[]|number|number[]>;
export type NonUndefined<X> = X extends undefined ? never : X;
export type useDatabase = [string, string];
export type Data = [
  Action,
  useDatabase
];