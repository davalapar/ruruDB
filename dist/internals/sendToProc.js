"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const proc = child_process_1.fork(path_1.default.resolve(__dirname, './proc.js'), [], { detached: true, stdio: 'pipe' });
proc.stdout.pipe(process.stdout);
const queue = [];
const createError = (message, stack) => {
    const error = Error(message);
    error.stack = stack;
    return error;
};
queue.push([console.log, console.error]);
proc.on('message', ([error, result]) => {
    const shifted = queue.shift();
    if (shifted !== undefined) {
        const [resolve, reject] = shifted;
    }
});
