import {
  Actions,
  useDatabaseParameters,
  useDatabaseReturnType,
  useTableParameters,
  useTableReturnType,
} from './types';
import { queue, proc } from './sendToProc';

export const useDatabase = (
  ...parameters : useDatabaseParameters
) : Promise<useDatabaseReturnType> => new Promise((resolve, reject) => {
  queue.push([resolve, reject]);
  proc.send([Actions.useDatabase, parameters]);
});

export const useTable = (
  ...parameters: useTableParameters
) : Promise<useTableReturnType> => new Promise((resolve, reject) => {
  queue.push([resolve, reject]);
  proc.send([Actions.useTable, parameters]);
});