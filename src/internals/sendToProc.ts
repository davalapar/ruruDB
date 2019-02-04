
/**
 * Definitions:
 */

// Imports
import path from 'path';
import { fork } from 'child_process';

// Types
type Queue = NonNullable<[Function, Function]>[];
type Message = [string[]|null, object[]|null];
type NonUndefined<X> = X extends undefined ? never : X;
// Functions
const createError = (message: string, stack: string): Error => {
  const error = Error(message);
  error.stack = stack;
  return error;
};

const queue: Queue = [];

const proc = fork(
  path.resolve(__dirname, './proc.js'),
  [],
  // @ts-ignore
  { detached: true, stdio: 'pipe' }
);

proc.stdout.pipe(process.stdout);

proc.on('message', ([error, result]: Message) => {
  const [resolve, reject] = (queue.shift() as NonUndefined<[Function, Function]>);
  if (error) {
    const [message, stack] = error;
    reject(createError(message, stack));
  } else {
    resolve(result);
  }
});

export const sendToProc: Function = (action: Function, ...parameters: []) : Promise<object|null> => new Promise((resolve, reject) => {
  queue.push([resolve, reject]);
  proc.send([action, parameters]);
});