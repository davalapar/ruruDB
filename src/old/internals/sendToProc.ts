
/**
 * Definitions:
 */

// Imports
import path from 'path';
import { fork } from 'child_process';
import { Queue, Response } from './types';

// Functions
const createError = (message: string, stack: string): Error => {
  const error = Error(message);
  error.stack = stack;
  return error;
};

export const queue: Queue = [];

export const proc = fork(
  path.resolve(__dirname, './proc.js'),
  [],
  // @ts-ignore
  { detached: true, stdio: 'pipe' }
);

proc.stdout.pipe(process.stdout);

proc.on('message', ([result, error]: Response) => {
  const [resolve, reject] = (queue.shift() as NonNullable<[Function, Function]>);
  if (error) {
    const [message, stack] = error;
    reject(createError(message, stack));
  } else {
    resolve(result);
  }
});

