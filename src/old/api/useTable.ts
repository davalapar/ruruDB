import * as Methods from '../internals/methods';
import {
  useTableParameters,
  useTableReturnType
} from '../internals/types';

export const useTable = async (
  label: useTableParameters[0]
) : (
  Promise<useTableReturnType>
) => {
  const table = await Methods.useTable(label);
  return table;
};