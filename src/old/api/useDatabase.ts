import * as Methods from '../internals/methods';
import {
  useDatabaseParameters,
  useDatabaseReturnType
} from '../internals/types';

export const useDatabase = async (
  label: useDatabaseParameters[0],
  directory: useDatabaseParameters[1],
) : (
  Promise<useDatabaseReturnType>
) => {
  const result = await Methods.useDatabase(label, directory);
  return result;
};