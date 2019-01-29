
import path from 'path';
import { fork } from 'child_process';
import { promises } from 'fs';

const proc = fork(
  path.resolve(__dirname, './proc.js'),
  [],
  // @ts-ignore
  { detached: true, stdio: 'pipe' }
);

proc.stdout.pipe(process.stdout);

const queue:Array<[Function, Function]> = [];

const createError = (message: string, stack: string): Error => {
  const error = Error(message);
  error.stack = stack;
  return error;
};

queue.push([console.log, console.error]);

proc.on('message', ([error, result]: [string[]|null, object[]|null]) => {
  const shifted = queue.shift();
  if (shifted !== undefined) {
    const [resolve, reject] = shifted;
  }
});
