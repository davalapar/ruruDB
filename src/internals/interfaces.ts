
import { TableItemIds, TableItems, TableItemIndex } from './symbols';
import { ItemId, Item } from './types';

export interface Table {
  [TableItemIds]: ItemId[],
  [TableItems]: Item[],
  [TableItemIndex]: Map<ItemId, Item>,
}